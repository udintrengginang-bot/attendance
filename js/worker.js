import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- TRANSLATIONS ---
const translations = {
    en: {
        worker_checkin: "Worker Check-in", placeholder_mobile: "Enter 10-Digit Mobile Number", placeholder_pin: "Enter 4-Digit PIN", login: "Login",
        welcome: "Welcome", todays_task: "Today's Task", select_site: "Select Your Site for Today", start_work: "Start Work", end_work: "End Work", logout: "Logout",
        status_started: "Work Started", status_ended: "Work Ended", no_sites: "No sites assigned", contact_admin: "Contact Admin to Assign Site"
    },
    hi: {
        worker_checkin: "कर्मचारी चेक-इन", placeholder_mobile: "10 अंकों का मोबाइल नंबर दर्ज करें", placeholder_pin: "4 अंकों का पिन दर्ज करें", login: "लॉग इन करें",
        welcome: "आपका स्वागत है", todays_task: "आज का कार्य", select_site: "आज के लिए अपनी साइट चुनें", start_work: "काम शुरू करें", end_work: "काम खत्म करें", logout: "लॉग आउट",
        status_started: "काम शुरू हुआ", status_ended: "काम समाप्त हुआ", no_sites: "कोई साइट असाइन नहीं है", contact_admin: "साइट असाइन करने के लिए व्यवस्थापक से संपर्क करें"
    },
    mr: {
        worker_checkin: "कामगार चेक-इन", placeholder_mobile: "१०-अंकी मोबाइल नंबर प्रविष्ट करा", placeholder_pin: "४-अंकी पिन प्रविष्ट करा", login: "लॉग इन करा",
        welcome: "आपले स्वागत आहे", todays_task: "आजचे कार्य", select_site: "आजसाठी आपली साइट निवडा", start_work: "काम सुरू करा", end_work: "काम समाप्त करा", logout: "लॉग आउट",
        status_started: "काम सुरू झाले", status_ended: "काम संपले", no_sites: "कोणतीही साइट नियुक्त केलेली नाही", contact_admin: "साइट नियुक्त करण्यासाठी प्रशासकाशी संपर्क साधा"
    }
};

let currentLanguage = localStorage.getItem('shreeved-lang-worker') || 'en';

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('shreeved-lang-worker', lang);
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.dataset.translateKey;
        const translation = translations[lang][key] || translations['en'][key];
        if (el.placeholder) {
            el.placeholder = translation;
        } else {
            el.textContent = translation;
        }
    });
    document.querySelectorAll('#language-switcher .lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

// DOM Elements
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const workerNameEl = document.getElementById('worker-name');
const workerStatusEl = document.getElementById('worker-status');
const siteSelectionView = document.getElementById('site-selection-view');
const siteSelect = document.getElementById('site-select');
const startWorkBtn = document.getElementById('start-work-btn');
const endWorkBtn = document.getElementById('end-work-btn');
const logoutBtn = document.getElementById('logout-btn');
const taskView = document.getElementById('task-view');
const taskDescriptionEl = document.getElementById('task-description');
const langSwitcher = document.getElementById('language-switcher');

let currentWorker = null;
let sitesData = [];

// --- Functions ---
const updateStatusUI = (status) => {
    workerStatusEl.textContent = translations[currentLanguage][status === 'Work Started' ? 'status_started' : 'status_ended'];
    workerStatusEl.className = 'mt-1 text-sm font-semibold py-1 px-3 rounded-full inline-block ';
    if (status === 'Work Started') {
        workerStatusEl.classList.add('bg-green-100', 'text-green-800');
        startWorkBtn.classList.add('hidden');
        endWorkBtn.classList.remove('hidden');
        siteSelectionView.classList.add('hidden');
    } else { // Work Ended
        workerStatusEl.classList.add('bg-red-100', 'text-red-800');
        startWorkBtn.classList.remove('hidden');
        endWorkBtn.classList.add('hidden');
        siteSelectionView.classList.remove('hidden');
    }
};

const showDashboard = (worker) => {
    currentWorker = worker;
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    workerNameEl.textContent = `${translations[currentLanguage].welcome}, ${worker.name}`;
    updateStatusUI(worker.status);

    if (worker.currentTask) {
        taskDescriptionEl.textContent = worker.currentTask;
        taskView.classList.remove('hidden');
    } else {
        taskView.classList.add('hidden');
    }

    const assignedSiteIds = worker.assignedSiteIds || [];
    const assignedSites = sitesData.filter(s => assignedSiteIds.includes(s.id));
    
    siteSelect.innerHTML = assignedSites.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    if (assignedSites.length === 0) {
        siteSelect.innerHTML = `<option value="">${translations[currentLanguage].no_sites}</option>`;
        startWorkBtn.disabled = true;
        startWorkBtn.textContent = translations[currentLanguage].contact_admin;
        startWorkBtn.classList.add('bg-slate-400', 'cursor-not-allowed');
    } else {
        startWorkBtn.disabled = false;
        startWorkBtn.textContent = translations[currentLanguage].start_work;
        startWorkBtn.classList.remove('bg-slate-400', 'cursor-not-allowed');
    }
};

const showLogin = () => {
    currentWorker = null;
    loginView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    loginForm.reset();
    loginError.textContent = '';
};

const createLog = async (action, siteId) => {
    try {
        await addDoc(collection(db, 'attendance_logs'), {
            workerId: currentWorker.id,
            workerName: currentWorker.name,
            action: action,
            siteId: siteId,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error creating log:", error);
    }
};

// --- Event Listeners ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const mobileNumber = document.getElementById('mobile-number').value;
    const pin = document.getElementById('pin').value;

    const q = query(collection(db, 'workers'), where('mobileNumber', '==', mobileNumber), where('pin', '==', pin));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        loginError.textContent = 'Invalid mobile number or PIN.';
    } else {
        const workerDoc = querySnapshot.docs[0];
        showDashboard({ id: workerDoc.id, ...workerDoc.data() });
    }
});

startWorkBtn.addEventListener('click', async () => {
    const selectedSiteId = siteSelect.value;
    if (!selectedSiteId) {
        alert("Please select a site before starting work.");
        return;
    }
    const workerRef = doc(db, 'workers', currentWorker.id);
    await updateDoc(workerRef, { status: 'Work Started', lastSiteId: selectedSiteId });
    await createLog('Start Work', selectedSiteId);
    currentWorker.status = 'Work Started';
    currentWorker.lastSiteId = selectedSiteId; // Update local state
    updateStatusUI('Work Started');
});

endWorkBtn.addEventListener('click', async () => {
    const workerRef = doc(db, 'workers', currentWorker.id);
    const siteIdForLog = currentWorker.lastSiteId;
    await updateDoc(workerRef, { status: 'Work Ended' });
    await createLog('End Work', siteIdForLog);
    currentWorker.status = 'Work Ended';
    updateStatusUI('Work Ended');
});

logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    showLogin();
});

langSwitcher.addEventListener('click', (e) => {
    if (e.target.matches('.lang-btn')) {
        setLanguage(e.target.dataset.lang);
    }
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLanguage);
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const sitesSnapshot = await getDocs(collection(db, 'sites'));
            sitesData = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            showLogin();
        } catch (error) {
            console.error("Error fetching sites:", error);
            document.body.innerHTML = "Error loading essential data. Please refresh."
        }
    } else {
        signInAnonymously(auth).catch(err => {
            console.error("Anonymous sign-in failed:", err);
        });
    }
});
