import styled from "styled-components";
import GlobalStyle from "../../styles/globalStyles";
import Head from "next/head";

import { useState, useEffect, useRef } from "react";

import Search from "../search";
import Reader from "../Reader";
import Contents from "../Contents";
import NavBar from "../NavBar";

import { Books } from "../../utils/Books";

const Container = styled.div`
	display: grid;
	grid-template-columns: [fullbleed-start] 24px [main-start] 1fr [main-end] 24px [fullbleed-end];
	justify-items: center;
`;

export default function Main({ slug, book }) {
	const [bookNavVisible, setBookNavVisible] = useState(false);
	const [searchVisible, setSearchVisible] = useState(false);
	const [currentPosition, setCurrentPosition] = useState({});
	const [currentBook, setCurrentBook] = useState(book || Books[0]); // set the initial book to the first book in the JSON data

	// useEffect(() => {
	// 	if (typeof window !== "undefined") {
	// 		const lastPosition = JSON.parse(localStorage.getItem("lastPosition"));

	// 		if (!isNaN(lastPosition?.book) && !slug) {
	// 			setCurrentBook(Books[lastPosition.book]);
	// 		} else {
	// 			if (currentBook.index) {
	// 				updateLastPosition(currentBook.index);
	// 			}
	// 		}
	// 	}
	// }, []);

	const goToPosition = (book_index, chapter_index, verse_index) => {
		// setCurrentBook(Books[book_index]);
		// setBookNavVisible(false);
		// if (chapter_index) {
		// 	const id = chapter_index + ":" + verse_index;
		// 	window.location.hash = id;
		// } else {
		// 	window.scrollTo({ top: 0 });
		// }
		// updateLastPosition(book_index);
	};

	const updateLastPosition = (book_index) => {
		const position = { book: book_index };
		localStorage.setItem("lastPosition", JSON.stringify(position));
		// 		const lastPosition = JSON.parse(localStorage.getItem("lastPosition"));
	};

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
			<GlobalStyle />

			<Container>
				<Search
					dismiss={() => {
						setSearchVisible(false);
					}}
					active={searchVisible}
					goToPosition={goToPosition}
				></Search>

				<Reader book={book || Books[0]}></Reader>

				<Contents
					active={bookNavVisible}
					goToPosition={goToPosition}
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
