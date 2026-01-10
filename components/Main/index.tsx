"use client";

import styles from "./Main.module.css";
import "../../styles/styles.css";

import { useState, useEffect, useCallback } from "react";
import type { MainProps, Book } from "../../types/bible";

import Search from "../search";
import Reader from "../Reader";
import Contents from "../Contents";
import NavBar from "../NavBar";

import { Books } from "../../utils/Books";
import { useReadingPosition } from "../../utils/useReadingPosition";

function scrollTo(chapter: number, verse?: number): void {
	let chapterVerse = chapter.toString();
	if (verse) {
		chapterVerse = chapter + ":" + verse;
	}
	const element = document.getElementById(chapterVerse);
	if (element) {
		element.scrollIntoView({ behavior: "instant" });
	}
}

export default function Main({ slug, book }: MainProps) {
	const [bookNavVisible, setBookNavVisible] = useState<boolean>(false);
	const [searchVisible, setSearchVisible] = useState<boolean>(false);
	const [currentBook, setCurrentBook] = useState<Book>(book || Books[0]);
	const [initialLoadComplete, setInitialLoadComplete] =
		useState<boolean>(false);

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
				setTimeout(() => {
					if (currentPosition.scrollPosition > 0) {
						window.scrollTo({
							top: currentPosition.scrollPosition,
							behavior: "instant",
						});
					} else {
						scrollTo(currentPosition.chapter, currentPosition.verse);
					}
				}, 200);
			} else {
				setInitialLoadComplete(true);
			}
		}
	}, [book, currentPosition, isLoading, initialLoadComplete]);

	// Separate effect to handle book changes for navigation
	useEffect(() => {
		if (book) {
			setCurrentBook(book);
			if (!initialLoadComplete) {
				setInitialLoadComplete(true);
			}
		}
	}, [book, initialLoadComplete]);

	// Save scroll position when navigating away from a book
	useEffect(() => {
		return () => {
			if (initialLoadComplete && currentPosition) {
				saveCurrentScrollPosition();
			}
		};
	}, [currentPosition, saveCurrentScrollPosition, initialLoadComplete]);

	const handleBookSelect = useCallback((selectedBook: Book): void => {
		setCurrentBook(selectedBook);
		setBookNavVisible(false);
	}, []);

	const handleMenuToggle = useCallback(() => {
		setBookNavVisible((prev) => !prev);
	}, []);

	const handleSearchToggle = useCallback(() => {
		setSearchVisible((prev) => !prev);
	}, []);

	const handleChapterChange = useCallback(
		(chapter: number, verse: number) => {
			if (currentBook.index !== undefined) {
				savePosition(currentBook.index, chapter, verse);
			}
		},
		[currentBook.index, savePosition]
	);

	// Close modals when escaping
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setSearchVisible(false);
				setBookNavVisible(false);
			}
		};

		if (searchVisible || bookNavVisible) {
			document.addEventListener("keydown", handleEscape);
			return () => document.removeEventListener("keydown", handleEscape);
		}
	}, [searchVisible, bookNavVisible]);

	return (
		<div className={styles.container}>
			{/* Only render Search when active */}
			{searchVisible && (
				<Search
					dismiss={() => setSearchVisible(false)}
					active={searchVisible}
				/>
			)}

			<Reader
				book={currentBook}
				searchActive={searchVisible}
				onChapterChange={handleChapterChange}
			/>

			{/* Only render Contents when active */}
			{bookNavVisible && (
				<Contents
					active={bookNavVisible}
					currentBook={currentBook}
					onBookSelect={handleBookSelect}
					books={Books}
					dismiss={() => setBookNavVisible(false)}
				/>
			)}

			<NavBar
				onMenuToggle={handleMenuToggle}
				onSearchToggle={handleSearchToggle}
				onNextChapter={() => {
					// Implementation for next chapter navigation
				}}
				onPrevChapter={() => {
					// Implementation for previous chapter navigation
				}}
				currentPosition={currentPosition}
				currentBook={currentBook}
			/>
		</div>
	);
}
