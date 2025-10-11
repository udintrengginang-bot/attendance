import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, where, getDocs, Timestamp, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
const storage = getStorage(app);

// --- TRANSLATIONS (ABBREVIATED FOR BREVITY) ---
const translations = {
    en: { admin_login: "Admin Login", placeholder_email: "Email Address", placeholder_password: "Password", login: "Login", nav_dashboard: "Dashboard", nav_summary: "Project Summary", nav_tasks: "Daily Tasks", nav_payroll: "Payroll", nav_sites: "Sites", nav_workers: "Workers", nav_expenses: "Expenses", nav_attendance: "Attendance Log", nav_worker_checkin: "Worker Check-in", logout: "Logout" },
    hi: { admin_login: "एडमिन लॉगिन", placeholder_email: "ईमेल पता", placeholder_password: "पासवर्ड", login: "लॉग इन करें", nav_dashboard: "डैशबोर्ड", nav_summary: "परियोजना सारांश", nav_tasks: "दैनिक कार्य", nav_payroll: "पेरोल", nav_sites: "साइटें", nav_workers: "कर्मचारी", nav_expenses: "व्यय", nav_attendance: "उपस्थिति लॉग", nav_worker_checkin: "कर्मचारी चेक-इन", logout: "लॉग आउट" },
    mr: { admin_login: "प्रशासक लॉगिन", placeholder_email: "ईमेल पत्ता", placeholder_password: "पासवर्ड", login: "लॉग इन करा", nav_dashboard: "डॅशबोर्ड", nav_summary: "प्रकल्प सारांश", nav_tasks: "दैनिक कार्ये", nav_payroll: "वेतनपट", nav_sites: "साइट्स", nav_workers: "कामगार", nav_expenses: "खर्च", nav_attendance: "उपस्थिती लॉग", nav_worker_checkin: "कामगार चेक-इन", logout: "लॉग आउट" }
};

let currentLanguage = localStorage.getItem('shreeved-lang') || 'en';

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('shreeved-lang', lang);
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
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const dashboardContent = document.getElementById('dashboard-content');
    let isAppInitialized = false;

    const langSwitcher = document.getElementById('language-switcher');
    langSwitcher?.addEventListener('click', (e) => {
        if (e.target.matches('.lang-btn')) setLanguage(e.target.dataset.lang);
    });
    setLanguage(currentLanguage);

    onAuthStateChanged(auth, user => {
        if (user) {
            loginModal.style.display = 'none';
            dashboardContent.style.display = 'block';
            if (!isAppInitialized) {
                initializeDashboardApp();
                isAppInitialized = true;
            }
        } else {
            loginModal.style.display = 'flex';
            dashboardContent.style.display = 'none';
            isAppInitialized = false;
        }
    });

    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        const errorEl = document.getElementById('login-error');
        signInWithEmailAndPassword(auth, email, password)
            .catch((error) => {
                console.error("Login failed:", error);
                if (errorEl) errorEl.textContent = 'Invalid email or password.';
            });
    });

    function initializeDashboardApp() {
        const mainContent = dashboardContent.querySelector('main');
        let sitesData = [], workersData = [], expensesData = [], attendanceLogData = [];
        const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

        const showLoading = (element) => {
            element.innerHTML = '<div class="flex justify-center items-center p-10"><div class="loader"></div></div>';
        };

        const renderDashboardPage = async () => {
            const page = mainContent.querySelector('#dashboard');
            if (!page) return;
            const activeWorkers = workersData.filter(l => l.status === 'Work Started').length;
            const totalWorkers = workersData.length;
            
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            const monthlyPayrollData = await calculatePayroll(startOfMonth, endOfMonth);
            const totalMonthlyPayroll = Object.values(monthlyPayrollData).reduce((sum, w) => sum + w.netPayable, 0);

            page.innerHTML = `<h2 class="text-3xl font-bold text-slate-800 mb-6">Dashboard Overview</h2><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="font-medium text-slate-500">Active Workers</h3><p class="text-4xl font-bold text-slate-800 mt-2">${activeWorkers} / ${totalWorkers}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="font-medium text-slate-500">Total Sites</h3><p class="text-4xl font-bold text-slate-800 mt-2">${sitesData.length}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="font-medium text-slate-500">Payroll (This Month)</h3><p class="text-4xl font-bold text-slate-800 mt-2">${currencyFormatter.format(totalMonthlyPayroll)}</p></div>
            </div>`;
        };

        const renderSitesPage = () => {
            const page = mainContent.querySelector('#sites');
            if(!page) return;
            let tableRows = sitesData.map(site => `...`).join(''); // Placeholder for brevity
            page.innerHTML = `...`; // Placeholder for brevity
        };
        
        // ... Other render functions would be fully implemented here ...
        const renderWorkersPage = () => {};
        const renderExpensesPage = () => {};
        const renderPayrollPage = () => {};
        const renderProjectSummaryPage = () => {};
        const renderDailyTasksPage = () => {};
        const renderAttendanceLogPage = () => {};
        
        const calculatePayroll = async (start, end) => { return {}; };
        const calculateLaborCostForSite = async (siteId, start, end) => { return 0; };
        const calculateExpenseCostForSite = (siteId, start, end) => { return 0; };
        
        const openModal = () => {};
        const closeModal = () => {};
        const openSiteModal = () => {};
        const openWorkerModal = () => {};
        const openExpenseModal = () => {};
        const openDocumentsModal = () => {};
        const openFinancesModal = () => {};
        const showConfirmationModal = () => {};


        const routes = {
            '#dashboard': renderDashboardPage,
            '#summary': renderProjectSummaryPage,
            '#tasks': renderDailyTasksPage,
            '#payroll': renderPayrollPage,
            '#sites': renderSitesPage,
            '#workers': renderWorkersPage,
            '#expenses': renderExpensesPage,
            '#attendance': renderAttendanceLogPage,
        };
        
        const renderCurrentPage = () => {
            const hash = window.location.hash || '#dashboard';
            const pageId = hash.substring(1);
            
            document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
            
            const currentPageElement = document.getElementById(pageId);
            if(currentPageElement) {
                currentPageElement.classList.remove('hidden');
                const renderFunc = routes[hash];
                if (renderFunc) {
                    showLoading(currentPageElement);
                    // Use a timeout to ensure the loading spinner is visible before heavy computation
                    setTimeout(() => renderFunc(), 0);
                }
            }
        };

        const handleNavigation = () => {
            const hash = window.location.hash || '#dashboard';
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.getAttribute('href') === hash);
            });
            renderCurrentPage();
        };

        mainContent.innerHTML = `
            <section id="dashboard" class="page-content"></section>
            <section id="summary" class="page-content hidden"></section>
            <section id="tasks" class="page-content hidden"></section>
            <section id="payroll" class="page-content hidden"></section>
            <section id="sites" class="page-content hidden"></section>
            <section id="workers" class="page-content hidden"></section>
            <section id="expenses" class="page-content hidden"></section>
            <section id="attendance" class="page-content hidden"></section>
            <div id="form-modal" class="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center hidden z-40 overflow-y-auto p-4"></div>
        `;
        
        window.addEventListener('hashchange', handleNavigation);
        dashboardContent.querySelector('#logout-btn').addEventListener('click', () => signOut(auth));

        mainContent.addEventListener('click', (e) => {
            // ... Event delegation for all buttons ...
        });

        onSnapshot(query(collection(db, "sites")), snap => {
            sitesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderCurrentPage();
        });
        onSnapshot(query(collection(db, "workers")), snap => {
            workersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderCurrentPage();
        });
        onSnapshot(query(collection(db, "expenses")), snap => {
            expensesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderCurrentPage();
        });
        onSnapshot(query(collection(db, "attendance_logs")), snap => {
            attendanceLogData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderCurrentPage();
        });
        
        handleNavigation();
    }
});
