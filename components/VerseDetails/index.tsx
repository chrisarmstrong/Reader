"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Drawer } from "@mantine/core";
import styles from "./VerseDetails.module.css";
import {
	IconBookmark,
	IconBookmarkFilled,
	IconPlayerPlay,
	IconShare,
	IconX,
	IconNotes,
} from "@tabler/icons-react";
import BibleStorage from "../../utils/BibleStorage";
import type { VerseNote } from "../../types/bible";

interface VerseDetailsProps {
	active: boolean;
	book: string;
	chapter: string;
	verse: string;
	text: string;
	onClose: () => void;
	onBookmarkChange?: () => void | Promise<void>;
	onPlayAudio?: (chapter: number, verse: number) => void;
}

export default function VerseDetails({
	active,
	book,
	chapter,
	verse,
	text,
	onClose,
	onBookmarkChange,
	onPlayAudio,
}: VerseDetailsProps) {
	const [isBookmarked, setIsBookmarked] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [noteText, setNoteText] = useState("");
	const [currentNote, setCurrentNote] = useState<VerseNote | null>(null);
	const savedNoteRef = useRef("");

	console.log("VerseDetails rendered:", { active, book, chapter, verse });

	const saveNote = useCallback(async () => {
		const trimmed = noteText.trim();
		if (trimmed === savedNoteRef.current) return;

		try {
			if (currentNote && trimmed === "") {
				await BibleStorage.deleteNote(currentNote.id);
				setCurrentNote(null);
			} else if (currentNote && trimmed !== "") {
				const updated = await BibleStorage.updateNote(currentNote.id, trimmed);
				setCurrentNote(updated);
			} else if (!currentNote && trimmed !== "") {
				const created = await BibleStorage.addNote(book, chapter, verse, trimmed);
				setCurrentNote(created);
			}
			savedNoteRef.current = trimmed;
		} catch (error) {
			console.error("Error saving note:", error);
		}
	}, [noteText, currentNote, book, chapter, verse]);

	useEffect(() => {
		console.log("VerseDetails useEffect:", { active, book, chapter, verse });
		if (active && book && chapter && verse) {
			console.log("Checking if bookmarked...");
			BibleStorage.isBookmarked(book, chapter, verse)
				.then((result) => {
					console.log("Is bookmarked result:", result);
					setIsBookmarked(result);
				})
				.catch((error) => {
					console.error("Error checking bookmark status:", error);
					setIsBookmarked(false);
				});

			BibleStorage.getNotesForVerse(book, chapter, verse)
				.then((notes) => {
					if (notes.length > 0) {
						setCurrentNote(notes[0]);
						setNoteText(notes[0].content);
						savedNoteRef.current = notes[0].content;
					} else {
						setCurrentNote(null);
						setNoteText("");
						savedNoteRef.current = "";
					}
				})
				.catch((error) => {
					console.error("Error loading notes:", error);
				});
		}
	}, [active, book, chapter, verse]);

	const handleBookmarkToggle = async () => {
		console.log("=== handleBookmarkToggle called ===");
		console.log(
			"Current state - isBookmarked:",
			isBookmarked,
			"isLoading:",
			isLoading
		);

		setIsLoading(true);
		try {
			if (isBookmarked) {
				console.log("Removing bookmark...");
				await BibleStorage.removeBookmark(`${book}-${chapter}:${verse}`);
				setIsBookmarked(false);
			} else {
				console.log("Adding bookmark...");
				await BibleStorage.addBookmark(book, chapter, verse, text);
				console.log("Bookmark added, updating state");
				setIsBookmarked(true);
			}
			console.log("Bookmark toggle completed successfully");
			// Update bookmark CSS immediately
			if (onBookmarkChange) {
				await onBookmarkChange();
			}
		} catch (error) {
			console.error("Error toggling bookmark:", error);
			alert("Failed to save bookmark. Check console for details.");
		} finally {
			setIsLoading(false);
			console.log("Loading state reset");
		}
	};

	const handleShare = async () => {
		const reference = `${book} ${chapter}:${verse}`;
		const bookSlug = book.toLowerCase().replace(/\s+/g, "-");
		const url = `https://simplebible.app/${bookSlug}/#${chapter}:${verse}`;
		const shareText = `"${text}"\n\n— ${reference}\n${url}`;

		if (navigator.share) {
			try {
				await navigator.share({
					text: shareText,
					title: reference,
					url: url,
				});
			} catch (error) {
				// User cancelled or error occurred
				console.log("Share cancelled or failed:", error);
			}
		} else {
			// Fallback: copy to clipboard
			try {
				await navigator.clipboard.writeText(shareText);
				alert("Copied to clipboard!");
			} catch (error) {
				console.error("Failed to copy:", error);
			}
		}
	};

	const handleClose = useCallback(async () => {
		await saveNote();
		onClose();
	}, [saveNote, onClose]);

	const isMobile = typeof window !== "undefined" && window.innerWidth <= 820;

	return (
		<Drawer
			opened={active}
			onClose={handleClose}
			position={isMobile ? "bottom" : "right"}
			size={isMobile ? "70vh" : "md"}
			padding="lg"
			withCloseButton={false}
		>
			<div className={styles.header}>
				<h3 className={styles.reference}>
					{book} {chapter}:{verse}
				</h3>
				<button
					className={styles.closeButton}
					onPointerUp={(e) => {
						e.preventDefault();
						handleClose();
					}}
					aria-label="Close"
				>
					<IconX size={24} />
				</button>
			</div>

			<div className={styles.content}>
				<p className={styles.verseText}>{text}</p>

				<div className={styles.notesSection}>
					<label className={styles.notesLabel}>
						<IconNotes size={16} />
						Note
					</label>
					<textarea
						className={styles.noteTextarea}
						placeholder="Add a note..."
						value={noteText}
						onChange={(e) => setNoteText(e.target.value)}
						onBlur={saveNote}
						rows={3}
					/>
				</div>
			</div>

			<div className={styles.actions}>
				<button
					className={styles.actionButton}
					onPointerUp={(e) => {
						e.preventDefault();
						handleBookmarkToggle();
					}}
					disabled={isLoading}
				>
					{isBookmarked ? (
						<IconBookmarkFilled size={24} />
					) : (
						<IconBookmark size={24} />
					)}
					<span>{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
				</button>

				{onPlayAudio && (
					<button
						className={styles.actionButton}
						onPointerUp={(e) => {
							e.preventDefault();
							onPlayAudio(parseInt(chapter), parseInt(verse));
						}}
					>
						<IconPlayerPlay size={24} />
						<span>Play</span>
					</button>
				)}

				<button
					className={styles.actionButton}
					onPointerUp={(e) => {
						e.preventDefault();
						handleShare();
					}}
				>
					<IconShare size={24} />
					<span>Share</span>
				</button>
			</div>
		</Drawer>
	);
}
