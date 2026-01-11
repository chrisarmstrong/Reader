"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Virtuoso } from "react-virtuoso";
import { IconBookmarkOff, IconArrowLeft } from "@tabler/icons-react";
import styles from "./Bookmarks.module.css";
import BibleStorage from "../../utils/BibleStorage";
import type { Bookmark } from "../../types/bible";

export default function Bookmarks() {
	const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadBookmarks();
	}, []);

	const loadBookmarks = async () => {
		setIsLoading(true);
		setError(null);
		try {
			console.log("Loading bookmarks...");
			const allBookmarks = await BibleStorage.getAllBookmarks();
			console.log("Bookmarks loaded:", allBookmarks);
			setBookmarks(allBookmarks);
		} catch (error) {
			console.error("Failed to load bookmarks:", error);
			setError("Failed to load bookmarks. Try refreshing the page.");
			// Set bookmarks to empty array so UI doesn't stay in loading state
			setBookmarks([]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleRemoveBookmark = async (id: string) => {
		try {
			await BibleStorage.removeBookmark(id);
			setBookmarks((prev) => prev.filter((b) => b.id !== id));
		} catch (error) {
			console.error("Failed to remove bookmark:", error);
		}
	};

	const formatDate = (timestamp: number) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffDays = Math.floor(
			(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
		);

		if (diffDays === 0) return "Today";
		if (diffDays === 1) return "Yesterday";
		if (diffDays < 7) return `${diffDays} days ago`;

		return date.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
		});
	};

	if (isLoading) {
		return (
			<div className={styles.container}>
				<div className={styles.header}>
					<Link href="/" className={styles.backButton}>
						<IconArrowLeft size={24} />
					</Link>
					<h1>Bookmarks</h1>
				</div>
				<div className={styles.loading}>Loading bookmarks...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.container}>
				<div className={styles.header}>
					<Link href="/" className={styles.backButton}>
						<IconArrowLeft size={24} />
					</Link>
					<h1>Bookmarks</h1>
				</div>
				<div className={styles.empty}>
					<p>{error}</p>
					<button
						className={styles.retryButton}
						onPointerUp={(e) => {
							e.preventDefault();
							loadBookmarks();
						}}
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	if (bookmarks.length === 0) {
		return (
			<div className={styles.container}>
				<div className={styles.header}>
					<Link href="/" className={styles.backButton}>
						<IconArrowLeft size={24} />
					</Link>
					<h1>Bookmarks</h1>
				</div>
				<div className={styles.empty}>
					<IconBookmarkOff size={48} opacity={0.3} />
					<p>No bookmarks yet</p>
					<p className={styles.emptyHint}>
						Tap on any verse while reading to bookmark it
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<Link href="/" className={styles.backButton}>
					<IconArrowLeft size={24} />
				</Link>
				<h1>Bookmarks</h1>
				<span className={styles.count}>{bookmarks.length}</span>
			</div>

			<Virtuoso
				style={{ height: "100%" }}
				totalCount={bookmarks.length}
				itemContent={(index) => {
					const bookmark = bookmarks[index];
					const bookSlug = bookmark.book.toLowerCase().replace(/\s+/g, "-");

					return (
						<div className={styles.bookmarkItem}>
							<Link
								href={`/${bookSlug}#${bookmark.chapter}:${bookmark.verse}`}
								className={styles.bookmarkLink}
							>
								<div className={styles.bookmarkHeader}>
									<span className={styles.reference}>
										{bookmark.book} {bookmark.chapter}:{bookmark.verse}
									</span>
									<span className={styles.date}>
										{formatDate(bookmark.createdAt)}
									</span>
								</div>
								<p className={styles.text}>{bookmark.text}</p>
								{bookmark.note && (
									<p className={styles.note}>{bookmark.note}</p>
								)}
							</Link>
							<button
								className={styles.removeButton}
								onPointerUp={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleRemoveBookmark(bookmark.id);
								}}
								aria-label="Remove bookmark"
							>
								<IconBookmarkOff size={20} />
							</button>
						</div>
					);
				}}
			/>
		</div>
	);
}
