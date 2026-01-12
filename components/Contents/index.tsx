"use client";

import { useEffect } from "react";
import styles from "./Contents.module.css";
import { useRouter } from "next/navigation";
import type { Book } from "../../types/bible";
import { motion, stagger } from "motion/react";
import { useRef } from "react";
import Link from "next/link";

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
	const router = useRouter();
	const listRef = useRef<HTMLDivElement | null>(null);
	const isPanningRef = useRef(false);

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

	const handleRandomBook = () => {
		if (isPanningRef.current) return;

		const randomBook = books[Math.floor(Math.random() * books.length)];
		const randomChapter =
			Math.floor(Math.random() * randomBook.chapters.length) + 1;

		if (onBookSelect) {
			onBookSelect(randomBook);
		}

		// Navigate to the random chapter
		const bookSlug = randomBook.book.toLowerCase().replace(/\s+/g, "-");
		router.push(`/${bookSlug}#${randomChapter}:1`);

		dismiss();
	};

	const handleBookClick = (book: Book) => {
		if (isPanningRef.current) return;

		if (onBookSelect) {
			onBookSelect(book);
		}
		const bookSlug = book.book.toLowerCase().replace(/\s+/g, "-");
		router.push(`/${bookSlug}`);
		dismiss();
	};

	return (
		<div className={styles.container} data-active={active}>
			<motion.div
				className={styles.bookList}
				ref={listRef}
				onPanStart={() => {
					isPanningRef.current = true;
				}}
				onPan={() => {
					isPanningRef.current = true;
				}}
				onPanEnd={() => {
					// Reset after a brief delay to avoid triggering during deceleration
					setTimeout(() => {
						isPanningRef.current = false;
					}, 100);
				}}
			>
				<motion.button
					className={styles.randomButton}
					onTap={handleRandomBook}
					whileTap={{ scale: 0.98 }}
				>
					Random
				</motion.button>
				{books.map((book, i) => (
					<motion.button
						key={book.book}
						data-index={i}
						className={styles.bookLink}
						onTap={() => handleBookClick(book)}
						whileTap={{ scale: 0.98 }}
					>
						{book.book}
					</motion.button>
				))}
				<Link href="/update" className={styles.updateLink}>
					Check for Updates
				</Link>
			</motion.div>
			<div className={styles.dismiss} onClick={dismiss}></div>
		</div>
	);
}
