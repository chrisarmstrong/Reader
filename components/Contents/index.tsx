"use client";

import { useEffect } from "react";
import styles from "./Contents.module.css";
import Link from "next/link";
import type { Book } from "../../types/bible";
import { stagger } from "motion";
import { useRef } from "react";

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
			controls.forEach((c) => c.cancel());
			links.forEach((el) => {
				el.style.willChange = "";
			});
		};
	}, [active, books]);

	return (
		<div className={styles.container} data-active={active}>
			<div className={styles.bookList} ref={listRef}>
				{books.map((book, i) => (
					<Link
						key={book.book}
						href={"/" + book.book.toLowerCase().replace(/\s+/g, "-")}
						data-index={i}
						className={styles.bookLink}
						onClick={() => {
							if (onBookSelect) {
								onBookSelect(book);
							}
							dismiss();
						}}
					>
						{book.book}
					</Link>
				))}
			</div>
			<div className={styles.dismiss} onClick={dismiss}></div>
		</div>
	);
}
