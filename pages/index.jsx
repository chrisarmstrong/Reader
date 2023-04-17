import Head from "next/head";
import { Inter } from "@next/font/google";
import styled, { css } from "styled-components";
import { useState, useEffect, useRef } from "react";

import Search from "../components/search";
import Reader from "../components/Reader";
import Contents from "../components/Contents";
import NavBar from "../components/NavBar";

import GlobalStyle from "../styles/globalStyles";

import { Books } from "../utils/Books";

const Container = styled.div`
	display: grid;
	grid-template-columns: [fullbleed-start] 24px [main-start] 1fr [main-end] 24px [fullbleed-end];
	justify-items: center;
`;

export default function Home() {
	const [currentBook, setCurrentBook] = useState(Books[0]); // set the initial book to the first book in the JSON data

	useEffect(() => {
		if (typeof window !== "undefined") {
			const lastPosition = JSON.parse(localStorage.getItem("lastPosition"));
			if (lastPosition?.book) {
				setCurrentBook(Books[lastPosition.book]);
			}
		}
	}, []);

	const [bookNavVisible, setBookNavVisible] = useState(false);
	const [searchVisible, setSearchVisible] = useState(false);

	const handleBookSelect = (e) => {
		setCurrentBook(Books[e.target.getAttribute("data-index")]);
		setBookNavVisible(false);
		window.scrollTo({ top: 0 });

		const currentPosition = { book: e.target.getAttribute("data-index") };
		localStorage.setItem("lastPosition", JSON.stringify(currentPosition));
	};

	return (
		<>
			<Head>
				<title>{currentBook.book}</title>
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
			<GlobalStyle></GlobalStyle>

			<Container>
				{searchVisible && (
					<Search
						dismiss={() => {
							setSearchVisible(false);
						}}
					></Search>
				)}
				<Reader book={currentBook}></Reader>

				<Contents
					active={bookNavVisible}
					handleBookSelect={handleBookSelect}
					books={Books}
					dismiss={() => {
						setBookNavVisible(false);
					}}
				></Contents>

				<NavBar
					setBookNavVisible={setBookNavVisible}
					bookNavVisible={bookNavVisible}
					setSearchVisible={setSearchVisible}
				/>
			</Container>
		</>
	);
}
