"use client";

import styles from "./Reader.module.css";
import { useEffect } from "react";
import Debounce from "../../utils/Debounce";
import { useBibleContent } from "../../utils/useReadingPosition";
import type { ReaderProps } from "../../types/bible";

export default function Reader({
	book,
	searchActive = false,
	onChapterChange,
}: ReaderProps) {
	const { cacheBibleBook } = useBibleContent();

	// Cache the current book content when it's loaded
	useEffect(() => {
		if (book && book.book) {
			cacheBibleBook(book.book, book);
		}
	}, [book, cacheBibleBook]);

	const handleScroll = Debounce(() => {
		const elements = document.querySelectorAll("p.verse");
		let currentChapterVerse: string[] | null = null;

		const foundElement = Array.from(elements).find((element) => {
			if (
				element.getBoundingClientRect().top >= 0 &&
				element.getBoundingClientRect().top <= window.innerHeight
			) {
				return element.id;
			}
		});

		if (foundElement) {
			currentChapterVerse = foundElement.id.split(":");

			// Call the onChapterChange callback if provided
			if (onChapterChange && currentChapterVerse.length >= 2) {
				onChapterChange(
					parseInt(currentChapterVerse[0]),
					parseInt(currentChapterVerse[1])
				);
			}
		}

		return foundElement;
	}, 1000);

	useEffect(() => {
		if (typeof window !== "undefined") {
			window.addEventListener("scroll", handleScroll);

			return () => {
				window.removeEventListener("scroll", handleScroll);
			};
		}
	}, [book, handleScroll]);

	const chaptersCount = book?.chapters.length || 0;
	let hash: string | null = null;

	if (typeof window !== "undefined") {
		hash = window?.location.hash.substring(1) || null;
	}

	return (
		<div className={styles.container} data-search-active={searchActive}>
			<div className={styles.book}>
				<h1 className={styles.bookTitle}>{book.book}</h1>
				{book.chapters?.map((chapter) => (
					<div
						key={chapter.chapter}
						className={styles.chapter}
						id={chapter.chapter.toString()}
					>
						<h2 className={styles.chapterNumber}>
							{chaptersCount > 1
								? chapter.chapter
								: chapter.verses[0]?.text.slice(0, 1)}
						</h2>
						{chapter.verses.map((verse, i) => (
							<p
								key={verse.verse}
								id={chapter.chapter + `:` + verse.verse}
								className={`${styles.verse} verse ${
									verse.paragraph ? styles.newParagraph : ""
								} ${
									hash && hash === chapter.chapter + `:` + verse.verse
										? styles.highlight
										: ""
								}`}
							>
								<sup>{verse.verse}&nbsp;</sup>
								{i === 0 && chaptersCount < 2 && verse.text.slice(1)}
								{(i > 0 || chaptersCount > 1) && verse.text}
							</p>
						))}
					</div>
				))}
			</div>
		</div>
	);
}
