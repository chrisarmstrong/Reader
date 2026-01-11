import { memo, useEffect, useState } from "react";
import {
	IconPlayerPlayFilled,
	IconPlayerPauseFilled,
	IconMenu2,
	IconSearch,
	IconBookmark,
} from "@tabler/icons-react";
import Link from "next/link";
import styles from "./NavBar.module.css";
import type { ReadingPosition, Book } from "../../types/bible";

interface NavBarProps {
	onMenuToggle: () => void;
	onSearchToggle: () => void;
	currentPosition?: ReadingPosition | null;
	currentBook?: Book;
	visibleChapter?: number | null;
	isPlaying?: boolean;
	isAudioSupported?: boolean;
	onPlayPause?: () => void;
}

function NavBar({
	onMenuToggle,
	onSearchToggle,
	currentPosition,
	currentBook,
	visibleChapter,
	isPlaying = false,
	isAudioSupported = true,
	onPlayPause,
}: NavBarProps) {
	// Use visibleChapter from parent (updated immediately during scroll)
	// Fallback to currentPosition for initial render
	const chapter = visibleChapter ?? currentPosition?.chapter;

	return (
		<div className={styles.container}>
			<button
				onPointerUp={(e) => {
					e.preventDefault();
					onMenuToggle();
				}}
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
					onPointerUp={(e) => {
						e.preventDefault();
						if (onPlayPause) onPlayPause();
					}}
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
				<Link
					href="/bookmarks"
					className={`${styles.navButton} ${styles.iconButton}`}
					aria-label="Bookmarks"
				>
					<IconBookmark size={24} stroke={1.6} />
				</Link>
				<button
					onPointerUp={(e) => {
						e.preventDefault();
						onSearchToggle();
					}}
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
