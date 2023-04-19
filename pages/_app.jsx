import "../styles/styles.css";

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
	return (
		<>
			<style jsx global>{`
				:root {
					--serif: ${Family.style.fontFamily};
				}
			`}</style>
			<Component {...pageProps} />
		</>
	);
}
