import { initializeApp, cert, apps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin dynamically
if (!apps.length) {
  initializeApp({
    credential: cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.VITE_FIREBASE_CLIENT_EMAIL,
      // Fixes potential multiline secret formatting issues on Vercel
      privateKey: process.env.VITE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  // 1. Only allow POST requests from Supabase
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Supabase webhook forwards the newly inserted row inside req.body.record
    const { receiver_id, sender_name, message_text } = req.body.record;

    if (!receiver_id) {
      return res.status(400).json({ error: 'Missing receiver ID context.' });
    }

    // 2. Query Supabase Rest API directly to fetch the target user's token
    const supabaseUrl = process.env.VITE_MY_SUPABASE_URL;
    const serviceRoleKey = process.env.VITE_MY_SUPABASE_SERVICE_ROLE_KEY;

    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${receiver_id}&select=fcm_token`, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    const userData = await response.json();
    const registrationToken = userData?.[0]?.fcm_token;

    // If the user hasn't allowed notifications or is offline, skip gracefully
    if (!registrationToken) {
      return res.status(200).json({ message: 'User has no registered device token.' });
    }

    // 3. Build the Firebase Push payload
    // Inside your api/send-notification.js file...

// Modify the message object to look like this:
const message = {
  token: registrationToken,
  notification: {
    title: sender_name || 'New Message',
    body: message_text || 'Sent an attachment',
  },
  // Add this explicit Android configuration block:
  android: {
    priority: 'high',
    notification: {
      channelId: 'chat_messages', // Must match an importance level
      importance: 'high',
      priority: 'high',
      defaultSound: true,
      defaultVibratorTimings: true
    }
  },
  webpush: {
    headers: {
      Urgency: 'high' // Tells browsers to deliver it instantly
    },
    notification: {
      icon: '/logo-192x192.png',
      badge: '/logo-192x192.png',
      requireInteraction: true // Keeps notification on screen until clicked
    }
  }
};

    // 4. Fire the notification away!
    await getMessaging().send(message);

    return res.status(200).json({ success: true, message: 'Notification sent successfully.' });

  } catch (error) {
    console.error('Webhook Endpoint Error:', error);
    return res.status(500).json({ error: error.message });
  }
}