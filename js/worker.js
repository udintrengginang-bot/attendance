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

// DOM Elements
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const workerNameEl = document.getElementById('worker-name');
const workerStatusEl = document.getElementById('worker-status');
const siteSelectionView = document.getElementById('site-selection-view');
const siteSelect = document.getElementById('site-select');
const clockInBtn = document.getElementById('clock-in-btn');
const clockOutBtn = document.getElementById('clock-out-btn');
const logoutBtn = document.getElementById('logout-btn');
const taskView = document.getElementById('task-view');
const taskDescriptionEl = document.getElementById('task-description');

let currentWorker = null;
let sitesData = [];

// --- Functions ---

const updateStatusUI = (status) => {
    workerStatusEl.textContent = status;
    workerStatusEl.className = 'mt-1 text-sm font-semibold py-1 px-3 rounded-full inline-block ';
    switch (status) {
        case 'Clocked In':
            workerStatusEl.classList.add('bg-green-100', 'text-green-800');
            clockInBtn.classList.add('hidden');
            clockOutBtn.classList.remove('hidden');
            siteSelectionView.classList.add('hidden');
            break;
        case 'Clocked Out':
        default:
            workerStatusEl.classList.add('bg-red-100', 'text-red-800');
            clockInBtn.classList.remove('hidden');
            clockOutBtn.classList.add('hidden');
            siteSelectionView.classList.remove('hidden');
            break;
    }
};

const showDashboard = (worker) => {
    currentWorker = worker;
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    workerNameEl.textContent = `Welcome, ${worker.name}`;
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
        siteSelect.innerHTML = `<option value="">No sites assigned</option>`;
        clockInBtn.disabled = true;
        clockInBtn.textContent = 'Contact Admin to Assign Site';
        clockInBtn.classList.add('bg-slate-400', 'cursor-not-allowed');
    } else {
        clockInBtn.disabled = false;
        clockInBtn.textContent = 'Clock In';
        clockInBtn.classList.remove('bg-slate-400', 'cursor-not-allowed');
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
            laborerId: currentWorker.id,
            laborerName: currentWorker.name,
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

    const q = query(collection(db, 'laborers'), where('mobileNumber', '==', mobileNumber), where('pin', '==', pin));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        loginError.textContent = 'Invalid mobile number or PIN.';
    } else {
        const workerDoc = querySnapshot.docs[0];
        showDashboard({ id: workerDoc.id, ...workerDoc.data() });
    }
});

clockInBtn.addEventListener('click', async () => {
    const selectedSiteId = siteSelect.value;
    if (!selectedSiteId) {
        alert("Please select a site before clocking in.");
        return;
    }
    const workerRef = doc(db, 'laborers', currentWorker.id);
    await updateDoc(workerRef, { status: 'Clocked In', lastSiteId: selectedSiteId });
    await createLog('Clock In', selectedSiteId);
    currentWorker.status = 'Clocked In';
    updateStatusUI('Clocked In');
});

clockOutBtn.addEventListener('click', async () => {
    const workerRef = doc(db, 'laborers', currentWorker.id);
    // Use the last recorded siteId for clocking out
    const siteIdForClockOut = currentWorker.lastSiteId || siteSelect.value;
    await updateDoc(workerRef, { status: 'Clocked Out' });
    await createLog('Clock Out', siteIdForClockOut);
    currentWorker.status = 'Clocked Out';
    updateStatusUI('Clocked Out');
});


logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    showLogin();
});

// --- Initialization ---

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const sitesSnapshot = await getDocs(collection(db, 'sites'));
            sitesData = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // If the user is authenticated, keep them on the login page to enter credentials
            showLogin();
        } catch (error) {
            console.error("Error fetching sites:", error);
        }
    } else {
        // Sign in anonymously to secure a connection for login checks
        signInAnonymously(auth).catch(err => {
            console.error("Anonymous sign-in failed:", err);
        });
    }
});
