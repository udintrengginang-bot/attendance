import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
        if (el.placeholder) el.placeholder = translation;
        else el.textContent = translation;
    });
    document.querySelectorAll('#language-switcher .lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

document.addEventListener('DOMContentLoaded', () => {
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

    const updateStatusUI = (status) => {
        // ... implementation ...
    };

    const showDashboard = (worker) => {
        // ... implementation ...
    };
    
    const showLogin = () => {
        // ... implementation ...
    };
    
    const createLog = async (action, siteId) => {
       // ... implementation ...
    };
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const mobileNumber = document.getElementById('mobile-number').value;
        const pin = document.getElementById('pin').value;
        // Use 'laborers' to match the database collection name
        const q = query(collection(db, 'laborers'), where('mobileNumber', '==', mobileNumber), where('pin', '==', pin));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            loginError.textContent = 'Invalid mobile number or PIN.';
        } else {
            const workerDoc = querySnapshot.docs[0];
            showDashboard({ id: workerDoc.id, ...workerDoc.data() });
        }
    });

    startWorkBtn.addEventListener('click', async () => { /* ... implementation ... */ });
    endWorkBtn.addEventListener('click', async () => { /* ... implementation ... */ });
    logoutBtn.addEventListener('click', async () => { /* ... implementation ... */ });
    langSwitcher.addEventListener('click', (e) => {
        if (e.target.matches('.lang-btn')) setLanguage(e.target.dataset.lang);
    });

    setLanguage(currentLanguage);

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const sitesSnapshot = await getDocs(collection(db, 'sites'));
                sitesData = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                showLogin();
            } catch (error) {
                console.error("Error fetching sites:", error);
                document.body.innerHTML = "Error loading. Please refresh."
            }
        } else {
            signInAnonymously(auth).catch(err => console.error("Anonymous sign-in failed:", err));
        }
    });
});

