import styled from "styled-components";
import GlobalStyle from "../../styles/globalStyles";
import Head from "next/head";

import { useState, useEffect, useRef } from "react";

import Search from "../search";
import Reader from "../Reader";
import Contents from "../Contents";
import NavBar from "../NavBar";

import { Books } from "../../utils/Books";
import { useReadingPosition } from "../../utils/useReadingPosition";

const Container = styled.div`
	display: grid;
	grid-template-columns: [fullbleed-start] 24px [main-start] 1fr [main-end] 24px [fullbleed-end];
	justify-items: center;
`;

function scrollTo(chapter, verse) {
	let chapterVerse = chapter;
	if (verse) {
		chapterVerse = chapter + ":" + verse;
	}
	const element = document.getElementById(chapterVerse);
	if (element) {
		element.scrollIntoView({ behavior: "instant" });
	}
}

export default function Main({ slug, book }) {
	const [bookNavVisible, setBookNavVisible] = useState(false);
	const [searchVisible, setSearchVisible] = useState(false);
	const [currentBook, setCurrentBook] = useState(book || Books[0]);
	const [initialLoadComplete, setInitialLoadComplete] = useState(false);

	const {
		currentPosition,
		savePosition,
		saveCurrentScrollPosition,
		isLoading,
	} = useReadingPosition();

	useEffect(() => {
		// Only restore position on initial load, not when navigating between books
		if (!book && currentPosition && !isLoading && !initialLoadComplete) {
			if (currentPosition.book !== undefined && Books[currentPosition.book]) {
				setCurrentBook(Books[currentPosition.book]);

				// Mark initial load as complete before scrolling
				setInitialLoadComplete(true);

				// Scroll to saved position after content is rendered
				// Use a longer delay to ensure everything is loaded
				setTimeout(() => {
					if (currentPosition.scrollPosition > 0) {
						// Restore exact scroll position if we have it
						window.scrollTo({
							top: currentPosition.scrollPosition,
							behavior: "instant",
						});
					} else {
						// Fallback to scrolling to the verse
						scrollTo(currentPosition.chapter, currentPosition.verse);
					}
				}, 200);
			} else {
				setInitialLoadComplete(true);
			}
		}

		// If a specific book is provided (navigation), use it without scroll restoration
		if (book) {
			// Save current scroll position before navigating away
			if (initialLoadComplete && currentPosition) {
				saveCurrentScrollPosition();
			}
			setCurrentBook(book);
			if (!initialLoadComplete) {
				setInitialLoadComplete(true);
			}
		}
	}, [book, currentPosition, isLoading, initialLoadComplete]);

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
				></Search>

				<Reader
					book={currentBook}
					savePosition={savePosition}
					currentPosition={currentPosition}
				></Reader>

				<Contents
					active={bookNavVisible}
					books={Books}
					dismiss={() => {
						setBookNavVisible(false);
					}}
				></Contents>

				<NavBar
					setBookNavVisible={setBookNavVisible}
					bookNavVisible={bookNavVisible}
					setSearchVisible={setSearchVisible}
					currentPosition={currentPosition}
					currentBook={currentBook}
				/>
			</Container>
		</>
	);
}
