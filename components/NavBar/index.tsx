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

export default function NavBar({
	onMenuToggle,
	onSearchToggle,
	onNextChapter,
	onPrevChapter,
	canGoNext = true,
	canGoPrev = true,
	currentPosition,
	currentBook,
}: NavBarProps) {
	return (
		<div className={styles.container}>
			<button
				onClick={onMenuToggle}
				className={`${styles.navButton} ${styles.iconButton} ${styles.menu}`}
				aria-label="Menu"
			></button>

			{currentPosition?.chapter && currentBook ? (
				<h2>
					{currentBook.book} {currentPosition.chapter}
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
