"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Virtuoso } from "react-virtuoso";
import { SegmentedControl } from "@mantine/core";
import { IconBookmarkOff, IconX } from "@tabler/icons-react";
import styles from "./Bookmarks.module.css";
import BibleStorage from "../../utils/BibleStorage";
import type { Bookmark } from "../../types/bible";
import { Books } from "../../utils/Books";

type BookmarkScope = "all" | "book" | "old" | "new";

interface BookmarksProps {
	active: boolean;
	dismiss: () => void;
	currentBook?: { book: string };
}

export default function Bookmarks({
	active,
	dismiss,
	currentBook,
}: BookmarksProps) {
	const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [scope, setScope] = useState<BookmarkScope>("all");

	useEffect(() => {
		if (active) {
			loadBookmarks();
		}
	}, [active]);

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

	const filteredBookmarks = bookmarks.filter((bookmark) => {
		if (scope === "all") return true;
		if (scope === "book") return bookmark.book === currentBook?.book;
		const book = Books.find((b) => b.book === bookmark.book);
		if (!book) return false;
		// Old Testament is books 0-38, New Testament is 39-65
		if (scope === "old") return book.index < 39;
		if (scope === "new") return book.index >= 39;
		return true;
	});

	if (!active) return null;

	if (isLoading) {
		return (
			<div className={styles.container} data-active={active}>
				<div className={styles.header}>
					<h1>Bookmarks</h1>
					<button
						className={styles.closeButton}
						onPointerUp={(e) => {
							e.preventDefault();
							dismiss();
						}}
						aria-label="Close"
					>
						<IconX size={24} />
					</button>
				</div>
				<div className={styles.loading}>Loading bookmarks...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.container} data-active={active}>
				<div className={styles.header}>
					<h1>Bookmarks</h1>
					<button
						className={styles.closeButton}
						onPointerUp={(e) => {
							e.preventDefault();
							dismiss();
						}}
						aria-label="Close"
					>
						<IconX size={24} />
					</button>
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
			<div className={styles.container} data-active={active}>
				<div className={styles.header}>
					<h1>Bookmarks</h1>
					<button
						className={styles.closeButton}
						onPointerUp={(e) => {
							e.preventDefault();
							dismiss();
						}}
						aria-label="Close"
					>
						<IconX size={24} />
					</button>
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
		<div className={styles.container} data-active={active}>
			<div className={styles.header}>
				<h1>Bookmarks</h1>
				<span className={styles.count}>{filteredBookmarks.length}</span>
				<button
					className={styles.closeButton}
					onPointerUp={(e) => {
						e.preventDefault();
						dismiss();
					}}
					aria-label="Close"
				>
					<IconX size={24} />
				</button>
			</div>

			<div className={styles.scopeControls}>
				<SegmentedControl
					value={scope}
					onChange={(value) => setScope(value as BookmarkScope)}
					data={[
						{ label: "All", value: "all" },
						...(currentBook
							? [{ label: currentBook.book, value: "book" }]
							: []),
						{ label: "Old Testament", value: "old" },
						{ label: "New Testament", value: "new" },
					]}
					fullWidth
				/>
			</div>

			<div className={styles.content}>
				<Virtuoso
					style={{ height: "100%" }}
					totalCount={filteredBookmarks.length}
					itemContent={(index) => {
						const bookmark = filteredBookmarks[index];
						const bookSlug = bookmark.book.toLowerCase().replace(/\s+/g, "-");

						return (
							<div className={styles.bookmarkItem}>
								<Link
									href={`/${bookSlug}?highlight=${bookmark.chapter}:${bookmark.verse}#${bookmark.chapter}:${bookmark.verse}`}
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
		</div>
	);
}
