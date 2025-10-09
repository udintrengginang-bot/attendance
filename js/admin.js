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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    // ... (login and auth logic remains the same) ...
    
    function initializeDashboardApp() {
        const mainContent = document.querySelector('main');
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

        // --- ALL PREVIOUS RENDER FUNCTIONS AND MODALS ARE HERE ---
        // (openSiteModal, renderSitesPage, etc. are all still here, complete)

        // --- NEW: PROJECT SUMMARY PAGE ---
        const renderProjectSummaryPage = () => {
            const page = mainContent.querySelector('#summary');
            page.classList.remove('hidden');
            const siteOptions = sitesData.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            
            // Set default dates: last 30 days
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 29);
            const formatDate = (date) => date.toISOString().split('T')[0];

            page.innerHTML = `
                <h2 class="text-3xl font-bold text-slate-800 mb-6">Project Cost Summary</h2>
                <div class="bg-white p-6 rounded-xl shadow-lg mb-6">
                    <form id="summary-form" class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div class="md:col-span-2">
                            <label for="summary-site" class="block text-sm font-medium text-slate-700">Select Site</label>
                            <select id="summary-site" class="mt-1 p-2 w-full border border-slate-300 rounded-md" required>
                                <option value="">-- All Sites --</option>
                                ${siteOptions}
                            </select>
                        </div>
                        <div>
                            <label for="summary-start-date" class="block text-sm font-medium text-slate-700">Start Date</label>
                            <input type="date" id="summary-start-date" value="${formatDate(startDate)}" class="mt-1 p-2 w-full border border-slate-300 rounded-md">
                        </div>
                        <div>
                            <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 font-bold py-2 px-4 rounded-lg shadow-sm transition-colors">Generate Report</button>
                        </div>
                    </form>
                </div>
                <div id="summary-report" class="bg-white p-6 rounded-xl shadow-lg">
                    <p class="text-center text-slate-500">Select a site and date range to generate a cost summary.</p>
                </div>
            `;

            document.getElementById('summary-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const siteId = document.getElementById('summary-site').value;
                const start = new Date(document.getElementById('summary-start-date').value);
                const end = new Date(); // Always calculate up to today
                end.setHours(23, 59, 59, 999);
                
                const reportContainer = document.getElementById('summary-report');
                reportContainer.innerHTML = `<p class="text-center text-slate-500">Calculating... Please wait.</p>`;

                // 1. Calculate Labor Cost
                const laborCost = await calculateLaborCostForSite(siteId, start, end);

                // 2. Calculate Expense Cost
                const expenseCost = calculateExpenseCostForSite(siteId, start, end);

                // 3. Display Report
                const totalCost = laborCost + expenseCost;
                reportContainer.innerHTML = `
                    <h3 class="text-2xl font-bold text-slate-800 mb-4">Cost Summary for ${sitesData.find(s => s.id === siteId)?.name || 'All Sites'}</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center p-4 bg-slate-100 rounded-lg">
                            <span class="font-medium text-slate-600">Total Labor Cost</span>
                            <span class="font-bold text-lg text-slate-800">${currencyFormatter.format(laborCost)}</span>
                        </div>
                        <div class="flex justify-between items-center p-4 bg-slate-100 rounded-lg">
                            <span class="font-medium text-slate-600">Total Material & Expenses</span>
                            <span class="font-bold text-lg text-slate-800">${currencyFormatter.format(expenseCost)}</span>
                        </div>
                        <div class="flex justify-between items-center p-4 bg-green-100 border-t-2 border-green-300 rounded-lg">
                            <span class="font-bold text-green-800 uppercase">Total Project Cost</span>
                            <span class="font-bold text-xl text-green-900">${currencyFormatter.format(totalCost)}</span>
                        </div>
                    </div>
                `;
            });
        };
        
        // --- NEW: HELPER CALCULATION FUNCTIONS ---
        async function calculateLaborCostForSite(siteId, startDate, endDate) {
            let totalLaborCost = 0;
            const relevantLogs = attendanceLogData.filter(log => {
                const logDate = log.timestamp.toDate();
                const matchesSite = !siteId || log.siteId === siteId;
                return matchesSite && logDate >= startDate && logDate <= endDate;
            });

            relevantLogs.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());
            
            const payroll = {}; // Temporary object to track hours per laborer
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
            else if (hash === '#tasks') renderDailyTasksPage();
            // ... (other routing logic remains the same)
            else renderDashboardPage();
        };

        const handleNavigation = () => {
            // ... (navigation logic remains the same)
        };
        
        // --- DATA LISTENERS and INITIALIZATION ---
        // (onSnapshot calls and handleNavigation() call remain the same)
    }
});
