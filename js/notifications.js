/**
 * Push Notification Manager for Shreeved
 * Handles browser notifications for admin alerts
 */

export class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.supported = 'Notification' in window;
    }

    /**
     * Request notification permission
     * @returns {Promise<string>} Permission status
     */
    async requestPermission() {
        if (!this.supported) {
            console.warn('Notifications not supported in this browser');
            return 'denied';
        }

        try {
            this.permission = await Notification.requestPermission();
            return this.permission;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return 'denied';
        }
    }

    /**
     * Show a notification
     * @param {string} title - Notification title
     * @param {Object} options - Notification options
     */
    show(title, options = {}) {
        if (!this.supported || this.permission !== 'granted') {
            console.warn('Cannot show notification: permission not granted');
            return null;
        }

        const defaultOptions = {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-96x96.png',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);
            
            // Auto-close after 10 seconds
            setTimeout(() => notification.close(), 10000);
            
            return notification;
        } catch (error) {
            console.error('Error showing notification:', error);
            return null;
        }
    }

    /**
     * Worker started work notification
     */
    workerStarted(workerName, siteName, time) {
        return this.show('Worker Started Work', {
            body: `${workerName} started work at ${siteName} (${time})`,
            tag: 'worker-started',
            icon: '/icons/icon-192x192.png',
            data: { type: 'worker-started', workerName, siteName }
        });
    }

    /**
     * Worker ended work notification
     */
    workerEnded(workerName, siteName, hours, time) {
        return this.show('Worker Ended Work', {
            body: `${workerName} ended work at ${siteName} (${hours}, ${time})`,
            tag: 'worker-ended',
            icon: '/icons/icon-192x192.png',
            data: { type: 'worker-ended', workerName, siteName }
        });
    }

    /**
     * Worker is late notification
     */
    workerLate(workerName, currentTime) {
        return this.show('⚠️ Worker Late', {
            body: `${workerName} hasn't started work yet (${currentTime})`,
            tag: 'worker-late',
            icon: '/icons/icon-192x192.png',
            requireInteraction: true,
            data: { type: 'worker-late', workerName }
        });
    }

    /**
     * Worker forgot to end work notification
     */
    workerForgotEnd(workerName, currentTime) {
        return this.show('⚠️ Forgot to End Work?', {
            body: `${workerName} still working - forgot to end work? (${currentTime})`,
            tag: 'worker-forgot',
            icon: '/icons/icon-192x192.png',
            requireInteraction: true,
            data: { type: 'worker-forgot', workerName }
        });
    }

    /**
     * Daily summary notification
     */
    dailySummary(totalWorkers, totalHours, sites) {
        return this.show('📊 Daily Summary', {
            body: `${totalWorkers} workers worked ${totalHours} hours at ${sites} sites today`,
            tag: 'daily-summary',
            icon: '/icons/icon-192x192.png',
            data: { type: 'daily-summary', totalWorkers, totalHours, sites }
        });
    }

    /**
     * New document uploaded notification
     */
    documentUploaded(workerName, docType) {
        return this.show('📄 Document Uploaded', {
            body: `${workerName} uploaded a ${docType}`,
            tag: 'document-uploaded',
            icon: '/icons/icon-192x192.png',
            data: { type: 'document-uploaded', workerName, docType }
        });
    }

    /**
     * Work photo uploaded notification
     */
    photoUploaded(workerName, siteName) {
        return this.show('📸 Work Photo Uploaded', {
            body: `${workerName} uploaded a work photo from ${siteName}`,
            tag: 'photo-uploaded',
            icon: '/icons/icon-192x192.png',
            data: { type: 'photo-uploaded', workerName, siteName }
        });
    }

    /**
     * Schedule a notification
     * @param {string} title - Notification title
     * @param {Object} options - Notification options
     * @param {number} delay - Delay in milliseconds
     */
    schedule(title, options, delay) {
        return setTimeout(() => {
            this.show(title, options);
        }, delay);
    }

    /**
     * Clear all notifications with a specific tag
     */
    clearByTag(tag) {
        // Note: This only works in service worker context
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.getNotifications({ tag }).then(notifications => {
                    notifications.forEach(notification => notification.close());
                });
            });
        }
    }

    /**
     * Check if notifications are supported
     */
    isSupported() {
        return this.supported;
    }

    /**
     * Get current permission status
     */
    getPermission() {
        return this.supported ? Notification.permission : 'denied';
    }
}

/**
 * Initialize notification monitoring for admin
 * Listens to Firestore changes and sends notifications
 */
export async function initializeNotificationMonitoring(db, auth) {
    const notificationManager = new NotificationManager();
    
    // Request permission if not already granted
    if (notificationManager.getPermission() === 'default') {
        await notificationManager.requestPermission();
    }

    // Only monitor if we have permission
    if (notificationManager.getPermission() !== 'granted') {
        console.warn('Notification permission not granted');
        return notificationManager;
    }

    // Import Firestore functions
    const { collection, query, onSnapshot, where, Timestamp, orderBy, limit } = await import(
        'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
    );

    // Monitor attendance logs for real-time notifications
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const logsQuery = query(
        collection(db, 'attendance_logs'),
        where('timestamp', '>=', Timestamp.fromDate(today)),
        orderBy('timestamp', 'desc'),
        limit(50)
    );

    let isFirstLoad = true;
    
    onSnapshot(logsQuery, (snapshot) => {
        // Skip first load to avoid notification spam
        if (isFirstLoad) {
            isFirstLoad = false;
            return;
        }

        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const log = change.doc.data();
                const time = log.timestamp?.toDate().toLocaleTimeString('en-IN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });

                if (log.action === 'Work Started') {
                    notificationManager.workerStarted(
                        log.laborerName,
                        'Site', // You can fetch site name if needed
                        time
                    );
                } else if (log.action === 'Work Ended') {
                    notificationManager.workerEnded(
                        log.laborerName,
                        'Site',
                        'N/A', // Calculate hours if needed
                        time
                    );
                }
            }
        });
    });

    // Check for late workers every hour (after 10 AM)
    const checkLateWorkers = async () => {
        const now = new Date();
        const hour = now.getHours();
        
        if (hour >= 10 && hour < 18) {
            // Implementation would query workers who haven't started
            console.log('Checking for late workers...');
        }
    };

    // Schedule late worker check
    setInterval(checkLateWorkers, 60 * 60 * 1000); // Every hour

    // Check for workers who forgot to end work (at 9 PM)
    const checkForgotEndWork = async () => {
        const now = new Date();
        const hour = now.getHours();
        
        if (hour === 21) { // 9 PM
            // Implementation would query workers still showing as working
            console.log('Checking for workers who forgot to end work...');
        }
    };

    // Schedule forgot-to-end check
    setInterval(checkForgotEndWork, 60 * 60 * 1000); // Every hour

    // Send daily summary at 10 PM
    const sendDailySummary = () => {
        const now = new Date();
        const hour = now.getHours();
        
        if (hour === 22) { // 10 PM
            // Calculate daily stats and send notification
            console.log('Sending daily summary...');
            // notificationManager.dailySummary(workers, hours, sites);
        }
    };

    // Schedule daily summary
    setInterval(sendDailySummary, 60 * 60 * 1000); // Every hour

    return notificationManager;
}

// Export default instance
export default new NotificationManager();