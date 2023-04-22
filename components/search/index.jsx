import { useState } from "react";
import styled, { css } from "styled-components";
import Link from "next/link";

import { Books } from "../../utils/Books";

// import Fuse from "fuse.js";
// const options = {
// 	keys: ["text"], // Search the 'text' property of each verse object
// 	includeMatches: true, // Return matched characters for highlighting
// 	includeScore: true,
// 	threshold: 0.46,
// 	shouldSort: true,
// };
// const indexableData = Books.flatMap((book) =>
// 	book.chapters.flatMap((chapter) =>
// 		chapter.verses.map((verse) => ({
// 			...verse,
// 			book: book.book,
// 			chapter: chapter.chapter,
// 		}))
// 	)
// );
// const fuse = new Fuse(indexableData, options);

const Container = styled.div`
	position: fixed;
	top: 0;
	bottom: 0;
	left: 0;
	right: 0;
	background: ${(props) => (props.active ? "white" : "#ffffff00")};
	z-index: 100;
	pointer-events: none;
	opacity: ${(props) => (props.active ? "1" : "0")};
	transition: background-color 0.2s ease-in, opacity 0.2s;
`;

const SearchInput = styled.input`
	font-family: var(--serif), georgia, serif;
	font-size: 16px;
	grid-column: fullbleed;
	width: 100%;
	position: sticky;
	top: 0;
	outline: none;
	border: none;
	border-radius: none;
	padding: 18px 24px;
	border-bottom: 1px solid rgb(0 0 0 /0.1);
	border-radius: 0;
	background: white;
	z-index: 99;
	box-sizing: boder-box;
	pointer-events: all;
`;

const ResultsContainer = styled.div`
	overflow: scroll;
	padding-bottom: 120px;
	pointer-events: all;
	height: calc(100vh - 60px);
	width: 100%;
`;

const ResultsList = styled.div`
	display: grid;
	grid-template-columns: [fullbleed-start] 24px [main-start] 1fr [main-end] 24px [fullbleed-end];
	justify-items: center;

	& > div {
		grid-column: main;
	}

	.count {
		padding: 24px 0;
		font-style: italic;
		font-size: 18px;
		line-height: 24px;
		opacity: 0.6;
		text-align: center;
	}

	&.book-results {
		background: rgb(0 0 0 /0.05);
		padding: 12px 0;

		align-items: start;

		& + .no-results {
			display: none;
		}
	}
`;

const Result = styled.div`
	max-width: 70ch;
	width: 100%;
	grid-column: main;

	font-family: var(--serif), georgia, serif;

	${(props) =>
		props.sameChapter && !props.followingVerse
			? css`
					&:before {
						content: "";
						display: block;
						margin: auto;
						border-top: 1px dashed rgb(0 0 0 /0.1);
						width: 100%;
					}
			  `
			: css``}

	${(props) =>
		!props.sameChapter &&
		css`
			border-top: 1px solid rgb(0 0 0 / 0.2);
		`}

        

	cursor: pointer;

	p {
		margin-bottom: 6px;
	}
	.chapter-verse {
		opacity: 0.4;
		margin-bottom: 0;
	}

	.highlight {
		font-weight: bold;
		font-style: italic;
	}

	a {
		color: inherit;
		text-decoration: none;
		padding: 24px 0;
		display: block;
	}

	${(props) =>
		props.followingVerse &&
		css`
			border-top: none;
			margin-top: -24px;
		`}

	&.book-result {
		border-top: none;

		a {
			padding: 6px 0;
			font-size: 18px;
			width: 100vw;
			max-width: 100%;
			opacity: 0.6;
			transition: opacity 0.2s;

			&:hover {
				opacity: 1;
			}
		}
	}
`;

const Searchbar = styled.div`
	display: flex;
`;

const DismissButton = styled.button`
	outline: none;
	border: none;
	padding: none;
	background: none;
	border-radius: none;
	width: 60px;
	height: 60px;
	position: absolute;
	top: 0;
	right: 0;
	z-index: 99;
	line-height: 60px;
	font-size: 24px;
	font-family: var(--serif), georgia, serif;
	color: rgb(0 0 0 / 0.4);

	transition: color 0.2s;
	cursor: pointer;

	&:hover {
		color: black;
	}
	pointer-events: all;
`;

const History = styled.ul`
	pointer-events: all;
	padding: 24px 0;

	button {
		background: none;
		padding: 12px 24px;
		border: none;
		outline: none;
		border-radius: none;
		font-family: var(--serif), georgia, serif;
		font-size: 18px;
		line-height: 12px;
		cursor: pointer;
		color: inherit;
		opacity: 0.6;
		transition: opacity 0.2s;
		width: 100%;
		text-align: left;
	}

	button:hover {
		opacity: 1;
	}
`;

export default function Search({ active, dismiss, goToPosition }) {
	const [searchKeyword, setSearchKeyword] = useState("");
	const [searchHistory, setSearchHistory] = useState([]);
	const [resultsCount, setResultsCount] = useState([]);

	function debounce(func, delay) {
		let timeoutId;
		return function (...args) {
			const context = this;
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func.apply(context, args), delay);
		};
	}

	const updateSearchHistory = (keyword) => {
		if (keyword.length > 1) {
			const history = [keyword, ...searchHistory];
			const uniqueHistory = [...new Set(history)];
			setSearchHistory(uniqueHistory.splice(0, 5));
			localStorage?.setItem("lastPosition", JSON.stringify(searchHistory));
			console.log("Searches", keyword, searchHistory);
		}
	};

	const handleSearch = debounce((e) => {
		setSearchKeyword(e.target.value);
		console.log("Search for " + e.target.value);
		updateSearchHistory(e.target.value);
	}, 500);

	const getResults = (keyword) => {
		// const fuseResults = fuse.search(keyword);
		// console.log("Fuse results", fuseResults.length, fuseResults, Books);

		let results = [];
		const keywords = keyword.toLowerCase().split(" ");

		Books.map((book) =>
			book.chapters.map((chapter) =>
				chapter.verses.map((verse) => {
					const verseText = verse.text.toLowerCase();
					const match = keywords.every((word) => verseText.includes(word));
					if (keyword.length > 1 && match) {
						const r = {
							book: book.book,
							chapter: chapter,
							verse: verse,
						};
						results.push(r);
					}
				})
			)
		);

		return results;
	};

	const getBookResults = (keyword) => {
		let results = [];
		const keywords = keyword.toLowerCase().split(" ");

		Books.map((book) => {
			if (book.book.toLowerCase().includes(keywords[0])) {
				const chapterVerse = keywords[1]?.split(":") || null;
				const chapter = (chapterVerse && parseInt(chapterVerse[0])) || null;
				const verse =
					(chapterVerse && chapterVerse[1] && parseInt(chapterVerse[1])) ||
					null;

				if (chapter && chapter < book.chapters.length + 1) {
					if (verse && verse < book.chapters[chapter - 1].verses.length + 1) {
						const r = {
							book: book.book,
							chapter: chapter.toString(),
							verse: verse.toString(),
						};
						console.log("Book,chapter and verse", r);
						results.push(r);
					} else {
						const r = {
							book: book.book,
							chapter: chapter.toString(),
							verse: null,
						};
						console.log("Book and chapter", r);
						results.push(r);
					}
				} else {
					const r = { book: book.book, chapter: null, verse: null };
					console.log("Book result", r);
					results.push(r);
				}
			}
		});

		return results;
	};

	const BookResults = ({ keyword }) => {
		const results = getBookResults(keyword);

		return results.length ? (
			<ResultsList active={active} className="book-results">
				<div>
					{results.map((result, i) => {
						const link = (r) => {
							let l = "/" + r.book.toLowerCase().replace(/\s+/g, "-");

							if (r.chapter) {
								if (r.verse) {
									l = l + "#" + r.chapter + ":" + r.verse;
								} else {
									l = l + "#" + r.chapter;
								}
							}

							return l;
						};

						return (
							<Result
								className="book-result"
								key={
									"book-result" +
									result.book +
									result.chapter?.chapter +
									result.verse?.verse +
									"-" +
									i
								}
							>
								<Link
									href={link(result)}
									onClick={() => {
										dismiss();
									}}
								>
									<p>{`${result.book} ${
										result.chapter?.length > 0 ? " " + result.chapter : ""
									}${result.verse ? ":" + result.verse : ""}`}</p>
								</Link>
							</Result>
						);
					})}
				</div>
			</ResultsList>
		) : (
			<></>
		);
	};

	const Results = ({ keyword }) => {
		const results = getResults(keyword);

		return (
			<ResultsList
				active={active}
				className={results.length < 1 ? "no-results" : ""}
			>
				<div>
					<p className="count">
						{results.length} verses containing “{keyword}”
					</p>
					{results.map((result, i) =>
						i < 500 ? (
							<Result
								key={
									i + result.book + result.chapter.chapter + result.verse.verse
								}
								sameChapter={
									i > 0 &&
									result.book == results[i - 0].book &&
									result.chapter.chapter == results[i - 1].chapter.chapter
								}
								followingVerse={
									i > 0 &&
									result.book == results[i - 0].book &&
									result.chapter.chapter == results[i - 1].chapter.chapter &&
									parseInt(result.verse.verse) ==
										parseInt(results[i - 1].verse.verse) + 1
								}
							>
								<Link
									href={
										"/" +
										result.book.toLowerCase().replace(/\s+/g, "-") +
										"#" +
										result.chapter.chapter +
										":" +
										result.verse.verse
									}
									onClick={() => {
										dismiss();
									}}
								>
									<p>
										{highlightWordInString(
											result.verse.text,
											searchKeyword.toLowerCase()
										)}
									</p>
									<p className="chapter-verse">{`${result.book} ${result.chapter.chapter}:${result.verse.verse}`}</p>
								</Link>
							</Result>
						) : (
							<></>
						)
					)}
				</div>
			</ResultsList>
		);
	};

	const highlightWordInString = (str, wordToHighlight) => {
		const words = str.split(" ");
		const highlightWords = wordToHighlight.split(" ");

		return words.map((word, i) => {
			const lowercased = word.toLowerCase();

			if (highlightWords.some((highlight) => lowercased.includes(highlight))) {
				return (
					<span key={i} className="highlight">
						{word}{" "}
					</span>
				);
			} else {
				return <>{" " + word + " "}</>;
			}
		});
	};

	return (
		<Container active={active}>
			{active ? (
				<>
					<SearchInput
						type="text"
						placeholder="Search..."
						onChange={handleSearch}
						autoFocus
						onBlur={() => {
							!searchKeyword && dismiss();
						}}
					/>
					<DismissButton
						onClick={() => {
							dismiss();
							setSearchKeyword[""];
						}}
					>
						×
					</DismissButton>

					{searchKeyword.length > 1 ? (
						<ResultsContainer>
							<BookResults keyword={searchKeyword} />
							<Results keyword={searchKeyword} />
						</ResultsContainer>
					) : (
						<History>
							{/* {searchHistory.map((history, i) => (
								<li key={i}>
									<button
										onClick={() => {
											setSearchKeyword(history);
											console.log("test");
										}}
									>
										{history}
									</button>
								</li>
							))} */}
						</History>
					)}
				</>
			) : null}
		</Container>
	);
}
