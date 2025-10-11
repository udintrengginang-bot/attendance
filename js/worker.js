import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, orderBy, getDoc, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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

// Translations
const translations = {
    en: {
        worker_portal: "Worker Portal", mobile_label: "Mobile Number", pin_label: "4-Digit PIN",
        placeholder_mobile: "Enter 10-digit number", placeholder_pin: "Enter 4-digit PIN",
        login: "Login", need_help: "Need help?", call_ajit: "Call Ajit", whatsapp: "WhatsApp",
        welcome: "Welcome", todays_task: "Today's Task", from_ajit: "From Ajit",
        select_site: "📍 Where are you today?", start_work: "START WORK",
        working_at: "Working today at", working_time: "⏱️ Working",
        todays_earnings: "💰 Today's Earnings", hourly_rate: "Hourly Rate",
        upload_photo: "Upload Photo", end_work: "END WORK", work_history: "Last 7 Days",
        upload_work_photo: "📷 Upload Today's Work Photo",
        take_photo: "Camera", gallery: "Gallery",
        placeholder_description: "Example: Completed wall plastering",
        cancel: "Cancel", upload: "Upload Photo", end_work_confirm: "⚠️ End Your Work Day?",
        keep_working: "Keep Working", yes_end_work: "End Work",
        work_ended: "Work Day Ended!", you_worked: "You worked:", you_earned: "You earned:",
        see_you_tomorrow: "See you tomorrow! 👋", close: "Close", logout: "Logout",
        invalid_login: "Invalid mobile number or PIN", work_started: "Work started!",
        work_ended_success: "Work ended!", photo_uploaded: "Photo uploaded!", uploading: "Uploading..."
    },
    hi: {
        worker_portal: "कामगार पोर्टल", mobile_label: "मोबाइल नंबर", pin_label: "4-अंकीय पिन",
        placeholder_mobile: "10-अंकीय नंबर दर्ज करें", placeholder_pin: "4-अंकीय पिन दर्ज करें",
        login: "लॉग इन करें", need_help: "मदद चाहिए?", call_ajit: "अजित को कॉल करें", whatsapp: "व्हाट्सएप",
        welcome: "आपका स्वागत है", todays_task: "आज का कार्य", from_ajit: "अजित की ओर से",
        select_site: "📍 आज आप कहाँ हैं?", start_work: "काम शुरू करें",
        working_at: "आज काम कर रहे हैं", working_time: "⏱️ काम कर रहे हैं",
        todays_earnings: "💰 आज की कमाई", hourly_rate: "प्रति घंटा दर",
        upload_photo: "फोटो अपलोड करें", end_work: "काम समाप्त करें", work_history: "पिछले 7 दिन",
        upload_work_photo: "📷 आज के काम की फोटो अपलोड करें",
        take_photo: "कैमरा", gallery: "गैलरी",
        placeholder_description: "उदाहरण: दीवार प्लास्टर पूरा किया",
        cancel: "रद्द करें", upload: "फोटो अपलोड करें", end_work_confirm: "⚠️ काम का दिन समाप्त करें?",
        keep_working: "काम जारी रखें", yes_end_work: "हाँ, काम समाप्त करें",
        work_ended: "काम का दिन समाप्त!", you_worked: "आपने काम किया:", you_earned: "आपने कमाया:",
        see_you_tomorrow: "कल मिलेंगे! 👋", close: "बंद करें", logout: "लॉग आउट",
        invalid_login: "गलत मोबाइल नंबर या पिन", work_started: "काम शुरू हो गया!",
        work_ended_success: "काम समाप्त हो गया!", photo_uploaded: "फोटो अपलोड हो गया!", uploading: "अपलोड हो रहा है..."
    },
    mr: {
        worker_portal: "कामगार पोर्टल", mobile_label: "मोबाइल नंबर", pin_label: "4-अंकी पिन",
        placeholder_mobile: "10-अंकी नंबर टाका", placeholder_pin: "4-अंकी पिन टाका",
        login: "लॉग इन करा", need_help: "मदत हवी आहे?", call_ajit: "अजित ला कॉल करा", whatsapp: "व्हाट्सअॅप",
        welcome: "आपले स्वागत आहे", todays_task: "आजचे कार्य", from_ajit: "अजित कडून",
        select_site: "📍 आज तुम्ही कुठे आहात?", start_work: "काम सुरू करा",
        working_at: "आज काम करत आहात", working_time: "⏱️ काम करत आहात",
        todays_earnings: "💰 आजची कमाई", hourly_rate: "तासाची दर",
        upload_photo: "फोटो अपलोड करा", end_work: "काम संपवा", work_history: "गेले 7 दिवस",
        upload_work_photo: "📷 आजच्या कामाचा फोटो अपलोड करा",
        take_photo: "कॅमेरा", gallery: "गॅलरी",
        placeholder_description: "उदाहरण: भिंत प्लास्टर पूर्ण केले",
        cancel: "रद्द करा", upload: "फोटो अपलोड करा", end_work_confirm: "⚠️ कामाचा दिवस संपवायचा?",
        keep_working: "काम चालू ठेवा", yes_end_work: "होय, काम संपवा",
        work_ended: "कामाचा दिवस संपला!", you_worked: "तुम्ही काम केलेत:", you_earned: "तुम्ही कमावलेत:",
        see_you_tomorrow: "उद्या भेटू! 👋", close: "बंद करा", logout: "लॉग आउट",
        invalid_login: "चुकीचा मोबाइल नंबर किंवा पिन", work_started: "काम सुरू झाले!",
        work_ended_success: "काम संपले!", photo_uploaded: "फोटो अपलोड झाला!", uploading: "अपलोड करत आहे..."
    }
};

let currentLanguage = localStorage.getItem('shreeved-lang-worker') || 'en';
let currentWorker = null;
let sitesData = [];
let workStartTime = null;
let timerInterval = null;
let selectedPhoto = null;

// PERSISTENT STORAGE KEYS
const STORAGE_KEYS = {
    WORK_START: 'shreeved_work_start',
    CURRENT_SITE: 'shreeved_current_site',
    WORKER_ID: 'shreeved_worker_id'
};

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('shreeved-lang-worker', lang);
    
    // Update all translated elements
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
    
    // Update placeholders
    document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
        const key = el.getAttribute('data-translate-placeholder');
        if (translations[lang] && translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });
    
    // Update active language buttons
    document.querySelectorAll('.lang-btn, .lang-btn-dash').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}:${mins.toString().padStart(2, '0')}`;
}

function calculateEarnings(minutes, hourlyRate) {
    const hours = minutes / 60;
    return Math.round(hours * hourlyRate);
}

// SAVE WORK STATE TO LOCALSTORAGE (for persistence)
function saveWorkState() {
    if (workStartTime && currentWorker) {
        localStorage.setItem(STORAGE_KEYS.WORK_START, workStartTime.toISOString());
        localStorage.setItem(STORAGE_KEYS.CURRENT_SITE, currentWorker.currentSiteId || '');
        localStorage.setItem(STORAGE_KEYS.WORKER_ID, currentWorker.id);
    }
}

// RESTORE WORK STATE FROM LOCALSTORAGE
function restoreWorkState() {
    const savedStartTime = localStorage.getItem(STORAGE_KEYS.WORK_START);
    const savedSiteId = localStorage.getItem(STORAGE_KEYS.CURRENT_SITE);
    const savedWorkerId = localStorage.getItem(STORAGE_KEYS.WORKER_ID);
    
    if (savedStartTime && savedSiteId && savedWorkerId && currentWorker && currentWorker.id === savedWorkerId) {
        workStartTime = new Date(savedStartTime);
        return true;
    }
    return false;
}

// CLEAR WORK STATE
function clearWorkState() {
    localStorage.removeItem(STORAGE_KEYS.WORK_START);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SITE);
    localStorage.removeItem(STORAGE_KEYS.WORKER_ID);
}

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxWidth = 1200;
                const maxHeight = 1200;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    }));
                }, 'image/jpeg', 0.7);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function createLog(action, siteId) {
    if (!currentWorker || !siteId) return;
    try {
        await addDoc(collection(db, "attendance_logs"), {
            laborerId: currentWorker.id,
            laborerName: currentWorker.name,
            action: action,
            siteId: siteId,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error creating attendance log:", error);
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (!workStartTime) return;
        
        const now = new Date();
        const minutesWorked = (now - workStartTime) / (1000 * 60);
        
        const timerEl = document.getElementById('timer-display');
        if (timerEl) timerEl.textContent = formatTime(minutesWorked);
        
        const earnings = calculateEarnings(minutesWorked, currentWorker.hourlyRate || 0);
        const earningsEl = document.getElementById('earnings-display');
        if (earningsEl) earningsEl.textContent = `₹${earnings}`;
        
        // Save state every minute
        if (Math.floor(minutesWorked) % 1 === 0) {
            saveWorkState();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    clearWorkState();
}

async function load7DayHistory() {
    if (!currentWorker) return;
    
    const historyList = document.getElementById('history-list');
    const historyCard = document.getElementById('work-history-card');
    
    if (!historyList || !historyCard) return;
    
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        
        const logsQuery = query(
            collection(db, 'attendance_logs'),
            where('laborerId', '==', currentWorker.id),
            where('timestamp', '>=', sevenDaysAgo),
            orderBy('timestamp', 'desc')
        );
        
        const logsSnapshot = await getDocs(logsQuery);
        const logs = logsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const logsByDate = {};
        logs.forEach(log => {
            if (!log.timestamp) return;
            const date = log.timestamp.toDate().toLocaleDateString('en-IN');
            if (!logsByDate[date]) logsByDate[date] = [];
            logsByDate[date].push(log);
        });
        
        const dailyStats = [];
        Object.entries(logsByDate).forEach(([date, dayLogs]) => {
            let totalMinutes = 0;
            let currentStart = null;
            
            dayLogs.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
            
            dayLogs.forEach(log => {
                if (log.action === 'Work Started') {
                    currentStart = log.timestamp.toDate();
                } else if (log.action === 'Work Ended' && currentStart) {
                    const end = log.timestamp.toDate();
                    totalMinutes += (end - currentStart) / (1000 * 60);
                    currentStart = null;
                }
            });
            
            const earnings = calculateEarnings(totalMinutes, currentWorker.hourlyRate || 0);
            const siteName = dayLogs[0] ? sitesData.find(s => s.id === dayLogs[0].siteId)?.name : 'Unknown';
            
            dailyStats.push({ date, hours: formatTime(totalMinutes), earnings, site: siteName });
        });
        
        if (dailyStats.length === 0) {
            historyList.innerHTML = '<p class="text-slate-500 text-center">No work history yet</p>';
        } else {
            historyList.innerHTML = dailyStats.map(day => `
                <div class="border-l-4 border-teal-500 pl-4 py-2">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-semibold text-slate-800">${day.date}</p>
                            <p class="text-sm text-slate-600">📍 ${day.site}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-slate-800">⏱️ ${day.hours}</p>
                            <p class="text-sm text-emerald-600">₹${day.earnings}</p>
                        </div>
                    </div>
                </div>
            `).join('');
            historyCard.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error loading history:", error);
        if (historyList) {
            historyList.innerHTML = '<p class="text-slate-500 text-center">Unable to load work history</p>';
        }
    }
}

function updateUI(isWorking) {
    const siteSelection = document.getElementById('site-selection-view');
    const workingCard = document.getElementById('working-status-card');
    const startBtn = document.getElementById('start-work-btn');
    const uploadBtn = document.getElementById('upload-photo-btn');
    const endBtn = document.getElementById('end-work-btn');
    
    if (siteSelection) siteSelection.classList.toggle('hidden', isWorking);
    if (workingCard) workingCard.classList.toggle('hidden', !isWorking);
    if (startBtn) startBtn.classList.toggle('hidden', isWorking);
    if (uploadBtn) uploadBtn.classList.toggle('hidden', !isWorking);
    if (endBtn) endBtn.classList.toggle('hidden', !isWorking);
}

async function showDashboard(worker) {
    currentWorker = worker;
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    const t = translations[currentLanguage];
    const workerNameEl = document.getElementById('worker-name');
    if (workerNameEl) {
        workerNameEl.textContent = `${t.welcome}, ${worker.name}`;
    }
    
    const hourlyRateEl = document.getElementById('hourly-rate-display');
    if (hourlyRateEl) {
        hourlyRateEl.textContent = `₹${worker.hourlyRate || 0}`;
    }
    
    // Check if worker is currently working
    if (worker.status === 'Work Started' && worker.currentSiteId) {
        const site = sitesData.find(s => s.id === worker.currentSiteId);
        if (site) {
            const siteNameEl = document.getElementById('current-site-name');
            if (siteNameEl) {
                const spanEl = siteNameEl.querySelector('span:last-child');
                if (spanEl) spanEl.textContent = site.name;
            }
            
            // FETCH ACTUAL START TIME FROM FIRESTORE
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const logsQuery = query(
                    collection(db, 'attendance_logs'),
                    where('laborerId', '==', worker.id),
                    where('action', '==', 'Work Started'),
                    where('timestamp', '>=', today),
                    orderBy('timestamp', 'desc'),
                    limit(1)
                );
                
                const logsSnapshot = await getDocs(logsQuery);
                
                if (!logsSnapshot.empty) {
                    const lastLog = logsSnapshot.docs[0].data();
                    workStartTime = lastLog.timestamp.toDate();
                    console.log('Restored work start time from Firestore:', workStartTime);
                } else {
                    // Fallback to current time if no log found
                    workStartTime = new Date();
                    console.log('No log found, using current time');
                }
                
                saveWorkState();
            } catch (error) {
                console.error('Error fetching start time:', error);
                // Try to restore from localStorage
                const hasRestoredState = restoreWorkState();
                if (!hasRestoredState) {
                    workStartTime = new Date();
                }
            }
            
            updateUI(true);
            startTimer();
        }
    } else {
        clearWorkState();
        updateUI(false);
        loadSites();
    }
    
    // Load today's task
    loadTodayTask();
    
    // Load work history
    load7DayHistory();
    
    // Request notification permission
    setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, 2000);
}

async function loadTodayTask() {
    if (!currentWorker) return;
    
    const today = new Date().toISOString().split('T')[0];
    const taskCard = document.getElementById('task-card');
    const taskDesc = document.getElementById('task-description');
    
    if (!taskCard || !taskDesc) return;
    
    try {
        // First check worker's currentTask
        if (currentWorker.currentTask) {
            taskDesc.textContent = currentWorker.currentTask;
            taskCard.classList.remove('hidden');
            return;
        }
        
        // Otherwise check daily_tasks collection
        const taskQuery = query(
            collection(db, 'daily_tasks'),
            where('laborerId', '==', currentWorker.id),
            where('date', '==', today)
        );
        
        const taskSnapshot = await getDocs(taskQuery);
        
        if (!taskSnapshot.empty) {
            const task = taskSnapshot.docs[0].data();
            taskDesc.textContent = task.task;
            taskCard.classList.remove('hidden');
        } else {
            taskCard.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error loading task:", error);
        taskCard.classList.add('hidden');
    }
}

function loadSites() {
    const siteSelect = document.getElementById('site-select');
    if (!siteSelect) return;
    
    const assignedSites = sitesData.filter(s => currentWorker.assignedSiteIds?.includes(s.id));
    
    if (assignedSites.length > 0) {
        siteSelect.innerHTML = assignedSites.map(s => 
            `<option value="${s.id}">${s.name}</option>`
        ).join('');
        siteSelect.disabled = false;
    } else {
        const t = translations[currentLanguage];
        siteSelect.innerHTML = `<option value="">No sites assigned</option>`;
        siteSelect.disabled = true;
        const startBtn = document.getElementById('start-work-btn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = `<span class="text-3xl">📍</span><span>Contact Ajit</span>`;
        }
    }
}

function showLogin() {
    currentWorker = null;
    workStartTime = null;
    stopTimer();
    clearWorkState();
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.reset();
    const errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLanguage);
    
    // Language switchers - LOGIN
    document.querySelectorAll('#language-switcher .lang-btn').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });
    
    // Language switchers - DASHBOARD
    document.querySelectorAll('#language-switcher-dashboard .lang-btn-dash').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        // Load saved preference
        const isDark = localStorage.getItem('shreeved-dark-mode') === 'true';
        if (isDark) {
            document.body.classList.add('dark-mode');
            darkModeToggle.textContent = '☀️';
        }
        
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDarkNow = document.body.classList.contains('dark-mode');
            darkModeToggle.textContent = isDarkNow ? '☀️' : '🌙';
            localStorage.setItem('shreeved-dark-mode', isDarkNow);
        });
    }
    
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const t = translations[currentLanguage];
            const errorEl = document.getElementById('login-error');
            if (errorEl) errorEl.textContent = '';
            
            const mobile = document.getElementById('mobile-number').value.trim();
            const pin = document.getElementById('pin').value.trim();
            
            if (mobile.length !== 10 || pin.length !== 4) {
                if (errorEl) errorEl.textContent = t.invalid_login;
                return;
            }
            
            try {
                const q = query(
                    collection(db, 'laborers'),
                    where('mobileNumber', '==', mobile),
                    where('pin', '==', pin)
                );
                
                const snapshot = await getDocs(q);
                
                if (snapshot.empty) {
                    if (errorEl) errorEl.textContent = t.invalid_login;
                } else {
                    await showDashboard({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
                }
            } catch (error) {
                console.error("Login error:", error);
                if (errorEl) errorEl.textContent = 'Error occurred. Please try again.';
            }
        });
    }
    
    // Start work button
    const startWorkBtn = document.getElementById('start-work-btn');
    if (startWorkBtn) {
        startWorkBtn.addEventListener('click', async () => {
            if (!currentWorker) return;
            
            const siteSelect = document.getElementById('site-select');
            const siteId = siteSelect?.value;
            if (!siteId) return;
            
            try {
                workStartTime = new Date();
                
                await updateDoc(doc(db, 'laborers', currentWorker.id), {
                    status: 'Work Started',
                    currentSiteId: siteId
                });
                
                await createLog('Work Started', siteId);
                
                currentWorker.status = 'Work Started';
                currentWorker.currentSiteId = siteId;
                
                // Save to localStorage
                saveWorkState();
                
                const site = sitesData.find(s => s.id === siteId);
                const siteNameEl = document.getElementById('current-site-name');
                if (siteNameEl && site) {
                    const spanEl = siteNameEl.querySelector('span:last-child');
                    if (spanEl) spanEl.textContent = site.name;
                }
                
                updateUI(true);
                startTimer();
                
                // Show success message
                const t = translations[currentLanguage];
                alert(t.work_started);
                
            } catch (error) {
                console.error("Error starting work:", error);
                alert('Error starting work');
            }
        });
    }
    
    // Upload photo button
    const uploadPhotoBtn = document.getElementById('upload-photo-btn');
    if (uploadPhotoBtn) {
        uploadPhotoBtn.addEventListener('click', () => {
            const modal = document.getElementById('photo-upload-modal');
            if (modal) modal.classList.remove('hidden');
        });
    }
    
    // Camera button - FIXED
    const cameraBtn = document.getElementById('camera-btn');
    if (cameraBtn) {
        cameraBtn.addEventListener('click', () => {
            const input = document.getElementById('photo-input');
            if (input) {
                input.setAttribute('capture', 'environment');
                input.accept = 'image/*';
                input.click();
            }
        });
    }
    
    // Gallery button - FIXED
    const galleryBtn = document.getElementById('gallery-btn');
    if (galleryBtn) {
        galleryBtn.addEventListener('click', () => {
            const input = document.getElementById('photo-input');
            if (input) {
                input.removeAttribute('capture');
                input.accept = 'image/*';
                input.click();
            }
        });
    }
    
    // Photo input change
    const photoInput = document.getElementById('photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.size > 5 * 1024 * 1024) {
                alert('File too large! Max 5MB allowed.');
                return;
            }
            
            selectedPhoto = file;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('photo-preview');
                const container = document.getElementById('photo-preview-container');
                const submitBtn = document.getElementById('upload-photo-submit-btn');
                
                if (preview) preview.src = e.target.result;
                if (container) container.classList.remove('hidden');
                if (submitBtn) submitBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Cancel photo upload
    const cancelPhotoBtn = document.getElementById('cancel-photo-btn');
    if (cancelPhotoBtn) {
        cancelPhotoBtn.addEventListener('click', () => {
            const modal = document.getElementById('photo-upload-modal');
            const input = document.getElementById('photo-input');
            const desc = document.getElementById('photo-description');
            const container = document.getElementById('photo-preview-container');
            const submitBtn = document.getElementById('upload-photo-submit-btn');
            
            if (modal) modal.classList.add('hidden');
            if (input) input.value = '';
            if (desc) desc.value = '';
            if (container) container.classList.add('hidden');
            if (submitBtn) submitBtn.disabled = true;
            selectedPhoto = null;
        });
    }
    
    // Upload photo submit
    const uploadPhotoSubmitBtn = document.getElementById('upload-photo-submit-btn');
    if (uploadPhotoSubmitBtn) {
        uploadPhotoSubmitBtn.addEventListener('click', async () => {
            if (!selectedPhoto || !currentWorker) return;
            
            const t = translations[currentLanguage];
            const description = document.getElementById('photo-description')?.value.trim();
            const statusEl = document.getElementById('upload-status');
            
            if (!description) {
                if (statusEl) {
                    statusEl.textContent = 'Please add a description';
                    statusEl.className = 'text-center text-sm font-semibold text-red-500';
                }
                return;
            }
            
            try {
                if (statusEl) {
                    statusEl.textContent = t.uploading;
                    statusEl.className = 'text-center text-sm font-semibold text-blue-500';
                }
                uploadPhotoSubmitBtn.disabled = true;
                
                const compressedFile = await compressImage(selectedPhoto);
                
                const timestamp = Date.now();
                const filename = `${currentWorker.id}_${timestamp}.jpg`;
                const storageRef = ref(storage, `work_photos/${currentWorker.currentSiteId}/${filename}`);
                
                await uploadBytes(storageRef, compressedFile);
                const photoURL = await getDownloadURL(storageRef);
                
                await addDoc(collection(db, 'work_photos'), {
                    laborerId: currentWorker.id,
                    laborerName: currentWorker.name,
                    siteId: currentWorker.currentSiteId,
                    photoURL,
                    description,
                    uploadedAt: serverTimestamp()
                });
                
                if (statusEl) {
                    statusEl.textContent = t.photo_uploaded;
                    statusEl.className = 'text-center text-sm font-semibold text-green-500';
                }
                
                setTimeout(() => {
                    cancelPhotoBtn.click();
                    if (statusEl) statusEl.textContent = '';
                }, 2000);
                
            } catch (error) {
                console.error("Error uploading photo:", error);
                if (statusEl) {
                    statusEl.textContent = 'Error uploading photo';
                    statusEl.className = 'text-center text-sm font-semibold text-red-500';
                }
                uploadPhotoSubmitBtn.disabled = false;
            }
        });
    }
    
    // End work button
    const endWorkBtn = document.getElementById('end-work-btn');
    if (endWorkBtn) {
        endWorkBtn.addEventListener('click', () => {
            if (!currentWorker || !workStartTime) return;
            
            const now = new Date();
            const minutesWorked = (now - workStartTime) / (1000 * 60);
            const earnings = calculateEarnings(minutesWorked, currentWorker.hourlyRate || 0);
            const site = sitesData.find(s => s.id === currentWorker.currentSiteId);
            
            const siteEl = document.getElementById('end-work-site');
            const hoursEl = document.getElementById('end-work-hours');
            const earningsEl = document.getElementById('end-work-earnings');
            
            if (siteEl) {
                const spanEl = siteEl.querySelector('span');
                if (spanEl) spanEl.textContent = site?.name || 'Unknown';
            }
            if (hoursEl) hoursEl.textContent = formatTime(minutesWorked);
            if (earningsEl) earningsEl.textContent = `₹${earnings}`;
            
            const modal = document.getElementById('end-work-modal');
            if (modal) modal.classList.remove('hidden');
        });
    }
    
    // Cancel end work
    const cancelEndWorkBtn = document.getElementById('cancel-end-work-btn');
    if (cancelEndWorkBtn) {
        cancelEndWorkBtn.addEventListener('click', () => {
            const modal = document.getElementById('end-work-modal');
            if (modal) modal.classList.add('hidden');
        });
    }
    
    // Confirm end work
    const confirmEndWorkBtn = document.getElementById('confirm-end-work-btn');
    if (confirmEndWorkBtn) {
        confirmEndWorkBtn.addEventListener('click', async () => {
            if (!currentWorker) return;
            
            try {
                const now = new Date();
                const minutesWorked = (now - workStartTime) / (1000 * 60);
                const earnings = calculateEarnings(minutesWorked, currentWorker.hourlyRate || 0);
                const site = sitesData.find(s => s.id === currentWorker.currentSiteId);
                
                await updateDoc(doc(db, 'laborers', currentWorker.id), {
                    status: 'Work Ended'
                });
                
                await createLog('Work Ended', currentWorker.currentSiteId);
                
                stopTimer();
                
                const endModal = document.getElementById('end-work-modal');
                if (endModal) endModal.classList.add('hidden');
                
                const successHoursEl = document.getElementById('success-hours');
                const successEarningsEl = document.getElementById('success-earnings');
                const successSiteEl = document.getElementById('success-site');
                
                if (successHoursEl) successHoursEl.textContent = formatTime(minutesWorked);
                if (successEarningsEl) successEarningsEl.textContent = `₹${earnings}*`;
                if (successSiteEl) successSiteEl.textContent = site?.name || 'Unknown';
                
                const encouragements = [
                    '🌟 Excellent work today!',
                    '💪 Keep up the great work!',
                    '👏 Another productive day!',
                    '🎯 Well done!',
                    '✨ Outstanding effort!',
                    '🏆 You\'re doing amazing!'
                ];
                const randomMsg = encouragements[Math.floor(Math.random() * encouragements.length)];
                const encouragementEl = document.getElementById('encouragement-message');
                if (encouragementEl) encouragementEl.textContent = randomMsg;
                
                const successModal = document.getElementById('work-ended-modal');
                if (successModal) successModal.classList.remove('hidden');
                
            } catch (error) {
                console.error("Error ending work:", error);
                alert('Error ending work');
            }
        });
    }
    
    // Close success modal
    const closeSuccessBtn = document.getElementById('close-success-btn');
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', () => {
            const modal = document.getElementById('work-ended-modal');
            if (modal) modal.classList.add('hidden');
            currentWorker.status = 'Work Ended';
            workStartTime = null;
            updateUI(false);
            loadSites();
            load7DayHistory();
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', showLogin);
    }
    
    // Initialize Firebase Auth
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const sitesSnapshot = await getDocs(collection(db, 'sites'));
                sitesData = sitesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (error) {
                console.error("Error loading sites:", error);
            }
        } else {
            signInAnonymously(auth).catch(err => console.error("Anonymous auth failed:", err));
        }
    });
    
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(err => {
            console.log('Service Worker registration failed:', err);
        });
    }
});
