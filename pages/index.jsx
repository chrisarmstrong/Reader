import Head from "next/head";
import { Inter } from "@next/font/google";
import styled, { createGlobalStyle, css } from "styled-components";
import { useState, useEffect, useRef } from "react";

import { VariableSizeList } from "react-window";

import GlobalStyle from "../styles/globalStyles";

import Books from "./data/kjv/Books.json";
import Genesis from "./data/kjv/Genesis.json";

const Container = styled.div`
	display: grid;
	grid-template-columns: [fullbleed-start] 24px [main-start] 1fr [main-end] 24px [fullbleed-end];
	justify-items: center;

	${(props) =>
		props.searchKeyword.length < 2
			? css`
					.results {
						display: none;
					}

					.content {
						display: block;
					}
			  `
			: css`
					.results {
						display: block;
					}

					.content {
						display: none;
					}
			  `}
`;

const Reader = styled.div`
	display: grid;
	grid-template-columns: [fullbleed-start] 24px [main-start] 1fr [main-end] 24px [fullbleed-end];
	justify-items: center;

	grid-column: fullbleed;
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

const Result = styled.div`
	font-family: Family, georgia, serif;
	padding: 24px 0;
	border-bottom: 1px solid rgb(0 0 0 / 0.1);
	p {
		margin-bottom: 6px;
	}
	.chapter-verse {
		opacity: 0.4;
	}
`;

const Search = styled.input`
	font-family: Family, georgia, serif;
	font-size: 16px;
	grid-column: fullbleed;
	width: 100%;
	position: fixed;
	bottom: 0;
	outline: none;
	border: none;
	border-radius: none;
	padding: 18px 24px;
	border-top: 1px solid rgb(0 0 0 /0.1);
	border-radius: 0;
	background: white;
	z-index: 99;
	box-sizing: boder-box;
`;

const BooksNav = styled.nav`
	position: fixed;
	width: 200px;
	bottom: 60px;

	transition: right 0.2s ease-in;
	right: ${(props) => (props.active ? "0" : "-200px")};
	text-align: right;
	padding: 24px;
	height: calc(100vh - 60px);
	overflow: scroll;
	z-index: 1;

	background: linear-gradient(
		to left,
		rgba(255, 255, 255, 1) 0%,
		rgba(255, 255, 255, 1) 40%,
		rgba(255, 255, 255, 0) 100%
	);

	p {
		opacity: 0.4;
		transition: opacity 0.2s;
		width: 100%;
		padding: 6px 0;

		&:hover {
			opacity: 1;
		}
		cursor: pointer;
	}
`;

const NavToggle = styled.div`
	width: 60px;
	height: 60px;
	position: fixed;
	bottom: 0;
	right: 0;
	z-index: 99;
	display: flex;
	justify-content: center;
	align-items: center;
	cursor: pointer;

	&:after {
		content: "";
		display: block;
		width: 6px;
		height: 6px;
		background: black;
		border-radius: 100px;
		opacity: 0.4;
		transition: width 0.2s ease-in, height 0.2s ease-in, opacity 0.2s;
	}

	&:hover:after {
		width: 12px;
		height: 12px;
		opacity: 1;
	}
`;

export default function Home() {
	const [bookData, setBookData] = useState([]);
	const [currentBook, setCurrentBook] = useState(bookData[0] || Genesis); // set the initial book to the first book in the JSON data

	const [bookNavVisible, setBookNavVisible] = useState(false);

	const [searchKeyword, setSearchKeyword] = useState("");
	const [searchResults, setSearchResults] = useState([]);

	useEffect(() => {
		Promise.all(
			Books.map((book) => {
				import(`./data/kjv/${book}.json`).then((data) => {
					setBookData((prevData) => [...prevData, data.default]);
				});
			})
		);
	}, []);

	console.log(bookData.length);

	function debounce(func, delay) {
		let timeoutId;
		return function (...args) {
			const context = this;
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func.apply(context, args), delay);
		};
	}

	const handleSearch = debounce((e) => {
		setSearchKeyword(e.target.value);
		getVerses();
	}, 500);

	const handleBookSelect = (e) => {
		setCurrentBook(bookData[e.target.getAttribute("data-index")]);
		window.scrollTo({ top: 0 });
	};

	const handleNavToggle = (e) => {
		setBookNavVisible(!bookNavVisible);
	};

	const getVerses = () => {
		let verses = [];

		bookData.forEach((book) => {
			book.chapters.forEach((chapter) => {
				chapter.verses.forEach((verse) => {
					if (
						!searchKeyword ||
						verse.text.toLowerCase().includes(searchKeyword.toLowerCase())
					) {
						verses.push(
							<Result key={`${book.book}${chapter.chapter}:${verse.verse}`}>
								<p>{verse.text}</p>
								<p className="chapter-verse">{`${book.book} ${chapter.chapter}:${verse.verse}`}</p>
							</Result>
						);
					}
				});
			});
		});

		setSearchResults(verses);
	};

	return (
		<>
			<Head>
				<title>{currentBook.book}</title>
				<meta name="description" content="Generated by create next app" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
				/>
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<link
					rel="apple-touch-icon"
					sizes="180x180"
					href="/apple-touch-icon.png"
				></link>
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<GlobalStyle></GlobalStyle>

			<Container searchKeyword={searchKeyword}>
				<Search type="text" placeholder="Search..." onChange={handleSearch} />

				<Chapter className="results">{searchResults}</Chapter>
				<NavToggle onClick={handleNavToggle}></NavToggle>

				<BooksNav active={bookNavVisible}>
					{bookData.map((book, i) => (
						<p key={book.book} onClick={handleBookSelect} data-index={i}>
							{book.book}
						</p>
					))}
				</BooksNav>

				<Reader>
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
