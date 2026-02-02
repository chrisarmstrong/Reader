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

	// Swipe-to-dismiss state - use refs to avoid stale closure issues
	const [dragY, setDragY] = useState(0);
	const isDraggingRef = useRef(false);
	const dragStartY = useRef(0);
	const dragYRef = useRef(0);
	const drawerContentRef = useRef<HTMLDivElement>(null);

	console.log("VerseDetails rendered:", { active, book, chapter, verse });

	// Reset drag state when drawer closes
	useEffect(() => {
		if (!active) {
			setDragY(0);
			isDraggingRef.current = false;
			dragYRef.current = 0;
		}
	}, [active]);

	// Swipe gesture handlers
	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		// Only allow drag from the handle area or if at top of scroll
		const target = e.target as HTMLElement;
		const isHandle = target.closest(`.${styles.dragHandle}`);
		const contentEl = drawerContentRef.current?.querySelector(`.${styles.content}`) as HTMLElement;
		const isAtTop = !contentEl || contentEl.scrollTop === 0;

		if (isHandle || isAtTop) {
			dragStartY.current = e.touches[0].clientY;
			isDraggingRef.current = true;
		}
	}, []);

	const handleTouchMove = useCallback((e: React.TouchEvent) => {
		if (!isDraggingRef.current) return;

		const currentY = e.touches[0].clientY;
		const deltaY = currentY - dragStartY.current;

		// Only allow dragging downward (positive deltaY)
		if (deltaY > 0) {
			dragYRef.current = deltaY;
			setDragY(deltaY);
		}
	}, []);

	const handleTouchEnd = useCallback(() => {
		if (!isDraggingRef.current) return;

		// If dragged more than 100px or 20% of viewport height, close the drawer
		const threshold = Math.min(100, window.innerHeight * 0.2);

		if (dragYRef.current > threshold) {
			onClose();
		}

		// Reset drag state
		setDragY(0);
		isDraggingRef.current = false;
		dragYRef.current = 0;
	}, [onClose]);

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

	// Swipe styles for mobile bottom drawer - applied to wrapper div
	const wrapperStyle: React.CSSProperties = isMobile ? {
		transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
		transition: dragY > 0 ? 'none' : 'transform 0.3s ease-out',
	} : {};

	return (
		<Drawer
			opened={active}
			onClose={onClose}
			position={isMobile ? "bottom" : "right"}
			size={isMobile ? "70vh" : "md"}
			padding={0}
			withCloseButton={false}
		>
			<div
				ref={drawerContentRef}
				onTouchStart={isMobile ? handleTouchStart : undefined}
				onTouchMove={isMobile ? handleTouchMove : undefined}
				onTouchEnd={isMobile ? handleTouchEnd : undefined}
				className={styles.drawerWrapper}
				style={wrapperStyle}
			>
				{/* Drag handle for mobile */}
				{isMobile && (
					<div className={styles.dragHandle}>
						<div className={styles.dragIndicator} />
					</div>
				)}

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
			</div>
		</Drawer>
	);
}
