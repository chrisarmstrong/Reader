import { memo, useEffect, useState, useCallback, useRef } from "react";
import {
	IconPlayerPlayFilled,
	IconPlayerPauseFilled,
	IconMenu2,
	IconSearch,
} from "@tabler/icons-react";
import styles from "./NavBar.module.css";
import type { ReadingPosition, Book, Verse } from "../../types/bible";

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
	onSetReadingVerse?: (id: string | null) => void;
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
	onSetReadingVerse,
}: NavBarProps) {
	const [displayChapter, setDisplayChapter] = useState<number | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [speechSupported, setSpeechSupported] = useState(true);
	const [preferredVoice, setPreferredVoice] =
		useState<SpeechSynthesisVoice | null>(null);
	const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
	const lastChapterRef = useRef<number | null>(null);
	const queueIndexRef = useRef<number>(0);
	const versesRef = useRef<Verse[]>([]);

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
		const hasSpeech = "speechSynthesis" in window;
		setSpeechSupported(hasSpeech);

		if (!hasSpeech) return;

		const selectVoice = (voices: SpeechSynthesisVoice[]) => {
			const byName = (substr: string) =>
				voices.find((v) =>
					v.name?.toLowerCase().includes(substr.toLowerCase())
				);
			// Priority: Premium → Enhanced → English → any
			const premium = byName("premium");
			if (premium) return premium;
			const enhanced = byName("enhanced");
			if (enhanced) return enhanced;
			const english = voices.find((v) =>
				v.lang?.toLowerCase().startsWith("en")
			);
			if (english) return english;
			return voices[0] || null;
		};

		const assignVoice = () => {
			const voices = window.speechSynthesis.getVoices();
			setPreferredVoice(selectVoice(voices));
		};

		assignVoice();
		window.speechSynthesis.addEventListener("voiceschanged", assignVoice);
		return () => {
			window.speechSynthesis.removeEventListener("voiceschanged", assignVoice);
		};
	}, []);

	// Fallback to currentPosition for initial render before hash is set
	const chapter = displayChapter || currentPosition?.chapter;

	// Stop speech when chapter changes
	useEffect(() => {
		if (chapter !== lastChapterRef.current && isPlaying) {
			window.speechSynthesis.cancel();
			setIsPlaying(false);
			queueIndexRef.current = 0;
			versesRef.current = [];
			onSetReadingVerse?.(null);
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
		if (!speechSupported || !currentBook || !chapter) return;

		const chapterData = currentBook.chapters?.find(
			(ch) => parseInt(ch.chapter) === chapter
		);
		const verses = chapterData?.verses ?? [];
		if (verses.length === 0) return;

		const speakNext = () => {
			const idx = queueIndexRef.current;
			if (!versesRef.current[idx]) {
				setIsPlaying(false);
				onSetReadingVerse?.(null);
				return;
			}
			const v = versesRef.current[idx];
			const id = `${chapter}:${v.verse}`;
			onSetReadingVerse?.(id);

			const utterance = new SpeechSynthesisUtterance(v.text);
			utteranceRef.current = utterance;
			utterance.voice = preferredVoice ?? null;
			utterance.rate = 1.0;
			utterance.pitch = 1.0;
			utterance.volume = 1.0;
			utterance.onend = () => {
				queueIndexRef.current += 1;
				speakNext();
			};
			utterance.onerror = () => {
				queueIndexRef.current += 1;
				speakNext();
			};
			window.speechSynthesis.speak(utterance);
			setIsPlaying(true);
		};

		if (isPlaying) {
			window.speechSynthesis.cancel();
			setIsPlaying(false);
			onSetReadingVerse?.(null);
			queueIndexRef.current = 0;
			versesRef.current = [];
		} else {
			versesRef.current = verses;
			const startVerse =
				currentPosition?.verse ?? parseInt(verses[0]?.verse || "1");
			const startIdx = verses.findIndex(
				(v) => parseInt(v.verse) === startVerse
			);
			queueIndexRef.current = startIdx >= 0 ? startIdx : 0;
			speakNext();
		}
	}, [
		speechSupported,
		currentBook,
		chapter,
		preferredVoice,
		isPlaying,
		currentPosition?.verse,
		onSetReadingVerse,
	]);

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
					disabled={!speechSupported || !currentBook || !chapter}
					title={
						!speechSupported
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
