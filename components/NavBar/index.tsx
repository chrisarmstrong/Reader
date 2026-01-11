import { memo, useEffect, useState } from "react";
import {
	IconPlayerPlayFilled,
	IconPlayerPauseFilled,
	IconMenu2,
	IconSearch,
} from "@tabler/icons-react";
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
	isPlaying?: boolean;
	isAudioSupported?: boolean;
	onPlayPause?: () => void;
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
	isPlaying = false,
	isAudioSupported = true,
	onPlayPause,
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
				className={`${styles.navButton} ${styles.iconButton}`}
				aria-label="Menu"
			>
				<IconMenu2 size={28} stroke={1.6} />
			</button>

			{chapter && currentBook ? (
				<h2>
					{currentBook.book} {chapter}
				</h2>
			) : null}

			<div className={styles.rightButtons}>
				<button
					onClick={onPlayPause}
					disabled={!isAudioSupported || !currentBook || !chapter}
					title={
						!isAudioSupported
							? "Not supported on this device"
							: !currentBook || !chapter
							? "Chapter not loaded yet"
							: undefined
					}
					className={`${styles.navButton} ${styles.playButton}`}
					aria-label={isPlaying ? "Pause" : "Play"}
				>
					{isPlaying ? (
						<IconPlayerPauseFilled size={24} stroke={1.5} />
					) : (
						<IconPlayerPlayFilled size={24} stroke={1.5} />
					)}
				</button>
				<button
					onClick={onSearchToggle}
					className={`${styles.navButton} ${styles.iconButton}`}
					aria-label="Search"
				>
					<IconSearch size={26} stroke={1.6} />
				</button>
			</div>
		</div>
	);
}

export default memo(NavBar);
