import Head from "next/head";
import { Inter } from "@next/font/google";
import styled, { createGlobalStyle, css } from "styled-components";
import { useState, useEffect, useRef } from "react";

import Search from "../components/search";

import GlobalStyle from "../styles/globalStyles";

import { Books } from "../utils/Books";

const Container = styled.div`
	display: grid;
	grid-template-columns: [fullbleed-start] 24px [main-start] 1fr [main-end] 24px [fullbleed-end];
	justify-items: center;
`;

const Reader = styled.div`
	display: grid;
	grid-template-columns: [fullbleed-start] 24px [main-start] 1fr [main-end] 24px [fullbleed-end];
	justify-items: center;

	grid-column: fullbleed;

	${(props) =>
		props.searchActive &&
		css`
			pointer-events: none;
		`}
`;

const Book = styled.div`
	display: grid;
	grid-template-columns: [fullbleed-start] 24px [main-start] 1fr [main-end] 24px [fullbleed-end];
	justify-items: center;

	grid-column: fullbleed;

	padding: 24px 0;
`;

const BookTitle = styled.h1`
	font-family: Family, georgia, serif;
	grid-column: main;
	padding: 24px;
	margin-bottom: 24px;
	font-size: 54px;
	line-height: 60px;
	text-align: center;
`;

const Chapter = styled.div`
	max-width: 70ch;
	line-height: 24px;
	grid-column: main;
	margin-bottom: 24px;
`;

const ChapterNumber = styled.h2`
	font-size: 54px;
	font-weight: 300;
	display: inline-block;
	float: left;
	line-height: 1.9ex;
	margin-right: 0.35ex;

	& + p sup {
		display: none;
	}
`;

const Verse = styled.p`
	display: inline;
	font-family: Family, georgia, serif;

	sup {
		opacity: 0.3;
		padding: 0 0.1ex 0 1ex;
		line-height: 0;
	}
`;

const BooksNav = styled.nav`
	position: fixed;
	width: 100%;
	top: 0;
	bottom: 0;
	transition: left 0.2s ease-in, background 0.2s ease-in, opacity 0.2s;
	left: ${(props) => (props.active ? "0" : "-280px")};
	text-align: left;
	overflow: scroll;
	z-index: 1;
	opacity: ${(props) => (props.active ? "1" : "0")};
	pointer-events: ${(props) => (props.active ? "all" : "none")};
	${(props) =>
		props.active
			? css`
					background: linear-gradient(
						to right,
						rgba(255, 255, 255, 1) 0%,
						rgba(255, 255, 255, 1) 100px,
						rgba(255, 255, 255, 0.8) 300px,
						rgba(255, 255, 255, 0.4) 100%
					);
			  `
			: css`
					background: linear-gradient(
						to right,
						rgba(255, 255, 255, 1) 0%,
						rgba(255, 255, 255, 1) 50px,
						rgba(255, 255, 255, 0.4) 100%
					);
			  `};

	display: grid;
	grid-template-columns: 280px 1fr;

	.book-list {
		padding: 60px 24px;
	}
	.dismiss {
		width: 100%;
		height: 100%;
	}

	p {
		opacity: 0.4;
		transition: opacity 0.2s;
		width: 100%;
		padding: 6px 0;
		font-size: 36px;
		font-weight: 300;

		&:hover {
			opacity: 1;
		}
		cursor: pointer;
	}
`;

const Navbar = styled.div`
	width: 100%;
	position: fixed;
	padding-bottom: env(safe-area-inset-bottom);

	left: 0;
	right: 0;
	display: flex;
	justify-content: space-between;
	z-index: 99;

	@media all and (max-width: 820px) {
		background: white;
		border-top: 1px solid rgb(0 0 0 /0.1);
		bottom: 0;
	}

	button {
		height: 60px;
		padding: 12px 24px;
		background: none;
		outline: none;
		border: none;
		font-family: "Family", georgia, serif;
		font-size: 16px;
		font-style: italic;
		opacity: 0.4;
		transition: opacity 0.2s;
		cursor: pointer;
		color: black;

		&:hover {
			opacity: 1;
		}
	}
`;

const NavToggle = styled.button``;

const SearchToggle = styled.button``;

export default function Home() {
	const [currentBook, setCurrentBook] = useState(Books[0]); // set the initial book to the first book in the JSON data

	const [bookNavVisible, setBookNavVisible] = useState(false);
	const [searchVisible, setSearchVisible] = useState(false);

	const handleBookSelect = (e) => {
		setCurrentBook(Books[e.target.getAttribute("data-index")]);
		setBookNavVisible(false);
		window.scrollTo({ top: 0 });
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
				<Navbar>
					<NavToggle
						onClick={() => {
							setBookNavVisible(!bookNavVisible);
						}}
					>
						Index
					</NavToggle>
					<SearchToggle
						onClick={() => {
							setSearchVisible(true);
						}}
					>
						Search
					</SearchToggle>
				</Navbar>

				<BooksNav active={bookNavVisible}>
					<div className="book-list">
						{Books.map((book, i) => (
							<p key={book.book} onClick={handleBookSelect} data-index={i}>
								{book.book}
							</p>
						))}
					</div>
					<div
						className="dismiss"
						onClick={() => {
							setBookNavVisible(false);
						}}
					></div>
				</BooksNav>
				{searchVisible && (
					<Search
						dismiss={() => {
							setSearchVisible(false);
						}}
					></Search>
				)}

				<Reader searchActive={searchVisible}>
					<Book key={currentBook.book}>
						<BookTitle className="content">{currentBook.book}</BookTitle>
						{currentBook.chapters.map((chapter) => (
							<Chapter key={chapter.chapter} className="content">
								<ChapterNumber>{`${chapter.chapter}`}</ChapterNumber>
								{chapter.verses.map((verse) => (
									<Verse key={verse.verse}>
										<sup>{verse.verse}</sup>&nbsp;{verse.text}
									</Verse>
								))}
							</Chapter>
						))}
					</Book>
				</Reader>
			</Container>
		</>
	);
}
