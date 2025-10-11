import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyArMFpT8YIkJhMGIEPTghKMCTTQsbAwK3I",
    authDomain: "dad-attendance.firebaseapp.com",
    projectId: "dad-attendance",
    storageBucket: "dad-attendance.firebasestorage.app",
    messagingSenderId: "626292583397",
    appId: "1:626292583397:web:b0078d3a49840f38631d0c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const translations = {
    en: {
        worker_portal: "Worker Portal", mobile_label: "Mobile Number", pin_label: "4-Digit PIN",
        login: "Login", welcome: "Welcome", select_site: "📍 Where are you today?", 
        start_work: "START WORK", working_at: "Working today at", working_time: "⏱️ Working",
        todays_earnings: "💰 Today's Earnings", upload_photo: "📸 Upload Photo",
        end_work: "END WORK", work_ended: "Work Day Ended!", invalid_login: "Invalid mobile number or PIN"
    },
    hi: {
        worker_portal: "कामगार पोर्टल", mobile_label: "मोबाइल नंबर", pin_label: "4-अंकीय पिन",
        login: "लॉग इन करें", welcome: "आपका स्वागत है", select_site: "📍 आज आप कहाँ हैं?",
        start_work: "काम शुरू करें", working_at: "आज काम कर रहे हैं", working_time: "⏱️ काम कर रहे हैं",
        todays_earnings: "💰 आज की कमाई", upload_photo: "📸 फोटो अपलोड करें",
        end_work: "काम समाप्त करें", work_ended: "काम का दिन समाप्त!", invalid_login: "गलत मोबाइल नंबर या पिन"
    },
    mr: {
        worker_portal: "कामगार पोर्टल", mobile_label: "मोबाइल नंबर", pin_label: "4-अंकी पिन",
        login: "लॉग इन करा", welcome: "आपले स्वागत आहे", select_site: "📍 आज तुम्ही कुठे आहात?",
        start_work: "काम सुरू करा", working_at: "आज काम करत आहात", working_time: "⏱️ काम करत आहात",
        todays_earnings: "💰 आजची कमाई", upload_photo: "📸 फोटो अपलोड करा",
        end_work: "काम संपवा", work_ended: "कामाचा दिवस संपला!", invalid_login: "चुकीचा मोबाइल नंबर किंवा पिन"
    }
};

let currentLanguage = localStorage.getItem('shreeved-lang-worker') || 'en';
let currentWorker = null;
let sitesData = [];
let workStartTime = null;
let timerInterval = null;
let selectedPhoto = null;

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('shreeved-lang-worker', lang);
    document.querySelectorAll('.lang-btn, .lang-btn-dash').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}:${mins.toString().padStart(2, '0')}`;
}

function calculateEarnings(minutes, hourlyRate) {
    const hours = minutes / 60;
    return Math.round(hours * hourlyRate);
}

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxWidth = 1200;
                const maxHeight = 1200;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    }));
                }, 'image/jpeg', 0.7);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function createLog(action, siteId) {
    if (!currentWorker || !siteId) return;
    try {
        await addDoc(collection(db, "attendance_logs"), {
            laborerId: currentWorker.id,
            laborerName: currentWorker.name,
            action: action,
            siteId: siteId,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error creating attendance log:", error);
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (!workStartTime) return;
        
        const now = new Date();
        const minutesWorked = (now - workStartTime) / (1000 * 60);
        
        document.getElementById('timer-display').textContent = formatTime(minutesWorked);
        
        const earnings = calculateEarnings(minutesWorked, currentWorker.hourlyRate || 0);
        document.getElementById('earnings-display').textContent = `₹${earnings}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

async function load7DayHistory() {
    if (!currentWorker) return;
    
    const historyList = document.getElementById('history-list');
    const historyCard = document.getElementById('work-history-card');
    
    if (!historyList || !historyCard) return;
    
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const logsQuery = query(
            collection(db, 'attendance_logs'),
            where('laborerId', '==', currentWorker.id),
            where('timestamp', '>=', sevenDaysAgo),
            orderBy('timestamp', 'desc')
        );
        
        const logsSnapshot = await getDocs(logsQuery);
        const logs = logsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const logsByDate = {};
        logs.forEach(log => {
            const date = log.timestamp.toDate().toLocaleDateString('en-IN');
            if (!logsByDate[date]) logsByDate[date] = [];
            logsByDate[date].push(log);
        });
        
        const dailyStats = [];
        Object.entries(logsByDate).forEach(([date, dayLogs]) => {
            let totalMinutes = 0;
            let currentStart = null;
            
            dayLogs.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
            
            dayLogs.forEach(log => {
                if (log.action === 'Work Started') {
                    currentStart = log.timestamp.toDate();
                } else if (log.action === 'Work Ended' && currentStart) {
                    const end = log.timestamp.toDate();
                    totalMinutes += (end - currentStart) / (1000 * 60);
                    currentStart = null;
                }
            });
            
            const earnings = calculateEarnings(totalMinutes, currentWorker.hourlyRate || 0);
            const siteName = dayLogs[0] ? sitesData.find(s => s.id === dayLogs[0].siteId)?.name : 'Unknown';
            
            dailyStats.push({ date, hours: formatTime(totalMinutes), earnings, site: siteName });
        });
        
        if (dailyStats.length === 0) {
            historyList.innerHTML = '<p class="text-slate-500 text-center">No work history yet</p>';
        } else {
            historyList.innerHTML = dailyStats.map(day => `
                <div class="border-l-4 border-green-500 pl-4 py-2">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-semibold text-slate-800">${day.date}</p>
                            <p class="text-sm text-slate-600">📍 ${day.site}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-slate-800">⏱️ ${day.hours}</p>
                            <p class="text-sm text-green-600">₹${day.earnings}</p>
                        </div>
                    </div>
                </div>
            `).join('');
            historyCard.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error loading history:", error);
    }
}

function updateUI(isWorking) {
    document.getElementById('site-selection-view')?.classList.toggle('hidden', isWorking);
    document.getElementById('working-status-card')?.classList.toggle('hidden', !isWorking);
    document.getElementById('start-work-btn')?.classList.toggle('hidden', isWorking);
    document.getElementById('upload-photo-btn')?.classList.toggle('hidden', !isWorking);
    document.getElementById('end-work-btn')?.classList.toggle('hidden', !isWorking);
}

function showDashboard(worker) {
    currentWorker = worker;
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    const t = translations[currentLanguage];
    document.getElementById('worker-name').textContent = `${t.welcome}, ${worker.name}`;
    
    document.getElementById('hourly-rate-display')?.textContent = `₹${worker.hourlyRate || 0}`;
    
    if (worker.status === 'Work Started' && worker.currentSiteId) {
        const site = sitesData.find(s => s.id === worker.currentSiteId);
        if (site) {
            const siteNameEl = document.getElementById('current-site-name')?.querySelector('span:last-child');
            if (siteNameEl) siteNameEl.textContent = site.name;
            workStartTime = new Date();
            updateUI(true);
            startTimer();
        }
    } else {
        updateUI(false);
        loadSites();
    }
    
    load7DayHistory();
    
    setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, 2000);
}

function loadSites() {
    const siteSelect = document.getElementById('site-select');
    if (!siteSelect) return;
    
    const assignedSites = sitesData.filter(s => currentWorker.assignedSiteIds?.includes(s.id));
    
    if (assignedSites.length > 0) {
        siteSelect.innerHTML = assignedSites.map(s => 
            `<option value="${s.id}">${s.name}</option>`
        ).join('');
        siteSelect.disabled = false;
    } else {
        siteSelect.innerHTML = `<option value="">No sites assigned</option>`;
        siteSelect.disabled = true;
        const startBtn = document.getElementById('start-work-btn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = `<span class="text-3xl">📍</span><span>Contact Ajit</span>`;
        }
    }
}

function showLogin() {
    currentWorker = null;
    workStartTime = null;
    stopTimer();
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('login-form').reset();
    document.getElementById('login-error').textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLanguage);
    
    document.querySelectorAll('#language-switcher .lang-btn, #language-switcher-dashboard .lang-btn-dash').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });
    
    document.getElementById('dark-mode-toggle')?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const icon = document.querySelector('#dark-mode-toggle');
        icon.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    });
    
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const t = translations[currentLanguage];
        const errorEl = document.getElementById('login-error');
        errorEl.textContent = '';
        
        const mobile = document.getElementById('mobile-number').value.trim();
        const pin = document.getElementById('pin').value.trim();
        
        if (mobile.length !== 10 || pin.length !== 4) {
            errorEl.textContent = t.invalid_login;
            return;
        }
        
        try {
            const q = query(
                collection(db, 'laborers'),
                where('mobileNumber', '==', mobile),
                where('pin', '==', pin)
            );
            
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                errorEl.textContent = t.invalid_login;
            } else {
                showDashboard({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
            }
        } catch (error) {
            console.error("Login error:", error);
            errorEl.textContent = 'Error occurred. Please try again.';
        }
    });
    
    document.getElementById('start-work-btn')?.addEventListener('click', async () => {
        if (!currentWorker) return;
        
        const siteId = document.getElementById('site-select')?.value;
        if (!siteId) return;
        
        try {
            workStartTime = new Date();
            
            await updateDoc(doc(db, 'laborers', currentWorker.id), {
                status: 'Work Started',
                currentSiteId: siteId
            });
            
            await createLog('Work Started', siteId);
            
            currentWorker.status = 'Work Started';
            currentWorker.currentSiteId = siteId;
            
            const site = sitesData.find(s => s.id === siteId);
            const siteNameEl = document.getElementById('current-site-name')?.querySelector('span:last-child');
            if (siteNameEl) siteNameEl.textContent = site.name;
            
            updateUI(true);
            startTimer();
            
        } catch (error) {
            console.error("Error starting work:", error);
            alert('Error starting work');
        }
    });
    
    document.getElementById('upload-photo-btn')?.addEventListener('click', () => {
        document.getElementById('photo-upload-modal')?.classList.remove('hidden');
    });
    
    document.getElementById('end-work-btn')?.addEventListener('click', () => {
        if (!currentWorker || !workStartTime) return;
        
        const now = new Date();
        const minutesWorked = (now - workStartTime) / (1000 * 60);
        const earnings = calculateEarnings(minutesWorked, currentWorker.hourlyRate || 0);
        const site = sitesData.find(s => s.id === currentWorker.currentSiteId);
        
        document.getElementById('end-work-site')?.querySelector('span').textContent = site?.name || 'Unknown';
        document.getElementById('end-work-hours').textContent = formatTime(minutesWorked);
        document.getElementById('end-work-earnings').textContent = `₹${earnings}`;
        
        document.getElementById('end-work-modal')?.classList.remove('hidden');
    });
    
    document.getElementById('cancel-end-work-btn')?.addEventListener('click', () => {
        document.getElementById('end-work-modal')?.classList.add('hidden');
    });
    
    document.getElementById('confirm-end-work-btn')?.addEventListener('click', async () => {
        if (!currentWorker) return;
        
        try {
            await updateDoc(doc(db, 'laborers', currentWorker.id), {
                status: 'Work Ended'
            });
            
            await createLog('Work Ended', currentWorker.currentSiteId);
            
            stopTimer();
            
            document.getElementById('end-work-modal')?.classList.add('hidden');
            document.getElementById('work-ended-modal')?.classList.remove('hidden');
            
        } catch (error) {
            console.error("Error ending work:", error);
            alert('Error ending work');
        }
    });
    
    document.getElementById('close-success-btn')?.addEventListener('click', () => {
        document.getElementById('work-ended-modal')?.classList.add('hidden');
        currentWorker.status = 'Work Ended';
        workStartTime = null;
        updateUI(false);
        loadSites();
        load7DayHistory();
    });
    
    document.getElementById('logout-btn')?.addEventListener('click', showLogin);
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const sitesSnapshot = await getDocs(collection(db, 'sites'));
                sitesData = sitesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (error) {
                console.error("Error loading sites:", error);
            }
        } else {
            signInAnonymously(auth).catch(err => console.error("Anonymous auth failed:", err));
        }
    });
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(err => {
            console.log('Service Worker registration failed:', err);
        });
    }
});
