import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, where, getDocs, Timestamp, writeBatch, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
    document.querySelectorAll('#language-switcher .lang-btn, .lang-btn-main').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const dashboardContent = document.getElementById('dashboard-content');
    let isAppInitialized = false;

    const langSwitcherLogin = document.querySelector('#login-modal #language-switcher');
    langSwitcherLogin?.addEventListener('click', (e) => {
        const button = e.target.closest('.lang-btn');
        if (button) setLanguage(button.dataset.lang);
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
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        
        mobileMenuBtn.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
        sidebarOverlay.addEventListener('click', () => document.body.classList.remove('sidebar-open'));

        let sitesData = [], laborersData = [], expensesData = [], attendanceLogData = [], financesData = [];
        const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

        const showLoading = (element) => {
            if (element) element.innerHTML = `<div class="flex justify-center items-center p-10"><div class="loader"></div></div>`;
        };
        
        const closeModal = () => {
            const modal = document.getElementById('form-modal');
            if (modal) modal.classList.add('hidden');
        };
        
        const openModal = (content) => {
             const modal = document.getElementById('form-modal');
             if(!modal) return;
             modal.innerHTML = content;
             modal.classList.remove('hidden');
             modal.querySelector('.modal-cancel-btn')?.addEventListener('click', closeModal);
        };

        const showConfirmationModal = (message, onConfirm) => {
            const content = `
                <div class="bg-white rounded-lg shadow-xl w-full max-w-sm m-4 animate-fade-in-up">
                    <div class="p-6">
                        <h3 class="text-lg font-medium text-slate-800">Confirm Action</h3>
                        <p class="mt-2 text-slate-600">${message}</p>
                    </div>
                    <div class="flex justify-end gap-4 p-4 bg-slate-50 rounded-b-lg">
                        <button class="modal-cancel-btn px-5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 font-semibold transition-colors">Cancel</button>
                        <button id="confirm-ok-btn" class="px-5 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors">Confirm</button>
                    </div>
                </div>
            `;
            openModal(content);
            const confirmBtn = document.getElementById('confirm-ok-btn');
            confirmBtn.addEventListener('click', () => {
                onConfirm();
                closeModal();
            }, { once: true });
        };

        const openSiteModal = (site = {}) => {
            const isEditing = !!site.id;
            const content = `
                <div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
                    <div class="p-6 border-b border-slate-200"><h3 class="text-2xl font-bold text-slate-800">${isEditing ? 'Edit Site' : 'Add New Site'}</h3></div>
                    <form id="site-form" class="p-6 space-y-4">
                        <input type="hidden" id="site-id" value="${site.id || ''}">
                        <div><label for="site-name" class="font-medium text-slate-700">Site Name</label><input type="text" id="site-name" value="${site.name || ''}" class="w-full p-3 mt-1 border border-slate-300 rounded-lg" required></div>
                        <div><label for="site-location" class="font-medium text-slate-700">Location</label><input type="text" id="site-location" value="${site.location || ''}" class="w-full p-3 mt-1 border border-slate-300 rounded-lg" required></div>
                        <div class="flex justify-end gap-4 pt-4">
                            <button type="button" class="modal-cancel-btn px-5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 font-semibold transition-colors">Cancel</button>
                            <button type="submit" class="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 font-semibold transition-colors">${isEditing ? 'Update Site' : 'Save Site'}</button>
                        </div>
                    </form>
                </div>`;
            openModal(content);
            document.getElementById('site-form').addEventListener('submit', async e => {
                e.preventDefault();
                const id = document.getElementById('site-id').value;
                const data = { name: document.getElementById('site-name').value, location: document.getElementById('site-location').value };
                try {
                    if (id) { await updateDoc(doc(db, 'sites', id), data); } 
                    else { await addDoc(collection(db, 'sites'), data); }
                    closeModal();
                } catch (error) { console.error("Error saving site:", error); }
            });
        };

        const openLaborerModal = (laborer = {}) => {
            const isEditing = !!laborer.id;
            const assignedSites = laborer.assignedSiteIds || [];
            const siteCheckboxes = sitesData.map(s => `
                <div class="flex items-center">
                    <input type="checkbox" id="site-${s.id}" value="${s.id}" class="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" ${assignedSites.includes(s.id) ? 'checked' : ''}>
                    <label for="site-${s.id}" class="ml-3 text-slate-700">${s.name}</label>
                </div>
            `).join('');

            const content = `
                <div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
                    <div class="p-6 border-b"><h3 class="text-2xl font-bold">${isEditing ? 'Edit Worker' : 'Add New Worker'}</h3></div>
                    <form id="worker-form" class="p-6 space-y-4">
                        <input type="hidden" id="worker-id" value="${laborer.id || ''}">
                        <div><label for="worker-name" class="font-medium text-slate-700">Full Name</label><input type="text" id="worker-name" value="${laborer.name || ''}" class="w-full p-2 border border-slate-300 rounded" required></div>
                        <div class="space-y-2">
                            <label class="font-medium text-slate-700">Assign Sites</label>
                            <div class="p-2 border border-slate-300 rounded-md max-h-32 overflow-y-auto space-y-2">${siteCheckboxes}</div>
                        </div>
                        <div><label for="worker-mobile" class="font-medium text-slate-700">Mobile Number (10 Digits)</label><input type="tel" id="worker-mobile" value="${laborer.mobileNumber || ''}" pattern="[0-9]{10}" class="w-full p-2 border border-slate-300 rounded" required></div>
                        <div><label for="worker-pin" class="font-medium text-slate-700">4-Digit PIN</label><input type="text" id="worker-pin" value="${laborer.pin || ''}" pattern="[0-9]{4}" class="w-full p-2 border border-slate-300 rounded" required></div>
                        <div><label for="worker-rate" class="font-medium text-slate-700">Hourly Rate (₹)</label><input type="number" id="worker-rate" value="${laborer.hourlyRate || ''}" class="w-full p-2 border border-slate-300 rounded" required></div>
                        <div class="flex justify-end gap-4 pt-4">
                            <button type="button" class="modal-cancel-btn px-4 py-2 rounded bg-slate-200">Cancel</button>
                            <button type="submit" class="px-4 py-2 rounded bg-amber-500 font-semibold">${isEditing ? 'Update' : 'Save'}</button>
                        </div>
                    </form>
                </div>`;
            openModal(content);
            document.getElementById('worker-form').addEventListener('submit', async e => {
                e.preventDefault();
                const id = document.getElementById('worker-id').value;
                const assignedSiteIds = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                const data = { 
                    name: document.getElementById('worker-name').value, 
                    assignedSiteIds,
                    mobileNumber: document.getElementById('worker-mobile').value, 
                    pin: document.getElementById('worker-pin').value, 
                    hourlyRate: parseFloat(document.getElementById('worker-rate').value) 
                };
                try {
                    if (id) { await updateDoc(doc(db, 'laborers', id), data); } 
                    else { await addDoc(collection(db, 'laborers'), { ...data, status: 'Work Ended' }); }
                    closeModal();
                } catch (error) { console.error("Error saving worker:", error); }
            });
        };
        
        const openExpenseModal = (expense = {}) => {
            const isEditing = !!expense.id;
            const siteOptions = sitesData.map(s => `<option value="${s.id}" ${s.id === expense.siteId ? 'selected' : ''}>${s.name}</option>`).join('');
            const content = `
                <div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
                    <div class="p-6 border-b"><h3 class="text-2xl font-bold">${isEditing ? 'Edit Expense' : 'Add New Expense'}</h3></div>
                    <form id="expense-form" class="p-6 space-y-4">
                        <input type="hidden" id="expense-id" value="${expense.id || ''}">
                        <div><label for="expense-date" class="font-medium text-slate-700">Date</label><input type="date" id="expense-date" value="${expense.date || new Date().toISOString().split('T')[0]}" class="w-full p-2 border border-slate-300 rounded" required></div>
                        <div><label for="expense-site" class="font-medium text-slate-700">Site</label><select id="expense-site" class="w-full p-2 border border-slate-300 rounded" required><option value="">-- Select Site --</option>${siteOptions}</select></div>
                        <div><label for="expense-desc" class="font-medium text-slate-700">Description</label><input type="text" id="expense-desc" value="${expense.description || ''}" class="w-full p-2 border border-slate-300 rounded" required></div>
                        <div><label for="expense-amount" class="font-medium text-slate-700">Amount (₹)</label><input type="number" id="expense-amount" value="${expense.amount || ''}" class="w-full p-2 border border-slate-300 rounded" required></div>
                        <div class="flex justify-end gap-4 pt-4">
                            <button type="button" class="modal-cancel-btn px-4 py-2 rounded bg-slate-200">Cancel</button>
                            <button type="submit" class="px-4 py-2 rounded bg-amber-500 font-semibold">${isEditing ? 'Update' : 'Save'}</button>
                        </div>
                    </form>
                </div>`;
            openModal(content);
            document.getElementById('expense-form').addEventListener('submit', async e => {
                e.preventDefault();
                const id = document.getElementById('expense-id').value;
                const data = { 
                    date: document.getElementById('expense-date').value, 
                    siteId: document.getElementById('expense-site').value, 
                    description: document.getElementById('expense-desc').value, 
                    amount: parseFloat(document.getElementById('expense-amount').value) 
                };
                try {
                    if (id) { await updateDoc(doc(db, 'expenses', id), data); } 
                    else { await addDoc(collection(db, 'expenses'), data); }
                    closeModal();
                } catch(error) { console.error("Error saving expense:", error); }
            });
        };

        const renderDashboardPage = async () => { /* ... see above ... */ };
        const renderSitesPage = () => { /* ... see above ... */ };
        const renderLaborersPage = () => { /* ... see above ... */ };
        const renderExpensesPage = () => { /* ... see above ... */ };
        
        const renderProjectSummaryPage = async () => {
            const page = mainContent.querySelector('#summary');
            if (!page) return;
            // ... implementation
        };
        const renderDailyTasksPage = () => {
            const page = mainContent.querySelector('#tasks');
            if (!page) return;
            // ... implementation
        };
        const renderPayrollPage = async () => {
            const page = mainContent.querySelector('#payroll');
            if (!page) return;
            // ... implementation
        };
        const renderAttendanceLogPage = () => {
            const page = mainContent.querySelector('#attendance');
            if (!page) return;
            // ... implementation
        };

        const routes = {
            '#dashboard': renderDashboardPage,
            '#summary': renderProjectSummaryPage,
            '#tasks': renderDailyTasksPage,
            '#payroll': renderPayrollPage,
            '#sites': renderSitesPage,
            '#laborers': renderLaborersPage,
            '#expenses': renderExpensesPage,
            '#attendance': renderAttendanceLogPage,
        };
        
        const renderCurrentPage = () => {
            const hash = window.location.hash || '#dashboard';
            const pageId = hash.substring(1);
            mainContent.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
            const currentPageElement = document.getElementById(pageId);
            if(currentPageElement) {
                currentPageElement.classList.remove('hidden');
                const renderFunc = routes[hash];
                if (renderFunc) {
                    showLoading(currentPageElement);
                    setTimeout(() => renderFunc(), 50);
                }
            } else {
                 const dashboardPage = document.getElementById('dashboard');
                 if (dashboardPage) {
                    dashboardPage.classList.remove('hidden');
                    showLoading(dashboardPage);
                    setTimeout(() => renderDashboardPage(), 50);
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
            <section id="laborers" class="page-content hidden"></section>
            <section id="expenses" class="page-content hidden"></section>
            <section id="attendance" class="page-content hidden"></section>
            <div id="form-modal" class="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center hidden z-40 overflow-y-auto p-4"></div>
        `;
        
        window.addEventListener('hashchange', handleNavigation);
        dashboardContent.querySelector('#logout-btn').addEventListener('click', () => signOut(auth));

        mainContent.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if(!button) return;
            const { action, id } = button.dataset;
            
            if (action === 'add-site') openSiteModal();
            if (action === 'edit-site') openSiteModal(sitesData.find(s => s.id === id));
            if (action === 'delete-site') showConfirmationModal('Are you sure you want to delete this site?', () => deleteDoc(doc(db, 'sites', id)));
            
            if (action === 'add-laborer') openLaborerModal();
            if (action === 'edit-laborer') openLaborerModal(laborersData.find(l => l.id === id));
            if (action === 'delete-laborer') showConfirmationModal('Are you sure you want to delete this worker?', () => deleteDoc(doc(db, 'laborers', id)));
            
            if (action === 'add-expense') openExpenseModal();
            if (action === 'edit-expense') openExpenseModal(expensesData.find(ex => ex.id === id));
            if (action === 'delete-expense') showConfirmationModal('Are you sure you want to delete this expense?', () => deleteDoc(doc(db, 'expenses', id)));
            
            if (action === 'manage-docs') openDocumentsModal(laborersData.find(l => l.id === id));
            if (action === 'manage-finances') openFinancesModal(laborersData.find(l => l.id === id));
        });

        onSnapshot(query(collection(db, "sites")), snap => { sitesData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNavigation(); }, console.error);
        onSnapshot(query(collection(db, "laborers")), snap => { laborersData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNavigation(); }, console.error);
        onSnapshot(query(collection(db, "expenses")), snap => { expensesData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNavigation(); }, console.error);
        onSnapshot(query(collection(db, "attendance_logs")), snap => { attendanceLogData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNavigation(); }, console.error);
        onSnapshot(query(collection(db, "finances")), snap => { financesData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNavigation(); }, console.error);
        
        handleNavigation();
    }
});

