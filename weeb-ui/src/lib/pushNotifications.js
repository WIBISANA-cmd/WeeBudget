import { apiDelete, apiGet, apiPost } from '../api/http';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function getRegistration() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker belum didukung di browser ini.');
  }

  return navigator.serviceWorker.ready;
}

export async function ensureTransactionReminderSubscription({ requestPermission = false } = {}) {
  if (typeof window === 'undefined' || !('Notification' in window) || !('PushManager' in window)) {
    throw new Error('Push notification belum didukung di browser ini.');
  }

  const currentPermission = Notification.permission;
  if (currentPermission === 'denied') {
    throw new Error('Izin notifikasi sudah diblokir di browser ini.');
  }

  let permission = currentPermission;
  if (requestPermission && currentPermission !== 'granted') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    throw new Error('Izin notifikasi belum diberikan.');
  }

  const registration = await getRegistration();
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    await apiPost('/push/subscriptions', existingSubscription.toJSON());
    return existingSubscription;
  }

  const response = await apiGet('/push/vapid-public-key');
  const publicKey = response.data?.public_key;

  if (!publicKey) {
    throw new Error('Public key push notification belum tersedia.');
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await apiPost('/push/subscriptions', subscription.toJSON());

  return subscription;
}

export async function removeTransactionReminderSubscription() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }

  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  await apiDelete('/push/subscriptions', { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}
