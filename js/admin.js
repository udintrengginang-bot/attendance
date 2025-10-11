import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, where, getDocs, Timestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
    en: { admin_login: "Admin Login", placeholder_email: "Email", placeholder_password: "Password", login: "Login" },
    hi: { admin_login: "प्रशासक लॉगिन", placeholder_email: "ईमेल", placeholder_password: "पासवर्ड", login: "लॉग इन" },
    mr: { admin_login: "प्रशासक लॉगिन", placeholder_email: "ईमेल", placeholder_password: "पासवर्ड", login: "लॉग इन" }
};

let currentLanguage = localStorage.getItem('shreeved-lang') || 'en';
let sitesData = [], laborersData = [], expensesData = [], attendanceLogData = [], financesData = [];
const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('shreeved-lang', lang);
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
}

const showLoading = (el) => el && (el.innerHTML = `<div class="flex justify-center p-10"><div class="loader"></div></div>`);
const closeModal = () => document.getElementById('form-modal')?.classList.add('hidden');
const openModal = (content) => {
    const modal = document.getElementById('form-modal');
    if (!modal) return;
    modal.innerHTML = content;
    modal.classList.remove('hidden');
    modal.querySelector('.modal-cancel-btn')?.addEventListener('click', closeModal);
};

const showConfirm = (msg, onConfirm) => {
    openModal(`<div class="bg-white rounded-lg shadow-xl max-w-sm m-4 p-6">
        <h3 class="text-lg font-bold mb-4">Confirm</h3>
        <p class="mb-6">${msg}</p>
        <div class="flex gap-3 justify-end">
            <button class="modal-cancel-btn px-4 py-2 bg-slate-200 rounded-lg">Cancel</button>
            <button id="confirm-btn" class="px-4 py-2 bg-red-500 text-white rounded-lg">Confirm</button>
        </div>
    </div>`);
    document.getElementById('confirm-btn').addEventListener('click', () => { onConfirm(); closeModal(); }, { once: true });
};

const calculateHours = (logs) => {
    let total = 0, start = null;
    logs.forEach(log => {
        if (log.action === 'Work Started') start = log.timestamp.toDate();
        else if (log.action === 'Work Ended' && start) {
            total += (log.timestamp.toDate() - start) / 3600000;
            start = null;
        }
    });
    return total;
};

const calculatePayroll = async (startDate, endDate) => {
    const payroll = {};
    for (const laborer of laborersData) {
        const logsQuery = query(collection(db, 'attendance_logs'),
            where('laborerId', '==', laborer.id),
            where('timestamp', '>=', Timestamp.fromDate(startDate)),
            where('timestamp', '<=', Timestamp.fromDate(endDate)),
            orderBy('timestamp', 'asc'));
        const logs = (await getDocs(logsQuery)).docs.map(d => ({ ...d.data() }));
        const hours = calculateHours(logs);
        const gross = hours * (laborer.hourlyRate || 0);
        const finances = financesData.filter(f => f.laborerId === laborer.id && new Date(f.date) >= startDate && new Date(f.date) <= endDate);
        const advances = finances.filter(f => f.type === 'advance').reduce((s, f) => s + f.amount, 0);
        const deductions = finances.filter(f => f.type === 'deduction').reduce((s, f) => s + f.amount, 0);
        payroll[laborer.id] = { name: laborer.name, hours: hours.toFixed(1), rate: laborer.hourlyRate || 0, gross, advances, deductions, net: gross - advances - deductions };
    }
    return payroll;
};

const openSiteModal = (site = {}) => {
    const isEdit = !!site.id;
    openModal(`<div class="bg-white rounded-xl shadow-xl max-w-md m-4 p-6">
        <h3 class="text-2xl font-bold mb-6">${isEdit ? 'Edit' : 'Add'} Site</h3>
        <form id="site-form" class="space-y-4">
            <input type="hidden" id="site-id" value="${site.id || ''}">
            <div><label class="block font-semibold mb-2">Site Name</label>
                <input type="text" id="site-name" value="${site.name || ''}" class="w-full p-3 border rounded-lg" required></div>
            <div><label class="block font-semibold mb-2">Location</label>
                <input type="text" id="site-location" value="${site.location || ''}" class="w-full p-3 border rounded-lg" required></div>
            <div class="flex gap-3 justify-end pt-4">
                <button type="button" class="modal-cancel-btn px-6 py-2 bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" class="px-6 py-2 bg-amber-500 text-white rounded-lg font-semibold">Save</button>
            </div>
        </form>
    </div>`);
    document.getElementById('site-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('site-id').value;
        const data = { name: document.getElementById('site-name').value, location: document.getElementById('site-location').value };
        try {
            id ? await updateDoc(doc(db, 'sites', id), data) : await addDoc(collection(db, 'sites'), data);
            closeModal();
        } catch (err) { alert('Error: ' + err.message); }
    });
};

const openWorkerModal = (worker = {}) => {
    const isEdit = !!worker.id;
    const siteChecks = sitesData.map(s => `<label class="flex items-center gap-2">
        <input type="checkbox" value="${s.id}" ${(worker.assignedSiteIds || []).includes(s.id) ? 'checked' : ''} class="site-check">
        <span>${s.name}</span></label>`).join('');
    openModal(`<div class="bg-white rounded-xl shadow-xl max-w-md m-4 p-6">
        <h3 class="text-2xl font-bold mb-6">${isEdit ? 'Edit' : 'Add'} Worker</h3>
        <form id="worker-form" class="space-y-4">
            <input type="hidden" id="worker-id" value="${worker.id || ''}">
            <div><label class="block font-semibold mb-2">Name</label>
                <input type="text" id="worker-name" value="${worker.name || ''}" class="w-full p-3 border rounded-lg" required></div>
            <div><label class="block font-semibold mb-2">Mobile (10 digits)</label>
                <input type="tel" id="worker-mobile" value="${worker.mobileNumber || ''}" pattern="[0-9]{10}" class="w-full p-3 border rounded-lg" required></div>
            <div><label class="block font-semibold mb-2">PIN (4 digits)</label>
                <input type="text" id="worker-pin" value="${worker.pin || ''}" pattern="[0-9]{4}" class="w-full p-3 border rounded-lg" required></div>
            <div><label class="block font-semibold mb-2">Hourly Rate (₹)</label>
                <input type="number" id="worker-rate" value="${worker.hourlyRate || ''}" class="w-full p-3 border rounded-lg" required></div>
            <div><label class="block font-semibold mb-2">Assign Sites</label>
                <div class="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">${siteChecks || '<p class="text-slate-500">No sites available</p>'}</div></div>
            <div class="flex gap-3 justify-end pt-4">
                <button type="button" class="modal-cancel-btn px-6 py-2 bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" class="px-6 py-2 bg-amber-500 text-white rounded-lg font-semibold">Save</button>
            </div>
        </form>
    </div>`);
    document.getElementById('worker-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('worker-id').value;
        const data = {
            name: document.getElementById('worker-name').value,
            mobileNumber: document.getElementById('worker-mobile').value,
            pin: document.getElementById('worker-pin').value,
            hourlyRate: parseFloat(document.getElementById('worker-rate').value),
            assignedSiteIds: Array.from(document.querySelectorAll('.site-check:checked')).map(cb => cb.value)
        };
        try {
            id ? await updateDoc(doc(db, 'laborers', id), data) : await addDoc(collection(db, 'laborers'), { ...data, status: 'Work Ended' });
            closeModal();
        } catch (err) { alert('Error: ' + err.message); }
    });
};

const openExpenseModal = (expense = {}) => {
    const isEdit = !!expense.id;
    const siteOpts = sitesData.map(s => `<option value="${s.id}" ${s.id === expense.siteId ? 'selected' : ''}>${s.name}</option>`).join('');
    openModal(`<div class="bg-white rounded-xl shadow-xl max-w-md m-4 p-6">
        <h3 class="text-2xl font-bold mb-6">${isEdit ? 'Edit' : 'Add'} Expense</h3>
        <form id="expense-form" class="space-y-4">
            <input type="hidden" id="expense-id" value="${expense.id || ''}">
            <div><label class="block font-semibold mb-2">Date</label>
                <input type="date" id="expense-date" value="${expense.date || new Date().toISOString().split('T')[0]}" class="w-full p-3 border rounded-lg" required></div>
            <div><label class="block font-semibold mb-2">Site</label>
                <select id="expense-site" class="w-full p-3 border rounded-lg" required><option value="">Select Site</option>${siteOpts}</select></div>
            <div><label class="block font-semibold mb-2">Description</label>
                <input type="text" id="expense-desc" value="${expense.description || ''}" class="w-full p-3 border rounded-lg" required></div>
            <div><label class="block font-semibold mb-2">Amount (₹)</label>
                <input type="number" id="expense-amount" value="${expense.amount || ''}" class="w-full p-3 border rounded-lg" required></div>
            <div class="flex gap-3 justify-end pt-4">
                <button type="button" class="modal-cancel-btn px-6 py-2 bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" class="px-6 py-2 bg-amber-500 text-white rounded-lg font-semibold">Save</button>
            </div>
        </form>
    </div>`);
    document.getElementById('expense-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('expense-id').value;
        const data = {
            date: document.getElementById('expense-date').value,
            siteId: document.getElementById('expense-site').value,
            description: document.getElementById('expense-desc').value,
            amount: parseFloat(document.getElementById('expense-amount').value)
        };
        try {
            id ? await updateDoc(doc(db, 'expenses', id), data) : await addDoc(collection(db, 'expenses'), data);
            closeModal();
        } catch (err) { alert('Error: ' + err.message); }
    });
};

const openTasksModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const workersBySite = {};
    sitesData.forEach(site => {
        workersBySite[site.id] = { name: site.name, workers: laborersData.filter(l => l.assignedSiteIds?.includes(site.id)) };
    });
    
    const siteGroups = Object.entries(workersBySite).map(([siteId, data]) => `
        <div class="mb-6">
            <h4 class="font-bold text-lg mb-3">📍 ${data.name}</h4>
            ${data.workers.map(w => `
                <div class="flex gap-3 items-center mb-3 p-3 border rounded-lg">
                    <input type="checkbox" id="task-${w.id}" checked class="w-5 h-5">
                    <div class="flex-1">
                        <label for="task-${w.id}" class="font-semibold">${w.name}</label>
                        <textarea id="task-text-${w.id}" placeholder="Enter task for ${w.name}..." class="w-full mt-2 p-2 border rounded text-sm" rows="2">${w.currentTask || ''}</textarea>
                    </div>
                    <button type="button" data-worker-id="${w.id}" class="save-single-task px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">Save</button>
                </div>
            `).join('') || '<p class="text-slate-500">No workers assigned to this site</p>'}
        </div>
    `).join('');
    
    openModal(`<div class="bg-white rounded-xl shadow-xl max-w-3xl m-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">📋 Assign Daily Tasks</h3>
        <form id="tasks-form">
            ${siteGroups}
            <div class="flex gap-3 justify-end pt-4 border-t sticky bottom-0 bg-white">
                <button type="button" class="modal-cancel-btn px-6 py-2 bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" class="px-6 py-2 bg-amber-500 text-white rounded-lg font-semibold">💾 Save All Tasks</button>
            </div>
        </form>
    </div>`);
    
    document.querySelectorAll('.save-single-task').forEach(btn => {
        btn.addEventListener('click', async () => {
            const workerId = btn.dataset.workerId;
            const taskText = document.getElementById(`task-text-${workerId}`).value.trim();
            try {
                await updateDoc(doc(db, 'laborers', workerId), { currentTask: taskText });
                const q = query(collection(db, 'daily_tasks'), where('laborerId', '==', workerId), where('date', '==', today));
                const existing = await getDocs(q);
                if (existing.empty && taskText) {
                    await addDoc(collection(db, 'daily_tasks'), { laborerId: workerId, task: taskText, date: today });
                }
                btn.textContent = '✅ Saved';
                setTimeout(() => btn.textContent = 'Save', 2000);
            } catch (err) { alert('Error: ' + err.message); }
        });
    });
    
    document.getElementById('tasks-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            for (const worker of laborersData) {
                const checkbox = document.getElementById(`task-${worker.id}`);
                if (!checkbox?.checked) continue;
                const taskText = document.getElementById(`task-text-${worker.id}`).value.trim();
                await updateDoc(doc(db, 'laborers', worker.id), { currentTask: taskText });
                const q = query(collection(db, 'daily_tasks'), where('laborerId', '==', worker.id), where('date', '==', today));
                const existing = await getDocs(q);
                if (existing.empty && taskText) {
                    await addDoc(collection(db, 'daily_tasks'), { laborerId: worker.id, task: taskText, date: today });
                }
            }
            alert('✅ All tasks saved!');
            closeModal();
        } catch (err) { alert('Error: ' + err.message); }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('login-modal');
    const dashboardContent = document.getElementById('dashboard-content');
    let isAppInit = false;
    
    document.querySelector('#language-switcher')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.lang-btn');
        if (btn) setLanguage(btn.dataset.lang);
    });
    setLanguage(currentLanguage);
    
    onAuthStateChanged(auth, user => {
        if (user) {
            loginModal.style.display = 'none';
            dashboardContent.style.display = 'block';
            if (!isAppInit) { initApp(); isAppInit = true; }
        } else {
            loginModal.style.display = 'flex';
            dashboardContent.style.display = 'none';
        }
    });
    
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        signInWithEmailAndPassword(auth, email, password).catch(() => {
            document.getElementById('login-error').textContent = 'Invalid credentials';
        });
    });
    
    function initApp() {
        document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-open');
            document.getElementById('sidebar').classList.toggle('-translate-x-full');
        });
        
        document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
            document.body.classList.remove('sidebar-open');
            document.getElementById('sidebar').classList.add('-translate-x-full');
        });
        
        [document.getElementById('dark-mode-toggle-mobile'), document.getElementById('dark-mode-toggle-desktop')].forEach(btn => {
            btn?.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                btn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
            });
        });
        
        document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));
        
        const renderHome = async () => {
            const active = laborersData.filter(l => l.status === 'Work Started').length;
            const activeSites = new Set(laborersData.filter(l => l.status === 'Work Started').map(l => l.currentSiteId)).size;
            const today = new Date(); today.setHours(0,0,0,0);
            const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
            const cost = await calculatePayroll(today, tomorrow);
            const totalCost = Object.values(cost).reduce((s, w) => s + w.gross, 0);
            
            const activeCountEl = document.getElementById('active-workers-count');
            const sitesCountEl = document.getElementById('active-sites-count');
            const costEl = document.getElementById('today-cost');
            
            if (activeCountEl) activeCountEl.textContent = active;
            if (sitesCountEl) sitesCountEl.textContent = activeSites;
            if (costEl) costEl.textContent = currencyFormatter.format(totalCost);
            
            const activityList = document.getElementById('activity-list');
            if (!activityList) return;
            
            const recent = [...attendanceLogData].sort((a,b) => b.timestamp?.seconds - a.timestamp?.seconds).slice(0,10);
            activityList.innerHTML = recent.length ? recent.map(log => {
                const site = sitesData.find(s => s.id === log.siteId);
                const time = log.timestamp?.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                const icon = log.action === 'Work Started' ? '✅' : '🛑';
                return `<div class="flex gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors"><span class="text-2xl">${icon}</span><div><p class="font-semibold">${log.laborerName} ${log.action.toLowerCase()} at ${site?.name || 'Unknown'}</p><p class="text-sm text-slate-500">${time}</p></div></div>`;
            }).join('') : '<p class="text-center text-slate-500">No activity yet</p>';
        };
        
        const renderWorkers = () => {
            const page = document.getElementById('workers');
            page.innerHTML = `<div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Manage Workers</h2>
                <button data-action="add-worker" class="bg-amber-500 hover:bg-amber-600 font-bold py-3 px-6 rounded-lg transition-colors">Add Worker</button>
            </div><div class="bg-white rounded-xl shadow-lg overflow-x-auto"><table class="w-full"><thead><tr class="border-b-2"><th class="py-3 px-4 text-left">Name</th><th class="py-3 px-4 text-left">Mobile</th><th class="py-3 px-4 text-left">Status</th><th class="py-3 px-4 text-right">Actions</th></tr></thead><tbody>${laborersData.map(l => `<tr class="border-b hover:bg-slate-50 transition-colors"><td class="py-4 px-4 font-medium">${l.name}</td><td class="py-4 px-4">${l.mobileNumber}</td><td class="py-4 px-4"><span class="px-2 py-1 text-xs rounded-full ${l.status === 'Work Started' ? 'bg-green-100 text-green-800' : 'bg-slate-100'}">${l.status || 'Work Ended'}</span></td><td class="py-4 px-4 text-right"><button data-action="edit-worker" data-id="${l.id}" class="text-blue-600 font-semibold mr-2 hover:underline">Edit</button><button data-action="delete-worker" data-id="${l.id}" class="text-red-600 font-semibold hover:underline">Delete</button></td></tr>`).join('')}</tbody></table></div>`;
        };
        
        const renderSites = () => {
            const page = document.getElementById('sites');
            page.innerHTML = `<div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Manage Sites</h2>
                <button data-action="add-site" class="bg-amber-500 hover:bg-amber-600 font-bold py-3 px-6 rounded-lg transition-colors">Add Site</button>
            </div><div class="bg-white rounded-xl shadow-lg overflow-x-auto"><table class="w-full"><thead><tr class="border-b-2"><th class="py-3 px-4 text-left">Site Name</th><th class="py-3 px-4 text-left">Location</th><th class="py-3 px-4 text-right">Actions</th></tr></thead><tbody>${sitesData.map(s => `<tr class="border-b hover:bg-slate-50 transition-colors"><td class="py-4 px-4 font-medium">${s.name}</td><td class="py-4 px-4">${s.location}</td><td class="py-4 px-4 text-right"><button data-action="edit-site" data-id="${s.id}" class="text-blue-600 font-semibold mr-2 hover:underline">Edit</button><button data-action="delete-site" data-id="${s.id}" class="text-red-600 font-semibold hover:underline">Delete</button></td></tr>`).join('')}</tbody></table></div>`;
        };
        
        const renderTasks = () => {
            const page = document.getElementById('tasks');
            page.innerHTML = `<div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Daily Tasks</h2>
                <button data-action="assign-tasks" class="bg-amber-500 hover:bg-amber-600 font-bold py-3 px-6 rounded-lg transition-colors">Assign Tasks</button>
            </div><div class="bg-white rounded-xl shadow-lg p-6">${laborersData.map(l => `<div class="border-b py-4"><div class="flex justify-between"><span class="font-semibold">${l.name}</span><span class="text-sm text-slate-500">${sitesData.filter(s => l.assignedSiteIds?.includes(s.id)).map(s => s.name).join(', ')}</span></div><p class="text-slate-600 mt-2">${l.currentTask || '<span class="text-slate-400">No task assigned</span>'}</p></div>`).join('')}</div>`;
        };
        
        const renderSummary = async () => {
            const page = document.getElementById('summary');
            const costs = {};
            sitesData.forEach(s => costs[s.id] = { name: s.name, labor: 0, expenses: 0 });
            
            for (const site of sitesData) {
                const siteLogs = attendanceLogData.filter(l => l.siteId === site.id);
                const workerIds = [...new Set(siteLogs.map(l => l.laborerId))];
                let siteLabor = 0;
                for (const wId of workerIds) {
                    const worker = laborersData.find(l => l.id === wId);
                    if (!worker) continue;
                    const logs = siteLogs.filter(l => l.laborerId === wId);
                    const hours = calculateHours(logs);
                    siteLabor += hours * (worker.hourlyRate || 0);
                }
                costs[site.id].labor = siteLabor;
                costs[site.id].expenses = expensesData.filter(e => e.siteId === site.id).reduce((s, e) => s + e.amount, 0);
            }
            
            const total = Object.values(costs).reduce((s, c) => s + c.labor + c.expenses, 0);
            page.innerHTML = `<h2 class="text-3xl font-bold mb-6">Project Summary</h2><div class="bg-white rounded-xl shadow-lg overflow-x-auto"><table class="w-full"><thead><tr class="border-b-2"><th class="py-3 px-4 text-left">Site</th><th class="py-3 px-4 text-right">Labor Cost</th><th class="py-3 px-4 text-right">Expenses</th><th class="py-3 px-4 text-right">Total</th></tr></thead><tbody>${Object.values(costs).map(c => `<tr class="border-b hover:bg-slate-50 transition-colors"><td class="py-4 px-4 font-medium">${c.name}</td><td class="py-4 px-4 text-right">${currencyFormatter.format(c.labor)}</td><td class="py-4 px-4 text-right">${currencyFormatter.format(c.expenses)}</td><td class="py-4 px-4 text-right font-bold text-amber-600">${currencyFormatter.format(c.labor + c.expenses)}</td></tr>`).join('')}<tr class="bg-slate-100 font-bold"><td colspan="3" class="py-4 px-4 text-right">GRAND TOTAL:</td><td class="py-4 px-4 text-right text-amber-600">${currencyFormatter.format(total)}</td></tr></tbody></table></div>`;
        };
        
        const renderPayroll = async () => {
            const page = document.getElementById('payroll');
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            const payroll = await calculatePayroll(startOfMonth, endOfMonth);
            const totals = Object.values(payroll).reduce((acc, w) => ({
                gross: acc.gross + w.gross,
                advances: acc.advances + w.advances,
                deductions: acc.deductions + w.deductions,
                net: acc.net + w.net
            }), { gross: 0, advances: 0, deductions: 0, net: 0 });
            
            const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
            page.innerHTML = `<h2 class="text-3xl font-bold mb-6">Payroll - ${monthName}</h2><div class="bg-white rounded-xl shadow-lg overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b-2"><th class="py-3 px-4 text-left">Worker</th><th class="py-3 px-4 text-center">Hours</th><th class="py-3 px-4 text-right">Rate</th><th class="py-3 px-4 text-right">Gross Pay</th><th class="py-3 px-4 text-right">Advances</th><th class="py-3 px-4 text-right">Deductions</th><th class="py-3 px-4 text-right">Net Pay</th></tr></thead><tbody>${Object.values(payroll).map(w => `<tr class="border-b hover:bg-slate-50 transition-colors"><td class="py-4 px-4 font-medium">${w.name}</td><td class="py-4 px-4 text-center">${w.hours}h</td><td class="py-4 px-4 text-right">${currencyFormatter.format(w.rate)}</td><td class="py-4 px-4 text-right">${currencyFormatter.format(w.gross)}</td><td class="py-4 px-4 text-right text-red-600">${currencyFormatter.format(w.advances)}</td><td class="py-4 px-4 text-right text-blue-600">${currencyFormatter.format(w.deductions)}</td><td class="py-4 px-4 text-right font-bold text-green-600">${currencyFormatter.format(w.net)}</td></tr>`).join('')}<tr class="bg-slate-100 font-bold"><td colspan="3" class="py-4 px-4 text-right">TOTALS:</td><td class="py-4 px-4 text-right">${currencyFormatter.format(totals.gross)}</td><td class="py-4 px-4 text-right text-red-600">${currencyFormatter.format(totals.advances)}</td><td class="py-4 px-4 text-right text-blue-600">${currencyFormatter.format(totals.deductions)}</td><td class="py-4 px-4 text-right text-green-600">${currencyFormatter.format(totals.net)}</td></tr></tbody></table></div><p class="mt-4 text-sm text-slate-600">Net Pay = Gross Pay - Advances - Deductions</p>`;
        };
        
        const renderExpenses = () => {
            const page = document.getElementById('expenses');
            const sorted = [...expensesData].sort((a,b) => new Date(b.date) - new Date(a.date));
            page.innerHTML = `<div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Track Expenses</h2>
                <button data-action="add-expense" class="bg-amber-500 hover:bg-amber-600 font-bold py-3 px-6 rounded-lg transition-colors">Add Expense</button>
            </div><div class="bg-white rounded-xl shadow-lg overflow-x-auto"><table class="w-full"><thead><tr class="border-b-2"><th class="py-3 px-4 text-left">Date</th><th class="py-3 px-4 text-left">Site</th><th class="py-3 px-4 text-left">Description</th><th class="py-3 px-4 text-right">Amount</th><th class="py-3 px-4 text-right">Actions</th></tr></thead><tbody>${sorted.map(e => `<tr class="border-b hover:bg-slate-50 transition-colors"><td class="py-4 px-4">${e.date}</td><td class="py-4 px-4">${sitesData.find(s => s.id === e.siteId)?.name || 'N/A'}</td><td class="py-4 px-4">${e.description}</td><td class="py-4 px-4 text-right">${currencyFormatter.format(e.amount)}</td><td class="py-4 px-4 text-right"><button data-action="edit-expense" data-id="${e.id}" class="text-blue-600 font-semibold mr-2 hover:underline">Edit</button><button data-action="delete-expense" data-id="${e.id}" class="text-red-600 font-semibold hover:underline">Delete</button></td></tr>`).join('')}</tbody></table></div>`;
        };
        
        const renderAttendance = () => {
            const page = document.getElementById('attendance');
            const sorted = [...attendanceLogData].sort((a,b) => b.timestamp?.seconds - a.timestamp?.seconds);
            page.innerHTML = `<h2 class="text-3xl font-bold mb-6">Attendance Log</h2><div class="bg-white rounded-xl shadow-lg overflow-x-auto"><table class="w-full"><thead><tr class="border-b-2"><th class="py-3 px-4 text-left">Date & Time</th><th class="py-3 px-4 text-left">Worker</th><th class="py-3 px-4 text-left">Site</th><th class="py-3 px-4 text-left">Action</th></tr></thead><tbody>${sorted.map(log => {
                const date = log.timestamp?.toDate().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const site = sitesData.find(s => s.id === log.siteId);
                const color = log.action === 'Work Started' ? 'text-green-600' : 'text-red-600';
                return `<tr class="border-b hover:bg-slate-50 transition-colors"><td class="py-4 px-4">${date || 'N/A'}</td><td class="py-4 px-4 font-medium">${log.laborerName}</td><td class="py-4 px-4">${site?.name || 'Unknown'}</td><td class="py-4 px-4 ${color} font-semibold">${log.action}</td></tr>`;
            }).join('')}</tbody></table></div>`;
        };
        
        const renderGallery = async () => {
            const page = document.getElementById('gallery');
            try {
                const photosQuery = query(collection(db, 'work_photos'), orderBy('uploadedAt', 'desc'), limit(50));
                const photosSnap = await getDocs(photosQuery);
                const photos = photosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                page.innerHTML = `<h2 class="text-3xl font-bold mb-6">📸 Work Photo Gallery</h2><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${photos.length ? photos.map(p => {
                    const site = sitesData.find(s => s.id === p.siteId);
                    const date = p.uploadedAt?.toDate().toLocaleDateString('en-IN');
                    return `<div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                        <img src="${p.photoURL}" alt="Work photo" class="w-full h-48 object-cover">
                        <div class="p-4">
                            <p class="font-semibold">${p.laborerName}</p>
                            <p class="text-sm text-slate-600">${site?.name || 'Unknown Site'}</p>
                            <p class="text-sm text-slate-500 mt-2">${p.description || 'No description'}</p>
                            <p class="text-xs text-slate-400 mt-2">${date}</p>
                        </div>
                    </div>`;
                }).join('') : '<p class="text-slate-500 col-span-full text-center py-20">No photos uploaded yet</p>'}</div>`;
            } catch (err) {
                page.innerHTML = `<h2 class="text-3xl font-bold mb-6">Photo Gallery</h2><p class="text-red-500">Error loading photos: ${err.message}</p>`;
            }
        };
        
        const routes = {
            '#home': renderHome,
            '#workers': renderWorkers,
            '#sites': renderSites,
            '#tasks': renderTasks,
            '#summary': renderSummary,
            '#payroll': renderPayroll,
            '#expenses': renderExpenses,
            '#attendance': renderAttendance,
            '#gallery': renderGallery
        };
        
        const renderPage = () => {
            const hash = window.location.hash || '#home';
            document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
            const pageId = hash.substring(1);
            const page = document.getElementById(pageId);
            if (page) {
                page.classList.remove('hidden');
                const render = routes[hash];
                if (render) {
                    showLoading(page);
                    setTimeout(() => render(), 50);
                }
            }
        };
        
        const handleNav = () => {
            const hash = window.location.hash || '#home';
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.getAttribute('href') === hash);
            });
            renderPage();
            document.body.classList.remove('sidebar-open');
            document.getElementById('sidebar').classList.add('-translate-x-full');
        };
        
        window.addEventListener('hashchange', handleNav);
        
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'check-workers') window.location.hash = '#workers';
                if (action === 'manage-sites') window.location.hash = '#sites';
                if (action === 'assign-tasks') openTasksModal();
                if (action === 'project-summary') window.location.hash = '#summary';
                if (action === 'view-payroll') window.location.hash = '#payroll';
                if (action === 'add-expense') openExpenseModal();
            });
        });
        
        document.querySelector('main').addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const { action, id } = btn.dataset;
            
            if (action === 'add-site') openSiteModal();
            if (action === 'edit-site') openSiteModal(sitesData.find(s => s.id === id));
            if (action === 'delete-site') showConfirm('Delete this site?', () => deleteDoc(doc(db, 'sites', id)));
            
            if (action === 'add-worker') openWorkerModal();
            if (action === 'edit-worker') openWorkerModal(laborersData.find(l => l.id === id));
            if (action === 'delete-worker') showConfirm('Delete this worker?', () => deleteDoc(doc(db, 'laborers', id)));
            
            if (action === 'add-expense') openExpenseModal();
            if (action === 'edit-expense') openExpenseModal(expensesData.find(e => e.id === id));
            if (action === 'delete-expense') showConfirm('Delete this expense?', () => deleteDoc(doc(db, 'expenses', id)));
            
            if (action === 'assign-tasks') openTasksModal();
        });
        
        onSnapshot(collection(db, "sites"), snap => { sitesData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNav(); });
        onSnapshot(collection(db, "laborers"), snap => { laborersData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNav(); });
        onSnapshot(collection(db, "expenses"), snap => { expensesData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNav(); });
        onSnapshot(collection(db, "attendance_logs"), snap => { attendanceLogData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNav(); });
        onSnapshot(collection(db, "finances"), snap => { financesData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNav(); });
        
        handleNav();
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js').then(() => {
                if ('Notification' in window && Notification.permission === 'default') {
                    setTimeout(() => Notification.requestPermission(), 3000);
                }
            }).catch(err => console.log('Service Worker registration failed:', err));
        }
    }
});
