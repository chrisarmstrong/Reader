// Custom hook for Bible audio playback using Web Speech API
import { useState, useEffect, useCallback, useRef } from "react";
import type { Book, Verse } from "../types/bible";
import { scrollToVerse } from "./scrollToVerse";
import BibleStorageInstance from "./BibleStorage";
import { selectVoice, loadVoice } from "./selectVoice";

interface UseAudioPlayerProps {
	book?: Book;
}

interface UseAudioPlayerReturn {
	isPlaying: boolean;
	isSupported: boolean;
	currentVerseId: string | null;
	play: (chapter: number, startVerse?: number) => void;
	pause: () => void;
	togglePlayPause: (chapter: number, startVerse?: number) => void;
}

export function useAudioPlayer({
	book,
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
	const playbackRateRef = useRef<number>(1);
	const stoppedRef = useRef<boolean>(false);
	const wakeLockRef = useRef<WakeLockSentinel | null>(null);

	const acquireWakeLock = useCallback(async () => {
		if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
		try {
			wakeLockRef.current = await navigator.wakeLock.request("screen");
		} catch {
			// Wake lock can fail silently (e.g. low battery, background tab)
		}
	}, []);

	const releaseWakeLock = useCallback(() => {
		wakeLockRef.current?.release();
		wakeLockRef.current = null;
	}, []);

	// Detect Web Speech API support
	useEffect(() => {
		if (typeof window === "undefined") return;
		const hasSpeech = "speechSynthesis" in window;
		setIsSupported(hasSpeech);
	}, []);

	// Load playback speed preference
	useEffect(() => {
		BibleStorageInstance.getPreference("playbackSpeed", 1).then(
			(val) => (playbackRateRef.current = val)
		);
	}, []);

	// Load and select preferred voice
	useEffect(() => {
		if (!isSupported || typeof window === "undefined") return;
		return loadVoice((voice) => setPreferredVoice(voice));
	}, [isSupported]);

	// Stop playback if book changes (but NOT if just chapter changes)
	useEffect(() => {
		if (
			currentBookRef.current !== undefined &&
			book?.book !== currentBookRef.current &&
			isPlaying
		) {
			stoppedRef.current = true;
			window.speechSynthesis.cancel();
			setIsPlaying(false);
			setCurrentVerseId(null);
			queueIndexRef.current = 0;
			versesRef.current = [];
			releaseWakeLock();
		}
		currentBookRef.current = book?.book;
	}, [book?.book, isPlaying, releaseWakeLock]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (typeof window !== "undefined" && window.speechSynthesis) {
				window.speechSynthesis.cancel();
			}
			releaseWakeLock();
		};
	}, [releaseWakeLock]);

	// Speak the next verse in the queue
	const speakNext = useCallback(() => {
		const idx = queueIndexRef.current;
		if (!versesRef.current[idx]) {
			setIsPlaying(false);
			setCurrentVerseId(null);
			releaseWakeLock();
			return;
		}

		const v = versesRef.current[idx];
		const verseId = `${currentChapterRef.current}:${v.verse}`;
		setCurrentVerseId(verseId);

		// Insert a brief pause between verses, doubled for paragraph breaks
		if (idx > 0) {
			const pause = new SpeechSynthesisUtterance(
				v.paragraph ? ". . . . . ." : ". . ."
			);
			pause.volume = 0;
			pause.rate = 1;
			window.speechSynthesis.speak(pause);
		}

		const utterance = new SpeechSynthesisUtterance(v.text);
		utteranceRef.current = utterance;

		// Only override voice when selectVoice returned an explicit pick;
		// null means the browser default is already a good English voice.
		if (preferredVoice) {
			utterance.voice = preferredVoice;
		}
		utterance.rate = playbackRateRef.current;
		utterance.pitch = 1.0;
		utterance.volume = 1.0;

		utterance.onend = () => {
			if (stoppedRef.current) return;
			queueIndexRef.current += 1;
			speakNext();
		};

		utterance.onerror = () => {
			if (stoppedRef.current) return;
			queueIndexRef.current += 1;
			speakNext();
		};

		window.speechSynthesis.speak(utterance);
	}, [preferredVoice, releaseWakeLock]);

	// Play function - now takes chapter and verse as parameters
	const play = useCallback(
		async (chapter: number, startVerse?: number) => {
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
			scrollToVerse(chapter, startVerseNum, "smooth");

			stoppedRef.current = false;
			setIsPlaying(true);
			acquireWakeLock();
			speakNext();
		},
		[isSupported, book, preferredVoice, speakNext, acquireWakeLock]
	);

	// Pause function — set stoppedRef BEFORE cancel() because cancel()
	// fires onend synchronously, which would otherwise call speakNext().
	const pause = useCallback(() => {
		stoppedRef.current = true;
		if (typeof window !== "undefined") {
			window.speechSynthesis.cancel();
		}
		setIsPlaying(false);
		setCurrentVerseId(null);
		queueIndexRef.current = 0;
		versesRef.current = [];
		releaseWakeLock();
	}, [releaseWakeLock]);

	// Toggle play/pause
	const togglePlayPause = useCallback(
		(chapter: number, startVerse?: number) => {
			if (isPlaying) {
				pause();
			} else {
				play(chapter, startVerse);
			}
		},
		[isPlaying, play, pause]
	);

	return {
		isPlaying,
		isSupported,
		currentVerseId,
		play,
		pause,
		togglePlayPause,
	};
}
