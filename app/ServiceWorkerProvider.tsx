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

		// Register service worker only in production
		if ("serviceWorker" in navigator) {
			window.addEventListener("load", () => {
				navigator.serviceWorker
					.register("/sw.js")
					.then((registration) => {
						console.log("SW registered: ", registration);
					})
					.catch((registrationError) => {
						console.log("SW registration failed: ", registrationError);
					});
			});
		}
	}, []);

	return <>{children}</>;
}
