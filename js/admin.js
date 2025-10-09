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

    // THIS IS THE "GATEKEEPER" LOGIC THAT WAS MISSING. IT'S NOW RESTORED.
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
        const loginError = document.getElementById('login-error');
        loginError.textContent = '';
        signInWithEmailAndPassword(auth, email, password)
            .catch(() => { loginError.textContent = 'Invalid email or password.'; });
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

        const renderProjectSummaryPage = () => {
            const page = mainContent.querySelector('#summary');
            page.classList.remove('hidden');
            const siteOptions = sitesData.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            const endDate = new Date(), startDate = new Date();
            startDate.setDate(endDate.getDate() - 29);
            const formatDate = (date) => date.toISOString().split('T')[0];
            page.innerHTML = `<h2 class="text-3xl font-bold text-slate-800 mb-6">Project Cost Summary</h2><div class="bg-white p-6 rounded-xl shadow-lg mb-6"><form id="summary-form" class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"><div class="md:col-span-2"><label for="summary-site" class="block text-sm font-medium text-slate-700">Select Site</label><select id="summary-site" class="mt-1 p-2 w-full border border-slate-300 rounded-md" required><option value="">-- All Sites --</option>${siteOptions}</select></div><div><label for="summary-start-date" class="block text-sm font-medium text-slate-700">Start Date</label><input type="date" id="summary-start-date" value="${formatDate(startDate)}" class="mt-1 p-2 w-full border border-slate-300 rounded-md"></div><div><button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 font-bold py-2 px-4 rounded-lg shadow-sm transition-colors">Generate Report</button></div></form></div><div id="summary-report" class="bg-white p-6 rounded-xl shadow-lg"><p class="text-center text-slate-500">Select a site and date range to generate a cost summary.</p></div>`;
            document.getElementById('summary-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const siteId = document.getElementById('summary-site').value;
                const start = new Date(document.getElementById('summary-start-date').value);
                const end = new Date();
                end.setHours(23, 59, 59, 999);
                const reportContainer = document.getElementById('summary-report');
                reportContainer.innerHTML = `<p class="text-center text-slate-500">Calculating... Please wait.</p>`;
                const laborCost = await calculateLaborCostForSite(siteId, start, end);
                const expenseCost = calculateExpenseCostForSite(siteId, start, end);
                const totalCost = laborCost + expenseCost;
                reportContainer.innerHTML = `<h3 class="text-2xl font-bold text-slate-800 mb-4">Cost Summary for ${sitesData.find(s => s.id === siteId)?.name || 'All Sites'}</h3><div class="space-y-4"><div class="flex justify-between items-center p-4 bg-slate-100 rounded-lg"><span class="font-medium text-slate-600">Total Labor Cost</span><span class="font-bold text-lg text-slate-800">${currencyFormatter.format(laborCost)}</span></div><div class="flex justify-between items-center p-4 bg-slate-100 rounded-lg"><span class="font-medium text-slate-600">Total Material & Expenses</span><span class="font-bold text-lg text-slate-800">${currencyFormatter.format(expenseCost)}</span></div><div class="flex justify-between items-center p-4 bg-green-100 border-t-2 border-green-300 rounded-lg"><span class="font-bold text-green-800 uppercase">Total Project Cost</span><span class="font-bold text-xl text-green-900">${currencyFormatter.format(totalCost)}</span></div></div>`;
            });
        };
        
        async function calculateLaborCostForSite(siteId, startDate, endDate) {
            let totalLaborCost = 0;
            const relevantLogs = attendanceLogData.filter(log => {
                const logDate = log.timestamp.toDate();
                const matchesSite = !siteId || log.siteId === siteId;
                return matchesSite && logDate >= startDate && logDate <= endDate;
            });
            relevantLogs.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());
            const payroll = {};
            for (const log of relevantLogs) {
                if (!payroll[log.laborerId]) {
                    const laborerInfo = laborersData.find(l => l.id === log.laborerId);
                    if (!laborerInfo) continue;
                    payroll[log.laborerId] = { rate: laborerInfo.hourlyRate || 0, totalHours: 0, lastClockIn: null };
                }
                if (log.action === "Clock In" || log.action === "End Break") {
                    payroll[log.laborerId].lastClockIn = log.timestamp.toDate();
                } else if ((log.action === "Clock Out" || log.action === "Start Break") && payroll[log.laborerId].lastClockIn) {
                    const durationMillis = log.timestamp.toDate() - payroll[log.laborerId].lastClockIn;
                    payroll[log.laborerId].totalHours += (durationMillis / 3600000);
                    payroll[log.laborerId].lastClockIn = null;
                }
            }
            for (const laborerId in payroll) {
                totalLaborCost += payroll[laborerId].totalHours * payroll[laborerId].rate;
            }
            return totalLaborCost;
        }

        function calculateExpenseCostForSite(siteId, startDate, endDate) {
            const relevantExpenses = expensesData.filter(expense => {
                const expenseDate = new Date(expense.date);
                const matchesSite = !siteId || expense.siteId === siteId;
                return matchesSite && expenseDate >= startDate && expenseDate <= endDate;
            });
            return relevantExpenses.reduce((sum, e) => sum + e.amount, 0);
        }

        const renderCurrentPage = () => {
            const hash = window.location.hash || '#dashboard';
            mainContent.querySelectorAll('.page-content').forEach(c => c.classList.add('hidden'));
            if (hash === '#summary') renderProjectSummaryPage();
            // ... (other routing logic will be filled in the full version)
            else { /* renderDashboardPage() will be here */ }
        };

        const handleNavigation = () => {
            const hash = window.location.hash || '#dashboard';
            dashboardContent.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.getAttribute('href') === hash);
            });
            renderCurrentPage();
        };
        
        // --- DATA LISTENERS AND START ---
        window.addEventListener('hashchange', handleNavigation);
        onSnapshot(query(collection(db, "sites")), s => { sitesData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });
        onSnapshot(query(collection(db, "laborers")), s => { laborersData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });
        onSnapshot(query(collection(db, "expenses")), s => { expensesData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });
        onSnapshot(query(collection(db, "attendance_logs")), s => { attendanceLogData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });
        handleNavigation();
    }
});
