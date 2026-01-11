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
			const lower = (s?: string) => s?.toLowerCase() ?? "";
			const isEnglish = (v: SpeechSynthesisVoice) =>
				lower(v.lang).startsWith("en");
			const englishVoices = voices.filter(isEnglish);
			const byName = (list: SpeechSynthesisVoice[], substr: string) =>
				list.find((v) => lower(v.name).includes(substr.toLowerCase()));
			// Priority: Premium → Enhanced → Siri (prefer English variants first)
			const premium =
				byName(englishVoices, "premium") || byName(voices, "premium");
			if (premium) return premium;
			const enhanced =
				byName(englishVoices, "enhanced") || byName(voices, "enhanced");
			if (enhanced) return enhanced;
			const siri = byName(englishVoices, "siri") || byName(voices, "siri");
			if (siri) return siri;
			// Fallback to any English voice, then any voice
			const english = englishVoices[0];
			if (english) return english;
			return voices[0] || null;
		};

		let retries = 0;
		const assignVoice = () => {
			const voices = window.speechSynthesis.getVoices();
			if (voices && voices.length) {
				setPreferredVoice(selectVoice(voices));
				return true;
			}
			return false;
		};

		// Try once immediately
		if (!assignVoice()) {
			// Poll a few times because some browsers don't fire voiceschanged reliably
			const tryLoadVoices = () => {
				if (assignVoice()) return;
				if (retries++ < 12) {
					setTimeout(tryLoadVoices, 250);
				}
			};
			tryLoadVoices();
		}

		const onVoicesChanged = () => {
			assignVoice();
		};
		window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
		return () => {
			window.speechSynthesis.removeEventListener(
				"voiceschanged",
				onVoicesChanged
			);
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

	const handlePlayPause = useCallback(async () => {
		if (!speechSupported || !currentBook || !chapter) return;

		// Lazily load/select voices only upon user gesture (play)
		if (!preferredVoice) {
			const synth = window.speechSynthesis;
			let voices = synth.getVoices();
			if (!voices || voices.length === 0) {
				await new Promise<void>((resolve) => {
					const handler = () => {
						synth.removeEventListener("voiceschanged", handler);
						resolve();
					};
					synth.addEventListener("voiceschanged", handler);
					// Safety timeout in case event doesn't fire
					setTimeout(resolve, 1000);
				});
				voices = synth.getVoices();
			}
			const lower = (s?: string) => s?.toLowerCase() ?? "";
			const isEnglish = (vv: SpeechSynthesisVoice) =>
				lower(vv.lang).startsWith("en");
			const englishVoices = voices.filter(isEnglish);
			const byName = (list: SpeechSynthesisVoice[], substr: string) =>
				list.find((vv) => lower(vv.name).includes(substr.toLowerCase()));
			const premium =
				byName(englishVoices, "premium") || byName(voices, "premium");
			const enhanced =
				byName(englishVoices, "enhanced") || byName(voices, "enhanced");
			const siri = byName(englishVoices, "siri") || byName(voices, "siri");
			const english = englishVoices[0];
			const selected =
				premium || enhanced || siri || english || voices[0] || null;
			if (selected) setPreferredVoice(selected);
		}

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
			// Ensure we have a voice; reselect if missing
			const voices = window.speechSynthesis.getVoices();
			const voiceToUse =
				preferredVoice ?? (voices.length ? voices.find((vv) => vv) : null);
			if (!preferredVoice && voices.length) {
				// Use same selection strategy to pick best available
				const lower = (s?: string) => s?.toLowerCase() ?? "";
				const isEnglish = (vv: SpeechSynthesisVoice) =>
					lower(vv.lang).startsWith("en");
				const englishVoices = voices.filter(isEnglish);
				const byName = (list: SpeechSynthesisVoice[], substr: string) =>
					list.find((vv) => lower(vv.name).includes(substr.toLowerCase()));
				const premium =
					byName(englishVoices, "premium") || byName(voices, "premium");
				const enhanced =
					byName(englishVoices, "enhanced") || byName(voices, "enhanced");
				const siri = byName(englishVoices, "siri") || byName(voices, "siri");
				const english = englishVoices[0];
				const selected =
					premium || enhanced || siri || english || voices[0] || null;
				if (selected) setPreferredVoice(selected);
			}
			utterance.voice = voiceToUse ?? null;
			utterance.lang = voiceToUse?.lang ?? "en-US";
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
