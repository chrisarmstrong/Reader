"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Contents.module.css";
import type { Book } from "../../types/bible";
import { stagger } from "motion/react";
import Link from "next/link";
import BibleStorageInstance from "../../utils/BibleStorage";

// Maximum pointer movement (px) that still counts as a tap rather than a scroll
const TAP_THRESHOLD = 10;

interface ContentsProps {
	active: boolean;
	currentBook: Book;
	onBookSelect?: (book: Book) => void;
	books: Book[];
	dismiss: () => void;
}

export default function Contents({
	active,
	dismiss,
	currentBook,
	onBookSelect,
	books,
}: ContentsProps) {
	const listRef = useRef<HTMLDivElement | null>(null);
	const router = useRouter();
	const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
	const [redLetterEnabled, setRedLetterEnabled] = useState(true);
	const [verseNumbersEnabled, setVerseNumbersEnabled] = useState(true);

	// Load display preferences on mount
	useEffect(() => {
		BibleStorageInstance.getPreference("redLetterEnabled", true).then(
			(val) => setRedLetterEnabled(val)
		);
		BibleStorageInstance.getPreference("verseNumbersEnabled", true).then(
			(val) => setVerseNumbersEnabled(val)
		);
	}, []);

	const handleRedLetterToggle = async () => {
		const newValue = !redLetterEnabled;
		setRedLetterEnabled(newValue);
		await BibleStorageInstance.savePreference("redLetterEnabled", newValue);
		// Force reload to re-apply/remove red letter CSS
		window.location.reload();
	};

	const handleVerseNumbersToggle = async () => {
		const newValue = !verseNumbersEnabled;
		setVerseNumbersEnabled(newValue);
		await BibleStorageInstance.savePreference("verseNumbersEnabled", newValue);
		window.location.reload();
	};

	// Close menu when ESC is pressed
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && active) {
				dismiss();
			}
		};

		if (active) {
			document.addEventListener("keydown", handleEscape);
			return () => document.removeEventListener("keydown", handleEscape);
		}
	}, [active, dismiss]);

	// Stagger in the book links when contents opens
	useEffect(() => {
		if (!active) return;
		const root = listRef.current;
		if (!root) return;
		const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("a"));
		if (!links.length) return;

		// Set initial state for a natural enter
		links.forEach((el) => {
			el.style.willChange = "transform, opacity";
		});

		const delays = stagger(0.04);
		const controls = links.map((el, i) =>
			el.animate(
				[
					{ opacity: 0, transform: "translateX(-12px)" },
					{ opacity: 0.5, transform: "translateX(0)" },
				],
				{
					duration: 350,
					delay: Math.round(delays(i, links.length) * 1000),
					easing: "ease-out",
					fill: "both",
				}
			)
		);

		return () => {
			controls.forEach((c) => {
				try {
					if (c) c.cancel();
				} catch (_) {
					// ignore cancel errors on unmounted elements
				}
			});
			links.forEach((el) => {
				el.style.willChange = "";
			});
		};
	}, [active, books]);

	const handleRandomBook = (e: React.MouseEvent) => {
		e.preventDefault();
		const randomBook = books[Math.floor(Math.random() * books.length)];
		const randomChapter =
			Math.floor(Math.random() * randomBook.chapters.length) + 1;

		if (onBookSelect) {
			onBookSelect(randomBook);
		}

		dismiss();
		// Use window.location for navigation to ensure it works
		const bookSlug = randomBook.book.toLowerCase().replace(/\s+/g, "-");
		window.location.href = `/${bookSlug}#${randomChapter}:1`;
	};

	const handleBookClick = (book: Book) => {
		if (onBookSelect) {
			onBookSelect(book);
		}
		dismiss();
	};

	return (
		<div className={styles.container} data-active={active}>
			<div className={styles.bookList} ref={listRef}>
				<Link
					href="/settings"
					className={styles.settingsLink}
					onPointerDown={(e) => {
						pointerStartRef.current = { x: e.clientX, y: e.clientY };
					}}
					onPointerUp={(e) => {
						const start = pointerStartRef.current;
						pointerStartRef.current = null;
						if (!start) return;
						const dx = Math.abs(e.clientX - start.x);
						const dy = Math.abs(e.clientY - start.y);
						if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD) {
							e.preventDefault();
							dismiss();
							router.push("/settings");
						}
					}}
					onClick={(e) => {
						if (e.detail > 0) {
							e.preventDefault();
						} else {
							dismiss();
						}
					}}
				>
					Settings
				</Link>
				<button
					className={styles.randomButton}
					onPointerDown={(e) => {
						pointerStartRef.current = { x: e.clientX, y: e.clientY };
					}}
					onPointerUp={(e) => {
						const start = pointerStartRef.current;
						pointerStartRef.current = null;
						if (!start) return;
						const dx = Math.abs(e.clientX - start.x);
						const dy = Math.abs(e.clientY - start.y);
						if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD) {
							handleRandomBook(e);
						}
					}}
					onClick={(e) => {
						if (e.detail > 0) {
							e.preventDefault();
						} else {
							handleRandomBook(e);
						}
					}}
				>
					Random
				</button>
				{books.map((book, i) => {
					const bookSlug = book.book.toLowerCase().replace(/\s+/g, "-");
					return (
						<Link
							key={book.book}
							href={`/${bookSlug}`}
							className={styles.bookLink}
							data-index={i}
							onPointerDown={(e) => {
								pointerStartRef.current = { x: e.clientX, y: e.clientY };
							}}
							onPointerUp={(e) => {
								const start = pointerStartRef.current;
								pointerStartRef.current = null;
								if (!start) return;
								const dx = Math.abs(e.clientX - start.x);
								const dy = Math.abs(e.clientY - start.y);
								if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD) {
									e.preventDefault();
									handleBookClick(book);
									router.push(`/${bookSlug}`);
								}
							}}
							onClick={(e) => {
								// Keyboard Enter (detail === 0): let through for accessibility
								// Pointer clicks (detail > 0): prevent, handled by onPointerUp
								if (e.detail > 0) {
									e.preventDefault();
								} else {
									handleBookClick(book);
								}
							}}
						>
							{book.book}
						</Link>
					);
				})}
				<button
					className={styles.settingToggle}
					onClick={handleRedLetterToggle}
				>
					<span>Red Letter</span>
					<span
						className={styles.toggleIndicator}
						data-enabled={redLetterEnabled}
					/>
				</button>
				<button
					className={styles.settingToggle}
					onClick={handleVerseNumbersToggle}
				>
					<span>Verse Numbers</span>
					<span
						className={styles.toggleIndicator}
						data-enabled={verseNumbersEnabled}
					/>
				</button>
				<Link
					href="/update"
					className={styles.updateLink}
					onPointerDown={(e) => {
						pointerStartRef.current = { x: e.clientX, y: e.clientY };
					}}
					onPointerUp={(e) => {
						const start = pointerStartRef.current;
						pointerStartRef.current = null;
						if (!start) return;
						const dx = Math.abs(e.clientX - start.x);
						const dy = Math.abs(e.clientY - start.y);
						if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD) {
							e.preventDefault();
							dismiss();
							router.push("/update");
						}
					}}
					onClick={(e) => {
						if (e.detail > 0) {
							e.preventDefault();
						} else {
							dismiss();
						}
					}}
				>
					Check for Updates
				</Link>
			</div>
			<div className={styles.dismiss} onClick={dismiss}></div>
		</div>
	);
}
