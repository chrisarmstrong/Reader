import { useState } from "react";
import styled from "styled-components";
import Link from "next/link";

import { Books } from "../../utils/Books";

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
	font-family: Family, georgia, serif;
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

const Results = styled.div`
	display: grid;
	grid-template-columns: [fullbleed-start] 24px [main-start] 1fr [main-end] 24px [fullbleed-end];
	justify-items: center;
	height: calc(100vh - 60px);
	overflow: scroll;
	padding-bottom: 120px;
	pointer-events: all;
`;

const Result = styled.div`
	max-width: 70ch;
	width: 100%;
	grid-column: main;
	font-family: Family, georgia, serif;
	padding: 24px 0;
	border-bottom: 1px solid rgb(0 0 0 / 0.1);
	cursor: pointer;

	p {
		margin-bottom: 6px;
	}
	.chapter-verse {
		opacity: 0.4;
	}

	.highlight {
		font-weight: bold;
	}

	a {
		color: inherit;
		text-decoration: none;
	}
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
	font-family: "Family", georgia, serif;
	color: rgb(0 0 0 / 0.4);

	transition: color 0.2s;
	cursor: pointer;

	&:hover {
		color: black;
	}
	pointer-events: all;
`;

export default function Search({ active, dismiss, goToPosition }) {
	const [searchKeyword, setSearchKeyword] = useState("");
	const [searchResults, setSearchResults] = useState([]);

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
		console.log("Search for " + e.target.value);
	}, 500);

	const highlightWordInString = (str, wordToHighlight) => {
		const words = str.split(" ");

		return words.map((word, i) => {
			const lowercased = word.toLowerCase();

			if (lowercased.includes(wordToHighlight)) {
				return (
					<span key={i} className="highlight">
						{word}{" "}
					</span>
				);
			} else {
				return <span key={i}>{word} </span>;
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
					<Results active={active}>
						{Books.map((book, book_index) =>
							book.chapters.map((chapter) =>
								chapter.verses.map(
									(verse) =>
										searchKeyword.length > 1 &&
										verse.text
											.toLowerCase()
											.includes(searchKeyword.toLowerCase()) && (
											<Result
												key={`${book.book}${chapter.chapter}:${verse.verse}`}
											>
												<Link
													href={
														"/" +
														book.book.toLowerCase() +
														"#" +
														chapter.chapter +
														":" +
														verse.verse
													}
													onClick={() => {
														dismiss();
													}}
												>
													<p>
														{highlightWordInString(
															verse.text,
															searchKeyword.toLowerCase()
														)}
													</p>
													<p className="chapter-verse">{`${book.book} ${chapter.chapter}:${verse.verse}`}</p>
												</Link>
											</Result>
										)
								)
							)
						)}
					</Results>
				</>
			) : null}
		</Container>
	);
}
