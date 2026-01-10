"use client";

import styles from "./Contents.module.css";
import Link from "next/link";
import type { Book } from "../../types/bible";

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
	return (
		<div className={styles.container} data-active={active}>
			<div className={styles.bookList}>
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
