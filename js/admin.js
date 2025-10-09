import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
    document.body.innerHTML = `<div class="h-screen w-screen flex items-center justify-center bg-zinc-100 p-4"><div class="p-8 text-center bg-red-100 text-red-800 rounded-lg shadow-md"><h1 class="text-2xl font-bold">Configuration Error</h1><p class="mt-2">Firebase is not configured. Please edit the <strong>/js/admin.js</strong> file and replace placeholder values.</p></div></div>`;
    throw new Error("Firebase config is not valid.");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const dashboardContent = document.getElementById('dashboard-content');

    onAuthStateChanged(auth, user => {
        if (user) {
            loginModal.style.display = 'none';
            dashboardContent.style.display = 'block';
            initializeDashboardApp();
        } else {
            loginModal.style.display = 'flex';
            dashboardContent.style.display = 'none';
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        signInWithEmailAndPassword(auth, email, password).catch(() => { document.getElementById('login-error').textContent = 'Invalid email or password.'; });
    });
    
    function initializeDashboardApp() {
        const mainContent = dashboardContent.querySelector('main');
        mainContent.innerHTML = `
            <section id="dashboard" class="page-content"></section>
            <section id="summary" class="page-content hidden"></section>
            <section id="tasks" class="page-content hidden"></section>
            <section id="payroll" class="page-content hidden"></section>
            <section id="sites" class="page-content hidden"></section>
            <section id="laborers" class="page-content hidden"></section>
            <section id="expenses" class="page-content hidden"></section>
            <section id="attendance" class="page-content hidden"></section>
            <div id="form-modal" class="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center hidden z-40"></div>
        `;
        document.getElementById('logout-btn').addEventListener('click', () => { signOut(auth); });

        let sitesData = [], laborersData = [], expensesData = [], attendanceLogData = [];
        const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

        // --- ALL FUNCTION DEFINITIONS (THE "COOKBOOK") ARE PLACED HERE FIRST ---

        const openSiteModal = (site = {}) => { /* ... (full site modal logic) ... */ };
        const openLaborerModal = (laborer = {}) => { /* ... (full laborer modal logic) ... */ };
        const openExpenseModal = (expense = {}) => { /* ... (full expense modal logic) ... */ };

        const renderDashboardPage = () => { /* ... (full dashboard rendering logic) ... */ };
        const renderSitesPage = () => { /* ... (full sites rendering logic) ... */ };
        const renderLaborersPage = () => { /* ... (full laborers rendering logic) ... */ };
        const renderExpensesPage = () => { /* ... (full expenses rendering logic) ... */ };
        const renderAttendanceLogPage = () => { /* ... (full attendance rendering logic) ... */ };
        const renderDailyTasksPage = () => { /* ... (full daily tasks rendering logic) ... */ };
        const renderPayrollPage = () => { /* ... (full payroll rendering logic) ... */ };
        const renderProjectSummaryPage = () => { /* ... (full project summary rendering logic) ... */ };
        
        async function calculatePayroll(startDate, endDate) { /* ... (full payroll calculation logic) ... */ }
        async function calculateLaborCostForSite(siteId, startDate, endDate) { /* ... */ }
        function calculateExpenseCostForSite(siteId, startDate, endDate) { /* ... */ }

        // --- NEW: THE ROUTER "TABLE OF CONTENTS" ---
        const routes = {
            '#dashboard': renderDashboardPage,
            '#summary': renderProjectSummaryPage,
            '#tasks': renderDailyTasksPage,
            '#payroll': renderPayrollPage,
            '#sites': renderSitesPage,
            '#laborers': renderLaborersPage,
            '#expenses': renderExpensesPage,
            '#attendance': renderAttendanceLogPage
        };

        const renderCurrentPage = () => {
            const hash = window.location.hash || '#dashboard';
            mainContent.querySelectorAll('.page-content').forEach(c => c.classList.add('hidden'));
            
            // Look up the recipe in our table of contents and run it
            const renderFunction = routes[hash];
            if (renderFunction) {
                renderFunction();
            } else {
                renderDashboardPage(); // Default to dashboard if link is broken
            }
        };
        
        const handleNavigation = () => {
            const hash = window.location.hash || '#dashboard';
            dashboardContent.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.getAttribute('href') === hash);
            });
            renderCurrentPage();
        };
        
        // --- EVENT LISTENERS AND INITIAL CALLS ---
        window.addEventListener('hashchange', handleNavigation);
        
        mainContent.addEventListener('click', e => { /* ... (full event delegation logic for edit/delete) ... */ });

        onSnapshot(query(collection(db, "sites")), s => { sitesData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });
        onSnapshot(query(collection(db, "laborers")), s => { laborersData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });
        onSnapshot(query(collection(db, "expenses")), s => { expensesData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });
        onSnapshot(query(collection(db, "attendance_logs")), s => { attendanceLogData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });

        handleNavigation();
    }
});
