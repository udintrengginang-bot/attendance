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
            document.getElementById('confirm-ok-btn').addEventListener('click', () => {
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

        const renderDashboardPage = async () => {
            const page = mainContent.querySelector('#dashboard');
            if (!page) return;
            const activeWorkers = laborersData.filter(l => l.status === 'Work Started').length;
            const totalWorkers = laborersData.length;
            
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            
            const [payrollData, laborCost, expenseCost] = await Promise.all([
                calculatePayroll(startOfMonth, endOfMonth),
                calculateAllLaborCost(startOfMonth, endOfMonth),
                calculateAllExpenseCost(startOfMonth, endOfMonth)
            ]);

            const totalMonthlyPayroll = Object.values(payrollData).reduce((sum, w) => sum + w.netPayable, 0);

            page.innerHTML = `<h2 class="text-3xl font-bold text-slate-800 mb-6">Dashboard Overview</h2><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="font-medium text-slate-500">Active Workers</h3><p class="text-4xl font-bold text-slate-800 mt-2">${activeWorkers} / ${totalWorkers}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="font-medium text-slate-500">Total Sites</h3><p class="text-4xl font-bold text-slate-800 mt-2">${sitesData.length}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="font-medium text-slate-500">Payroll (This Month)</h3><p class="text-4xl font-bold text-slate-800 mt-2">${currencyFormatter.format(totalMonthlyPayroll)}</p></div>
                 <div class="bg-white p-6 rounded-xl shadow-lg md:col-span-2 lg:col-span-3"><h3 class="font-medium text-slate-500">Month-to-Date Summary</h3><div class="flex flex-wrap justify-around items-center mt-2 gap-4"><div class="text-center"><p class="text-sm text-slate-500">Total Labor Cost</p><p class="text-2xl font-bold">${currencyFormatter.format(laborCost)}</p></div><div class="text-center"><p class="text-sm text-slate-500">Total Expenses</p><p class="text-2xl font-bold">${currencyFormatter.format(expenseCost)}</p></div><div class="text-center"><p class="text-sm text-slate-500">Total Project Cost</p><p class="text-2xl font-bold text-amber-600">${currencyFormatter.format(laborCost + expenseCost)}</p></div></div></div>
            </div>`;
        };
        
        const renderSitesPage = () => {
             const page = mainContent.querySelector('#sites');
             if(!page) return;
             let tableRows = sitesData.map(site => `<tr class="border-b border-slate-200 hover:bg-slate-50"><td class="py-4 px-6 font-medium text-slate-800">${site.name}</td><td class="py-4 px-6 text-slate-600">${site.location}</td><td class="py-4 px-6 text-right"><div class="flex items-center justify-end space-x-4"><button data-action="edit-site" data-id="${site.id}" class="text-slate-500 hover:text-blue-600 action-icon" title="Edit Site"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button><button data-action="delete-site" data-id="${site.id}" class="text-slate-500 hover:text-red-600 action-icon" title="Delete Site"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button></div></td></tr>`).join('');
             page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Manage Sites</h2><button data-action="add-site" class="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Add New Site</button></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Site Name</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Location</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
        };
        
        const renderLaborersPage = () => {
            const page = mainContent.querySelector('#laborers');
            if(!page) return;
            let tableRows = laborersData.map(l => {
                const assignedSites = (l.assignedSiteIds || [])
                    .map(siteId => sitesData.find(s => s.id === siteId)?.name || 'Unknown Site')
                    .join(', ');
                const statusClass = l.status === 'Work Started' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600';

                return `<tr class="border-b border-slate-200 hover:bg-slate-50">
                    <td class="py-4 px-6 font-medium text-slate-800">${l.name}</td>
                    <td class="py-4 px-6">${assignedSites || '<span class="text-slate-400">Not Assigned</span>'}</td>
                    <td class="py-4 px-6 text-slate-600">${l.mobileNumber || 'N/A'}</td>
                    <td class="py-4 px-6"><span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">${l.status || 'Work Ended'}</span></td>
                    <td class="py-4 px-6 text-right"><div class="flex items-center justify-end space-x-2">
                        <button data-action="manage-docs" data-id="${l.id}" class="text-slate-500 hover:text-purple-600 p-2 rounded-full hover:bg-purple-100" title="Manage Documents"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg></button>
                        <button data-action="manage-finances" data-id="${l.id}" class="text-slate-500 hover:text-green-600 p-2 rounded-full hover:bg-green-100" title="Manage Finances"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.158-.103.346-.196.552-.257a.5.5 0 01.328.016.5.5 0 01.217.218c.056.1.086.215.086.324 0 .11-.03.223-.086.323-.05.101-.13.18-.217.218a.502.502 0 01-.328.017c-.206-.06-.394-.153-.552-.257A2.001 2.001 0 016.05 8.666a.5.5 0 01.707-.707 1 1 0 10-1.414-1.414.5.5 0 11-.707.707a2 2 0 012.828 0zM4 11a1 1 0 100-2 1 1 0 000 2z m11.586 2.586a.5.5 0 01.707.707 2 2 0 01-2.828 0 .5.5 0 01.707-.707 1 1 0 101.414-1.414.5.5 0 010 .707zM10 4a1 1 0 100 2 1 1 0 000-2z" /><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0 2a10 10 0 100-20 10 10 0 000 20z" clip-rule="evenodd" /></svg></button>
                        <button data-action="edit-laborer" data-id="${l.id}" class="text-slate-500 hover:text-blue-600 p-2 rounded-full hover:bg-blue-100" title="Edit Worker"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button>
                        <button data-action="delete-laborer" data-id="${l.id}" class="text-slate-500 hover:text-red-600 p-2 rounded-full hover:bg-red-100" title="Delete Worker"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button>
                    </div></td>
                </tr>`
            }).join('');
            page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Manage Workers</h2><button data-action="add-laborer" class="bg-amber-500 hover:bg-amber-600 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Add New Worker</button></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Name</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Assigned Sites</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Mobile</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Status</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
        };
        
        const renderExpensesPage = () => {
             const page = mainContent.querySelector('#expenses');
             if(!page) return;
             const sortedExpenses = [...expensesData].sort((a,b) => new Date(b.date) - new Date(a.date));
             let tableRows = sortedExpenses.map(e => `<tr class="border-b border-slate-200 hover:bg-slate-50"><td class="py-4 px-6">${e.date}</td><td class="py-4 px-6">${sitesData.find(s=>s.id===e.siteId)?.name ||'N/A'}</td><td class="py-4 px-6">${e.description}</td><td class="py-4 px-6 text-right">${currencyFormatter.format(e.amount)}</td><td class="py-4 px-6 text-right"><div class="flex items-center justify-end space-x-4"><button data-action="edit-expense" data-id="${e.id}" class="text-slate-500 hover:text-blue-600 action-icon" title="Edit Expense"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button><button data-action="delete-expense" data-id="${e.id}" class="text-slate-500 hover:text-red-600 action-icon" title="Delete Expense"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button></div></td></tr>`).join('');
             page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Track Expenses</h2><button data-action="add-expense" class="bg-amber-500 hover:bg-amber-600 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Add New Expense</button></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Date</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Site</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Description</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Amount</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
        };
        
        // --- Full implementations of other pages and modals would go here ---

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
