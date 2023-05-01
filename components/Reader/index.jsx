import { useState, useEffect } from "react";
import styled, { css, keyframes } from "styled-components";
import Debounce from "../../utils/Debounce";

const Container = styled.div`
	display: grid;
	grid-template-columns: [fullbleed-start] 24px [main-start] 1fr [main-end] 24px [fullbleed-end];
	justify-items: center;
	grid-column: fullbleed;

	${(props) =>
		props.searchActive &&
		css`
			pointer-events: none;
		`}

	--highlight-color: #fcba0360;
`;

const highlightFade = keyframes`
 0% { background: transparent}
 5% { background: var(--highlight-color)}
 80% { background: var(--highlight-color)}
 100% { background: transparent) }
`;

const Book = styled.div`
	display: grid;
	grid-template-columns: [fullbleed-start] 24px [main-start] 1fr [main-end] 24px [fullbleed-end];
	justify-items: center;

	grid-column: fullbleed;

	padding: 24px 0;

	padding-bottom: calc(60px + env(safe-area-inset-bottom));
`;

const BookTitle = styled.h1`
	font-family: var(--serif), georgia, serif;
	grid-column: main;
	padding: 24px 0;
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
	margin-right: 0.25ex;

	& + p sup {
		display: none;
	}
`;

const Verse = styled.p`
	display: inline;
	font-family: var(--serif), georgia, serif;

	sup {
		opacity: 0.3;
		padding: 0 0.1ex 0 1ex;
		line-height: 0;
		font-variant-numeric: oldstyle-nums;
	}

	&.new-paragraph {
		&:before {
			content: "";
			display: block;
			height: 24px;
		}

		sup {
			padding-left: 0;
		}
	}

	transition: background-color 0.2s ease-out;

	${(props) =>
		props.highlight
			? css`
					// animation: ${highlightFade} 10s;
					background: var(--highlight-color);
			  `
			: ""}
`;

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

// Note: Books are zero-base indexed, chapters and verses are the number in which they appear

export default function Reader({ book, setCurrentPosition }) {
	const handleScroll = Debounce(() => {
		let elements = document.querySelectorAll("p.verse");
		let currentChapterVerse = null;

		let foundElement = Array.from(elements).find((element) => {
			if (
				element.getBoundingClientRect().top >= 0 &&
				element.getBoundingClientRect().top <= window.innerHeight
			) {
				return element.id;
			}
		});

		currentChapterVerse = foundElement.id.split(":");

		updateLastPosition(
			book?.index,
			currentChapterVerse[0],
			currentChapterVerse[1]
		);

		return foundElement;
	}, 1000);

	useEffect(() => {
		if (typeof window !== "undefined") {
			window.addEventListener("scroll", handleScroll);

			return () => {
				window.removeEventListener("scroll", handleScroll);
			};
		}
	}, []);

	const updateLastPosition = (book_index, chapter_index, verse_index) => {
		const position = {
			book: book_index,
			chapter: chapter_index,
			verse: verse_index,
		};
		localStorage.setItem("lastPosition", JSON.stringify(position));
		setCurrentPosition(position);
	};

	const chaptersCount = book?.chapters.length;
	let hash = null;

	if (typeof window !== "undefined") {
		hash = window?.location.hash.substring(1) || null;
	}

	return (
		<Container className="reader">
			<Book key={book.book}>
				<BookTitle className="content" key={book.book}>
					{book.book}
				</BookTitle>
				{book.chapters?.map((chapter) => (
					<Chapter
						key={chapter.chapter}
						className={"content chapter"}
						id={chapter.chapter}
					>
						<ChapterNumber>
							{chaptersCount > 1
								? chapter.chapter
								: chapter.verses[0].text.slice(0, 1)}
						</ChapterNumber>
						{chapter.verses.map((verse, i) => (
							<Verse
								key={verse.verse}
								id={chapter.chapter + `:` + verse.verse}
								className={verse.paragraph ? `verse new-paragraph` : `verse`}
								highlight={hash && hash == chapter.chapter + `:` + verse.verse}
							>
								<sup>{verse.verse}&nbsp;</sup>

								{i == 0 && chaptersCount < 2 && verse.text.slice(1)}
								{(i > 0 || chaptersCount > 1) && verse.text}
							</Verse>
						))}
					</Chapter>
				))}
			</Book>
		</Container>
	);
}
