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
    document.body.innerHTML = `<div class="h-screen w-screen flex items-center justify-center bg-zinc-100 p-4"><div class="p-8 text-center bg-red-100 text-red-800 rounded-lg shadow-md"><h1 class="text-2xl font-bold">Configuration Error</h1><p class="mt-2">Firebase is not configured. Please edit the <strong>/js/admin.js</strong> file and replace the placeholder values.</p></div></div>`;
    throw new Error("Firebase config is not valid.");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const dashboardContent = document.getElementById('dashboard-content');
    let isAppInitialized = false;

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

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email-input').value;
            const password = document.getElementById('password-input').value;
            signInWithEmailAndPassword(auth, email, password)
                .catch(() => { 
                    const loginError = document.getElementById('login-error');
                    if(loginError) loginError.textContent = 'Invalid email or password.'; 
                });
        });
    }
    
    function initializeDashboardApp() {
        const mainContent = dashboardContent.querySelector('main');
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
        document.getElementById('logout-btn').addEventListener('click', () => { signOut(auth); });

        let sitesData = [], workersData = [], expensesData = [], attendanceLogData = [];
        const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

        const showConfirmationModal = (message, onConfirm) => {
            const modal = document.getElementById('form-modal');
            modal.innerHTML = `
                <div class="bg-white rounded-lg shadow-xl w-full max-w-sm m-4">
                    <div class="p-6">
                        <h3 class="text-lg font-medium text-slate-800">Confirm Action</h3>
                        <p class="mt-2 text-slate-600">${message}</p>
                    </div>
                    <div class="flex justify-end gap-4 p-4 bg-slate-50 rounded-b-lg">
                        <button id="confirm-cancel-btn" class="px-5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 font-semibold transition-colors">Cancel</button>
                        <button id="confirm-ok-btn" class="px-5 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors">Confirm</button>
                    </div>
                </div>
            `;
            modal.classList.remove('hidden');
        
            const close = () => modal.classList.add('hidden');
        
            const confirmBtn = document.getElementById('confirm-ok-btn');
            const cancelBtn = document.getElementById('confirm-cancel-btn');
        
            const confirmHandler = () => {
                onConfirm();
                close();
            };
        
            const cancelHandler = () => {
                close();
            };
        
            confirmBtn.addEventListener('click', confirmHandler, { once: true });
            cancelBtn.addEventListener('click', cancelHandler, { once: true });
        };

        const openSiteModal = (site = {}) => {
            const isEditing = !!site.id;
            const modal = document.getElementById('form-modal');
            modal.innerHTML = `<div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4"><div class="p-6 border-b border-slate-200"><h3 class="text-2xl font-bold text-slate-800">${isEditing ? 'Edit Site' : 'Add New Site'}</h3></div><form id="site-form" class="p-6 space-y-4"><input type="hidden" id="site-id" value="${site.id || ''}"><div><label for="site-name" class="font-medium text-slate-700">Site Name</label><input type="text" id="site-name" value="${site.name || ''}" class="w-full p-3 mt-1 border border-slate-300 rounded-lg" required></div><div><label for="site-location" class="font-medium text-slate-700">Location</label><input type="text" id="site-location" value="${site.location || ''}" class="w-full p-3 mt-1 border border-slate-300 rounded-lg" required></div><div class="flex justify-end gap-4 pt-4"><button type="button" class="modal-cancel-btn px-5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 font-semibold transition-colors">Cancel</button><button type="submit" class="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 font-semibold transition-colors">${isEditing ? 'Update Site' : 'Save Site'}</button></div></form></div>`;
            modal.classList.remove('hidden');
            modal.querySelector('.modal-cancel-btn').addEventListener('click', () => modal.classList.add('hidden'));
            document.getElementById('site-form').addEventListener('submit', async e => {
                e.preventDefault();
                const id = document.getElementById('site-id').value;
                const data = { name: document.getElementById('site-name').value, location: document.getElementById('site-location').value };
                try {
                    if (id) { await updateDoc(doc(db, 'sites', id), data); } else { await addDoc(collection(db, 'sites'), data); }
                    modal.classList.add('hidden');
                } catch (error) {
                    console.error("Error saving site:", error);
                    alert("Error saving site. Check console for details.");
                }
            });
        };
        
        const openWorkerModal = (worker = {}) => {
            const isEditing = !!worker.id;
            const modal = document.getElementById('form-modal');
            const assignedSites = worker.assignedSiteIds || [];
            const siteCheckboxes = sitesData.map(s => `
                <div class="flex items-center">
                    <input type="checkbox" id="site-${s.id}" value="${s.id}" class="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" ${assignedSites.includes(s.id) ? 'checked' : ''}>
                    <label for="site-${s.id}" class="ml-3 text-slate-700">${s.name}</label>
                </div>
            `).join('');

            modal.innerHTML = `<div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4"><div class="p-6 border-b"><h3 class="text-2xl font-bold">${isEditing ? 'Edit Worker' : 'Add New Worker'}</h3></div><form id="worker-form" class="p-6 space-y-4"><input type="hidden" id="worker-id" value="${worker.id || ''}"><div><label for="worker-name" class="font-medium text-slate-700">Full Name</label><input type="text" id="worker-name" value="${worker.name || ''}" class="w-full p-2 border border-slate-300 rounded" required></div><div class="space-y-2">
            <label class="font-medium text-slate-700">Assign Sites</label>
            <div class="p-2 border border-slate-300 rounded-md max-h-32 overflow-y-auto space-y-2">${siteCheckboxes}</div>
            </div><div><label for="worker-mobile" class="font-medium text-slate-700">Mobile Number (10 Digits)</label><input type="tel" id="worker-mobile" value="${worker.mobileNumber || ''}" pattern="[0-9]{10}" class="w-full p-2 border border-slate-300 rounded" required></div><div><label for="worker-pin" class="font-medium text-slate-700">4-Digit PIN</label><input type="text" id="worker-pin" value="${worker.pin || ''}" pattern="[0-9]{4}" class="w-full p-2 border border-slate-300 rounded" required></div><div><label for="worker-rate" class="font-medium text-slate-700">Hourly Rate (₹)</label><input type="number" id="worker-rate" value="${worker.hourlyRate || ''}" class="w-full p-2 border border-slate-300 rounded" required></div><div class="flex justify-end gap-4 pt-4"><button type="button" class="modal-cancel-btn px-4 py-2 rounded bg-slate-200">Cancel</button><button type="submit" class="px-4 py-2 rounded bg-amber-500 font-semibold">${isEditing ? 'Update' : 'Save'}</button></div></form></div>`;
            modal.classList.remove('hidden');
            modal.querySelector('.modal-cancel-btn').addEventListener('click', () => modal.classList.add('hidden'));
            document.getElementById('worker-form').addEventListener('submit', async e => {
                e.preventDefault();
                const id = document.getElementById('worker-id').value;
                const assignedSiteIds = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                const data = { 
                    name: document.getElementById('worker-name').value, 
                    assignedSiteIds,
                    mobileNumber: document.getElementById('worker-mobile').value, 
                    pin: document.getElementById('worker-pin').value, 
                    hourlyRate: parseFloat(document.getElementById('worker-rate').value) 
                };
                try {
                    if (id) { await updateDoc(doc(db, 'laborers', id), data); } else { await addDoc(collection(db, 'laborers'), { ...data, status: 'Clocked Out' }); }
                    modal.classList.add('hidden');
                } catch (error) {
                    console.error("Error saving worker:", error);
                    alert("Error saving worker. Check console for details.");
                }
            });
        };
        
        const openExpenseModal = (expense = {}) => {
            const isEditing = !!expense.id;
            const modal = document.getElementById('form-modal');
            const siteOptions = sitesData.map(s => `<option value="${s.id}" ${s.id === expense.siteId ? 'selected' : ''}>${s.name}</option>`).join('');
            modal.innerHTML = `<div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4"><div class="p-6 border-b"><h3 class="text-2xl font-bold">${isEditing ? 'Edit Expense' : 'Add New Expense'}</h3></div><form id="expense-form" class="p-6 space-y-4"><input type="hidden" id="expense-id" value="${expense.id || ''}"><div><label for="expense-date" class="font-medium text-slate-700">Date</label><input type="date" id="expense-date" value="${expense.date || new Date().toISOString().split('T')[0]}" class="w-full p-2 border border-slate-300 rounded" required></div><div><label for="expense-site" class="font-medium text-slate-700">Site</label><select id="expense-site" class="w-full p-2 border border-slate-300 rounded" required><option value="">-- Select Site --</option>${siteOptions}</select></div><div><label for="expense-desc" class="font-medium text-slate-700">Description</label><input type="text" id="expense-desc" value="${expense.description || ''}" class="w-full p-2 border border-slate-300 rounded" required></div><div><label for="expense-amount" class="font-medium text-slate-700">Amount (₹)</label><input type="number" id="expense-amount" value="${expense.amount || ''}" class="w-full p-2 border border-slate-300 rounded" required></div><div class="flex justify-end gap-4 pt-4"><button type="button" class="modal-cancel-btn px-4 py-2 rounded bg-slate-200">Cancel</button><button type="submit" class="px-4 py-2 rounded bg-amber-500 font-semibold">${isEditing ? 'Update' : 'Save'}</button></div></form></div>`;
            modal.classList.remove('hidden');
            modal.querySelector('.modal-cancel-btn').addEventListener('click', () => modal.classList.add('hidden'));
            document.getElementById('expense-form').addEventListener('submit', async e => {
                e.preventDefault();
                const id = document.getElementById('expense-id').value;
                const data = { date: document.getElementById('expense-date').value, siteId: document.getElementById('expense-site').value, description: document.getElementById('expense-desc').value, amount: parseFloat(document.getElementById('expense-amount').value) };
                try {
                    if (id) { await updateDoc(doc(db, 'expenses', id), data); } else { await addDoc(collection(db, 'expenses'), data); }
                    modal.classList.add('hidden');
                } catch(error) {
                    console.error("Error saving expense:", error);
                    alert("Error saving expense. Check console for details.");
                }
            });
        };

        const renderDashboardPage = async () => {
            const page = mainContent.querySelector('#dashboard');
            page.innerHTML = `<div class="text-center p-10"><p class="text-slate-500">Loading dashboard...</p></div>`; // Loading state
            const activeWorkers = workersData.filter(l => l.status === 'Clocked In').length;
            const totalWorkers = workersData.length;
            
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            const monthlyPayroll = await calculatePayroll(startOfMonth, endOfMonth);
            const totalMonthlyPayroll = Object.values(monthlyPayroll).reduce((sum, w) => sum + w.paymentDue, 0);

            page.innerHTML = `<h2 class="text-3xl font-bold text-slate-800 mb-6">Dashboard Overview</h2><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="font-medium text-slate-500">Active Workers</h3><p class="text-4xl font-bold text-slate-800 mt-2">${activeWorkers} / ${totalWorkers}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="font-medium text-slate-500">Total Sites</h3><p class="text-4xl font-bold text-slate-800 mt-2">${sitesData.length}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="font-medium text-slate-500">Payroll (This Month)</h3><p class="text-4xl font-bold text-slate-800 mt-2">${currencyFormatter.format(totalMonthlyPayroll)}</p></div>
            </div>`;
        };
        
        const renderSitesPage = () => {
             const page = mainContent.querySelector('#sites');
             let tableRows = sitesData.map(site => `<tr class="border-b border-slate-200"><td class="py-4 px-6 font-medium text-slate-800">${site.name}</td><td class="py-4 px-6 text-slate-600">${site.location}</td><td class="py-4 px-6 text-right"><div class="flex items-center justify-end space-x-4"><button data-action="edit-site" data-id="${site.id}" class="text-slate-500 hover:text-blue-600 action-icon" title="Edit Site"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button><button data-action="delete-site" data-id="${site.id}" class="text-slate-500 hover:text-red-600 action-icon" title="Delete Site"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button></div></td></tr>`).join('');
             page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Manage Sites</h2><button id="add-site-btn" class="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Add New Site</button></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Site Name</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Location</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
        };
        
        const renderWorkersPage = () => {
            const page = mainContent.querySelector('#workers');
            let tableRows = workersData.map(l => {
                const assignedSites = (l.assignedSiteIds || [])
                    .map(siteId => sitesData.find(s => s.id === siteId)?.name || 'Unknown Site')
                    .join(', ');
                return `<tr class="border-b border-slate-200"><td class="py-4 px-6 font-medium text-slate-800">${l.name}</td><td class="py-4 px-6">${assignedSites || '<span class="text-slate-400">Not Assigned</span>'}</td><td class="py-4 px-6 text-slate-600">${l.mobileNumber || 'N/A'}</td><td class="py-4 px-6 text-center">${currencyFormatter.format(l.hourlyRate || 0)}/hr</td><td class="py-4 px-6 text-right"><div class="flex items-center justify-end space-x-4"><button data-action="edit-worker" data-id="${l.id}" class="text-slate-500 hover:text-blue-600 action-icon" title="Edit Worker"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button><button data-action="delete-worker" data-id="${l.id}" class="text-slate-500 hover:text-red-600 action-icon" title="Delete Worker"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button></div></td></tr>`
            }).join('');
            page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Manage Workers</h2><button id="add-worker-btn" class="bg-amber-500 hover:bg-amber-600 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Add New Worker</button></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Name</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Assigned Sites</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Mobile Number</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-center">Hourly Rate</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
        };

        const renderExpensesPage = () => {
             const page = mainContent.querySelector('#expenses');
             const sortedExpenses = [...expensesData].sort((a,b) => new Date(b.date) - new Date(a.date));
             let tableRows = sortedExpenses.map(e => `<tr class="border-b border-slate-200"><td class="py-4 px-6">${e.date}</td><td class="py-4 px-6">${sitesData.find(s=>s.id===e.siteId)?.name ||'N/A'}</td><td class="py-4 px-6">${e.description}</td><td class="py-4 px-6 text-right">${currencyFormatter.format(e.amount)}</td><td class="py-4 px-6 text-right"><div class="flex items-center justify-end space-x-4"><button data-action="edit-expense" data-id="${e.id}" class="text-slate-500 hover:text-blue-600 action-icon" title="Edit Expense"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button><button data-action="delete-expense" data-id="${e.id}" class="text-slate-500 hover:text-red-600 action-icon" title="Delete Expense"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button></div></td></tr>`).join('');
             page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Track Expenses</h2><button id="add-expense-btn" class="bg-amber-500 hover:bg-amber-600 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Add New Expense</button></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Date</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Site</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Description</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Amount</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
        };

        const renderAttendanceLogPage = () => {
            const page = mainContent.querySelector('#attendance');
            const sortedLogs = [...attendanceLogData].sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
            let tableRows = sortedLogs.map(log => {
                const timestamp = log.timestamp ? log.timestamp.toDate() : new Date();
                const date = timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const time = timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                const site = sitesData.find(s => s.id === log.siteId)?.name || 'N/A';
                const statusClass = log.action.includes('In') ? 'text-green-600' : 'text-red-500';
                return `<tr class="border-b border-slate-200"><td class="py-4 px-6">${date} at ${time.toLowerCase()}</td><td class="py-4 px-6 font-medium">${log.laborerName || 'N/A'}</td><td class="py-4 px-6">${site}</td><td class="py-4 px-6 font-semibold ${statusClass}">${log.action}</td></tr>`;
            }).join('');
            if (sortedLogs.length === 0) { tableRows = `<tr><td colspan="4" class="text-center p-6 text-slate-500">No attendance records found yet.</td></tr>`; }
            page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Full Attendance Log</h2></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Date & Time</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Worker</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Site</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Action</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
        };
        
        const renderDailyTasksPage = () => {
            const page = mainContent.querySelector('#tasks');
            const siteOptions = sitesData.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            page.innerHTML = `
                <h2 class="text-3xl font-bold text-slate-800 mb-6">Assign Daily Tasks</h2>
                <div class="bg-white p-6 rounded-xl shadow-lg mb-6">
                    <label for="task-site-select" class="block text-sm font-medium text-slate-700">1. Select a Site</label>
                    <select id="task-site-select" class="mt-1 block w-full md:w-1/2 p-3 border border-slate-300 rounded-md">
                        <option value="">-- Select Site --</option>
                        ${siteOptions}
                    </select>
                </div>
                <div id="task-assignment-container" class="hidden">
                    <h3 class="text-2xl font-bold text-slate-800 mb-4">2. Enter Tasks for Workers</h3>
                    <div id="task-assignment-list" class="space-y-4"></div>
                </div>
            `;
        
            const siteSelect = document.getElementById('task-site-select');
            const taskListContainer = document.getElementById('task-assignment-container');
            const taskListDiv = document.getElementById('task-assignment-list');
        
            siteSelect.addEventListener('change', () => {
                const selectedSiteId = siteSelect.value;
                taskListDiv.innerHTML = ''; 
        
                if (!selectedSiteId) {
                    taskListContainer.classList.add('hidden');
                    return;
                }
        
                const siteWorkers = workersData.filter(l => l.assignedSiteIds && l.assignedSiteIds.includes(selectedSiteId));
                
                if (siteWorkers.length === 0) {
                    taskListDiv.innerHTML = `<div class="bg-white p-6 rounded-xl shadow-lg"><p class="text-center text-slate-500 py-4">No workers are assigned to this site.</p></div>`;
                } else {
                    siteWorkers.forEach(l => {
                        const card = document.createElement('div');
                        card.className = 'bg-white p-4 rounded-xl shadow-lg grid grid-cols-1 md:grid-cols-4 gap-4 items-center';
                        card.innerHTML = `
                            <label for="task-${l.id}" class="font-bold text-slate-800 md:col-span-1">${l.name}</label>
                            <input type="text" id="task-${l.id}" data-worker-id="${l.id}" value="${l.currentTask || ''}" class="md:col-span-2 w-full p-2 border border-slate-300 rounded-md" placeholder="Enter task description...">
                            <button data-action="save-task" data-worker-id="${l.id}" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors justify-self-end w-full md:w-auto">Save</button>
                        `;
                        taskListDiv.appendChild(card);
                    });

                    const saveAllContainer = document.createElement('div');
                    saveAllContainer.className = 'flex justify-end mt-6 pt-4 border-t border-slate-200';
                    saveAllContainer.innerHTML = `<button id="save-all-tasks-btn" class="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Save All Tasks for Site</button>`;
                    taskListDiv.appendChild(saveAllContainer);
                }
                
                taskListContainer.classList.remove('hidden');
            });
        };

        const renderPayrollPage = () => {
            const page = mainContent.querySelector('#payroll');
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();

            const monthOptions = Array.from({length: 12}, (_, i) => {
                const d = new Date(year, i, 1);
                return `<option value="${i}" ${i === month ? 'selected' : ''}>${d.toLocaleString('default', { month: 'long' })}</option>`;
            }).join('');
            
            const yearOptions = Array.from({length: 5}, (_, i) => {
                const y = year - i;
                return `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`;
            }).join('');

            page.innerHTML = `<h2 class="text-3xl font-bold text-slate-800 mb-6">Payroll Calculator</h2><div class="bg-white p-6 rounded-xl shadow-lg mb-6"><form id="payroll-form" class="flex flex-wrap items-end gap-4"><div class="flex-1 min-w-[150px]"><label for="month-select" class="block text-sm font-medium text-slate-700">Month</label><select id="month-select" class="mt-1 p-2 w-full border border-slate-300 rounded-md">${monthOptions}</select></div><div class="flex-1 min-w-[120px]"><label for="year-select" class="block text-sm font-medium text-slate-700">Year</label><select id="year-select" class="mt-1 p-2 w-full border border-slate-300 rounded-md">${yearOptions}</select></div><button type="submit" class="bg-amber-500 hover:bg-amber-600 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Generate Report</button></form></div><div id="payroll-report" class="bg-white p-6 rounded-xl shadow-lg"><p class="text-center text-slate-500">Select a month and year to generate a payroll report.</p></div>`;
            
            const payrollForm = document.getElementById('payroll-form');
            payrollForm.addEventListener('submit', async (e) => {
                 e.preventDefault();
                 const selectedMonth = parseInt(document.getElementById('month-select').value, 10);
                 const selectedYear = parseInt(document.getElementById('year-select').value, 10);

                 const start = new Date(selectedYear, selectedMonth, 1);
                 const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
                 
                 const reportContainer = document.getElementById('payroll-report');
                 reportContainer.innerHTML = `<p class="text-center text-slate-500">Calculating... Please wait.</p>`;
                 const reportData = await calculatePayroll(start, end);

                 if (Object.keys(reportData).length === 0) {
                     reportContainer.innerHTML = `<p class="text-center text-slate-500">No attendance data found for the selected period.</p>`;
                     return;
                 }

                 let totalPayroll = 0;
                 let tableRows = Object.values(reportData).sort((a,b) => a.name.localeCompare(b.name)).map(worker => {
                     totalPayroll += worker.paymentDue;
                     return `<tr class="border-b border-slate-200"><td class="py-4 px-6 font-medium">${worker.name}</td><td class="py-4 px-6 text-center">${worker.totalHours.toFixed(2)}</td><td class="py-4 px-6 text-center">${currencyFormatter.format(worker.rate)}</td><td class="py-4 px-6 text-right font-bold">${currencyFormatter.format(worker.paymentDue)}</td></tr>`;
                 }).join('');

                 reportContainer.innerHTML = `<h3 class="text-2xl font-bold text-slate-800 mb-4">Payroll Report for ${start.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3><div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6">Worker</th><th class="py-3 px-6 text-center">Total Hours</th><th class="py-3 px-6 text-center">Hourly Rate</th><th class="py-3 px-6 text-right">Payment Due</th></tr></thead><tbody>${tableRows}</tbody><tfoot><tr class="border-t-2 border-slate-300"><td colspan="3" class="py-4 px-6 font-bold text-right text-slate-600">Total Payroll for Month</td><td class="py-4 px-6 font-bold text-right text-xl text-slate-800">${currencyFormatter.format(totalPayroll)}</td></tr></tfoot></table></div>`;
            });
            payrollForm.dispatchEvent(new Event('submit')); // Auto-generate for current month
        };
        
        const renderProjectSummaryPage = () => {
            const page = mainContent.querySelector('#summary');
            page.innerHTML = `<div>Project Summary Page - Not Implemented</div>`;
        };

        async function calculatePayroll(startDate, endDate) {
            const q = query(collection(db, "attendance_logs"), where("timestamp", ">=", startDate), where("timestamp", "<=", endDate));
            const logsSnapshot = await getDocs(q);
            const logs = logsSnapshot.docs.map(d => ({ ...d.data(), timestamp: d.data().timestamp.toDate() })).sort((a, b) => a.timestamp - b.timestamp);
        
            const payrollData = {};
        
            for (const worker of workersData) {
                const workerLogs = logs.filter(log => log.laborerId === worker.id);
                if (workerLogs.length === 0) continue;
        
                let totalHours = 0;
                let clockInTime = null;
        
                workerLogs.forEach(log => {
                    if (log.action === 'Clock In' && !clockInTime) {
                        clockInTime = log.timestamp;
                    } else if (log.action === 'Clock Out' && clockInTime) {
                        const hoursWorked = (log.timestamp - clockInTime) / (1000 * 60 * 60);
                        totalHours += hoursWorked;
                        clockInTime = null;
                    }
                });
        
                if (clockInTime) { // If worker is still clocked in
                     const hoursWorked = (new Date() - clockInTime) / (1000 * 60 * 60);
                     totalHours += Math.min(hoursWorked, 24); // Cap at 24 hours for safety
                }
        
                payrollData[worker.id] = {
                    name: worker.name,
                    rate: worker.hourlyRate,
                    totalHours: totalHours,
                    paymentDue: totalHours * worker.hourlyRate
                };
            }
            return payrollData;
        }
        
        // --- ROUTER & NAVIGATION ---
        const routes = {
            '#dashboard': renderDashboardPage, '#summary': renderProjectSummaryPage, '#tasks': renderDailyTasksPage, '#payroll': renderPayrollPage, '#sites': renderSitesPage, '#workers': renderWorkersPage, '#expenses': renderExpensesPage, '#attendance': renderAttendanceLogPage
        };

        const renderCurrentPage = (hash) => {
            mainContent.querySelectorAll('.page-content').forEach(c => c.classList.add('hidden'));
            const renderFunction = routes[hash];
            const targetPage = mainContent.querySelector(hash.split('?')[0]);
            
            if(targetPage) targetPage.classList.remove('hidden');

            if (renderFunction) {
                renderFunction();
            } else {
                mainContent.querySelector('#dashboard').classList.remove('hidden');
                routes['#dashboard']();
            }
             dashboardContent.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.getAttribute('href') === hash));
        };

        const handleNavigation = () => {
            renderCurrentPage(window.location.hash || '#dashboard');
        };

        // --- GLOBAL EVENT LISTENER ---
        mainContent.addEventListener('click', async e => {
            const target = e.target.closest('button');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id || target.dataset.workerId;
            
            switch (action) {
                case 'edit-site': {
                    const site = sitesData.find(s => s.id === id);
                    if(site) openSiteModal(site);
                    break;
                }
                case 'delete-site': {
                     showConfirmationModal('Are you sure you want to delete this site?', async () => {
                        await deleteDoc(doc(db, "sites", id));
                     });
                    break;
                }
                case 'edit-worker': {
                    const worker = workersData.find(w => w.id === id);
                    if(worker) openWorkerModal(worker);
                    break;
                }
                case 'delete-worker': {
                     showConfirmationModal('Are you sure you want to delete this worker?', async () => {
                        await deleteDoc(doc(db, "laborers", id));
                     });
                    break;
                }
                 case 'edit-expense': {
                    const expense = expensesData.find(ex => ex.id === id);
                    if(expense) openExpenseModal(expense);
                    break;
                }
                case 'delete-expense': {
                     showConfirmationModal('Are you sure you want to delete this expense?', async () => {
                        await deleteDoc(doc(db, "expenses", id));
                     });
                    break;
                }
                case 'save-task': {
                    const input = mainContent.querySelector(`input[data-worker-id="${id}"]`);
                    if (!input) return;
                    
                    target.disabled = true;
                    target.textContent = 'Saving...';
                    
                    try {
                        await updateDoc(doc(db, 'laborers', id), { currentTask: input.value.trim() });
                        target.textContent = 'Saved!';
                        target.classList.remove('bg-blue-500', 'hover:bg-blue-600');
                        target.classList.add('bg-green-500');
                    } catch (error) {
                        console.error("Error saving task:", error);
                        target.textContent = 'Error!';
                        target.classList.add('bg-red-500');
                    } finally {
                        setTimeout(() => {
                            target.textContent = 'Save';
                            target.classList.remove('bg-green-500', 'bg-red-500');
                            target.classList.add('bg-blue-500', 'hover:bg-blue-600');
                            target.disabled = false;
                        }, 2000);
                    }
                    break;
                }
            }
        });

        // --- BUTTONS OUTSIDE MAINCONTENT ---
        dashboardContent.addEventListener('click', e => {
            if (e.target.id === 'add-site-btn') return openSiteModal();
            if (e.target.id === 'add-worker-btn') return openWorkerModal();
            if (e.target.id === 'add-expense-btn') return openExpenseModal();

            if (e.target.id === 'save-all-tasks-btn') {
                 const inputs = mainContent.querySelectorAll('#task-assignment-list input[data-worker-id]');
                if (inputs.length === 0) return;

                const saveAllBtn = e.target;
                saveAllBtn.disabled = true;
                saveAllBtn.textContent = 'Saving All...';

                const updatePromises = [];
                inputs.forEach(input => {
                    const workerId = input.dataset.workerId;
                    const taskValue = input.value.trim();
                    updatePromises.push(updateDoc(doc(db, 'laborers', workerId), { currentTask: taskValue }));
                });

                Promise.all(updatePromises).then(() => {
                    saveAllBtn.textContent = 'All Saved!';
                    saveAllBtn.classList.remove('bg-amber-500');
                    saveAllBtn.classList.add('bg-green-500', 'text-white');
                }).catch(error => {
                    console.error("Error saving all tasks:", error);
                    saveAllBtn.textContent = 'Error!';
                    saveAllBtn.classList.add('bg-red-500', 'text-white');
                }).finally(() => {
                     setTimeout(() => {
                        saveAllBtn.textContent = 'Save All Tasks for Site';
                        saveAllBtn.classList.remove('bg-green-500', 'bg-red-500', 'text-white');
                        saveAllBtn.classList.add('bg-amber-500');
                        saveAllBtn.disabled = false;
                    }, 2000);
                });
            }
        });

        // --- MOBILE NAVIGATION ---
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const closeSidebar = () => document.body.classList.remove('sidebar-open');
        
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.body.classList.toggle('sidebar-open');
        });
        overlay.addEventListener('click', closeSidebar);
        sidebar.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                closeSidebar();
            }
        });

        // --- DATA SUBSCRIPTIONS ---
        const refreshPage = () => handleNavigation();
        onSnapshot(query(collection(db, "sites")), s => { sitesData = s.docs.map(d => ({id:d.id, ...d.data()})); refreshPage(); });
        onSnapshot(query(collection(db, "laborers")), s => { workersData = s.docs.map(d => ({id:d.id, ...d.data()})); refreshPage(); });
        onSnapshot(query(collection(db, "expenses")), s => { expensesData = s.docs.map(d => ({id:d.id, ...d.data()})); refreshPage(); });
        onSnapshot(query(collection(db, "attendance_logs")), s => { attendanceLogData = s.docs.map(d => ({id:d.id, ...d.data()})); refreshPage(); });

        window.addEventListener('hashchange', handleNavigation);
        handleNavigation(); // Initial page load
    }
});

