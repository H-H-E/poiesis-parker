self.__WB_DISABLE_DEV_LOGS = true

// This listener helps prevent duplicate service worker registration
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle fetch events
self.addEventListener('fetch', (event) => {
  // Let the browser handle the request as normal
  return;
});
