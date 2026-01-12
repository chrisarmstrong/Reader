"use client";

import { useState, useEffect } from "react";
import { Drawer } from "@mantine/core";
import styles from "./VerseDetails.module.css";
import {
	IconBookmark,
	IconBookmarkFilled,
	IconPlayerPlay,
	IconShare,
	IconX,
} from "@tabler/icons-react";
import BibleStorage from "../../utils/BibleStorage";

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

	console.log("VerseDetails rendered:", { active, book, chapter, verse });

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

	const isMobile = typeof window !== "undefined" && window.innerWidth <= 820;

	return (
		<Drawer
			opened={active}
			onClose={onClose}
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
						onClose();
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
		</Drawer>
	);
}
