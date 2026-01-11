// Custom hook for Bible audio playback using Web Speech API
import { useState, useEffect, useCallback, useRef } from "react";
import type { Book, Verse } from "../types/bible";

interface UseAudioPlayerProps {
	book?: Book;
	chapter?: number;
	startVerse?: number;
}

interface UseAudioPlayerReturn {
	isPlaying: boolean;
	isSupported: boolean;
	currentVerseId: string | null;
	play: () => void;
	pause: () => void;
	togglePlayPause: () => void;
}

export function useAudioPlayer({
	book,
	chapter,
	startVerse,
}: UseAudioPlayerProps): UseAudioPlayerReturn {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isSupported, setIsSupported] = useState(true);
	const [currentVerseId, setCurrentVerseId] = useState<string | null>(null);
	const [preferredVoice, setPreferredVoice] =
		useState<SpeechSynthesisVoice | null>(null);

	const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
	const queueIndexRef = useRef<number>(0);
	const versesRef = useRef<Verse[]>([]);
	const currentBookRef = useRef<string | undefined>(undefined);
	const currentChapterRef = useRef<number | undefined>(undefined);

	// Detect Web Speech API support
	useEffect(() => {
		if (typeof window === "undefined") return;
		const hasSpeech = "speechSynthesis" in window;
		setIsSupported(hasSpeech);
	}, []);

	// Voice selection helper
	const selectVoice = useCallback(
		(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
			const lower = (s?: string) => s?.toLowerCase() ?? "";
			const isEnglish = (v: SpeechSynthesisVoice) =>
				lower(v.lang).startsWith("en");
			const englishVoices = voices.filter(isEnglish);
			const byName = (list: SpeechSynthesisVoice[], substr: string) =>
				list.find((v) => lower(v.name).includes(substr.toLowerCase()));

			// Priority: Premium → Enhanced → Siri → English → Any
			const premium =
				byName(englishVoices, "premium") || byName(voices, "premium");
			if (premium) return premium;
			const enhanced =
				byName(englishVoices, "enhanced") || byName(voices, "enhanced");
			if (enhanced) return enhanced;
			const siri = byName(englishVoices, "siri") || byName(voices, "siri");
			if (siri) return siri;
			const english = englishVoices[0];
			if (english) return english;
			return voices[0] || null;
		},
		[]
	);

	// Load and select preferred voice
	useEffect(() => {
		if (!isSupported || typeof window === "undefined") return;

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
	}, [isSupported, selectVoice]);

	// Stop playback if book changes (but NOT if just chapter changes)
	useEffect(() => {
		if (
			currentBookRef.current !== undefined &&
			book?.book !== currentBookRef.current &&
			isPlaying
		) {
			window.speechSynthesis.cancel();
			setIsPlaying(false);
			setCurrentVerseId(null);
			queueIndexRef.current = 0;
			versesRef.current = [];
		}
		currentBookRef.current = book?.book;
	}, [book?.book, isPlaying]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (typeof window !== "undefined" && window.speechSynthesis) {
				window.speechSynthesis.cancel();
			}
		};
	}, []);

	// Speak the next verse in the queue
	const speakNext = useCallback(() => {
		const idx = queueIndexRef.current;
		if (!versesRef.current[idx]) {
			setIsPlaying(false);
			setCurrentVerseId(null);
			return;
		}

		const v = versesRef.current[idx];
		const verseId = `${currentChapterRef.current}:${v.verse}`;
		setCurrentVerseId(verseId);

		const utterance = new SpeechSynthesisUtterance(v.text);
		utteranceRef.current = utterance;

		// Select voice
		const voices = window.speechSynthesis.getVoices();
		const voiceToUse = preferredVoice ?? (voices.length ? voices[0] : null);

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
	}, [preferredVoice]);

	// Play function
	const play = useCallback(async () => {
		if (!isSupported || !book || chapter === undefined) return;

		// Lazily load voices on user gesture if needed
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
					setTimeout(resolve, 1000);
				});
				voices = synth.getVoices();
			}
			const selected = selectVoice(voices);
			if (selected) setPreferredVoice(selected);
		}

		const chapterData = book.chapters?.find(
			(ch) => parseInt(ch.chapter) === chapter
		);
		const verses = chapterData?.verses ?? [];
		if (verses.length === 0) return;

		versesRef.current = verses;
		currentChapterRef.current = chapter;

		// Find starting verse index
		const startVerseNum = startVerse ?? parseInt(verses[0]?.verse || "1");
		const startIdx = verses.findIndex(
			(v) => parseInt(v.verse) === startVerseNum
		);
		queueIndexRef.current = startIdx >= 0 ? startIdx : 0;

		// Scroll to the verse that will start playing
		const verseId = `${chapter}:${startVerseNum}`;
		const verseElement = document.getElementById(verseId);
		if (verseElement) {
			verseElement.scrollIntoView({ behavior: "smooth", block: "start" });
		}

		setIsPlaying(true);
		speakNext();
	}, [
		isSupported,
		book,
		chapter,
		startVerse,
		preferredVoice,
		selectVoice,
		speakNext,
	]);

	// Pause function
	const pause = useCallback(() => {
		if (typeof window !== "undefined") {
			window.speechSynthesis.cancel();
		}
		setIsPlaying(false);
		setCurrentVerseId(null);
		queueIndexRef.current = 0;
		versesRef.current = [];
	}, []);

	// Toggle play/pause
	const togglePlayPause = useCallback(() => {
		if (isPlaying) {
			pause();
		} else {
			play();
		}
	}, [isPlaying, play, pause]);

	return {
		isPlaying,
		isSupported,
		currentVerseId,
		play,
		pause,
		togglePlayPause,
	};
}
