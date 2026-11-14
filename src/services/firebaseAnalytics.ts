import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Analytics,
  getAnalytics,
  isSupported,
  logEvent,
} from 'firebase/analytics';

const analyticsFirebaseConfig = {
  apiKey: 'AIzaSyCNVMcfj_CGqjlqTakuMnRcYdf7oow1yRA',
  authDomain: 'todo-app-d3672.firebaseapp.com',
  projectId: 'todo-app-d3672',
  storageBucket: 'todo-app-d3672.firebasestorage.app',
  messagingSenderId: '976395996004',
  appId: '1:976395996004:web:3006944b62fc74afe44871',
  measurementId: 'G-QWHY37LQ71',
};

const ANALYTICS_APP_NAME = 'analytics-app';

const analyticsApp = getApps().some((a) => a.name === ANALYTICS_APP_NAME)
  ? getApp(ANALYTICS_APP_NAME)
  : initializeApp(analyticsFirebaseConfig, ANALYTICS_APP_NAME);

let analyticsInstance: Analytics | null = null;
let initPromise: Promise<Analytics | null> | null = null;

export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  if (analyticsInstance) return analyticsInstance;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const supported = await isSupported();
        if (!supported) return null;
        analyticsInstance = getAnalytics(analyticsApp);
        return analyticsInstance;
      } catch {
        return null;
      }
    })();
  }
  return initPromise;
}

export async function trackPlannerEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): Promise<void> {
  const analytics = await initFirebaseAnalytics();
  if (!analytics) return;
  try {
    logEvent(analytics, eventName, params);
  } catch {
    // Ignore analytics errors in restricted browsers or iframes
  }
}
