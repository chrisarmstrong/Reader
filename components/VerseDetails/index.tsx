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
} from "@tabler/icons-react";
import Link from "next/link";
import BibleStorage from "../../utils/BibleStorage";
import { getCrossReferences } from "../../utils/getCrossRefs";
import type { VerseNote, CrossReference } from "../../types/bible";

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
	const [isEditing, setIsEditing] = useState(false);
	const [crossRefs, setCrossRefs] = useState<CrossReference[]>([]);
	const [visibleCrossRefs, setVisibleCrossRefs] = useState(10);
	const savedNoteRef = useRef("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	console.log("VerseDetails rendered:", { active, book, chapter, verse });

	useEffect(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = "auto";
			textarea.style.height = textarea.scrollHeight + "px";
		}
	}, [noteText]);

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

			getCrossReferences(book, chapter, verse)
				.then((refs) => {
					setCrossRefs(refs);
					setVisibleCrossRefs(10);
				})
				.catch((error) => {
					console.error("Error loading cross-references:", error);
					setCrossRefs([]);
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
			size={isMobile ? (isEditing ? "100%" : "70vh") : "md"}
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

			<div className={styles.notesSection}>
				<textarea
					ref={textareaRef}
					className={styles.noteTextarea}
					placeholder="Add a note..."
					value={noteText}
					onChange={(e) => setNoteText(e.target.value)}
					onFocus={() => setIsEditing(true)}
					onBlur={() => {
						setIsEditing(false);
						saveNote();
					}}
					rows={1}
				/>
			</div>

			{crossRefs.length > 0 && (
				<div className={styles.crossRefsSection}>
					<h4 className={styles.crossRefsTitle}>Cross References</h4>
					<div className={styles.crossRefsList}>
						{crossRefs.slice(0, visibleCrossRefs).map((ref) => (
							<Link
								key={ref.verseId}
								href={`/${ref.book.toLowerCase().replace(/\s+/g, "-")}#${ref.chapter}:${ref.verse}`}
								className={styles.crossRefLink}
								onClick={handleClose}
							>
								<span className={styles.crossRefReference}>
									{ref.book} {ref.chapter}:{ref.verse}
								</span>
								{ref.text && (
									<span className={styles.crossRefText}>
										{ref.text}
									</span>
								)}
							</Link>
						))}
					</div>
					{crossRefs.length > visibleCrossRefs && (
						<button
							className={styles.showMoreButton}
							onClick={() =>
								setVisibleCrossRefs((prev) => prev + 10)
							}
						>
							Show more ({crossRefs.length - visibleCrossRefs}{" "}
							remaining)
						</button>
					)}
				</div>
			)}
		</Drawer>
	);
}
