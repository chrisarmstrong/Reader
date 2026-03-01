"use client";

import { useEffect } from "react";

export default function ServiceWorkerProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	useEffect(() => {
		// Skip service worker registration in development mode to prevent reload issues
		const isDev =
			process.env.NODE_ENV === "development" ||
			window.location.hostname === "localhost" ||
			window.location.hostname === "127.0.0.1";

		if (isDev) {
			console.log("Service Worker registration skipped in development mode");
			return;
		}

		// Request persistent storage so the browser won't evict IndexedDB data
		// (bookmarks, notes, reading positions) under storage pressure or after
		// periods of inactivity (Safari's 7-day eviction policy).
		if (navigator.storage?.persist) {
			navigator.storage.persist().then((granted) => {
				console.log(
					granted
						? "Persistent storage granted — data is safe from eviction"
						: "Persistent storage denied — data may be evicted under pressure"
				);
			});
		}

		// Register service worker only in production
		if ("serviceWorker" in navigator) {
			window.addEventListener("load", () => {
				navigator.serviceWorker
					.register("/sw.js")
					.then((registration) => {
						console.log("SW registered: ", registration);

						// If a new service worker is already waiting, activate it immediately
						if (registration.waiting) {
							registration.waiting.postMessage({ type: "SKIP_WAITING" });
						}

						// Listen for new service workers that finish installing
						registration.addEventListener("updatefound", () => {
							const newWorker = registration.installing;
							if (newWorker) {
								newWorker.addEventListener("statechange", () => {
									if (
										newWorker.state === "installed" &&
										navigator.serviceWorker.controller
									) {
										// New version available - activate it immediately
										newWorker.postMessage({ type: "SKIP_WAITING" });
									}
								});
							}
						});
					})
					.catch((registrationError) => {
						console.log("SW registration failed: ", registrationError);
					});
			});
		}
	}, []);

	return <>{children}</>;
}
