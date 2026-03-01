"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Settings.module.css";
import BibleStorageInstance from "../../utils/BibleStorage";
import { loadVoice } from "../../utils/selectVoice";

const SAMPLE_TEXT =
	"The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures.";

export default function Settings() {
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [redLetterEnabled, setRedLetterEnabled] = useState(true);
	const [playbackSpeed, setPlaybackSpeed] = useState(1);
	const [isSamplePlaying, setIsSamplePlaying] = useState(false);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [bookmarkCount, setBookmarkCount] = useState<number | null>(null);
	const [noteCount, setNoteCount] = useState<number | null>(null);
	const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

	useEffect(() => {
		BibleStorageInstance.getPreference("redLetterEnabled", true).then(
			(val) => setRedLetterEnabled(val)
		);
		BibleStorageInstance.getPreference("playbackSpeed", 1).then((val) =>
			setPlaybackSpeed(val)
		);
		BibleStorageInstance.getAllBookmarks().then((b) =>
			setBookmarkCount(b.length)
		);
		BibleStorageInstance.getAllNotes().then((n) => setNoteCount(n.length));
	}, []);

	// Load voice using the same logic as the audio player
	useEffect(() => {
		if (typeof window === "undefined" || !("speechSynthesis" in window))
			return;
		return loadVoice((voice) => (voiceRef.current = voice));
	}, []);

	const handleRedLetterToggle = async () => {
		const newValue = !redLetterEnabled;
		setRedLetterEnabled(newValue);
		await BibleStorageInstance.savePreference("redLetterEnabled", newValue);
	};

	const handleSpeedChange = async (speed: number) => {
		// Round to nearest 0.05 to avoid floating-point noise
		const rounded = Math.round(speed * 20) / 20;
		setPlaybackSpeed(rounded);
		await BibleStorageInstance.savePreference("playbackSpeed", rounded);
	};

	const handleSample = () => {
		if (typeof window === "undefined" || !("speechSynthesis" in window))
			return;

		// Stop any current sample
		window.speechSynthesis.cancel();

		if (isSamplePlaying) {
			setIsSamplePlaying(false);
			return;
		}

		const utterance = new SpeechSynthesisUtterance(SAMPLE_TEXT);
		utterance.rate = playbackSpeed;
		if (voiceRef.current) {
			utterance.voice = voiceRef.current;
			utterance.lang = voiceRef.current.lang;
		} else {
			utterance.lang = "en-US";
		}
		utterance.onend = () => setIsSamplePlaying(false);
		utterance.onerror = () => setIsSamplePlaying(false);
		setIsSamplePlaying(true);
		window.speechSynthesis.speak(utterance);
	};

	// Clean up sample on unmount
	useEffect(() => {
		return () => {
			if (typeof window !== "undefined" && window.speechSynthesis) {
				window.speechSynthesis.cancel();
			}
		};
	}, []);

	const handleExport = async () => {
		try {
			const json = await BibleStorageInstance.exportData();
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `bible-reader-data-${new Date().toISOString().slice(0, 10)}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			setStatusMessage("Data exported successfully");
		} catch {
			setStatusMessage("Export failed");
		}
	};

	const handleImportClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const result = await BibleStorageInstance.importData(text);
			setStatusMessage(
				`Imported ${result.bookmarks} bookmark${result.bookmarks !== 1 ? "s" : ""} and ${result.notes} note${result.notes !== 1 ? "s" : ""}`
			);
		} catch {
			setStatusMessage("Import failed — invalid file format");
		}

		// Reset file input so re-selecting the same file triggers onChange
		e.target.value = "";
	};

	return (
		<div className={styles.container}>
			<a
				className={styles.backLink}
				href="#"
				onClick={(e) => {
					e.preventDefault();
					router.back();
				}}
			>
				&larr; Back
			</a>

			<h1 className={styles.title}>Settings</h1>

			<div className={styles.section}>
				<h2 className={styles.sectionTitle}>Display</h2>
				<div className={styles.settingRow}>
					<span className={styles.settingLabel}>Red Letter</span>
					<span
						className={styles.toggleIndicator}
						data-enabled={redLetterEnabled}
						onClick={handleRedLetterToggle}
					/>
				</div>
			</div>

			<div className={styles.section}>
				<h2 className={styles.sectionTitle}>Audio</h2>
				<div className={styles.settingRow}>
					<span className={styles.settingLabel}>Playback Speed</span>
					<span className={styles.speedValue}>{playbackSpeed}x</span>
				</div>
				<input
					type="range"
					min={0.5}
					max={1.5}
					step={0.05}
					value={playbackSpeed}
					onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
					className={styles.slider}
				/>
				<button
					className={styles.sampleButton}
					onClick={handleSample}
				>
					{isSamplePlaying ? "Stop" : "Preview"}
				</button>
			</div>

			<div className={styles.section}>
				<h2 className={styles.sectionTitle}>Data</h2>
				{bookmarkCount !== null && noteCount !== null && (
					<p className={styles.dataSummary}>
						{bookmarkCount} bookmark{bookmarkCount !== 1 ? "s" : ""},{" "}
						{noteCount} note{noteCount !== 1 ? "s" : ""}
					</p>
				)}
				<button className={styles.button} onClick={handleExport}>
					Export Notes &amp; Bookmarks
				</button>
				<button className={styles.button} onClick={handleImportClick}>
					Import Notes &amp; Bookmarks
				</button>
				<input
					ref={fileInputRef}
					type="file"
					accept=".json"
					className={styles.fileInput}
					onChange={handleFileChange}
				/>
				{statusMessage && (
					<p className={styles.statusMessage}>{statusMessage}</p>
				)}
			</div>
		</div>
	);
}
