import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, onSnapshot, addDoc, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
const firebaseConfig = {
    apiKey: "AIzaSyArMFpT8YIkJhMGIEPTghKMCTTQsbAwK3I",
    authDomain: "dad-attendance.firebaseapp.com",
    projectId: "dad-attendance",
    storageBucket: "dad-attendance.firebasestorage.app",
    messagingSenderId: "626292583397",
    appId: "1:626292583397:web:b0078d3a49840f38631d0c"
};
// --- END OF FIREBASE CONFIG ---

if (!firebaseConfig.projectId || firebaseConfig.projectId === "YOUR_PROJECT_ID") {
    document.body.innerHTML = `<div class="p-4 text-center bg-red-100 text-red-800 rounded-lg"><h1 class="font-bold">Configuration Error</h1><p>Firebase is not configured. Please edit the <strong>/js/laborer.js</strong> file and add your keys.</p></div>`;
    throw new Error("Firebase config is not valid.");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
signInAnonymously(auth).catch(error => console.error("Anonymous sign-in failed:", error));

const translations = {
    en: { loginTitle: "Laborer Login", mobileLabel: "Mobile Number", pinLabel: "4-Digit PIN", loginBtn: "Login", goBackLink: "← Go to Main Page", statusReady: "Ready to Start", statusWorking: "Working", statusOnBreak: "On Break", btnStartWork: "Start Work", btnTakeBreak: "Take Break", btnResumeWork: "Resume Work", btnEndDay: "End Day", logout: "Logout", errorNotFound: "Mobile number not found.", errorIncorrectPin: "Incorrect PIN.", taskTitle: "Today's Task:", noTask: "No specific task assigned.", tabStatus: "Status", tabMyHours: "My Hours", hoursTitle: "Hours This Week", loadingHours: "Calculating hours...", noHours: "No hours recorded this week.", weekTotal: "Week Total" },
    hi: { loginTitle: "लेबर लॉगिन", mobileLabel: "मोबाइल नंबर", pinLabel: "४-अंकीय पिन", loginBtn: "लॉगिन करें", goBackLink: "← मुख्य पृष्ठ पर जाएं", statusReady: "शुरू करने के लिए तैयार", statusWorking: "काम पर", statusOnBreak: "ब्रेक पर", btnStartWork: "काम शुरू करें", btnTakeBreak: "ब्रेक लें", btnResumeWork: "काम पर वापस", btnEndDay: "दिन समाप्त करें", logout: "लॉगआउट", errorNotFound: "मोबाइल नंबर नहीं मिला।", errorIncorrectPin: "गलत पिन।", taskTitle: "आज का काम:", noTask: "कोई विशेष काम नहीं दिया गया।", tabStatus: "स्टेटस", tabMyHours: "मेरे घंटे", hoursTitle: "इस सप्ताह के घंटे", loadingHours: "घंटों की गणना हो रही है...", noHours: "इस सप्ताह कोई घंटे दर्ज नहीं किए गए।", weekTotal: "कुल योग" },
    mr: { loginTitle: "कामगार लॉगिन", mobileLabel: "मोबाईल नंबर", pinLabel: "४-अंकी पिन", loginBtn: "लॉगिन करा", goBackLink: "← मुख्य पृष्ठावर जा", statusReady: "सुरू करण्यास तयार", statusWorking: "कामावर", statusOnBreak: "ब्रेकवर", btnStartWork: "काम सुरू करा", btnTakeBreak: "ब्रेक घ्या", btnResumeWork: "कामावर परत", btnEndDay: "दिवस समाप्त करा", logout: "लॉगआउट", errorNotFound: "मोबाइल नंबर आढळला नाही.", errorIncorrectPin: "चुकीचा पिन。", taskTitle: "आजचे काम:", noTask: "कोणतेही विशिष्ट काम नियुक्त केलेले नाही.", tabStatus: "स्टेटस", tabMyHours: "माझे तास", hoursTitle: "या आठवड्यातील तास", loadingHours: "तासांची गणना होत आहे...", noHours: "या आठवड्यात कोणतेही तास नोंदवले नाहीत.", weekTotal: "एकूण" }
};
const icons = {
    play: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>`,
    pause: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`,
    stop: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" /></svg>`
};

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT REFERENCES ---
    const loginSection = document.getElementById('laborer-login-section'), mainSection = document.getElementById('laborer-main-section'), statusTab = document.getElementById('status-tab'), hoursTab = document.getElementById('hours-tab'), statusContent = document.getElementById('status-content'), hoursContent = document.getElementById('hours-content'), loginForm = document.getElementById('laborer-login-form'), errorEl = document.getElementById('laborer-login-error'), nameDisplay = document.getElementById('laborer-name-display'), siteDisplay = document.getElementById('site-name-display'), statusCard = document.getElementById('status-card'), statusText = document.getElementById('status-text'), mainBtn = document.getElementById('main-action-btn'), clockOutBtn = document.getElementById('clock-out-btn'), logoutBtn = document.getElementById('logout-laborer-btn'), taskContainer = document.getElementById('task-container'), taskTitle = document.getElementById('task-title'), taskDisplay = document.getElementById('task-display');

    let currentLaborer = null, unsubscribe, currentLang = localStorage.getItem('laborerLang') || 'en';

    // --- LANGUAGE SWITCHING ---
    const langButtons = { en: document.getElementById('lang-en'), hi: document.getElementById('lang-hi'), mr: document.getElementById('lang-mr') };
    function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('laborerLang', lang);
        Object.keys(langButtons).forEach(key => langButtons[key].classList.toggle('active', key === lang));
        const t = translations[lang];
        document.getElementById('login-title').textContent = t.loginTitle;
        document.getElementById('mobile-label').textContent = t.mobileLabel;
        document.getElementById('pin-label').textContent = t.pinLabel;
        document.getElementById('login-btn').textContent = t.loginBtn;
        document.getElementById('go-back-link').textContent = t.goBackLink;
        logoutBtn.textContent = t.logout;
        statusTab.textContent = t.tabStatus;
        hoursTab.textContent = t.tabMyHours;
        if (currentLaborer) updateUI();
    }
    Object.keys(langButtons).forEach(key => langButtons[key].addEventListener('click', () => setLanguage(key)));

    // --- LOGIN LOGIC ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mobile = document.getElementById('mobile-input').value;
        const pin = document.getElementById('pin-input').value;
        errorEl.textContent = '';
        const q = query(collection(db, "laborers"), where("mobileNumber", "==", mobile));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) { errorEl.textContent = translations[currentLang].errorNotFound; return; }
        const laborerDoc = querySnapshot.docs[0];
        if (laborerDoc.data().pin === pin) {
            sessionStorage.setItem('laborerId', laborerDoc.id);
            showMainView();
        } else {
            errorEl.textContent = translations[currentLang].errorIncorrectPin;
        }
    });

    // --- MAIN APP VIEW LOGIC ---
    function showMainView() {
        if (unsubscribe) unsubscribe();
        const laborerId = sessionStorage.getItem('laborerId');
        if (!laborerId) { showLoginView(); return; }
        loginSection.classList.add('hidden');
        mainSection.classList.remove('hidden');
        showTab('status');
        unsubscribe = onSnapshot(doc(db, "laborers", laborerId), (docSnap) => {
            if (docSnap.exists()) {
                currentLaborer = { id: docSnap.id, ...docSnap.data() };
                updateUI();
            } else { logout(); }
        });
    }
    
    // --- TAB SWITCHING LOGIC ---
    statusTab.addEventListener('click', () => showTab('status'));
    hoursTab.addEventListener('click', () => showTab('hours'));
    function showTab(tabName) {
        statusTab.classList.toggle('active', tabName === 'status');
        hoursTab.classList.toggle('active', tabName === 'hours');
        statusContent.classList.toggle('hidden', tabName !== 'status');
        hoursContent.classList.toggle('hidden', tabName !== 'hours');
        if (tabName === 'hours') renderHoursPage();
    }

    // --- RENDER HOURS PAGE ---
    async function renderHoursPage() {
        const t = translations[currentLang];
        hoursContent.innerHTML = `<h3 class="text-xl font-bold text-slate-800 mb-4">${t.hoursTitle}</h3><div id="hours-list" class="text-center text-slate-500">${t.loadingHours}</div>`;
        const weeklyHours = await calculateWeeklyHours();
        const hoursList = document.getElementById('hours-list');
        if (Object.keys(weeklyHours.days).length === 0) {
            hoursList.textContent = t.noHours;
            return;
        }
        const dayNames = { en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], hi: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"], mr: ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"] };
        let dayRows = Object.entries(weeklyHours.days).map(([dateStr, hours]) => {
            const date = new Date(dateStr);
            const dayName = dayNames[currentLang][date.getUTCDay()];
            return `<div class="flex justify-between items-center py-3 border-b border-slate-200"><span class="font-medium text-slate-600">${dayName} (${date.getUTCDate()}/${date.getUTCMonth()+1})</span><span class="font-bold text-slate-800">${hours.toFixed(2)} hrs</span></div>`;
        }).join('');
        hoursList.innerHTML = `<div class="space-y-2 text-left">${dayRows}</div><div class="flex justify-between items-center pt-4 mt-4 border-t-2 border-slate-300"><span class="font-bold text-slate-600 uppercase">${t.weekTotal}</span><span class="font-bold text-xl text-amber-600">${weeklyHours.total.toFixed(2)} hrs</span></div>`;
    }

    async function calculateWeeklyHours() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startOfWeek.setHours(0, 0, 0, 0);
        const logsQuery = query(collection(db, "attendance_logs"), where("laborerId", "==", currentLaborer.id), where("timestamp", ">=", Timestamp.fromDate(startOfWeek)));
        const logsSnapshot = await getDocs(logsQuery);
        const logs = logsSnapshot.docs.map(d => ({ ...d.data(), timestamp: d.data().timestamp.toDate() })).sort((a,b) => a.timestamp - b.timestamp);
        let dailyHours = {}, lastClockIn = null;
        for (const log of logs) {
            const dateStr = log.timestamp.toISOString().split('T')[0];
            if (!dailyHours[dateStr]) dailyHours[dateStr] = 0;
            if (log.action === "Clock In" || log.action === "End Break") {
                lastClockIn = log.timestamp;
            } else if ((log.action === "Clock Out" || log.action === "Start Break") && lastClockIn) {
                const durationHours = (log.timestamp - lastClockIn) / 3600000;
                dailyHours[dateStr] += durationHours;
                lastClockIn = null;
            }
        }
        const totalHours = Object.values(dailyHours).reduce((sum, h) => sum + h, 0);
        return { days: dailyHours, total: totalHours };
    }

    // --- UI Update & Action Logic ---
    async function updateUI() {
        if (!currentLaborer) return;
        const t = translations[currentLang];
        nameDisplay.textContent = currentLaborer.name;
        if (currentLaborer.siteId) {
            const siteQuery = query(collection(db, "sites"), where("__name__", "==", currentLaborer.siteId));
            const siteSnapshot = await getDocs(siteQuery);
            siteDisplay.textContent = siteSnapshot.docs.length > 0 ? siteSnapshot.docs[0].data().name : "Unassigned";
        } else {
            siteDisplay.textContent = "Unassigned";
        }
        taskTitle.textContent = t.taskTitle;
        if (currentLaborer.currentTask && currentLaborer.currentTask.trim() !== '') {
            taskDisplay.textContent = currentLaborer.currentTask;
            taskContainer.classList.remove('hidden');
        } else {
            taskDisplay.textContent = t.noTask;
            taskContainer.classList.remove('hidden');
        }
        let statusKey = 'statusReady';
        if (currentLaborer.status === 'Clocked In') statusKey = 'statusWorking';
        else if (currentLaborer.status === 'On Break') statusKey = 'statusOnBreak';
        statusText.textContent = t[statusKey];
        switch (currentLaborer.status) {
            case 'Clocked Out':
                statusCard.className = 'p-6 rounded-lg mb-6 bg-slate-200 text-slate-800';
                mainBtn.innerHTML = `${icons.play} <span>${t.btnStartWork}</span>`;
                mainBtn.className = 'w-full text-lg font-bold py-3 px-4 rounded-lg bg-green-500 hover:bg-green-600 text-white flex items-center justify-center space-x-3';
                clockOutBtn.classList.add('hidden');
                break;
            case 'Clocked In':
                statusCard.className = 'p-6 rounded-lg mb-6 bg-green-100 text-green-800';
                mainBtn.innerHTML = `${icons.pause} <span>${t.btnTakeBreak}</span>`;
                mainBtn.className = 'w-full text-lg font-bold py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 flex items-center justify-center space-x-3';
                clockOutBtn.innerHTML = `${icons.stop} <span>${t.btnEndDay}</span>`;
                clockOutBtn.classList.remove('hidden');
                break;
            case 'On Break':
                statusCard.className = 'p-6 rounded-lg mb-6 bg-blue-100 text-blue-800';
                mainBtn.innerHTML = `${icons.play} <span>${t.btnResumeWork}</span>`;
                mainBtn.className = 'w-full text-lg font-bold py-3 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center space-x-3';
                clockOutBtn.classList.add('hidden');
                break;
        }
    }
    
    async function handleAction(type) {
        if (!currentLaborer) return;
        mainBtn.disabled = true; clockOutBtn.disabled = true;
        let newStatus = '', logAction = '';
        if (type === 'main') {
            if (currentLaborer.status === 'Clocked Out') { newStatus = 'Clocked In'; logAction = 'Clock In'; }
            else if (currentLaborer.status === 'Clocked In') { newStatus = 'On Break'; logAction = 'Start Break'; }
            else if (currentLaborer.status === 'On Break') { newStatus = 'Clocked In'; logAction = 'End Break'; }
        } else if (type === 'clock_out') {
            newStatus = 'Clocked Out'; logAction = 'Clock Out';
        }
        try {
            await addDoc(collection(db, "attendance_logs"), { laborerId: currentLaborer.id, laborerName: currentLaborer.name, siteId: currentLaborer.siteId || null, action: logAction, timestamp: serverTimestamp() });
            await updateDoc(doc(db, "laborers", currentLaborer.id), { status: newStatus });
        } catch(err) {
            console.error("Failed to perform action:", err);
            alert("An error occurred. Please try again.");
        } finally {
            mainBtn.disabled = false; clockOutBtn.disabled = false;
        }
    }

    // --- LOGOUT & INITIALIZATION ---
    function showLoginView() {
        if (unsubscribe) unsubscribe();
        sessionStorage.removeItem('laborerId');
        currentLaborer = null;
        loginSection.classList.remove('hidden');
        mainSection.classList.add('hidden');
        loginForm.reset();
        errorEl.textContent = '';
    }
    logoutBtn.addEventListener('click', showLoginView);
    
    // THE FIX: ADD THE MISSING EVENT LISTENERS HERE
    mainBtn.addEventListener('click', () => handleAction('main'));
    clockOutBtn.addEventListener('click', () => handleAction('clock_out'));

    setLanguage(currentLang);
    if (sessionStorage.getItem('laborerId')) {
        showMainView();
    }
});