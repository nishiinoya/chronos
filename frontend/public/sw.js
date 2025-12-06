// public/sw.js

self.addEventListener("push", (event) => {
  console.log("[sw] push event receivedsss", event);

  let title = "Chronos notification";
  let body = "You have a new notification.";
  let data = {};

  if (event.data) {
    const raw = event.data.text();
    console.log("[sw] raw push data:", raw);

    try {
      const json = JSON.parse(raw);
      title = json.title || title;
      body = json.body || body;
      data = json.data || {};
    } catch (e) {
      console.error("[sw] Could not parse JSON, using raw text instead", e);
      body = raw || body;
    }
  }

  console.log("[sw] calling showNotification with:", { title, body, data });

  const options = {
    body,
    data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = "/"; // or `/event/${event.notification.data.eventId}`

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
