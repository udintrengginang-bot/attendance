import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, where, getDocs, Timestamp, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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

    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        signInWithEmailAndPassword(auth, email, password)
            .catch(() => {
                document.getElementById('login-error').textContent = 'Invalid email or password.';
            });
    });

    function initializeDashboardApp() {
        const mainContent = dashboardContent.querySelector('main');
        let sitesData = [], workersData = [], expensesData = [], attendanceLogData = [];
        const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

        const showLoading = (element) => {
            element.innerHTML = '<div class="flex justify-center items-center p-10"><div class="loader"></div></div>';
        };

        const renderCurrentPage = () => {
            const hash = window.location.hash || '#dashboard';
            mainContent.querySelectorAll('.page-content').forEach(c => c.classList.add('hidden'));
            const pageElement = mainContent.querySelector(hash);
            if (pageElement) {
                pageElement.classList.remove('hidden');
                const renderFunction = routes[hash];
                if (renderFunction) {
                    showLoading(pageElement);
                    renderFunction();
                }
            } else {
                mainContent.querySelector('#dashboard').classList.remove('hidden');
                showLoading(mainContent.querySelector('#dashboard'));
                renderDashboardPage();
            }
        };

        // --- MODAL FUNCTIONS ---
        const openModal = (content) => {
            const modal = document.getElementById('form-modal');
            modal.innerHTML = `<div class="bg-white rounded-lg shadow-xl w-full max-w-lg m-4">${content}</div>`;
            modal.classList.remove('hidden');
            modal.querySelector('.modal-cancel-btn')?.addEventListener('click', () => modal.classList.add('hidden'));
        };
        const closeModal = () => document.getElementById('form-modal').classList.add('hidden');

        // ... All other functions (openSiteModal, openWorkerModal, etc.) will be defined here ...
        // ... This includes the new openDocumentsModal and openFinancesModal ...

        // --- DATA CALCULATION ---
        const calculatePayroll = async (startDate, endDate) => {
            // ... Full payroll logic with advances/deductions
        };

        // --- RENDER FUNCTIONS ---
        // ... All render functions (renderDashboardPage, renderSitesPage, etc.)
        
        // --- ROUTER & NAVIGATION ---
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
        
        // --- EVENT LISTENERS & INITIALIZATION ---
        // ... Event listeners for navigation, clicks, and Firestore snapshots
    }
});

