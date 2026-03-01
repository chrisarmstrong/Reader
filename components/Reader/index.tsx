"use client";

import styles from "./Reader.module.css";
import { useEffect, useCallback, useState, useRef, memo } from "react";
import { useBibleContent } from "../../utils/useReadingPosition";
import VerseDetails from "../VerseDetails";
import type { ReaderProps, Bookmark } from "../../types/bible";
import BibleStorageInstance from "../../utils/BibleStorage";

function Reader({
	book,
	searchActive = false,
	onChapterChange,
	readingVerse,
	onPlayAudio,
}: ReaderProps) {
	const { cacheBibleBook } = useBibleContent();
	const initialHashScrollDone = useRef(false);
	const lastHashRef = useRef<string | null>(null);
	const lastHashUpdateAtRef = useRef<number>(0);
	const visibleIdsRef = useRef<Set<string>>(new Set());
	const searchActiveRef = useRef<boolean>(false);
	const scrollTimeoutRef = useRef<number | null>(null);
	const isScrollingRef = useRef<boolean>(false);
	const pendingHashRef = useRef<string | null>(null);

	const [selectedVerse, setSelectedVerse] = useState<{
		book: string;
		chapter: string;
		verse: string;
		text: string;
	} | null>(null);

	useEffect(() => {
		searchActiveRef.current = searchActive;
	}, [searchActive]);

	// Inject CSS for red letter verses (words of Jesus)
	useEffect(() => {
		const styleId = `red-letter-styles-${book.book}`;
		let styleEl = document.getElementById(styleId) as HTMLStyleElement;

		const loadRedLetterVerses = async () => {
			const redLetterEnabled =
				await BibleStorageInstance.getPreference("redLetterEnabled", true);
			if (!redLetterEnabled) {
				if (styleEl) styleEl.textContent = "";
				return;
			}

			const record =
				await BibleStorageInstance.getRedLetterVersesForBook(book.book);
			if (!record) {
				if (styleEl) styleEl.textContent = "";
				return;
			}

			if (!styleEl) {
				styleEl = document.createElement("style");
				styleEl.id = styleId;
				document.head.appendChild(styleEl);
			}

			// Build CSS selectors for all red letter verses in this book
			const selectors: string[] = [];
			for (const [chapter, verses] of Object.entries(record.chapters)) {
				for (const verse of verses) {
					selectors.push(`#${CSS.escape(`${chapter}:${verse}`)}`);
				}
			}

			styleEl.textContent = selectors.length
				? `${selectors.join(", ")} { color: #c0392b; }`
				: "";
		};

		loadRedLetterVerses();

		return () => {
			if (styleEl && styleEl.parentNode) {
				styleEl.parentNode.removeChild(styleEl);
			}
		};
	}, [book]);

	// Inject CSS to hide verse numbers when disabled
	useEffect(() => {
		const styleId = "verse-number-styles";
		let styleEl = document.getElementById(styleId) as HTMLStyleElement;

		const loadPreference = async () => {
			const enabled = await BibleStorageInstance.getPreference(
				"verseNumbersEnabled",
				true
			);

			if (!styleEl) {
				styleEl = document.createElement("style");
				styleEl.id = styleId;
				document.head.appendChild(styleEl);
			}

			styleEl.textContent = enabled
				? ""
				: ".verse sup { display: none !important; }";
		};

		loadPreference();

		return () => {
			if (styleEl && styleEl.parentNode) {
				styleEl.parentNode.removeChild(styleEl);
			}
		};
	}, [book]);

	// Inject CSS for bookmarked verses (more efficient than JS checking on each render)
	useEffect(() => {
		const styleId = `bookmark-styles-${book.book}`;
		let styleEl = document.getElementById(styleId) as HTMLStyleElement;

		const loadBookmarks = async () => {
			// Filter to only bookmarks from the current book for efficiency
			const bookmarks = await BibleStorageInstance.getAllBookmarks();
			const bookmarkedVerses = bookmarks.filter((b) => b.book === book.book);

			// Create or update style tag with CSS selectors for bookmarked verses
			if (!styleEl) {
				styleEl = document.createElement("style");
				styleEl.id = styleId;
				document.head.appendChild(styleEl);
			}

			// Generate CSS rules targeting bookmarked verse IDs
			const selectors = bookmarkedVerses
				.map((b) => `#${CSS.escape(`${b.chapter}:${b.verse}`)}`)
				.join(", ");

			styleEl.textContent = selectors
				? `${selectors} { background: rgba(255, 200, 0, 0.15); border-bottom: 2px solid rgba(255, 200, 0, 0.5); }`
				: "";
		};

		loadBookmarks();

		// Cleanup style tag when book changes or component unmounts
		return () => {
			if (styleEl && styleEl.parentNode) {
				styleEl.parentNode.removeChild(styleEl);
			}
		};
	}, [book]);

	// Track scroll state to defer hash updates until scrolling stops
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleScroll = () => {
			isScrollingRef.current = true;

			// Clear existing timeout
			if (scrollTimeoutRef.current !== null) {
				clearTimeout(scrollTimeoutRef.current);
			}

			// Set scrolling to false after 200ms of no scroll events
			scrollTimeoutRef.current = window.setTimeout(() => {
				isScrollingRef.current = false;

				// Update hash if there's a pending one
				if (pendingHashRef.current) {
					try {
						window.history.replaceState(null, "", pendingHashRef.current);
						lastHashRef.current = pendingHashRef.current;
						lastHashUpdateAtRef.current = performance.now();
						pendingHashRef.current = null;
					} catch (_) {
						// ignore Safari SecurityError if thrown
					}
				}
			}, 200);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });

		return () => {
			window.removeEventListener("scroll", handleScroll);
			if (scrollTimeoutRef.current !== null) {
				clearTimeout(scrollTimeoutRef.current);
			}
		};
	}, []);

	// Cache the current book content when it's loaded
	useEffect(() => {
		if (book && book.book) {
			cacheBibleBook(book.book, book);
		}
	}, [book, cacheBibleBook]);

	// IntersectionObserver-based visibility tracking for verses
	useEffect(() => {
		if (typeof window === "undefined") return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (searchActiveRef.current) return;

				for (const entry of entries) {
					const id = (entry.target as HTMLElement).id;
					if (!id) continue;
					if (entry.isIntersecting) {
						visibleIdsRef.current.add(id);
					} else {
						visibleIdsRef.current.delete(id);
					}
				}

				// Find the topmost visible verse in the viewport
				// Use cached rects from entries instead of querying DOM
				let topId: string | null = null;
				let topVal = Number.POSITIVE_INFINITY;

				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					const id = (entry.target as HTMLElement).id;
					if (!id) continue;

					const rect = entry.boundingClientRect;
					if (rect.top >= 0 && rect.top <= window.innerHeight) {
						if (rect.top < topVal) {
							topVal = rect.top;
							topId = id;
						}
					}
				}

				// If no top verse from current entries, check all visible
				if (!topId && visibleIdsRef.current.size > 0) {
					for (const id of visibleIdsRef.current) {
						const el = document.getElementById(id);
						if (!el) continue;
						const rect = el.getBoundingClientRect();
						if (rect.top >= 0 && rect.top <= window.innerHeight) {
							if (rect.top < topVal) {
								topVal = rect.top;
								topId = id;
							}
						}
					}
				}

				if (topId) {
					const [chapterStr, verseStr] = topId.split(":");
					const chapter = parseInt(chapterStr);
					const verse = parseInt(verseStr);

					const newHash = `#${chapter}:${verse}`;
					const now =
						typeof performance !== "undefined" ? performance.now() : Date.now();

					// Only update if enough time has passed
					if (
						newHash !== lastHashRef.current &&
						now - lastHashUpdateAtRef.current > 500
					) {
						// If scrolling, just store the pending hash
						if (isScrollingRef.current) {
							pendingHashRef.current = newHash;
						} else {
							// Not scrolling, update immediately
							try {
								window.history.replaceState(null, "", newHash);
								lastHashRef.current = newHash;
								lastHashUpdateAtRef.current = now;
							} catch (_) {
								// ignore Safari SecurityError if thrown
							}
						}
					}

					// Immediately notify parent of visible chapter change for UI
					// Only update if chapter or verse actually changed to avoid unnecessary renders
					if (onChapterChange) {
						onChapterChange(chapter, verse);
					}
				}
			},
			{ root: null, threshold: [0, 0.5, 1] }
		);

		const verses = document.querySelectorAll("p.verse");
		verses.forEach((node) => observer.observe(node));

		const visibleIds = visibleIdsRef.current;
		return () => {
			observer.disconnect();
			visibleIds.clear();
		};
	}, [book, onChapterChange]);

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

	const handleVerseClick = (chapter: string, verse: string, text: string) => {
		console.log("Verse clicked:", { book: book.book, chapter, verse });
		setSelectedVerse({
			book: book.book,
			chapter,
			verse,
			text,
		});
		console.log("Selected verse state updated");
	};

	// Function to update bookmark CSS - can be called anytime
	const updateBookmarkStyles = useCallback(async () => {
		const styleId = `bookmark-styles-${book.book}`;
		const styleEl = document.getElementById(styleId) as HTMLStyleElement;

		if (styleEl) {
			const bookmarks = await BibleStorageInstance.getAllBookmarks();
			const bookmarkedVerses = bookmarks.filter((b) => b.book === book.book);

			// Update CSS rules
			const selectors = bookmarkedVerses
				.map((b) => `#${CSS.escape(`${b.chapter}:${b.verse}`)}`)
				.join(", ");

			styleEl.textContent = selectors
				? `${selectors} { background: rgba(255, 200, 0, 0.15); border-bottom: 2px solid rgba(255, 200, 0, 0.5); }`
				: "";
		}
	}, [book]);

	const handleVerseDetailsClose = async () => {
		setSelectedVerse(null);
		// Reload bookmarks after drawer closes (in case bookmark was added/removed)
		await updateBookmarkStyles();
	};

	return (
		<>
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
							className={`${styles.chapter} ${book.book === "Psalms" ? styles.psalm : ""}`}
							id={chapter.chapter.toString()}
						>
							<h2 className={styles.chapterNumber}>
								{chaptersCount > 1
									? chapter.chapter
									: chapter.verses[0]?.text.slice(0, 1)}
							</h2>
							{chapter.title && (
								<span className={styles.psalmTitle}>
									{chapter.title}
								</span>
							)}
							{chapter.verses.map((verse, i) => (
								<p
									key={verse.verse}
									id={chapter.chapter + `:` + verse.verse}
									className={`${styles.verse} verse ${
										verse.paragraph ? styles.newParagraph : ""
									} ${verse.poetry ? styles.poetry : ""} ${
										highlightVerse &&
										highlightVerse === chapter.chapter + `:` + verse.verse
											? styles.selected
											: ""
									} ${
										readingVerse === chapter.chapter + `:` + verse.verse
											? styles.reading
											: ""
									} ${
										selectedVerse &&
										selectedVerse.chapter === chapter.chapter &&
										selectedVerse.verse === verse.verse
											? styles.selected
											: ""
									}`}
									onPointerUp={(e) => {
										e.preventDefault();
										handleVerseClick(chapter.chapter, verse.verse, verse.text);
									}}
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

			<VerseDetails
				active={selectedVerse !== null}
				book={selectedVerse?.book || ""}
				chapter={selectedVerse?.chapter || ""}
				verse={selectedVerse?.verse || ""}
				text={selectedVerse?.text || ""}
				onClose={handleVerseDetailsClose}
				onBookmarkChange={updateBookmarkStyles}
				onPlayAudio={onPlayAudio}
			/>
		</>
	);
}

export default memo(Reader);
