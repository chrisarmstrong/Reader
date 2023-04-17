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
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<link
					rel="apple-touch-icon"
					sizes="180x180"
					href="/apple-touch-icon.png"
				></link>
				<link rel="icon" href="/apple-touch-icon.png" />
			</Head>

			<Main />
		</>
	);
}
