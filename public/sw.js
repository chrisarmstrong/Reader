// Simple Service Worker for Bible Reader
// Focused on reliable offline reading and iOS compatibility

// Skip service worker functionality in development to prevent reload issues
const isDev =
	self.location.hostname === "localhost" ||
	self.location.hostname === "127.0.0.1" ||
	self.location.port === "3000";

if (isDev) {
	console.log("Service Worker disabled in development mode");
	self.addEventListener("install", () => self.skipWaiting());
	self.addEventListener("activate", () => self.clients.claim());
	// Exit early - don't register any caching logic in development
} else {
	// Production service worker code
	const CACHE_NAME = "bible-reader-v1";
	const BIBLE_CACHE = "bible-content-v1";

	// Critical files that should always be cached
	const STATIC_ASSETS = [
		"/",
		"/manifest.json",
		"/icon.png",
		"/apple-touch-icon.png",
	];

	// Install event - cache static assets
	self.addEventListener("install", (event) => {
		event.waitUntil(
			caches
				.open(CACHE_NAME)
				.then((cache) => cache.addAll(STATIC_ASSETS))
				.then(() => self.skipWaiting())
		);
	});

	// Activate event - clean up old caches
	self.addEventListener("activate", (event) => {
		event.waitUntil(
			caches
				.keys()
				.then((cacheNames) => {
					return Promise.all(
						cacheNames.map((cacheName) => {
							if (cacheName !== CACHE_NAME && cacheName !== BIBLE_CACHE) {
								return caches.delete(cacheName);
							}
						})
					);
				})
				.then(() => self.clients.claim())
		);
	});

	// Fetch event - handle requests
	self.addEventListener("fetch", (event) => {
		const url = new URL(event.request.url);

		// Handle Bible JSON files specially - these are most important for offline reading
		if (url.pathname.includes("/api/") || url.pathname.includes(".json")) {
			event.respondWith(
				caches.open(BIBLE_CACHE).then((cache) => {
					return cache.match(event.request).then((response) => {
						if (response) {
							// Return cached version immediately
							return response;
						}
						// Fetch and cache new version
						return fetch(event.request)
							.then((fetchResponse) => {
								if (fetchResponse.ok) {
									cache.put(event.request, fetchResponse.clone());
								}
								return fetchResponse;
							})
							.catch(() => {
								// If offline and no cache, return a basic error response
								return new Response("Offline - content not available", {
									status: 503,
									statusText: "Service Unavailable",
								});
							});
					});
				})
			);
			return;
		}

		// Handle other requests with cache-first strategy for static assets
		if (event.request.method === "GET") {
			event.respondWith(
				caches.match(event.request).then((response) => {
					if (response) {
						return response;
					}
					return fetch(event.request).then((fetchResponse) => {
						// Don't cache API calls or external resources
						if (fetchResponse.ok && url.origin === self.location.origin) {
							const responseClone = fetchResponse.clone();
							caches
								.open(CACHE_NAME)
								.then((cache) => cache.put(event.request, responseClone));
						}
						return fetchResponse;
					});
				})
			);
		}
	});

	// Message event - for clearing cache if needed
	self.addEventListener("message", (event) => {
		if (event.data && event.data.type === "SKIP_WAITING") {
			self.skipWaiting();
		}
		if (event.data && event.data.type === "CLEAR_CACHE") {
			caches.keys().then((cacheNames) => {
				return Promise.all(
					cacheNames.map((cacheName) => caches.delete(cacheName))
				);
			});
		}
	});
}
