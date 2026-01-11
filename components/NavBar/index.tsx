import { memo, useEffect, useState, useCallback, useRef } from "react";
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
	currentChapterContent?: string;
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
	currentChapterContent,
}: NavBarProps) {
	const [displayChapter, setDisplayChapter] = useState<number | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [speechSupported, setSpeechSupported] = useState(true);
	const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
	const lastChapterRef = useRef<number | null>(null);

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

	// Detect Web Speech API support (iOS Safari may lack it)
	useEffect(() => {
		if (typeof window === "undefined") return;
		setSpeechSupported("speechSynthesis" in window);
	}, []);

	// Fallback to currentPosition for initial render before hash is set
	const chapter = displayChapter || currentPosition?.chapter;

	// Stop speech when chapter changes
	useEffect(() => {
		if (chapter !== lastChapterRef.current && isPlaying) {
			window.speechSynthesis.cancel();
			setIsPlaying(false);
		}
		lastChapterRef.current = chapter || null;
	}, [chapter, isPlaying]);

	// Cleanup speech synthesis on unmount
	useEffect(() => {
		return () => {
			if (window.speechSynthesis) {
				window.speechSynthesis.cancel();
			}
		};
	}, []);

	const handlePlayPause = useCallback(() => {
		if (!speechSupported || !currentChapterContent) return;

		if (isPlaying) {
			// Pause or stop speech
			window.speechSynthesis.cancel();
			setIsPlaying(false);
		} else {
			// Start speech
			const utterance = new SpeechSynthesisUtterance(currentChapterContent);
			utteranceRef.current = utterance;

			// Configure speech parameters
			utterance.rate = 1.0;
			utterance.pitch = 1.0;
			utterance.volume = 1.0;

			// Handle speech end
			utterance.onend = () => {
				setIsPlaying(false);
			};

			// Handle speech errors
			utterance.onerror = () => {
				setIsPlaying(false);
			};

			window.speechSynthesis.speak(utterance);
			setIsPlaying(true);
		}
	}, [currentChapterContent, isPlaying, speechSupported]);

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
					onClick={handlePlayPause}
					disabled={!speechSupported || !currentChapterContent}
					title={
						!speechSupported
							? "Not supported on this device"
							: !currentChapterContent
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
