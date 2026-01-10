// Custom hook for reading position management
import { useEffect, useState, useCallback } from "react";
import BibleStorage from "./BibleStorage";

export function useReadingPosition() {
	const [currentPosition, setCurrentPosition] = useState(null);
	const [isLoading, setIsLoading] = useState(true);

	// Load saved position on mount
	useEffect(() => {
		const loadPosition = async () => {
			try {
				const savedPosition = await BibleStorage.getReadingPosition();
				if (savedPosition) {
					setCurrentPosition(savedPosition);
				} else {
					// Try localStorage fallback for existing users
					const fallbackPosition = localStorage.getItem("lastPosition");
					if (fallbackPosition) {
						const parsed = JSON.parse(fallbackPosition);
						if (parsed) {
							const position = {
								book: parsed.book,
								chapter: parsed.chapter,
								verse: parsed.verse || 1,
								scrollPosition: 0,
								lastUpdated: Date.now(),
							};
							setCurrentPosition(position);
							// Save to new storage
							await BibleStorage.saveReadingPosition(
								position.book,
								position.chapter,
								position.verse,
								position.scrollPosition
							);
						}
					}
				}
			} catch (error) {
				console.error("Error loading reading position:", error);
				// Try localStorage as final fallback
				try {
					const fallbackPosition = localStorage.getItem("lastPosition");
					if (fallbackPosition) {
						const parsed = JSON.parse(fallbackPosition);
						setCurrentPosition({
							book: parsed.book,
							chapter: parsed.chapter,
							verse: parsed.verse || 1,
							scrollPosition: 0,
							lastUpdated: Date.now(),
						});
					}
				} catch (fallbackError) {
					console.error("All storage methods failed:", fallbackError);
				}
			} finally {
				setIsLoading(false);
			}
		};

		loadPosition();
	}, []);

	// Save reading position with multiple storage methods
	const savePosition = useCallback(
		async (book, chapter, verse = 1, scrollPosition = 0) => {
			const position = {
				book,
				chapter,
				verse,
				scrollPosition,
				lastUpdated: Date.now(),
			};

			try {
				await BibleStorage.saveReadingPosition(
					book,
					chapter,
					verse,
					scrollPosition
				);
			} catch (error) {
				console.warn(
					"IndexedDB save failed, using localStorage fallback:",
					error
				);
			}

			// Always save to localStorage as backup
			try {
				localStorage.setItem(
					"lastPosition",
					JSON.stringify({
						book,
						chapter,
						verse,
					})
				);
			} catch (localStorageError) {
				console.warn("localStorage save failed:", localStorageError);
			}

			setCurrentPosition(position);
			return position;
		},
		[]
	);

	// Auto-save scroll position with debouncing
	const saveScrollPosition = useCallback(
		(scrollY) => {
			if (!currentPosition) return;

			clearTimeout(saveScrollPosition.timeout);
			saveScrollPosition.timeout = setTimeout(() => {
				savePosition(
					currentPosition.book,
					currentPosition.chapter,
					currentPosition.verse,
					scrollY
				);
			}, 1000);
		},
		[currentPosition, savePosition]
	);

	// Save current scroll position immediately (for page unload, navigation, etc.)
	const saveCurrentScrollPosition = useCallback(async () => {
		if (!currentPosition) return;

		const scrollPosition = window.scrollY;
		return savePosition(
			currentPosition.book,
			currentPosition.chapter,
			currentPosition.verse,
			scrollPosition
		);
	}, [currentPosition, savePosition]);

	// Save scroll position when page becomes hidden (user switches tabs, backgrounds app)
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden" && currentPosition) {
				saveCurrentScrollPosition();
			}
		};

		const handleBeforeUnload = () => {
			if (currentPosition) {
				saveCurrentScrollPosition();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [currentPosition, saveCurrentScrollPosition]);

	return {
		currentPosition,
		savePosition,
		saveScrollPosition,
		saveCurrentScrollPosition,
		isLoading,
	};
}

// Hook for Bible content caching
export function useBibleContent() {
	const cacheBibleBook = useCallback(async (bookName, content) => {
		try {
			await BibleStorage.cacheBibleBook(bookName, content);
		} catch (error) {
			console.warn("Could not cache Bible content:", error);
		}
	}, []);

	const getCachedBibleBook = useCallback(async (bookName) => {
		try {
			return await BibleStorage.getCachedBibleBook(bookName);
		} catch (error) {
			console.warn("Could not get cached Bible content:", error);
			return null;
		}
	}, []);

	return {
		cacheBibleBook,
		getCachedBibleBook,
	};
}
