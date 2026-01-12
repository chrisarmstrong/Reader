"use client";

import styles from "./Main.module.css";
import "../../styles/styles.css";

import { useState, useEffect, useCallback, useRef } from "react";
import { useHotkeys } from "@mantine/hooks";
import type { MainProps, Book } from "../../types/bible";

import Search from "../search";
import Reader from "../Reader";
import Contents from "../Contents";
import Bookmarks from "../Bookmarks";
import NavBar from "../NavBar";

import { Books } from "../../utils/Books";
import { useReadingPosition } from "../../utils/useReadingPosition";
import { useAudioPlayer } from "../../utils/useAudioPlayer";
import { scrollToVerse } from "../../utils/scrollToVerse";

export default function Main({ slug, book }: MainProps) {
	const [bookNavVisible, setBookNavVisible] = useState<boolean>(false);
	const [searchVisible, setSearchVisible] = useState<boolean>(false);
	const [bookmarksVisible, setBookmarksVisible] = useState<boolean>(false);
	const [currentBook, setCurrentBook] = useState<Book>(book || Books[0]);
	const [initialLoadComplete, setInitialLoadComplete] =
		useState<boolean>(false);
	const [currentChapterContent, setCurrentChapterContent] = useState<
		string | undefined
	>(undefined);
	const [currentReference, setCurrentReference] = useState<string | null>(null);
	const [visibleChapter, setVisibleChapter] = useState<number | null>(null);
	const lastSavedPositionRef = useRef<{
		chapter: number;
		verse: number;
	} | null>(null);

	const dismissSearch = useCallback(() => setSearchVisible(false), []);

	const {
		currentPosition,
		savePosition,
		saveCurrentScrollPosition,
		isLoading,
	} = useReadingPosition();

	const { isPlaying, isSupported, currentVerseId, togglePlayPause, play } =
		useAudioPlayer({
			book: currentBook,
		});

	// Helper to get current position from hash (parses once instead of separately)
	const getCurrentPosition = useCallback(() => {
		if (typeof window === "undefined") {
			return {
				chapter: currentPosition?.chapter || 1,
				verse: currentPosition?.verse,
			};
		}
		const hash = window.location.hash.substring(1);
		if (hash) {
			const [chapter, verse] = hash.split(":");
			return {
				chapter: parseInt(chapter) || currentPosition?.chapter || 1,
				verse: verse ? parseInt(verse) : currentPosition?.verse,
			};
		}
		return {
			chapter: currentPosition?.chapter || 1,
			verse: currentPosition?.verse,
		};
	}, [currentPosition?.chapter, currentPosition?.verse]);

	// Wrapper for togglePlayPause that gets current position
	const handlePlayPause = useCallback(() => {
		const { chapter, verse } = getCurrentPosition();
		togglePlayPause(chapter, verse);
	}, [togglePlayPause, getCurrentPosition]);

	// Handler for playing audio from a specific verse
	const handlePlayAudio = useCallback(
		(chapter: number, verse: number) => {
			play(chapter, verse);
		},
		[play]
	);

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
						scrollToVerse(currentPosition.chapter, currentPosition.verse);
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

	useHotkeys([["mod+k", handleSearchToggle]]);

	const handleChapterChange = useCallback(
		(chapter: number, verse: number) => {
			// Update visible chapter immediately for UI (this is cheap)
			setVisibleChapter(chapter);

			// Skip expensive operations if same position
			if (
				lastSavedPositionRef.current?.chapter === chapter &&
				lastSavedPositionRef.current?.verse === verse
			) {
				return;
			}

			lastSavedPositionRef.current = { chapter, verse };

			if (currentBook.index !== undefined) {
				savePosition(currentBook.index, chapter, verse);
				setCurrentReference(`${currentBook.book} ${chapter}:${verse}`);

				// Extract text content for the current chapter (only when chapter changes)
				const chapterData = currentBook.chapters?.find(
					(ch) => parseInt(ch.chapter) === chapter
				);
				if (chapterData) {
					const chapterText = chapterData.verses.map((v) => v.text).join(" ");
					setCurrentChapterContent(chapterText);
				}
			}
		},
		[currentBook.index, currentBook.chapters, currentBook.book, savePosition]
	);

	useEffect(() => {
		if (typeof document === "undefined") return;

		const appName = "KJV";
		document.title = currentReference
			? `${currentReference} · ${appName}`
			: appName;
	}, [currentReference]);

	// Close modals when escaping
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setSearchVisible(false);
				setBookNavVisible(false);
				setBookmarksVisible(false);
			}
		};

		if (searchVisible || bookNavVisible || bookmarksVisible) {
			document.addEventListener("keydown", handleEscape);
			return () => document.removeEventListener("keydown", handleEscape);
		}
	}, [searchVisible, bookNavVisible, bookmarksVisible]);

	return (
		<div className={styles.container}>
			<Search
				dismiss={dismissSearch}
				active={searchVisible}
				currentBook={currentBook}
			/>

			<Bookmarks
				active={bookmarksVisible}
				dismiss={() => setBookmarksVisible(false)}
				currentBook={currentBook}
			/>

			<Reader
				book={currentBook}
				searchActive={searchVisible}
				onChapterChange={handleChapterChange}
				readingVerse={currentVerseId}
				onPlayAudio={handlePlayAudio}
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
				onBookmarksToggle={() => setBookmarksVisible((prev) => !prev)}
				currentPosition={currentPosition}
				currentBook={currentBook}
				visibleChapter={visibleChapter}
				isPlaying={isPlaying}
				isAudioSupported={isSupported}
				onPlayPause={handlePlayPause}
			/>
		</div>
	);
}
