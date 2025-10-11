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

        // UTILITY FUNCTIONS FOR PAYROLL CALCULATIONS
        const calculateHoursWorked = (logs) => {
            let totalMinutes = 0;
            let currentStart = null;

            for (const log of logs) {
                if (log.action === 'Work Started') {
                    currentStart = log.timestamp.toDate();
                } else if (log.action === 'Work Ended' && currentStart) {
                    const end = log.timestamp.toDate();
                    const minutes = (end - currentStart) / (1000 * 60);
                    totalMinutes += minutes;
                    currentStart = null;
                }
            }

            return totalMinutes / 60; // Convert to hours
        };

        const calculatePayroll = async (startDate, endDate) => {
            const payrollData = {};

            for (const laborer of laborersData) {
                // Get attendance logs for this worker in date range
                const logsQuery = query(
                    collection(db, 'attendance_logs'),
                    where('laborerId', '==', laborer.id),
                    where('timestamp', '>=', Timestamp.fromDate(startDate)),
                    where('timestamp', '<=', Timestamp.fromDate(endDate)),
                    orderBy('timestamp', 'asc')
                );
                
                const logsSnapshot = await getDocs(logsQuery);
                const logs = logsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                const hoursWorked = calculateHoursWorked(logs);
                const grossPay = hoursWorked * (laborer.hourlyRate || 0);

                // Get advances and deductions for this period
                const financeRecords = financesData.filter(f => {
                    if (f.laborerId !== laborer.id) return false;
                    const fDate = new Date(f.date);
                    return fDate >= startDate && fDate <= endDate;
                });

                const advances = financeRecords
                    .filter(f => f.type === 'advance')
                    .reduce((sum, f) => sum + f.amount, 0);

                const deductions = financeRecords
                    .filter(f => f.type === 'deduction')
                    .reduce((sum, f) => sum + f.amount, 0);

                const netPayable = grossPay - advances - deductions;

                payrollData[laborer.id] = {
                    name: laborer.name,
                    hoursWorked: hoursWorked.toFixed(2),
                    hourlyRate: laborer.hourlyRate || 0,
                    grossPay,
                    advances,
                    deductions,
                    netPayable
                };
            }

            return payrollData;
        };

        const calculateAllLaborCost = async (startDate, endDate) => {
            const payroll = await calculatePayroll(startDate, endDate);
            return Object.values(payroll).reduce((sum, w) => sum + w.grossPay, 0);
        };

        const calculateAllExpenseCost = async (startDate, endDate) => {
            return expensesData
                .filter(e => {
                    const eDate = new Date(e.date);
                    return eDate >= startDate && eDate <= endDate;
                })
                .reduce((sum, e) => sum + e.amount, 0);
        };

        // MODAL FUNCTIONS
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
                } catch (error) { console.error("Error saving site:", error); alert("Error saving site!"); }
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
                            <div class="p-2 border border-slate-300 rounded-md max-h-32 overflow-y-auto space-y-2">${siteCheckboxes || '<p class="text-slate-500 text-sm">No sites available. Create sites first.</p>'}</div>
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
                } catch (error) { console.error("Error saving worker:", error); alert("Error saving worker!"); }
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
                } catch(error) { console.error("Error saving expense:", error); alert("Error saving expense!"); }
            });
        };

        const openDocumentsModal = (laborer) => {
            const content = `
                <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4">
                    <div class="p-6 border-b"><h3 class="text-2xl font-bold">Documents - ${laborer.name}</h3></div>
                    <div class="p-6">
                        <div class="mb-4">
                            <label class="block font-medium text-slate-700 mb-2">Upload Document</label>
                            <input type="file" id="doc-upload" class="w-full p-2 border border-slate-300 rounded" accept="image/*,.pdf">
                            <button id="upload-doc-btn" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Upload</button>
                        </div>
                        <div id="documents-list" class="space-y-2">
                            <p class="text-slate-500">Loading documents...</p>
                        </div>
                    </div>
                    <div class="flex justify-end gap-4 p-4 bg-slate-50 rounded-b-lg">
                        <button class="modal-cancel-btn px-5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 font-semibold">Close</button>
                    </div>
                </div>`;
            openModal(content);

            const loadDocuments = async () => {
                const listRef = ref(storage, `documents/${laborer.id}`);
                try {
                    const res = await listAll(listRef);
                    const docsList = document.getElementById('documents-list');
                    if (res.items.length === 0) {
                        docsList.innerHTML = '<p class="text-slate-500">No documents uploaded yet.</p>';
                        return;
                    }
                    const docsHTML = await Promise.all(res.items.map(async (itemRef) => {
                        const url = await getDownloadURL(itemRef);
                        return `<div class="flex items-center justify-between p-3 bg-slate-50 rounded">
                            <span class="text-sm">${itemRef.name}</span>
                            <div class="flex gap-2">
                                <a href="${url}" target="_blank" class="text-blue-500 hover:text-blue-700">View</a>
                                <button data-action="delete-doc" data-path="${itemRef.fullPath}" class="text-red-500 hover:text-red-700">Delete</button>
                            </div>
                        </div>`;
                    }));
                    docsList.innerHTML = docsHTML.join('');
                } catch (error) {
                    console.error("Error loading documents:", error);
                    document.getElementById('documents-list').innerHTML = '<p class="text-red-500">Error loading documents.</p>';
                }
            };

            loadDocuments();

            document.getElementById('upload-doc-btn').addEventListener('click', async () => {
                const fileInput = document.getElementById('doc-upload');
                if (!fileInput.files[0]) return alert('Please select a file');
                const file = fileInput.files[0];
                const storageRef = ref(storage, `documents/${laborer.id}/${file.name}`);
                try {
                    await uploadBytes(storageRef, file);
                    alert('Document uploaded successfully!');
                    fileInput.value = '';
                    loadDocuments();
                } catch (error) {
                    console.error("Upload error:", error);
                    alert('Error uploading document!');
                }
            });

            document.getElementById('documents-list').addEventListener('click', async (e) => {
                if (e.target.dataset.action === 'delete-doc') {
                    const filePath = e.target.dataset.path;
                    if (!confirm('Delete this document?')) return;
                    try {
                        await deleteObject(ref(storage, filePath));
                        alert('Document deleted!');
                        loadDocuments();
                    } catch (error) {
                        console.error("Delete error:", error);
                        alert('Error deleting document!');
                    }
                }
            });
        };

        const openFinancesModal = (laborer) => {
            const financeRecords = financesData.filter(f => f.laborerId === laborer.id);
            const recordsHTML = financeRecords.length > 0 
                ? financeRecords.map(f => `<div class="flex justify-between p-3 bg-slate-50 rounded">
                    <div>
                        <span class="font-medium ${f.type === 'advance' ? 'text-red-600' : 'text-blue-600'}">${f.type === 'advance' ? 'Advance' : 'Deduction'}</span>
                        <p class="text-sm text-slate-600">${f.description}</p>
                        <p class="text-xs text-slate-500">${f.date}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold">${currencyFormatter.format(f.amount)}</p>
                        <button data-action="delete-finance" data-id="${f.id}" class="text-xs text-red-500 hover:text-red-700">Delete</button>
                    </div>
                </div>`).join('')
                : '<p class="text-slate-500">No financial records yet.</p>';

            const content = `
                <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4">
                    <div class="p-6 border-b"><h3 class="text-2xl font-bold">Financial Records - ${laborer.name}</h3></div>
                    <div class="p-6">
                        <form id="finance-form" class="mb-6 p-4 bg-slate-50 rounded space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-sm font-medium mb-1">Type</label>
                                    <select id="finance-type" class="w-full p-2 border rounded">
                                        <option value="advance">Advance</option>
                                        <option value="deduction">Deduction</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-1">Amount (₹)</label>
                                    <input type="number" id="finance-amount" class="w-full p-2 border rounded" required>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Date</label>
                                <input type="date" id="finance-date" value="${new Date().toISOString().split('T')[0]}" class="w-full p-2 border rounded" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Description</label>
                                <input type="text" id="finance-desc" class="w-full p-2 border rounded" required>
                            </div>
                            <button type="submit" class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Add Record</button>
                        </form>
                        <div id="finance-records-list" class="space-y-2">${recordsHTML}</div>
                    </div>
                    <div class="flex justify-end gap-4 p-4 bg-slate-50 rounded-b-lg">
                        <button class="modal-cancel-btn px-5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 font-semibold">Close</button>
                    </div>
                </div>`;
            openModal(content);

            document.getElementById('finance-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = {
                    laborerId: laborer.id,
                    type: document.getElementById('finance-type').value,
                    amount: parseFloat(document.getElementById('finance-amount').value),
                    date: document.getElementById('finance-date').value,
                    description: document.getElementById('finance-desc').value
                };
                try {
                    await addDoc(collection(db, 'finances'), data);
                    alert('Record added successfully!');
                    closeModal();
                } catch (error) {
                    console.error("Error adding finance record:", error);
                    alert('Error adding record!');
                }
            });

            document.getElementById('finance-records-list').addEventListener('click', async (e) => {
                if (e.target.dataset.action === 'delete-finance') {
                    const id = e.target.dataset.id;
                    if (!confirm('Delete this record?')) return;
                    try {
                        await deleteDoc(doc(db, 'finances', id));
                        alert('Record deleted!');
                        closeModal();
                    } catch (error) {
                        console.error("Error deleting record:", error);
                        alert('Error deleting record!');
                    }
                }
            });
        };

        const openTaskModal = (laborer = null) => {
            const workerOptions = laborersData.map(l => `<option value="${l.id}" ${laborer?.id === l.id ? 'selected' : ''}>${l.name}</option>`).join('');
            const content = `
                <div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
                    <div class="p-6 border-b"><h3 class="text-2xl font-bold">Assign Daily Task</h3></div>
                    <form id="task-form" class="p-6 space-y-4">
                        <div>
                            <label for="task-worker" class="font-medium text-slate-700">Select Worker</label>
                            <select id="task-worker" class="w-full p-3 border border-slate-300 rounded" required>
                                <option value="">-- Select Worker --</option>
                                ${workerOptions}
                            </select>
                        </div>
                        <div>
                            <label for="task-description" class="font-medium text-slate-700">Task Description</label>
                            <textarea id="task-description" rows="4" class="w-full p-3 border border-slate-300 rounded" placeholder="Describe the task for today..." required>${laborer?.currentTask || ''}</textarea>
                        </div>
                        <div class="flex justify-end gap-4 pt-4">
                            <button type="button" class="modal-cancel-btn px-4 py-2 rounded bg-slate-200">Cancel</button>
                            <button type="submit" class="px-4 py-2 rounded bg-amber-500 font-semibold">Assign Task</button>
                        </div>
                    </form>
                </div>`;
            openModal(content);
            document.getElementById('task-form').addEventListener('submit', async e => {
                e.preventDefault();
                const workerId = document.getElementById('task-worker').value;
                const task = document.getElementById('task-description').value;
                try {
                    await updateDoc(doc(db, 'laborers', workerId), { currentTask: task });
                    alert('Task assigned successfully!');
                    closeModal();
                } catch (error) {
                    console.error("Error assigning task:", error);
                    alert('Error assigning task!');
                }
            });
        };

        // PAGE RENDER FUNCTIONS
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

            page.innerHTML = `
                <h2 class="text-3xl font-bold text-slate-800 mb-6">Dashboard Overview</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-xl shadow-lg">
                        <h3 class="font-medium text-slate-500">Active Workers</h3>
                        <p class="text-4xl font-bold text-slate-800 mt-2">${activeWorkers} / ${totalWorkers}</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-lg">
                        <h3 class="font-medium text-slate-500">Total Sites</h3>
                        <p class="text-4xl font-bold text-slate-800 mt-2">${sitesData.length}</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-lg">
                        <h3 class="font-medium text-slate-500">Payroll (This Month)</h3>
                        <p class="text-4xl font-bold text-slate-800 mt-2">${currencyFormatter.format(totalMonthlyPayroll)}</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-lg md:col-span-2 lg:col-span-3">
                        <h3 class="font-medium text-slate-500 mb-4">Month-to-Date Summary</h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="text-center p-4 bg-blue-50 rounded-lg">
                                <p class="text-sm text-slate-600 mb-1">Total Labor Cost</p>
                                <p class="text-2xl font-bold text-blue-600">${currencyFormatter.format(laborCost)}</p>
                            </div>
                            <div class="text-center p-4 bg-purple-50 rounded-lg">
                                <p class="text-sm text-slate-600 mb-1">Total Expenses</p>
                                <p class="text-2xl font-bold text-purple-600">${currencyFormatter.format(expenseCost)}</p>
                            </div>
                            <div class="text-center p-4 bg-amber-50 rounded-lg">
                                <p class="text-sm text-slate-600 mb-1">Total Project Cost</p>
                                <p class="text-2xl font-bold text-amber-600">${currencyFormatter.format(laborCost + expenseCost)}</p>
                            </div>
                        </div>
                    </div>
                </div>`;
        };

        const renderProjectSummaryPage = async () => {
            const page = mainContent.querySelector('#summary');
            if (!page) return;

            // Group expenses by site
            const expensesBySite = {};
            sitesData.forEach(site => {
                expensesBySite[site.id] = {
                    name: site.name,
                    location: site.location,
                    expenses: 0,
                    labor: 0,
                    total: 0
                };
            });

            expensesData.forEach(expense => {
                if (expensesBySite[expense.siteId]) {
                    expensesBySite[expense.siteId].expenses += expense.amount;
                }
            });

            // Calculate labor cost per site
            for (const site of sitesData) {
                const siteLogs = attendanceLogData.filter(log => log.siteId === site.id);
                const laborerIds = [...new Set(siteLogs.map(log => log.laborerId))];
                
                let siteLabor = 0;
                for (const laborerId of laborerIds) {
                    const laborer = laborersData.find(l => l.id === laborerId);
                    if (!laborer) continue;
                    
                    const workerLogs = siteLogs.filter(log => log.laborerId === laborerId);
                    const hours = calculateHoursWorked(workerLogs);
                    siteLabor += hours * (laborer.hourlyRate || 0);
                }
                
                if (expensesBySite[site.id]) {
                    expensesBySite[site.id].labor = siteLabor;
                    expensesBySite[site.id].total = siteLabor + expensesBySite[site.id].expenses;
                }
            }

            const summaryRows = Object.values(expensesBySite).map(site => `
                <tr class="border-b border-slate-200 hover:bg-slate-50">
                    <td class="py-4 px-6 font-medium text-slate-800">${site.name}</td>
                    <td class="py-4 px-6 text-slate-600">${site.location}</td>
                    <td class="py-4 px-6 text-right">${currencyFormatter.format(site.labor)}</td>
                    <td class="py-4 px-6 text-right">${currencyFormatter.format(site.expenses)}</td>
                    <td class="py-4 px-6 text-right font-bold text-amber-600">${currencyFormatter.format(site.total)}</td>
                </tr>
            `).join('');

            const grandTotal = Object.values(expensesBySite).reduce((sum, site) => sum + site.total, 0);

            page.innerHTML = `
                <h2 class="text-3xl font-bold text-slate-800 mb-6">Project Summary by Site</h2>
                <div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="border-b-2 border-slate-200">
                                <th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Site Name</th>
                                <th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Location</th>
                                <th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Labor Cost</th>
                                <th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Expenses</th>
                                <th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Total Cost</th>
                            </tr>
                        </thead>
                        <tbody>${summaryRows}</tbody>
                        <tfoot>
                            <tr class="bg-slate-100 font-bold">
                                <td colspan="4" class="py-4 px-6 text-right">GRAND TOTAL:</td>
                                <td class="py-4 px-6 text-right text-amber-600">${currencyFormatter.format(grandTotal)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>`;
        };

        const renderDailyTasksPage = () => {
            const page = mainContent.querySelector('#tasks');
            if (!page) return;

            const taskRows = laborersData.map(laborer => `
                <tr class="border-b border-slate-200 hover:bg-slate-50">
                    <td class="py-4 px-6 font-medium text-slate-800">${laborer.name}</td>
                    <td class="py-4 px-6 text-slate-600">${laborer.currentTask || '<span class="text-slate-400">No task assigned</span>'}</td>
                    <td class="py-4 px-6 text-right">
                        <button data-action="assign-task" data-id="${laborer.id}" class="text-blue-500 hover:text-blue-700 font-semibold">
                            ${laborer.currentTask ? 'Edit Task' : 'Assign Task'}
                        </button>
                    </td>
                </tr>
            `).join('');

            page.innerHTML = `
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-3xl font-bold text-slate-800">Daily Tasks</h2>
                    <button data-action="assign-task" class="bg-amber-500 hover:bg-amber-600 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Assign New Task</button>
                </div>
                <div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="border-b-2 border-slate-200">
                                <th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Worker Name</th>
                                <th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Today's Task</th>
                                <th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>${taskRows}</tbody>
                    </table>
                </div>`;
        };

        const renderPayrollPage = async () => {
            const page = mainContent.querySelector('#payroll');
            if (!page) return;

            // Default to current month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

            const payrollData = await calculatePayroll(startOfMonth, endOfMonth);

            const payrollRows = Object.entries(payrollData).map(([id, data]) => `
                <tr class="border-b border-slate-200 hover:bg-slate-50">
                    <td class="py-4 px-6 font-medium text-slate-800">${data.name}</td>
                    <td class="py-4 px-6 text-center">${data.hoursWorked}</td>
                    <td class="py-4 px-6 text-right">${currencyFormatter.format(data.hourlyRate)}</td>
                    <td class="py-4 px-6 text-right">${currencyFormatter.format(data.grossPay)}</td>
                    <td class="py-4 px-6 text-right text-red-600">${currencyFormatter.format(data.advances)}</td>
                    <td class="py-4 px-6 text-right text-blue-600">${currencyFormatter.format(data.deductions)}</td>
                    <td class="py-4 px-6 text-right font-bold text-green-600">${currencyFormatter.format(data.netPayable)}</td>
                </tr>
            `).join('');

            const totals = Object.values(payrollData).reduce((acc, data) => ({
                grossPay: acc.grossPay + data.grossPay,
                advances: acc.advances + data.advances,
                deductions: acc.deductions + data.deductions,
                netPayable: acc.netPayable + data.netPayable
            }), { grossPay: 0, advances: 0, deductions: 0, netPayable: 0 });

            const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

            page.innerHTML = `
                <h2 class="text-3xl font-bold text-slate-800 mb-6">Payroll - ${monthName}</h2>
                <div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead>
                            <tr class="border-b-2 border-slate-200">
                                <th class="py-3 px-4 font-semibold text-slate-500 uppercase">Worker</th>
                                <th class="py-3 px-4 font-semibold text-slate-500 uppercase text-center">Hours</th>
                                <th class="py-3 px-4 font-semibold text-slate-500 uppercase text-right">Rate</th>
                                <th class="py-3 px-4 font-semibold text-slate-500 uppercase text-right">Gross Pay</th>
                                <th class="py-3 px-4 font-semibold text-slate-500 uppercase text-right">Advances</th>
                                <th class="py-3 px-4 font-semibold text-slate-500 uppercase text-right">Deductions</th>
                                <th class="py-3 px-4 font-semibold text-slate-500 uppercase text-right">Net Pay</th>
                            </tr>
                        </thead>
                        <tbody>${payrollRows}</tbody>
                        <tfoot class="bg-slate-100 font-bold">
                            <tr>
                                <td colspan="3" class="py-4 px-4 text-right">TOTALS:</td>
                                <td class="py-4 px-4 text-right">${currencyFormatter.format(totals.grossPay)}</td>
                                <td class="py-4 px-4 text-right text-red-600">${currencyFormatter.format(totals.advances)}</td>
                                <td class="py-4 px-4 text-right text-blue-600">${currencyFormatter.format(totals.deductions)}</td>
                                <td class="py-4 px-4 text-right text-green-600">${currencyFormatter.format(totals.netPayable)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div class="mt-4 text-sm text-slate-600">
                    <p><strong>Note:</strong> Hours calculated from clock-in/out logs. Net Pay = Gross Pay - Advances - Deductions</p>
                </div>`;
        };

        const renderAttendanceLogPage = () => {
            const page = mainContent.querySelector('#attendance');
            if (!page) return;

            const sortedLogs = [...attendanceLogData].sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);

            const logRows = sortedLogs.map(log => {
                const date = log.timestamp?.toDate();
                const dateStr = date ? date.toLocaleString('en-IN', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'N/A';
                
                const site = sitesData.find(s => s.id === log.siteId);
                const actionClass = log.action === 'Work Started' ? 'text-green-600' : 'text-red-600';
                
                return `
                    <tr class="border-b border-slate-200 hover:bg-slate-50">
                        <td class="py-4 px-6">${dateStr}</td>
                        <td class="py-4 px-6 font-medium text-slate-800">${log.laborerName}</td>
                        <td class="py-4 px-6">${site?.name || 'Unknown Site'}</td>
                        <td class="py-4 px-6 ${actionClass} font-semibold">${log.action}</td>
                    </tr>
                `;
            }).join('');

            page.innerHTML = `
                <h2 class="text-3xl font-bold text-slate-800 mb-6">Attendance Log</h2>
                <div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="border-b-2 border-slate-200">
                                <th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Date & Time</th>
                                <th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Worker</th>
                                <th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Site</th>
                                <th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody>${logRows.length > 0 ? logRows : '<tr><td colspan="4" class="py-8 text-center text-slate-500">No attendance records yet</td></tr>'}</tbody>
                    </table>
                </div>`;
        };
        
        const renderSitesPage = () => {
             const page = mainContent.querySelector('#sites');
             if(!page) return;
             let tableRows = sitesData.map(site => `<tr class="border-b border-slate-200 hover:bg-slate-50"><td class="py-4 px-6 font-medium text-slate-800">${site.name}</td><td class="py-4 px-6 text-slate-600">${site.location}</td><td class="py-4 px-6 text-right"><div class="flex items-center justify-end space-x-4"><button data-action="edit-site" data-id="${site.id}" class="text-slate-500 hover:text-blue-600 action-icon" title="Edit Site"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button><button data-action="delete-site" data-id="${site.id}" class="text-slate-500 hover:text-red-600 action-icon" title="Delete Site"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button></div></td></tr>`).join('');
             page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Manage Sites</h2><button data-action="add-site" class="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Add New Site</button></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Site Name</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Location</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th></tr></thead><tbody>${tableRows.length > 0 ? tableRows : '<tr><td colspan="3" class="py-8 text-center text-slate-500">No sites yet. Add your first site!</td></tr>'}</tbody></table></div>`;
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
            page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Manage Workers</h2><button data-action="add-laborer" class="bg-amber-500 hover:bg-amber-600 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Add New Worker</button></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Name</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Assigned Sites</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Mobile</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Status</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th></tr></thead><tbody>${tableRows.length > 0 ? tableRows : '<tr><td colspan="5" class="py-8 text-center text-slate-500">No workers yet. Add your first worker!</td></tr>'}</tbody></table></div>`;
        };
        
        const renderExpensesPage = () => {
             const page = mainContent.querySelector('#expenses');
             if(!page) return;
             const sortedExpenses = [...expensesData].sort((a,b) => new Date(b.date) - new Date(a.date));
             let tableRows = sortedExpenses.map(e => `<tr class="border-b border-slate-200 hover:bg-slate-50"><td class="py-4 px-6">${e.date}</td><td class="py-4 px-6">${sitesData.find(s=>s.id===e.siteId)?.name ||'N/A'}</td><td class="py-4 px-6">${e.description}</td><td class="py-4 px-6 text-right">${currencyFormatter.format(e.amount)}</td><td class="py-4 px-6 text-right"><div class="flex items-center justify-end space-x-4"><button data-action="edit-expense" data-id="${e.id}" class="text-slate-500 hover:text-blue-600 action-icon" title="Edit Expense"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button><button data-action="delete-expense" data-id="${e.id}" class="text-slate-500 hover:text-red-600 action-icon" title="Delete Expense"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button></div></td></tr>`).join('');
             page.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-slate-800">Track Expenses</h2><button data-action="add-expense" class="bg-amber-500 hover:bg-amber-600 font-bold py-2 px-5 rounded-lg shadow-sm transition-colors">Add New Expense</button></div><div class="bg-white p-2 sm:p-4 rounded-xl shadow-lg overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b-2 border-slate-200"><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Date</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Site</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase">Description</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Amount</th><th class="py-3 px-6 text-sm font-semibold text-slate-500 uppercase text-right">Actions</th></tr></thead><tbody>${tableRows.length > 0 ? tableRows : '<tr><td colspan="5" class="py-8 text-center text-slate-500">No expenses yet. Add your first expense!</td></tr>'}</tbody></table></div>`;
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
            if (action === 'assign-task') openTaskModal(id ? laborersData.find(l => l.id === id) : null);
        });

        onSnapshot(query(collection(db, "sites")), snap => { sitesData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNavigation(); }, console.error);
        onSnapshot(query(collection(db, "laborers")), snap => { laborersData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNavigation(); }, console.error);
        onSnapshot(query(collection(db, "expenses")), snap => { expensesData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNavigation(); }, console.error);
        onSnapshot(query(collection(db, "attendance_logs")), snap => { attendanceLogData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNavigation(); }, console.error);
        onSnapshot(query(collection(db, "finances")), snap => { financesData = snap.docs.map(d => ({ id: d.id, ...d.data() })); handleNavigation(); }, console.error);
        
        handleNavigation();
    }
});
