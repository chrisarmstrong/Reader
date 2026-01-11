import "../styles/styles.css";
import localFont from "next/font/local";
import ServiceWorkerProvider from "./ServiceWorkerProvider";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";

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

export const metadata = {
	title: "Holy Bible",
	description: "Offline Bible Reader",
	applicationName: "Holy Bible",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "Holy Bible",
	},
	formatDetection: {
		telephone: false,
	},
	manifest: "/manifest.json",
	icons: {
		apple: "/apple-touch-icon.png",
		icon: [
			{ url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
			{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
		],
		shortcut: "/favicon.ico",
		other: [
			{
				rel: "mask-icon",
				url: "/safari-pinned-tab.svg",
				color: "#ffffff",
			},
		],
	},
	other: {
		"mobile-web-app-capable": "yes",
		"msapplication-config": "/browserconfig.xml",
		"msapplication-TileColor": "#ffffff",
		"msapplication-tap-highlight": "no",
	},
};

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
	themeColor: "#ffffff",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<head>
				<style
					dangerouslySetInnerHTML={{
						__html: `
							:root {
								--serif: ${Family.style.fontFamily};
							}
						`,
					}}
				/>
			</head>
			<body className={Family.className}>
				<MantineProvider>
					<ServiceWorkerProvider>{children}</ServiceWorkerProvider>
				</MantineProvider>
			</body>
		</html>
	);
}
