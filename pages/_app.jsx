import "../styles/styles.css";
import Head from "next/head";
import { useEffect } from "react";

import localFont from "next/font/local";

const Family = localFont({
	src: [
		{
			path: "../public/fonts/family-light.woff2",
			weight: "300",
			style: "normal",
		},
		{
			path: "../public/fonts/family-regular.woff2",
			weight: "400",
			style: "normal",
		},
		{
			path: "../public/fonts/family-bold.woff2",
			weight: "700",
			style: "normal",
		},
		{
			path: "../public/fonts/family-light-italic.woff2",
			weight: "300",
			style: "italic",
		},
		{
			path: "../public/fonts/family-italic.woff2",
			weight: "400",
			style: "italic",
		},
		{
			path: "../public/fonts/family-bold-italic.woff2",
			weight: "700",
			style: "italic",
		},
	],
});

export default function App({ Component, pageProps }) {
	useEffect(() => {
		// Register service worker
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

	return (
		<>
			<Head>
				{/* PWA Meta Tags */}
				<meta name="application-name" content="Holy Bible" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content="Holy Bible" />
				<meta name="description" content="Offline Bible Reader" />
				<meta name="format-detection" content="telephone=no" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="msapplication-config" content="/browserconfig.xml" />
				<meta name="msapplication-TileColor" content="#ffffff" />
				<meta name="msapplication-tap-highlight" content="no" />
				<meta name="theme-color" content="#ffffff" />

				{/* PWA Links */}
				<link rel="manifest" href="/manifest.json" />
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
				<link
					rel="icon"
					type="image/png"
					sizes="32x32"
					href="/favicon-32x32.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="16x16"
					href="/favicon-16x16.png"
				/>
				<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#ffffff" />
				<link rel="shortcut icon" href="/favicon.ico" />

				{/* Prevent iOS zoom on input focus */}
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
				/>
			</Head>
			<style jsx global>{`
				:root {
					--serif: ${Family.style.fontFamily};
				}
			`}</style>
			<Component {...pageProps} />
		</>
	);
}
