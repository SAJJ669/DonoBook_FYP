import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyB79kP09MnDG2P-FtshDl9ihO7pcu45UbM",
  authDomain: "donobook-fyp.firebaseapp.com",
  projectId: "donobook-fyp",
  storageBucket: "donobook-fyp.firebasestorage.app",
  messagingSenderId: "179204954432",
  appId: "1:179204954432:web:83ff5022c73fb189b242a5",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async (userId: string): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      // === NEW: EXPLICITLY REGISTER WORKER FOR MOBILE ===
      console.log('Registering service worker manually...');
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      
      // Wait for it to be fully active
      await navigator.serviceWorker.ready;
      console.log('Service worker is ready!');

      // Pass the registration to getToken
      const token = await getToken(messaging, { 
        vapidKey: 'BOrKJCGlLGqUo41CkfDkZACOma05_By2wOgfIZc4KlrAwlfz6UtzkF9qwYO90uAFm-yb7qhNTsaMmj4Cj6bOSfw',
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('Your Device FCM Token:', token);
        return token;
      } else {
        console.log('No registration token available.');
        return null;
      }
    } else {
      console.log('Permission denied for notifications.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving the token:', error);
    return null;
  }
};

export const setupForegroundMessageListener = () => {
  try {
    onMessage(messaging, (payload) => {
      console.log("Message received in foreground: ", payload);
      const title = payload.notification?.title || payload.data?.title || "New Message";
      const body = payload.notification?.body || payload.data?.body || "You have a new message";
      alert(`🔔 ${title}\n${body}`);
    });
  } catch (error) {
    console.error("Foreground listener failed:", error);
  }
};