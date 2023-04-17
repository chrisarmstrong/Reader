import { useState } from "react";
import styled from "styled-components";

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
	margin-right: 0.25ex;

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
`;

export default function Reader({ book }) {
	const chaptersCount = book.chapters.length;

	return (
		<Container>
			<Book key={book.book}>
				<BookTitle className="content">{book.book}</BookTitle>
				{book.chapters.map((chapter) => (
					<Chapter key={chapter.chapter} className="content chapter">
						<ChapterNumber>
							{chaptersCount > 1
								? chapter.chapter
								: chapter.verses[0].text.slice(0, 1)}
						</ChapterNumber>
						{chapter.verses.map((verse, i) => (
							<Verse
								key={verse.verse}
								className={verse.paragraph ? `verse new-paragraph` : `verse`}
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