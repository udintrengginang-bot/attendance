import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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
        const translation = translations[lang]?.[key] || translations['en'][key];
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
        if (!workerStatusEl) return;
        
        const isStarted = status === 'Work Started';
        workerStatusEl.textContent = isStarted ? translations[currentLanguage].status_started : translations[currentLanguage].status_ended;
        workerStatusEl.className = `mt-1 text-sm font-semibold py-1 px-3 rounded-full inline-block ${isStarted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;

        startWorkBtn.classList.toggle('hidden', isStarted);
        endWorkBtn.classList.toggle('hidden', !isStarted);
        siteSelectionView.classList.toggle('hidden', isStarted);
    };

    const showDashboard = (worker) => {
        currentWorker = worker;
        loginView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        
        workerNameEl.textContent = `${translations[currentLanguage].welcome}, ${worker.name}`;
        
        if (worker.currentTask) {
            taskDescriptionEl.textContent = worker.currentTask;
            taskView.classList.remove('hidden');
        } else {
            taskView.classList.add('hidden');
        }

        const assignedSites = sitesData.filter(s => worker.assignedSiteIds?.includes(s.id));
        if (assignedSites.length > 0) {
            siteSelect.innerHTML = assignedSites.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            siteSelectionView.classList.remove('hidden');
            startWorkBtn.disabled = false;
            startWorkBtn.textContent = translations[currentLanguage].start_work;
        } else {
            siteSelect.innerHTML = `<option>${translations[currentLanguage].no_sites}</option>`;
            startWorkBtn.disabled = true;
            startWorkBtn.textContent = translations[currentLanguage].contact_admin;
        }
        
        updateStatusUI(worker.status);
    };
    
    const showLogin = () => {
        currentWorker = null;
        loginView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
        loginForm.reset();
    };
    
    const createLog = async (action, siteId) => {
       if(!currentWorker || !siteId) {
           console.error("Cannot create log: Missing worker or siteId.", { currentWorker, siteId });
           return;
       };
       await addDoc(collection(db, "attendance_logs"), {
           laborerId: currentWorker.id,
           laborerName: currentWorker.name,
           action: action,
           siteId: siteId,
           timestamp: serverTimestamp()
       });
    };
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const mobileNumber = document.getElementById('mobile-number').value;
        const pin = document.getElementById('pin').value;
        
        const q = query(collection(db, 'laborers'), where('mobileNumber', '==', mobileNumber), where('pin', '==', pin));
        try {
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                loginError.textContent = 'Invalid mobile number or PIN.';
            } else {
                const workerDoc = querySnapshot.docs[0];
                showDashboard({ id: workerDoc.id, ...workerDoc.data() });
            }
        } catch (error) {
            console.error("Login query failed:", error);
            loginError.textContent = "An error occurred. Please try again.";
        }
    });

    startWorkBtn.addEventListener('click', async () => {
        if (!currentWorker || !siteSelect.value) return;
        const selectedSiteId = siteSelect.value;
        const newStatus = 'Work Started';
        const workerRef = doc(db, 'laborers', currentWorker.id);
        
        await updateDoc(workerRef, { status: newStatus, currentSiteId: selectedSiteId });
        await createLog(newStatus, selectedSiteId);
        
        currentWorker.status = newStatus;
        currentWorker.currentSiteId = selectedSiteId; // IMPORTANT FIX
        updateStatusUI(newStatus);
    });

    endWorkBtn.addEventListener('click', async () => {
        if (!currentWorker) return;
        const newStatus = 'Work Ended';
        const workerRef = doc(db, 'laborers', currentWorker.id);
        
        await updateDoc(workerRef, { status: newStatus });
        await createLog(newStatus, currentWorker.currentSiteId); // IMPORTANT FIX
        
        currentWorker.status = newStatus;
        updateStatusUI(newStatus);
    });

    logoutBtn.addEventListener('click', showLogin);

    langSwitcher.addEventListener('click', (e) => {
        const button = e.target.closest('.lang-btn');
        if (button) setLanguage(button.dataset.lang);
    });

    setLanguage(currentLanguage);

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const sitesSnapshot = await getDocs(collection(db, 'sites'));
                sitesData = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error("Error fetching sites:", error);
                document.body.innerHTML = "Error loading application data. Please refresh the page."
            }
        } else {
            signInAnonymously(auth).catch(err => console.error("Anonymous sign-in failed:", err));
        }
    });
});
