"use client";

import styles from "./Reader.module.css";
import { useEffect, useCallback, useState, useRef, memo } from "react";
import Debounce from "../../utils/Debounce";
import { useBibleContent } from "../../utils/useReadingPosition";
import type { ReaderProps } from "../../types/bible";

function Reader({ book, searchActive = false, onChapterChange }: ReaderProps) {
	const { cacheBibleBook } = useBibleContent();
	const [visibleChapter, setVisibleChapter] = useState<number | null>(null);
	const debouncedSaveRef = useRef<(chapter: number, verse: number) => void>();
	const initialHashScrollDone = useRef(false);

	// Initialize debounced save function once
	useEffect(() => {
		debouncedSaveRef.current = Debounce((chapter: number, verse: number) => {
			if (onChapterChange) {
				onChapterChange(chapter, verse);
			}
		}, 1000);
	}, [onChapterChange]);

	// Cache the current book content when it's loaded
	useEffect(() => {
		if (book && book.book) {
			cacheBibleBook(book.book, book);
		}
	}, [book.book, cacheBibleBook]);

	// Memoize the scroll handler so it doesn't get recreated on every render
	const handleScroll = useCallback(() => {
		if (searchActive) return; // pause updates while search overlay is open

		const elements = document.querySelectorAll("p.verse");

		const foundElement = Array.from(elements).find((element) => {
			if (
				element.getBoundingClientRect().top >= 0 &&
				element.getBoundingClientRect().top <= window.innerHeight
			) {
				return element.id;
			}
		});

		if (foundElement) {
			const currentChapterVerse = foundElement.id.split(":");
			const chapter = parseInt(currentChapterVerse[0]);
			const verse = parseInt(currentChapterVerse[1]);

			// Update URL hash immediately for instant visual feedback
			// Use replaceState to avoid adding to history on every scroll
			window.history.replaceState(null, "", `#${chapter}:${verse}`);

			// Manually dispatch hashchange event since replaceState doesn't trigger it
			window.dispatchEvent(new HashChangeEvent("hashchange"));

			// Update local state for any other consumers
			setVisibleChapter(chapter);

			// Call debounced save operation
			if (currentChapterVerse.length >= 2 && debouncedSaveRef.current) {
				debouncedSaveRef.current(chapter, verse);
			}
		}

		return foundElement;
	}, [searchActive]);

	useEffect(() => {
		if (typeof window !== "undefined") {
			// Use passive listener for better scroll performance
			window.addEventListener("scroll", handleScroll, { passive: true });

			return () => {
				window.removeEventListener("scroll", handleScroll);
			};
		}
	}, [handleScroll]);

	const chaptersCount = book?.chapters.length || 0;
	let highlightVerse: string | null = null;

	if (typeof window !== "undefined") {
		// Get highlight parameter from URL query string
		const params = new URLSearchParams(window.location.search);
		highlightVerse = params.get("highlight");
	}

	// Scroll to requested hash/highlight once after book loads
	useEffect(() => {
		if (typeof window === "undefined") return;

		const targetHash = window.location.hash.replace("#", "");
		let targetId = targetHash || highlightVerse;

		// If target is chapter 1 verse 1, scroll to top instead of verse anchor
		if (targetId === "1:1") {
			targetId = null;
			initialHashScrollDone.current = true;
			window.scrollTo({ top: 0, behavior: "instant" });
			return;
		}
		if (!targetId || initialHashScrollDone.current) return;

		const tryScroll = () => {
			const el = document.getElementById(targetId);
			if (el) {
				el.scrollIntoView({ behavior: "instant", block: "start" });
				initialHashScrollDone.current = true;
				return true;
			}
			return false;
		};

		// attempt immediately, then fallback after a frame to allow render
		if (!tryScroll()) {
			requestAnimationFrame(() => {
				tryScroll();
			});
		}
	}, [book, highlightVerse]);

	return (
		<div
			className={styles.container}
			data-search-active={searchActive}
			aria-hidden={searchActive}
			style={searchActive ? { pointerEvents: "none" } : undefined}
		>
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
									highlightVerse &&
									highlightVerse === chapter.chapter + `:` + verse.verse
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

export default memo(Reader);
