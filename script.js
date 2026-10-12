// Firebase Konfiguration
const firebaseConfig = {
    apiKey: "AIzaSyDlxKrv4KtPqUKwpVK8Umzz-AzaBxFwQsI",
    authDomain: "://firebaseapp.com",
    databaseURL: "https://firebasedatabase.app",
    projectId: "grandrp-tracker",
    storageBucket: "grandrp-tracker.firebasestorage.app",
    messagingSenderId: "538153636196",
    appId: "1:538153636196:web:a6d52f03b606ae5b7daa71"
};

// Firebase initialisieren
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentUserId = localStorage.getItem('grand_rp_user_id') || null;
let userData = null;

// Prüfen ob bereits eingeloggt
if (currentUserId) {
    checkLoginState();
}

// REGISTRIERUNGS-FUNKTION
function handleRegister() {
    const username = document.getElementById('authUsername').value.trim();
    const icId = document.getElementById('authID').value.trim();
    const phone = document.getElementById('authPhone').value.trim();

    if (!username || !icId || !phone) {
        alert("Fehler: Für die Registrierung müssen IC Name, ID UND Telefonnummer ausgefüllt sein!");
        return;
    }

    const cleanKey = (username + "_" + icId).replace(/[^a-zA-Z0-9_]/g, "");

    db.ref('users/' + cleanKey).once('value', snapshot => {
        if (snapshot.exists()) {
            alert("Diese Kombination aus Name und ID existiert bereits! Nutze den Einloggen-Button.");
        } else {
            db.ref('users').once('value', usersSnap => {
                const role = usersSnap.exists() ? "Mitglied" : "Chef";
                
                const newProfile = {
                    username: username,
                    icId: icId,
                    phone: phone,
                    role: role
                };

                db.ref('users/' + cleanKey).set(newProfile, error => {
                    if(!error) {
                        localStorage.setItem('grand_rp_user_id', cleanKey);
                        currentUserId = cleanKey;
                        checkLoginState();
                    } else {
                        alert("Datenbankfehler: " + error.message);
                    }
                });
            });
        }
    });
}

// LOGIN-FUNKTION
function handleLogin() {
    const username = document.getElementById('authUsername').value.trim();
    const icId = document.getElementById('authID').value.trim();

    if (!username || !icId) {
        alert("Bitte IC Name und ID zum Einloggen ausfüllen!");
        return;
    }

    const cleanKey = (username + "_" + icId).replace(/[^a-zA-Z0-9_]/g, "");

    db.ref('users/' + cleanKey).once('value', snapshot => {
        if (snapshot.exists()) {
            localStorage.setItem('grand_rp_user_id', cleanKey);
            currentUserId = cleanKey;
            checkLoginState();
        } else {
            alert("Konto nicht gefunden! Falls du neu bist, fülle auch das Telefonnummer-Feld aus und klicke auf 'Neues Konto registrieren'.");
        }
    });
}

function checkLoginState() {
    db.ref('users/' + currentUserId).once('value', snapshot => {
        userData = snapshot.val();
        if (userData) {
            document.getElementById('authArea').classList.add('hidden');
            document.getElementById('playerArea').classList.remove('hidden');
            document.getElementById('usernameDisplay').innerText = userData.username;
            document.getElementById('idDisplay').innerText = userData.icId;
            document.getElementById('userRang').innerText = userData.role;

            if (userData.role === "Chef" || userData.role === "Admin") {
                document.getElementById('adminArea').classList.remove('hidden');
                listenToAllPayouts();
            }

            db.ref('payouts/' + currentUserId).on('value', payoutSnap => {
                let total = 0;
                const logList = document.getElementById('myLogList');
                logList.innerHTML = "";
                
                payoutSnap.forEach(child => {
                    const event = child.val();
                    total += event.amount;

                    const li = document.createElement('li');
                    li.className = 'log-item';
                    li.innerHTML = `<span><strong>${event.time} Uhr</strong> - ${event.name}</span> <span>+$${event.amount.toLocaleString()}</span>`;
                    logList.appendChild(li);
                });
                document.getElementById('userTotal').innerText = "\$" + total.toLocaleString('de-DE');
            });
        }
    });
}

function addEvent() {
    const time = document.getElementById('eventTime').value;
    const eventSelect = document.getElementById('eventType');
    const amount = parseInt(eventSelect.value);
    const name = eventSelect.options[eventSelect.selectedIndex].text.split(' (');

    if (!time) { alert("Bitte gib eine Uhrzeit an!"); return; }

    db.ref('payouts/' + currentUserId).push({
        time: time,
        name: name,
        amount: amount,
        timestamp: Date.now()
    });

    document.getElementById('eventTime').value = "";
}

function listenToAllPayouts() {
    db.ref('users').on('value', usersSnapshot => {
        const users = usersSnapshot.val() || {};
        
        db.ref('payouts').on('value', payoutsSnapshot => {
            const adminList = document.getElementById('adminMemberList');
            adminList.innerHTML = "";
            const payouts = payoutsSnapshot.val() || {};

            for (let uid in users) {
                let userTotal = 0;
                let eventCount = 0;
                
                if (payouts[uid]) {
                    for (let id in payouts[uid]) {
                        userTotal += payouts[uid][id].amount;
                        eventCount++;
                    }
                }

                if (userTotal > 0) {
                    const div = document.createElement('div');
                    div.className = 'member-row';
                    div.innerHTML = `
                        <div>
                            <strong>${users[uid].username} (ID: ${users[uid].icId})</strong><br>
                            <span style="color: #aaa;">Tel: ${users[uid].phone} | ${eventCount} Event(s) offen</span>
                        </div>
                        <div>
                            <span style="color: #00ff77; font-weight: bold; margin-right: 15px;">$${userTotal.toLocaleString('de-DE')}</span>
                            <button class="btn-pay" onclick="clearPayout('${uid}', '${users[uid].username}')">Ausgezahlt</button>
                        </div>
                    `;
                    adminList.appendChild(div);
                }
            }
            if(adminList.innerHTML === "") {
                adminList.innerHTML = "<p style='text-align:center;color:#666;'>Aktuell keine offenen Auszahlungen vorhanden.</p>";
            }
        });
    });
}

function clearPayout(uid, name) {
    if (confirm(`Möchtest du die Auszahlung für ${name} wirklich bestätigen und zurücksetzen?`)) {
        db.ref('payouts/' + uid).remove();
    }
}

function logout() {
    localStorage.removeItem('grand_rp_user_id');
    location.reload();
}
