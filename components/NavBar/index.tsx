import { memo, useEffect, useState } from "react";
import styles from "./NavBar.module.css";
import type { ReadingPosition, Book } from "../../types/bible";

interface NavBarProps {
	onMenuToggle: () => void;
	onSearchToggle: () => void;
	onNextChapter: () => void;
	onPrevChapter: () => void;
	canGoNext?: boolean;
	canGoPrev?: boolean;
	currentPosition?: ReadingPosition | null;
	currentBook?: Book;
}

function NavBar({
	onMenuToggle,
	onSearchToggle,
	onNextChapter,
	onPrevChapter,
	canGoNext = true,
	canGoPrev = true,
	currentPosition,
	currentBook,
}: NavBarProps) {
	const [displayChapter, setDisplayChapter] = useState<number | null>(null);

	// Derive chapter from URL hash for instant updates without state changes
	useEffect(() => {
		const handleHashChange = () => {
			const hash = window.location.hash.substring(1);
			if (hash) {
				const [chapter] = hash.split(":");
				setDisplayChapter(parseInt(chapter) || null);
			}
		};

		handleHashChange();
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	// Fallback to currentPosition for initial render before hash is set
	const chapter = displayChapter || currentPosition?.chapter;

	return (
		<div className={styles.container}>
			<button
				onClick={onMenuToggle}
				className={`${styles.navButton} ${styles.iconButton} ${styles.menu}`}
				aria-label="Menu"
			></button>

			{chapter && currentBook ? (
				<h2>
					{currentBook.book} {chapter}
				</h2>
			) : null}

			<button
				onClick={onSearchToggle}
				className={`${styles.navButton} ${styles.iconButton}`}
				aria-label="Search"
			></button>
		</div>
	);
}

export default memo(NavBar);
