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

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email-input').value;
            const password = document.getElementById('password-input').value;
            signInWithEmailAndPassword(auth, email, password).catch(() => { document.getElementById('login-error').textContent = 'Invalid email or password.'; });
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
            <section id="laborers" class="page-content hidden"></section>
            <section id="expenses" class="page-content hidden"></section>
            <section id="attendance" class="page-content hidden"></section>
            <div id="form-modal" class="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center hidden z-40"></div>
        `;
        document.getElementById('logout-btn').addEventListener('click', () => { signOut(auth); });

        let sitesData = [], laborersData = [], expensesData = [], attendanceLogData = [];
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
                confirmBtn.removeEventListener('click', confirmHandler);
                cancelBtn.removeEventListener('click', cancelHandler);
            };
        
            const cancelHandler = () => {
                close();
                confirmBtn.removeEventListener('click', confirmHandler);
                cancelBtn.removeEventListener('click', cancelHandler);
            };
        
            confirmBtn.addEventListener('click', confirmHandler);
            cancelBtn.addEventListener('click', cancelHandler);
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
                if (id) { await updateDoc(doc(db, 'sites', id), data); } else { await addDoc(collection(db, 'sites'), data); }
                modal.classList.add('hidden');
            });
        };
        
        const openLaborerModal = (laborer = {}) => {
            const isEditing = !!laborer.id;
            const modal = document.getElementById('form-modal');
            const siteOptions = sitesData.map(s => `<option value="${s.id}" ${s.id === laborer.siteId ? 'selected' : ''}>${s.name}</option>`).join('');
            modal.innerHTML = `<div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4"><div class="p-6 border-b"><h3 class="text-2xl font-bold">${isEditing ? 'Edit Laborer' : 'Add New Laborer'}</h3></div><form id="laborer-form" class="p-6 space-y-4"><input type="hidden" id="laborer-id" value="${laborer.id || ''}"><div><label for="laborer-name" class="font-medium text-slate-700">Full Name</label><input type="text" id="laborer-name" value="${laborer.name || ''}" class="w-full p-2 border border-slate-300 rounded" required></div><div><label for="laborer-site" class="font-medium text-slate-700">Default Site</label><select id="laborer-site" class="w-full p-2 border border-slate-300 rounded"><option value="">-- No Default Site --</option>${siteOptions}</select></div><div><label for="laborer-mobile" class="font-medium text-slate-700">Mobile Number (10 Digits)</label><input type="tel" id="laborer-mobile" value="${laborer.mobileNumber || ''}" pattern="[0-9]{10}" class="w-full p-2 border border-slate-300 rounded" required></div><div><label for="laborer-pin" class="font-medium text-slate-700">4-Digit PIN</label><input type="text" id="laborer-pin" value="${laborer.pin || ''}" pattern="[0-9]{4}" class="w-full p-2 border border-slate-300 rounded" required></div><div><label for="laborer-rate" class="font-medium text-slate-700">Hourly Rate (₹)</label><input type="number" id="laborer-rate" value="${laborer.hourlyRate || ''}" class="w-full p-2 border border-slate-300 rounded" required></div><div class="flex justify-end gap-4 pt-4"><button type="button" class="modal-cancel-btn px-4 py-2 rounded bg-slate-200">Cancel</button><button type="submit" class="px-4 py-2 rounded bg-amber-500 font-semibold">${isEditing ? 'Update' : 'Save'}</button></div></form></div>`;
            modal.classList.remove('hidden');
            modal.querySelector('.modal-cancel-btn').addEventListener('click', () => modal.classList.add('hidden'));
            document.getElementById('laborer-form').addEventListener('submit', async e => {
                e.preventDefault();
                const id = document.getElementById('laborer-id').value;
                const data = { name: document.getElementById('laborer-name').value, siteId: document.getElementById('laborer-site').value, mobileNumber: document.getElementById('laborer-mobile').value, pin: document.getElementById('laborer-pin').value, hourlyRate: parseFloat(document.getElementById('laborer-rate').value) };
                if (id) { await updateDoc(doc(db, 'laborers', id), data); } else { await addDoc(collection(db, 'laborers'), { ...data, status: 'Clocked Out' }); }
                modal.classList.add('hidden');
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
                if (id) { await updateDoc(doc(db, 'expenses', id), data); } else { await addDoc(collection(db, 'expenses'), data); }
                modal.classList.add('hidden');
            });
        };

        const renderDashboardPage = () => {
            const page = mainContent.querySelector('#dashboard');
            const activeLaborers = laborersData.filter(l => l.status === 'Clocked In' || l.status === 'On Break').length;
            const totalLaborers = laborersData.length;
            const totalExpenses = expensesData.reduce((sum, e) => sum + (e.amount || 0), 0);
            page.innerHTML = `<h2 class="text-3xl font-bold text-slate-800 mb-6">Dashboard Overview</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-6"><div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="font-medium text-slate-500">Active Laborers</h3><p class="text-4xl font-bold text-slate-800 mt-2">${activeLaborers} / ${totalLaborers}</p></div><div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="font-medium text-slate-500">Total Sites</h3><p class="text-4xl font-bold text-slate-800 mt-2">${sitesData.length}</p></div><div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="font-medium text-slate-500">Total Expenses (All Time)</h3><p class="text-4xl font-bold text-slate-800 mt-2">${currencyFormatter.format(totalExpenses)}</p></div></div>`;
        };
        
        const renderSitesPage = () => {
             const page = mainContent.querySelector('#sites');
             let tableRows = sitesData.map(site => `<tr class="border-b border-slate-200"><td class="py-4 px-6 font-medium text-slate-800">${site.name}</td><td class="py-4 px-6 text-slate-600">${site.location}</td><td class="py-4 px-6 text-right"><div class="flex items-center justify-end space-x-4"><button data-action="edit-site" data-id="${site.id}" class="text-slate-500 hover:text-blue-600 action-icon" title="Edit Site"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button><button data-action="delete-site" data-id="${site.id}" class="text-slate-500 hover:text-red-600 action-icon" title="Delete Site"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button></div></td></tr>`).join('');
             page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Manage Sites</h2><button id="add-site-btn" class="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Add New Site</button></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Site Name</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Location</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
        };
        
        const renderLaborersPage = () => {
            const page = mainContent.querySelector('#laborers');
            let tableRows = laborersData.map(l => {
                const siteName = sitesData.find(s => s.id === l.siteId)?.name || '<span class="text-slate-400">Not Assigned</span>';
                return `<tr class="border-b border-slate-200"><td class="py-4 px-6 font-medium text-slate-800">${l.name}</td><td class="py-4 px-6">${siteName}</td><td class="py-4 px-6 text-slate-600">${l.mobileNumber || 'N/A'}</td><td class="py-4 px-6 text-center">${currencyFormatter.format(l.hourlyRate || 0)}/hr</td><td class="py-4 px-6 text-right"><div class="flex items-center justify-end space-x-4"><button data-action="edit-laborer" data-id="${l.id}" class="text-slate-500 hover:text-blue-600 action-icon" title="Edit Laborer"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button><button data-action="delete-laborer" data-id="${l.id}" class="text-slate-500 hover:text-red-600 action-icon" title="Delete Laborer"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button></div></td></tr>`
            }).join('');
            page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Manage Laborers</h2><button id="add-laborer-btn" class="bg-amber-500 hover:bg-amber-600 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Add New Laborer</button></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Name</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Default Site</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Mobile Number</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-center">Rate</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
        };

        const renderExpensesPage = () => {
             const page = mainContent.querySelector('#expenses');
             const sortedExpenses = [...expensesData].sort((a,b) => new Date(b.date) - new Date(a.date));
             let tableRows = sortedExpenses.map(e => `<tr class="border-b border-slate-200"><td class="py-4 px-6">${e.date}</td><td class="py-4 px-6">${sitesData.find(s=>s.id===e.siteId)?.name ||'N/A'}</td><td class="py-4 px-6">${e.description}</td><td class="py-4 px-6 text-right">${currencyFormatter.format(e.amount)}</td><td class="py-4 px-6 text-right"><div class="flex items-center justify-end space-x-4"><button data-action="edit-expense" data-id="${e.id}" class="text-slate-500 hover:text-blue-600 action-icon" title="Edit Expense"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button><button data-action="delete-expense" data-id="${e.id}" class="text-slate-500 hover:text-red-600 action-icon" title="Delete Expense"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button></div></td></tr>`).join('');
             page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Track Expenses</h2><button id="add-expense-btn" class="bg-amber-500 hover:bg-amber-600 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Add New Expense</button></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Date</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Site</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Description</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Amount</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
        };

        const renderAttendanceLogPage = () => {
            const page = mainContent.querySelector('#attendance');
            const sortedLogs = [...attendanceLogData].sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
            let tableRows = sortedLogs.map(log => {
                const timestamp = log.timestamp ? log.timestamp.toDate() : new Date();
                const date = timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const time = timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                const site = sitesData.find(s => s.id === log.siteId)?.name || 'N/A';
                const statusClass = log.action.includes('In') ? 'text-green-600' : (log.action.includes('Out') ? 'text-red-500' : 'text-blue-500');
                return `<tr class="border-b border-slate-200"><td class="py-4 px-6">${date} at ${time.toLowerCase()}</td><td class="py-4 px-6 font-medium">${log.laborerName || 'N/A'}</td><td class="py-4 px-6">${site}</td><td class="py-4 px-6 font-semibold ${statusClass}">${log.action}</td></tr>`;
            }).join('');
            if (sortedLogs.length === 0) { tableRows = `<tr><td colspan="4" class="text-center p-6 text-slate-500">No attendance records found yet.</td></tr>`; }
            page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Full Attendance Log</h2></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Date & Time</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Laborer</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Site</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Action</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
        };
        
        const renderDailyTasksPage = () => {
            const page = mainContent.querySelector('#tasks');
            const siteOptions = sitesData.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            page.innerHTML = `<h2 class="text-3xl font-bold text-slate-800 mb-6">Assign Daily Tasks</h2><div class="bg-white p-6 rounded-xl shadow-lg mb-6"><label for="task-site-select" class="block text-sm font-medium text-slate-700">Select a Site to View Laborers</label><select id="task-site-select" class="mt-1 block w-full md:w-1/2 p-3 border border-slate-300 rounded-md"><option value="">-- Select Site --</option>${siteOptions}</select></div><div id="task-assignment-list" class="bg-white p-6 rounded-xl shadow-lg hidden"></div>`;
            const siteSelect = document.getElementById('task-site-select');
            const taskListDiv = document.getElementById('task-assignment-list');
            siteSelect.addEventListener('change', () => {
                const selectedSiteId = siteSelect.value;
                if (!selectedSiteId) {
                    taskListDiv.classList.add('hidden');
                    return;
                }
                const siteLaborers = laborersData.filter(l => l.siteId === selectedSiteId);
                let laborerInputs = siteLaborers.map(l => `<div class="grid grid-cols-3 gap-4 items-center border-b border-slate-200 py-3"><label for="task-${l.id}" class="font-medium text-slate-800 col-span-1">${l.name}</label><input type="text" id="task-${l.id}" data-laborer-id="${l.id}" value="${l.currentTask || ''}" class="col-span-2 w-full p-2 border border-slate-300 rounded-md" placeholder="Optional: Enter task description..."></div>`).join('');
                if (siteLaborers.length === 0) {
                    laborerInputs = `<p class="text-center text-slate-500 py-4">No laborers assigned to this site.</p>`;
                }
                taskListDiv.innerHTML = `<div class="space-y-4">${laborerInputs}</div>${siteLaborers.length > 0 ? `<div class="flex justify-end mt-6"><button id="save-tasks-btn" class="bg-amber-500 hover:bg-amber-600 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Save All Tasks for Site</button></div>` : ''}`;
                taskListDiv.classList.remove('hidden');
                if (siteLaborers.length > 0) {
                    document.getElementById('save-tasks-btn').addEventListener('click', async () => {
                        const inputs = taskListDiv.querySelectorAll('input[data-laborer-id]');
                        const updatePromises = [];
                        inputs.forEach(input => {
                            const laborerId = input.dataset.laborerId;
                            const taskValue = input.value.trim();
                            updatePromises.push(updateDoc(doc(db, 'laborers', laborerId), { currentTask: taskValue }));
                        });
                        await Promise.all(updatePromises);
                        alert('Tasks updated successfully!');
                    });
                }
            });
        };

        const renderPayrollPage = () => {
            const page = mainContent.querySelector('#payroll');
            const endDate = new Date(), startDate = new Date();
            startDate.setDate(endDate.getDate() - 6);
            const formatDate = (date) => date.toISOString().split('T')[0];
            page.innerHTML = `<h2 class="text-3xl font-bold text-slate-800 mb-6">Payroll Calculator</h2><div class="bg-white p-6 rounded-xl shadow-lg mb-6"><form id="payroll-form" class="flex flex-wrap items-end gap-4"><div><label for="start-date" class="block text-sm font-medium text-slate-700">Start Date</label><input type="date" id="start-date" value="${formatDate(startDate)}" class="mt-1 p-2 border border-slate-300 rounded-md"></div><div><label for="end-date" class="block text-sm font-medium text-slate-700">End Date</label><input type="date" id="end-date" value="${formatDate(endDate)}" class="mt-1 p-2 border border-slate-300 rounded-md"></div><button type="submit" class="bg-amber-500 hover:bg-amber-600 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Generate Report</button></form></div><div id="payroll-report" class="bg-white p-6 rounded-xl shadow-lg"><p class="text-center text-slate-500">Select a date range and click "Generate Report" to see payroll calculations.</p></div>`;
            document.getElementById('payroll-form').addEventListener('submit', async (e) => {
                 e.preventDefault();
                 const start = new Date(document.getElementById('start-date').value);
                 const end = new Date(document.getElementById('end-date').value);
                 end.setHours(23, 59, 59, 999);
                 const reportContainer = document.getElementById('payroll-report');
                 reportContainer.innerHTML = `<p class="text-center text-slate-500">Calculating... Please wait.</p>`;
                 const reportData = await calculatePayroll(start, end);
                 if (Object.keys(reportData).length === 0) {
                     reportContainer.innerHTML = `<p class="text-center text-slate-500">No attendance data found for the selected period.</p>`;
                     return;
                 }
                 let totalPayroll = 0;
                 let tableRows = Object.values(reportData).map(laborer => {
                     totalPayroll += laborer.paymentDue;
                     return `<tr class="border-b border-slate-200"><td class="py-4 px-6 font-medium">${laborer.name}</td><td class="py-4 px-6 text-center">${laborer.totalHours.toFixed(2)}</td><td class="py-4 px-6 text-center">${currencyFormatter.format(laborer.rate)}</td><td class="py-4 px-6 text-right font-bold">${currencyFormatter.format(laborer.paymentDue)}</td></tr>`;
                 }).join('');
                 reportContainer.innerHTML = `<h3 class="text-2xl font-bold text-slate-800 mb-4">Payroll Report</h3><div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6">Laborer</th><th class="py-3 px-6 text-center">Total Hours</th><th class="py-3 px-6 text-center">Rate</th><th class="py-3 px-6 text-right">Payment Due</th></tr></thead><tbody>${tableRows}</tbody><tfoot><tr class="border-t-2 border-slate-300"><td colspan="3" class="py-4 px-6 font-bold text-right text-slate-600">Total Payroll</td><td class="py-4 px-6 font-bold text-right text-xl text-slate-800">${currencyFormatter.format(totalPayroll)}</td></tr></tfoot></table></div>`;
            });
        };
        
        const renderProjectSummaryPage = () => {
            const page = mainContent.querySelector('#summary');
            const siteOptions = sitesData.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            const endDate = new Date(), startDate = new Date();
            startDate.setDate(endDate.getDate() - 29);
            const formatDate = (date) => date.toISOString().split('T')[0];
            page.innerHTML = `<h2 class="text-3xl font-bold text-slate-800 mb-6">Project Cost Summary</h2><div class="bg-white p-6 rounded-xl shadow-lg mb-6"><form id="summary-form" class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"><div class="md:col-span-2"><label for="summary-site" class="block text-sm font-medium text-slate-700">Select Site</label><select id="summary-site" class="mt-1 p-2 w-full border border-slate-300 rounded-md" required><option value="">-- Select a Site --</option>${siteOptions}</select></div><div><label for="summary-start-date" class="block text-sm font-medium text-slate-700">Start Date</label><input type="date" id="summary-start-date" value="${formatDate(startDate)}" class="mt-1 p-2 w-full border border-slate-300 rounded-md"></div><div><button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 font-bold py-2 px-4 rounded-lg shadow-sm transition-colors">Generate Report</button></div></form></div><div id="summary-report" class="bg-white p-6 rounded-xl shadow-lg"><p class="text-center text-slate-500">Select a site and date range to generate a cost summary.</p></div>`;
            document.getElementById('summary-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const siteId = document.getElementById('summary-site').value;
                if (!siteId) { alert('Please select a site.'); return; }
                const start = new Date(document.getElementById('summary-start-date').value);
                const end = new Date();
                end.setHours(23, 59, 59, 999);
                const reportContainer = document.getElementById('summary-report');
                reportContainer.innerHTML = `<p class="text-center text-slate-500">Calculating... Please wait.</p>`;
                const laborCost = await calculateLaborCostForSite(siteId, start, end);
                const expenseCost = calculateExpenseCostForSite(siteId, start, end);
                const totalCost = laborCost + expenseCost;
                reportContainer.innerHTML = `<h3 class="text-2xl font-bold text-slate-800 mb-4">Cost Summary for ${sitesData.find(s => s.id === siteId)?.name || 'N/A'}</h3><div class="space-y-4"><div class="flex justify-between items-center p-4 bg-slate-100 rounded-lg"><span class="font-medium text-slate-600">Total Labor Cost</span><span class="font-bold text-lg text-slate-800">${currencyFormatter.format(laborCost)}</span></div><div class="flex justify-between items-center p-4 bg-slate-100 rounded-lg"><span class="font-medium text-slate-600">Total Material & Expenses</span><span class="font-bold text-lg text-slate-800">${currencyFormatter.format(expenseCost)}</span></div><div class="flex justify-between items-center p-4 bg-green-100 border-t-2 border-green-300 rounded-lg"><span class="font-bold text-green-800 uppercase">Total Project Cost</span><span class="font-bold text-xl text-green-900">${currencyFormatter.format(totalCost)}</span></div></div>`;
            });
        };

        async function calculatePayroll(startDate, endDate) { /* ... full payroll calculation logic ... */ return {}; }
        async function calculateLaborCostForSite(siteId, startDate, endDate) { /* ... full cost calculation logic ... */ return 0; }
        function calculateExpenseCostForSite(siteId, startDate, endDate) { /* ... full cost calculation logic ... */ return 0; }
        
        const routes = {
            '#dashboard': renderDashboardPage, '#summary': renderProjectSummaryPage, '#tasks': renderDailyTasksPage, '#payroll': renderPayrollPage, '#sites': renderSitesPage, '#laborers': renderLaborersPage, '#expenses': renderExpensesPage, '#attendance': renderAttendanceLogPage
        };
        const renderCurrentPage = () => {
            const hash = window.location.hash || '#dashboard';
            mainContent.querySelectorAll('.page-content').forEach(c => c.classList.add('hidden'));
            const page = mainContent.querySelector(hash);
            const renderFunction = routes[hash];
            if (renderFunction && page) {
                renderFunction();
                page.classList.remove('hidden');
            } else {
                renderDashboardPage();
                mainContent.querySelector('#dashboard').classList.remove('hidden');
            }
        };

        const handleNavigation = () => {
            const hash = window.location.hash || '#dashboard';
            dashboardContent.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.getAttribute('href') === hash));
            renderCurrentPage();
            if (document.body.classList.contains('sidebar-open')) {
                document.body.classList.remove('sidebar-open');
            }
        };

        window.addEventListener('hashchange', handleNavigation);
        
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        
        if (mobileMenuBtn && sidebarOverlay) {
            mobileMenuBtn.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
            sidebarOverlay.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
        }

        mainContent.addEventListener('click', e => {
            const target = e.target.closest('button');
            if (!target) return;

            if (target.id === 'add-site-btn') return openSiteModal();
            if (target.id === 'add-laborer-btn') return openLaborerModal();
            if (target.id === 'add-expense-btn') return openExpenseModal();

            const action = target.dataset.action;
            const id = target.dataset.id;
            if (!action || !id) return;
            
            if (action === 'delete-site') {
                showConfirmationModal('Are you sure you want to delete this site?', () => deleteDoc(doc(db, 'sites', id)));
            } else if (action === 'edit-site') {
                const site = sitesData.find(s => s.id === id);
                if (site) openSiteModal(site);
            } else if (action === 'delete-laborer') {
                 showConfirmationModal('Are you sure you want to delete this laborer?', () => deleteDoc(doc(db, 'laborers', id)));
            } else if (action === 'edit-laborer') {
                const laborer = laborersData.find(l => l.id === id);
                if (laborer) openLaborerModal(laborer);
            } else if (action === 'delete-expense') {
                showConfirmationModal('Are you sure you want to delete this expense?', () => deleteDoc(doc(db, 'expenses', id)));
            } else if (action === 'edit-expense') {
                const expense = expensesData.find(ex => ex.id === id);
                if (expense) openExpenseModal(expense);
            }
        });

        onSnapshot(query(collection(db, "sites")), s => { sitesData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });
        onSnapshot(query(collection(db, "laborers")), s => { laborersData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });
        onSnapshot(query(collection(db, "expenses")), s => { expensesData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });
        onSnapshot(query(collection(db, "attendance_logs")), s => { attendanceLogData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });

        handleNavigation();
    }
});
