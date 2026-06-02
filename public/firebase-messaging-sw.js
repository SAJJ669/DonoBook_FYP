// Import the Firebase scripts inside the service worker context
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase inside the service worker
// Paste your exact Web App Firebase Config values here
firebase.initializeApp({
  apiKey: "AIzaSyB79kP09MnDG2P-FtshDl9ihO7pcu45UbM",
  authDomain: "donobook-fyp.firebaseapp.com",
  projectId: "donobook-fyp",
  storageBucket: "donobook-fyp.firebasestorage.app",
  messagingSenderId: "179204954432",
  appId: "1:179204954432:web:83ff5022c73fb189b242a5",
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You received a message.',
    icon: '/logo-192x192.png', // Points to your PWA icon
    badge: '/logo-192x192.png',
    tag: 'chat-message', // Prevents flooding by stacking notifications
    renotify: true,
    data: {
      url: '/' // Opens your app when clicked
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});