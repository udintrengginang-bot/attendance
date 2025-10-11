import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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
        worker_checkin: "Worker Portal", mobile_label: "Mobile Number", pin_label: "4-Digit PIN",
        placeholder_mobile: "Enter 10-digit number", placeholder_pin: "Enter 4-digit PIN",
        login: "Login", need_help: "Need help?", call_ajit: "Call Ajit", whatsapp: "WhatsApp",
        welcome: "Welcome", todays_task: "Today's Task", from_ajit: "From Ajit",
        select_site: "📍 Where are you today?", start_work: "START WORK",
        working_at: "Working today at", working_time: "⏱️ Working", hours_minutes: "hours : minutes",
        todays_earnings: "💰 Today's Earnings", hourly_rate: "Hourly Rate", per_hour: "/hr",
        pay_disclaimer: "* Pay can be modified. Contact Ajit for details.",
        upload_photo: "Upload Work Photo", end_work: "END WORK", work_history: "Last 7 Days",
        upload_work_photo: "📷 Upload Today's Work Photo", photo_tips: "✨ Tips for good photos:",
        tip_1: "• Show what you completed today", tip_2: "• Take clear, well-lit photos",
        tip_3: "• Include the work area", take_photo: "Take Photo", gallery: "Gallery",
        work_description: "📝 What did you work on?",
        placeholder_description: "Example: Completed wall plastering in Room 2",
        cancel: "Cancel", upload: "Upload Photo", end_work_confirm: "⚠️ End Your Work Day?",
        worked_at: "You worked at:", total_time: "⏱️ Total time:", earnings: "💰 Earnings:",
        pay_final_disclaimer: "* Final pay confirmed by Ajit at month-end",
        keep_working: "No, Keep Working", yes_end_work: "Yes, End Work",
        work_ended: "Work Day Ended!", you_worked: "You worked:", you_earned: "You earned:",
        site: "Site:", see_you_tomorrow: "See you tomorrow! 👋", close: "Close", logout: "Logout",
        no_sites: "No sites assigned", contact_ajit: "Contact Ajit to assign sites",
        invalid_login: "Invalid mobile number or PIN", error_occurred: "An error occurred. Please try again.",
        photo_uploaded: "Photo uploaded successfully!", uploading: "Uploading...",
        error_upload: "Error uploading photo", select_photo_first: "Please select a photo first",
        work_started: "Work started successfully!", work_ended_success: "Work ended successfully!",
        error_start: "Error starting work", error_end: "Error ending work"
    },
    hi: {
        worker_checkin: "कामगार पोर्टल", mobile_label: "मोबाइल नंबर", pin_label: "4-अंकीय पिन",
        placeholder_mobile: "10-अंकीय नंबर दर्ज करें", placeholder_pin: "4-अंकीय पिन दर्ज करें",
        login: "लॉग इन करें", need_help: "मदद चाहिए?", call_ajit: "अजित को कॉल करें", whatsapp: "व्हाट्सएप",
        welcome: "आपका स्वागत है", todays_task: "आज का कार्य", from_ajit: "अजित की ओर से",
        select_site: "📍 आज आप कहाँ हैं?", start_work: "काम शुरू करें",
        working_at: "आज काम कर रहे हैं", working_time: "⏱️ काम कर रहे हैं", hours_minutes: "घंटे : मिनट",
        todays_earnings: "💰 आज की कमाई", hourly_rate: "प्रति घंटा दर", per_hour: "/घंटा",
        pay_disclaimer: "* वेतन संशोधित किया जा सकता है। विवरण के लिए अजित से संपर्क करें।",
        upload_photo: "काम की फोटो अपलोड करें", end_work: "काम समाप्त करें", work_history: "पिछले 7 दिन",
        upload_work_photo: "📷 आज के काम की फोटो अपलोड करें", photo_tips: "✨ अच्छी फोटो के लिए सुझाव:",
        tip_1: "• आज क्या पूरा किया दिखाएं", tip_2: "• स्पष्ट, अच्छी रोशनी में फोटो लें",
        tip_3: "• काम के क्षेत्र को शामिल करें", take_photo: "फोटो लें", gallery: "गैलरी",
        work_description: "📝 आपने क्या काम किया?",
        placeholder_description: "उदाहरण: कमरा 2 में दीवार का प्लास्टर पूरा किया",
        cancel: "रद्द करें", upload: "फोटो अपलोड करें", end_work_confirm: "⚠️ काम का दिन समाप्त करें?",
        worked_at: "आपने काम किया:", total_time: "⏱️ कुल समय:", earnings: "💰 कमाई:",
        pay_final_disclaimer: "* अंतिम वेतन महीने के अंत में अजित द्वारा पुष्टि की जाएगी",
        keep_working: "नहीं, काम जारी रखें", yes_end_work: "हाँ, काम समाप्त करें",
        work_ended: "काम का दिन समाप्त!", you_worked: "आपने काम किया:", you_earned: "आपने कमाया:",
        site: "साइट:", see_you_tomorrow: "कल मिलेंगे! 👋", close: "बंद करें", logout: "लॉग आउट",
        no_sites: "कोई साइट निर्धारित नहीं", contact_ajit: "साइट निर्धारित करने के लिए अजित से संपर्क करें",
        invalid_login: "गलत मोबाइल नंबर या पिन", error_occurred: "एक त्रुटि हुई। कृपया पुनः प्रयास करें।",
        photo_uploaded: "फोटो सफलतापूर्वक अपलोड!", uploading: "अपलोड हो रहा है...",
        error_upload: "फोटो अपलोड करने में त्रुटि", select_photo_first: "कृपया पहले एक फोटो चुनें",
        work_started: "काम सफलतापूर्वक शुरू!", work_ended_success: "काम सफलतापूर्वक समाप्त!",
        error_start: "काम शुरू करने में त्रुटि", error_end: "काम समाप्त करने में त्रुटि"
    },
    mr: {
        worker_checkin: "कामगार पोर्टल", mobile_label: "मोबाइल नंबर", pin_label: "4-अंकी पिन",
        placeholder_mobile: "10-अंकी नंबर टाका", placeholder_pin: "4-अंकी पिन टाका",
        login: "लॉग इन करा", need_help: "मदत हवी आहे?", call_ajit: "अजित ला कॉल करा", whatsapp: "व्हाट्सअॅप",
        welcome: "आपले स्वागत आहे", todays_task: "आजचे कार्य", from_ajit: "अजित कडून",
        select_site: "📍 आज तुम्ही कुठे आहात?", start_work: "काम सुरू करा",
        working_at: "आज काम करत आहात", working_time: "⏱️ काम करत आहात", hours_minutes: "तास : मिनिटे",
        todays_earnings: "💰 आजची कमाई", hourly_rate: "तासाची दर", per_hour: "/तास",
        pay_disclaimer: "* वेतन सुधारले जाऊ शकते। तपशीलासाठी अजित ला संपर्क करा।",
        upload_photo: "कामाचा फोटो अपलोड करा", end_work: "काम संपवा", work_history: "गेले 7 दिवस",
        upload_work_photo: "📷 आजच्या कामाचा फोटो अपलोड करा", photo_tips: "✨ चांगल्या फोटोसाठी टिप्स:",
        tip_1: "• आज काय पूर्ण केले ते दाखवा", tip_2: "• स्पष्ट, चांगल्या प्रकाशात फोटो घ्या",
        tip_3: "• कामाचे क्षेत्र समाविष्ट करा", take_photo: "फोटो घ्या", gallery: "गॅलरी",
        work_description: "📝 तुम्ही काय काम केलेत?",
        placeholder_description: "उदाहरण: खोली 2 मध्ये भिंत प्लास्टर पूर्ण केले",
        cancel: "रद्द करा", upload: "फोटो अपलोड करा", end_work_confirm: "⚠️ कामाचा दिवस संपवायचा?",
        worked_at: "तुम्ही काम केलेत:", total_time: "⏱️ एकूण वेळ:", earnings: "💰 कमाई:",
        pay_final_disclaimer: "* अंतिम वेतन महिन्याच्या शेवटी अजित द्वारे पुष्टी केली जाईल",
        keep_working: "नाही, काम चालू ठेवा", yes_end_work: "होय, काम संपवा",
        work_ended: "कामाचा दिवस संपला!", you_worked: "तुम्ही काम केलेत:", you_earned: "तुम्ही कमावलेत:",
        site: "साइट:", see_you_tomorrow: "उद्या भेटू! 👋", close: "बंद करा", logout: "लॉग आउट",
        no_sites: "कोणतीही साइट नियुक्त नाही", contact_ajit: "साइट नियुक्त करण्यासाठी अजित ला संपर्क करा",
        invalid_login: "चुकीचा मोबाइल नंबर किंवा पिन", error_occurred: "एक त्रुटी झाली. कृपया पुन्हा प्रयत्न करा.",
        photo_uploaded: "फोटो यशस्वीरित्या अपलोड!", uploading: "अपलोड करत आहे...",
        error_upload: "फोटो अपलोड करताना त्रुटी", select_photo_first: "कृपया प्रथम फोटो निवडा",
        work_started: "काम यशस्वीरित्या सुरू!", work_ended_success: "काम यशस्वीरित्या संपले!",
        error_start: "काम सुरू करताना त्रुटी", error_end: "काम संपवताना त्रुटी"
    }
};

let currentLanguage = localStorage.getItem('shreeved-lang-worker') || 'en';
let currentWorker = null;
let sitesData = [];
let workStartTime = null;
let timerInterval = null;
let selectedPhoto = null;
let photosTodayCount = 0;

// Encouragement messages
const encouragementMessages = [
    "🌟 Excellent work today!",
    "💪 Keep up the great work!",
    "👏 Another productive day!",
    "🎯 Well done!",
    "✨ Outstanding effort!",
    "🏆 You're doing amazing!"
];

// Set Language
function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('shreeved-lang-worker', lang);
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.dataset.translateKey;
        const translation = translations[lang]?.[key] || translations['en'][key];
        if (el.placeholder) {
            el.placeholder = translation;
        } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            // Don't change value, only placeholder
        } else {
            el.textContent = translation;
        }
    });
    document.querySelectorAll('.lang-btn, .lang-btn-dash').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

// Format time as HH:MM
function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}:${mins.toString().padStart(2, '0')}`;
}

// Calculate earnings
function calculateEarnings(minutes, hourlyRate) {
    const hours = minutes / 60;
    return Math.round(hours * hourlyRate);
}

// Compress image
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Max dimensions
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
                }, 'image/jpeg', 0.7); // 70% quality
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Create attendance log
async function createLog(action, siteId) {
    if (!currentWorker || !siteId) {
        console.error("Cannot create log: Missing worker or siteId");
        return;
    }
    try {
        await addDoc(collection(db, "attendance_logs"), {
            laborerId: currentWorker.id,
            laborerName: currentWorker.name,
            action: action,
            siteId: siteId,
            timestamp: serverTimestamp()
        });
        
        // Request notification permission and send notification
        if ('Notification' in window && Notification.permission === 'granted') {
            const siteName = sitesData.find(s => s.id === siteId)?.name || 'Unknown Site';
            const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            new Notification('Shreeved', {
                body: `${currentWorker.name} ${action.toLowerCase()} at ${siteName} (${time})`,
                icon: '/icons/icon-192x192.png'
            });
        }
    } catch (error) {
        console.error("Error creating attendance log:", error);
    }
}

// Update timer
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (!workStartTime) return;
        
        const now = new Date();
        const minutesWorked = (now - workStartTime) / (1000 * 60);
        
        document.getElementById('timer-display').textContent = formatTime(minutesWorked);
        
        const earnings = calculateEarnings(minutesWorked, currentWorker.hourlyRate || 0);
        document.getElementById('earnings-display').textContent = `₹${earnings}`;
    }, 1000);
}

// Stop timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Load 7-day history
async function load7DayHistory() {
    if (!currentWorker) return;
    
    const historyList = document.getElementById('history-list');
    const historyCard = document.getElementById('work-history-card');
    
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const logsQuery = query(
            collection(db, 'attendance_logs'),
            where('laborerId', '==', currentWorker.id),
            where('timestamp', '>=', sevenDaysAgo),
            orderBy('timestamp', 'desc')
        );
        
        const logsSnapshot = await getDocs(logsQuery);
        const logs = logsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Group by date
        const logsByDate = {};
        logs.forEach(log => {
            const date = log.timestamp.toDate().toLocaleDateString('en-IN');
            if (!logsByDate[date]) logsByDate[date] = [];
            logsByDate[date].push(log);
        });
        
        // Calculate hours per day
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
                <div class="border-l-4 border-green-500 pl-4 py-2">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-semibold text-slate-800 text-dark">${day.date}</p>
                            <p class="text-sm text-slate-600 text-dark">📍 ${day.site}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-slate-800 text-dark">⏱️ ${day.hours}</p>
                            <p class="text-sm text-green-600">₹${day.earnings}</p>
                        </div>
                    </div>
                </div>
            `).join('');
            historyCard.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error loading history:", error);
    }
}

// Show/hide UI elements
function updateUI(isWorking) {
    document.getElementById('site-selection-view').classList.toggle('hidden', isWorking);
    document.getElementById('working-status-card').classList.toggle('hidden', !isWorking);
    document.getElementById('start-work-btn').classList.toggle('hidden', isWorking);
    document.getElementById('upload-photo-btn').classList.toggle('hidden', !isWorking);
    document.getElementById('end-work-btn').classList.toggle('hidden', !isWorking);
}

// Show dashboard
function showDashboard(worker) {
    currentWorker = worker;
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    const t = translations[currentLanguage];
    document.getElementById('worker-name').textContent = `${t.welcome}, ${worker.name}`;
    
    // Load today's task
    loadTodayTask();
    
    // Display hourly rate
    document.getElementById('hourly-rate-display').textContent = `₹${worker.hourlyRate || 0}`;
    
    // Check if already working
    if (worker.status === 'Work Started' && worker.currentSiteId) {
        const site = sitesData.find(s => s.id === worker.currentSiteId);
        if (site) {
            document.getElementById('current-site-name').querySelector('span:last-child').textContent = site.name;
            workStartTime = new Date(); // Approximate - should ideally fetch from last log
            updateUI(true);
            startTimer();
        }
    } else {
        updateUI(false);
        loadSites();
    }
    
    load7DayHistory();
    
    // Request notification permission
    setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, 2000);
}

// Load today's task
async function loadTodayTask() {
    if (!currentWorker) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const taskQuery = query(
            collection(db, 'daily_tasks'),
            where('laborerId', '==', currentWorker.id),
            where('date', '==', today)
        );
        
        const taskSnapshot = await getDocs(taskQuery);
        
        if (!taskSnapshot.empty) {
            const task = taskSnapshot.docs[0].data();
            document.getElementById('task-description').textContent = task.task;
            document.getElementById('task-card').classList.remove('hidden');
        } else {
            document.getElementById('task-card').classList.add('hidden');
        }
    } catch (error) {
        console.error("Error loading task:", error);
    }
}

// Load sites
function loadSites() {
    const siteSelect = document.getElementById('site-select');
    const assignedSites = sitesData.filter(s => currentWorker.assignedSiteIds?.includes(s.id));
    
    if (assignedSites.length > 0) {
        siteSelect.innerHTML = assignedSites.map(s => 
            `<option value="${s.id}">${s.name}</option>`
        ).join('');
        siteSelect.disabled = false;
    } else {
        const t = translations[currentLanguage];
        siteSelect.innerHTML = `<option value="">${t.no_sites}</option>`;
        siteSelect.disabled = true;
        document.getElementById('start-work-btn').disabled = true;
        document.getElementById('start-work-btn').innerHTML = `
            <span class="text-3xl">📍</span>
            <span>${t.contact_ajit}</span>
        `;
    }
}

// Show login
function showLogin() {
    currentWorker = null;
    workStartTime = null;
    stopTimer();
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('login-form').reset();
    document.getElementById('login-error').textContent = '';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLanguage);
    
    // Language switchers
    document.querySelectorAll('#language-switcher .lang-btn, #language-switcher-dashboard .lang-btn-dash').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });
    
    // Dark mode toggle
    document.getElementById('dark-mode-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const icon = document.querySelector('#dark-mode-toggle span');
        icon.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    });
    
    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const t = translations[currentLanguage];
        const errorEl = document.getElementById('login-error');
        errorEl.textContent = '';
        
        const mobile = document.getElementById('mobile-number').value.trim();
        const pin = document.getElementById('pin').value.trim();
        
        if (mobile.length !== 10 || pin.length !== 4) {
            errorEl.textContent = t.invalid_login;
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
                errorEl.textContent = t.invalid_login;
            } else {
                showDashboard({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
            }
        } catch (error) {
            console.error("Login error:", error);
            errorEl.textContent = t.error_occurred;
        }
    });
    
    // Start work
    document.getElementById('start-work-btn').addEventListener('click', async () => {
        if (!currentWorker) return;
        
        const siteId = document.getElementById('site-select').value;
        if (!siteId) return;
        
        const t = translations[currentLanguage];
        
        try {
            workStartTime = new Date();
            
            await updateDoc(doc(db, 'laborers', currentWorker.id), {
                status: 'Work Started',
                currentSiteId: siteId
            });
            
            await createLog('Work Started', siteId);
            
            currentWorker.status = 'Work Started';
            currentWorker.currentSiteId = siteId;
            
            const site = sitesData.find(s => s.id === siteId);
            document.getElementById('current-site-name').querySelector('span:last-child').textContent = site.name;
            
            updateUI(true);
            startTimer();
            
            // Show brief success message
            const btn = document.getElementById('start-work-btn');
            btn.textContent = '✅ ' + t.work_started;
            setTimeout(() => btn.innerHTML = `<span class="text-3xl">🟢</span><span>${t.start_work}</span>`, 2000);
            
        } catch (error) {
            console.error("Error starting work:", error);
            alert(t.error_start);
        }
    });
    
    // Upload photo button
    document.getElementById('upload-photo-btn').addEventListener('click', () => {
        document.getElementById('photo-upload-modal').classList.remove('hidden');
    });
    
    // Camera and gallery buttons
    document.getElementById('camera-btn').addEventListener('click', () => {
        const input = document.getElementById('photo-input');
        input.setAttribute('capture', 'environment');
        input.click();
    });
    
    document.getElementById('gallery-btn').addEventListener('click', () => {
        const input = document.getElementById('photo-input');
        input.removeAttribute('capture');
        input.click();
    });
    
    // Photo selection
    document.getElementById('photo-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check file size (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
            alert('File too large! Max 2MB allowed.');
            return;
        }
        
        selectedPhoto = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('photo-preview').src = e.target.result;
            document.getElementById('photo-preview-container').classList.remove('hidden');
            document.getElementById('upload-photo-submit-btn').disabled = false;
        };
        reader.readAsDataURL(file);
    });
    
    // Cancel photo upload
    document.getElementById('cancel-photo-btn').addEventListener('click', () => {
        document.getElementById('photo-upload-modal').classList.add('hidden');
        document.getElementById('photo-input').value = '';
        document.getElementById('photo-description').value = '';
        document.getElementById('photo-preview-container').classList.add('hidden');
        selectedPhoto = null;
        document.getElementById('upload-photo-submit-btn').disabled = true;
    });
    
    // Upload photo submit
    document.getElementById('upload-photo-submit-btn').addEventListener('click', async () => {
        if (!selectedPhoto || !currentWorker) return;
        
        const t = translations[currentLanguage];
        const description = document.getElementById('photo-description').value.trim();
        const statusEl = document.getElementById('upload-status');
        
        if (!description) {
            statusEl.textContent = 'Please add a description';
            statusEl.className = 'text-center text-sm font-semibold text-red-500';
            return;
        }
        
        // Check daily limit
        if (photosTodayCount >= 10) {
            alert('Daily photo limit reached (10 photos)');
            return;
        }
        
        try {
            statusEl.textContent = t.uploading;
            statusEl.className = 'text-center text-sm font-semibold text-blue-500';
            document.getElementById('upload-photo-submit-btn').disabled = true;
            
            // Compress image
            const compressedFile = await compressImage(selectedPhoto);
            
            // Upload to storage
            const timestamp = Date.now();
            const filename = `${currentWorker.id}_${timestamp}.jpg`;
            const storageRef = ref(storage, `work_photos/${currentWorker.currentSiteId}/${filename}`);
            
            await uploadBytes(storageRef, compressedFile);
            const photoURL = await getDownloadURL(storageRef);
            
            // Save metadata to Firestore
            await addDoc(collection(db, 'work_photos'), {
                laborerId: currentWorker.id,
                laborerName: currentWorker.name,
                siteId: currentWorker.currentSiteId,
                photoURL,
                description,
                uploadedAt: serverTimestamp()
            });
            
            photosTodayCount++;
            
            statusEl.textContent = t.photo_uploaded;
            statusEl.className = 'text-center text-sm font-semibold text-green-500';
            
            setTimeout(() => {
                document.getElementById('cancel-photo-btn').click();
                statusEl.textContent = '';
            }, 2000);
            
        } catch (error) {
            console.error("Error uploading photo:", error);
            statusEl.textContent = t.error_upload;
            statusEl.className = 'text-center text-sm font-semibold text-red-500';
            document.getElementById('upload-photo-submit-btn').disabled = false;
        }
    });
    
    // End work button
    document.getElementById('end-work-btn').addEventListener('click', () => {
        if (!currentWorker || !workStartTime) return;
        
        const now = new Date();
        const minutesWorked = (now - workStartTime) / (1000 * 60);
        const earnings = calculateEarnings(minutesWorked, currentWorker.hourlyRate || 0);
        const site = sitesData.find(s => s.id === currentWorker.currentSiteId);
        
        document.getElementById('end-work-site').querySelector('span').textContent = site?.name || 'Unknown';
        document.getElementById('end-work-hours').textContent = formatTime(minutesWorked);
        document.getElementById('end-work-earnings').textContent = `₹${earnings}`;
        
        document.getElementById('end-work-modal').classList.remove('hidden');
    });
    
    // Cancel end work
    document.getElementById('cancel-end-work-btn').addEventListener('click', () => {
        document.getElementById('end-work-modal').classList.add('hidden');
    });
    
    // Confirm end work
    document.getElementById('confirm-end-work-btn').addEventListener('click', async () => {
        if (!currentWorker) return;
        
        const t = translations[currentLanguage];
        
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
            
            // Show success modal
            document.getElementById('end-work-modal').classList.add('hidden');
            document.getElementById('success-hours').textContent = formatTime(minutesWorked);
            document.getElementById('success-earnings').textContent = `₹${earnings}*`;
            document.getElementById('success-site').textContent = site?.name || 'Unknown';
            
            // Random encouragement
            const randomMsg = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
            document.getElementById('encouragement-message').textContent = randomMsg;
            
            document.getElementById('work-ended-modal').classList.remove('hidden');
            
        } catch (error) {
            console.error("Error ending work:", error);
            alert(t.error_end);
        }
    });
    
    // Close success modal
    document.getElementById('close-success-btn').addEventListener('click', () => {
        document.getElementById('work-ended-modal').classList.add('hidden');
        currentWorker.status = 'Work Ended';
        workStartTime = null;
        updateUI(false);
        loadSites();
        load7DayHistory();
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', showLogin);
    
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
        navigator.serviceWorker.register('/service-worker.js');
    }
});