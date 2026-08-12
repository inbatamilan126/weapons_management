import { supabase } from '../lib/supabase';

// Standard 65-byte P-256 VAPID Public Key
const PUBLIC_VAPID_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BEEahOKscIhnVsZ2i6TKSIUK1Qb4uxd4Uaama7gXZi9BA64YMTjxEGSOUowqMgNAUOduKuLGkL3fmGLcAt4A89k';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
}

export async function checkPushSubscriptionStatus(): Promise<PushStatus> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { supported: false, permission: 'denied', isSubscribed: false };
  }

  const permission = Notification.permission;
  if (permission !== 'granted') {
    return { supported: true, permission, isSubscribed: false };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return {
      supported: true,
      permission,
      isSubscribed: Boolean(subscription),
    };
  } catch (err) {
    return { supported: true, permission, isSubscribed: false };
  }
}

export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported on this browser.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted by user.');
  }

  const registration = await navigator.serviceWorker.ready;

  // Unsubscribe any stale/previous subscription to clear push service state
  try {
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      await existingSub.unsubscribe();
    }
  } catch (e) {
    console.warn('Cleared old push subscription:', e);
  }

  let subscription: PushSubscription;
  try {
    const convertedKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message?.includes('push service error')) {
      throw new Error(
        'Push Service Registration Failed: If using Brave browser, enable "Use Google Services for Push Messaging" in brave://settings/privacy. Otherwise, ensure network connection to Google FCM is active.'
      );
    }
    throw err;
  }

  const subJson = subscription.toJSON();
  const endpoint = subJson.endpoint;
  const p256dh = subJson.keys?.p256dh;
  const auth = subJson.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Failed to extract valid Web Push keys.');
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );

  if (error) throw error;
  return true;
}

export async function unsubscribeFromPushNotifications(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  }

  return true;
}
