// Example usage of BibleStorage in your Reader component
// This shows how to save and restore reading positions reliably on iOS

import { useEffect, useState } from "react";
import BibleStorage from "../utils/BibleStorage";

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
				}
			} catch (error) {
				console.error("Error loading reading position:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadPosition();
	}, []);

	// Save reading position
	const savePosition = async (book, chapter, verse = 1, scrollPosition = 0) => {
		try {
			const position = await BibleStorage.saveReadingPosition(
				book,
				chapter,
				verse,
				scrollPosition
			);
			setCurrentPosition(position);

			// Also save to localStorage as fallback
			localStorage.setItem("bible-position", JSON.stringify(position));

			return position;
		} catch (error) {
			console.error("Error saving reading position:", error);
			// Fallback to localStorage only
			const position = {
				book,
				chapter,
				verse,
				scrollPosition,
				lastUpdated: Date.now(),
			};
			localStorage.setItem("bible-position", JSON.stringify(position));
			setCurrentPosition(position);
			return position;
		}
	};

	// Auto-save scroll position with debouncing
	const saveScrollPosition = async (scrollY) => {
		if (!currentPosition) return;

		// Debounce scroll saves to avoid too many writes
		clearTimeout(saveScrollPosition.timeout);
		saveScrollPosition.timeout = setTimeout(() => {
			savePosition(
				currentPosition.book,
				currentPosition.chapter,
				currentPosition.verse,
				scrollY
			);
		}, 1000);
	};

	return {
		currentPosition,
		savePosition,
		saveScrollPosition,
		isLoading,
	};
}

// Example of caching Bible content with both service worker and IndexedDB
export async function loadBibleBook(bookName) {
	try {
		// Try to fetch from network first (will be cached by service worker)
		const response = await fetch(`/data/kjv/${bookName}.json`);
		if (response.ok) {
			const content = await response.json();

			// Cache in IndexedDB as additional backup
			try {
				await BibleStorage.cacheBibleBook(bookName, content);
			} catch (dbError) {
				console.warn("Could not cache in IndexedDB:", dbError);
			}

			return content;
		}
	} catch (networkError) {
		console.log("Network failed, trying IndexedDB cache:", networkError);
	}

	// If network fails, try IndexedDB cache
	try {
		const cachedContent = await BibleStorage.getCachedBibleBook(bookName);
		if (cachedContent) {
			return cachedContent;
		}
	} catch (dbError) {
		console.warn("IndexedDB also failed:", dbError);
	}

	throw new Error(`Could not load ${bookName} - no network or cache available`);
}

// Usage in your Reader component:
/*
function Reader() {
  const { currentPosition, savePosition, saveScrollPosition, isLoading } = useReadingPosition();
  const [bibleContent, setBibleContent] = useState(null);

  // Load content when position changes
  useEffect(() => {
    if (currentPosition) {
      loadBibleBook(currentPosition.book)
        .then(setBibleContent)
        .catch(console.error);
    }
  }, [currentPosition]);

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => saveScrollPosition(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [saveScrollPosition]);

  // Navigate to different chapter
  const goToChapter = (book, chapter) => {
    savePosition(book, chapter, 1, 0);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {bibleContent && (
        <div>
          <h1>{currentPosition.book} {currentPosition.chapter}</h1>
          // Render your Bible content here
        </div>
      )}
    </div>
  );
}
*/
