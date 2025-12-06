const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export async function registerServiceWorkerAndSubscribe(token) {
  if (!token) {
    console.log("No token, skipping push subscription.");
    return;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Push notifications not supported.");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("Service worker registered", registration);

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission not granted:", permission);
      return;
    }

    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      console.log("Already subscribed to push.");
      return;
    }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    console.log("VAPID key:", vapidPublicKey); // should NOT be undefined

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const res = await fetch(`${API_BASE}/notifications/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // <-- IMPORTANT
      },
      body: JSON.stringify({ subscription }),
    });

    const data = await res.json();
    console.log("Subscribe response:", res.status, data);

    console.log("Push subscription sent to backend.");
  } catch (err) {
    console.error("Error during SW / push setup:", err);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
