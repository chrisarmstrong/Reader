import Head from "next/head";
import { Inter } from "@next/font/google";

import Main from "../components/Main";

export default function Home() {
	return (
		<>
			<Head>
				<title>Bible</title>
				<meta name="description" content="A simple Bible app" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
				/>
				<meta name="application-name" content="Bible" />
				<meta name="msapplication-starturl" content="https://simplebible.app" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-title" content="Bible" />
				<link
					rel="apple-touch-icon"
					sizes="180x180"
					href="/apple-touch-icon.png"
				></link>
				<link rel="icon" href="/apple-touch-icon.png" />
				<link
					rel="manifest"
					crossOrigin="use-credentials"
					href="/manifest.json"
				/>
			</Head>

			<Main />
		</>
	);
}
