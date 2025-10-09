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

        // --- Mobile sidebar toggle ---
        const body = document.body;
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        function openSidebar() {
            body.classList.add('sidebar-open');
            mobileBtn?.setAttribute('aria-expanded', 'true');
            sidebar?.setAttribute('aria-hidden', 'false');
        }
        function closeSidebar() {
            body.classList.remove('sidebar-open');
            mobileBtn?.setAttribute('aria-expanded', 'false');
            sidebar?.setAttribute('aria-hidden', 'true');
        }

        mobileBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            if (body.classList.contains('sidebar-open')) closeSidebar();
            else openSidebar();
        });
        overlay?.addEventListener('click', closeSidebar);
        window.addEventListener('hashchange', closeSidebar);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });

        let sitesData = [], laborersData = [], expensesData = [], attendanceLogData = [];
        const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

        // --- Helper function for deletes ---
        async function handleItemDelete(col, id, label = 'item') {
            if (!id) return;
            if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
            try {
                await deleteDoc(doc(db, col, id));
            } catch (err) {
                console.error('Failed to delete:', err);
                alert('Delete failed. Check Firestore rules/permissions.');
            }
        }

        // ... keep your modals and renderers here ...

        const renderSitesPage = () => {
             const page = mainContent.querySelector('#sites');
             page.classList.remove('hidden');
             let tableRows = sitesData.map(site => `<tr class="border-b border-slate-200"><td class="py-4 px-6 font-medium text-slate-800">${site.name}</td><td class="py-4 px-6 text-slate-600">${site.location}</td><td class="py-4 px-6 text-right"><div class="flex items-center justify-end space-x-4"><button data-action="edit-site" data-id="${site.id}" class="text-slate-500 hover:text-blue-600 action-icon px-3 py-2" title="Edit Site">✏️</button><button data-action="delete-site" data-id="${site.id}" class="text-slate-500 hover:text-red-600 action-icon px-3 py-2" title="Delete Site">🗑️</button></div></td></tr>`).join('');
             page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Manage Sites</h2><button id="add-site-btn" class="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Add New Site</button></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto"><table class="w-full text-left min-w-[640px]"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Site Name</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Location</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
             document.getElementById('add-site-btn').addEventListener('click', () => openSiteModal());
        };

        // repeat the same overflow-x-auto + min-w tweak for Laborers, Expenses, Attendance tables

        onSnapshot(query(collection(db, "sites")), s => { sitesData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });
        onSnapshot(query(collection(db, "laborers")), s => { laborersData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });
        onSnapshot(query(collection(db, "expenses")), s => { expensesData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });
        onSnapshot(query(collection(db, "attendance_logs")), s => { attendanceLogData = s.docs.map(d => ({id:d.id, ...d.data()})); renderCurrentPage(); });

        handleNavigation();
    }
});
