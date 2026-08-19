import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { env } from './env.js';

let messagingInstance: Messaging | null = null;

/**
 * Initializes the Firebase Admin SDK once and returns a reusable Messaging
 * instance. Call getMessagingClient() anywhere you need to send a push —
 * don't call initializeApp() more than once, Firebase throws if you do.
 */
export function getMessagingClient(): Messaging {
  if (!messagingInstance) {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          // The .env value has literal \n escape sequences (since real
          // newlines can't survive a single-line .env file) — convert them
          // back into actual newlines here, or the key won't parse.
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
    messagingInstance = getMessaging();
  }
  return messagingInstance;
}