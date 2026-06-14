// Shared verse-search logic used by the global Search modal and the
// "add verse to study" picker. Keeps the querying decoupled from any
// particular UI so it can be reused without dragging in navigation concerns.
import { Books } from "./Books";
import BibleStorage from "./BibleStorage";
import { tokenize } from "./seedBibleData";
import type { Book } from "../types/bible";

export type SearchScope = "all" | "book" | "old" | "new";

export interface VerseSearchResult {
	book: string;
	chapter: string;
	verse: string;
	text: string;
}

/**
 * Perform indexed search via the IndexedDB inverted index.
 * Looks up each keyword, intersects the verse ID sets, fetches verse records,
 * and filters by scope.
 */
export async function indexedSearch(
	keyword: string,
	scope: SearchScope,
	currentBook?: Book
): Promise<VerseSearchResult[]> {
	const keywords = tokenize(keyword);

	if (keywords.length === 0) return [];

	// Look up each keyword in the inverted index
	const refSets: Set<string>[] = [];
	for (const word of keywords) {
		const entry = await BibleStorage.getSearchIndexEntry(word);
		if (!entry) return []; // A keyword with no matches → no results
		refSets.push(new Set(entry.refs));
	}

	// Intersect all sets (start from smallest for efficiency)
	refSets.sort((a, b) => a.size - b.size);
	let matchingIds = refSets[0];
	for (let i = 1; i < refSets.length; i++) {
		const next = refSets[i];
		const intersection = new Set<string>();
		for (const id of matchingIds) {
			if (next.has(id)) intersection.add(id);
		}
		matchingIds = intersection;
		if (matchingIds.size === 0) return [];
	}

	// Fetch the verse records
	const verses = await BibleStorage.getVersesByIds(Array.from(matchingIds));

	// Filter by scope
	let filtered = verses;
	if (scope === "book" && currentBook) {
		filtered = verses.filter((v) => v.book === currentBook.book);
	} else if (scope === "old") {
		filtered = verses.filter((v) => v.bookIndex < 39);
	} else if (scope === "new") {
		filtered = verses.filter((v) => v.bookIndex >= 39);
	}

	// Sort by book index, then chapter, then verse for consistent ordering
	filtered.sort((a, b) => {
		if (a.bookIndex !== b.bookIndex) return a.bookIndex - b.bookIndex;
		const chapterDiff = parseInt(a.chapter) - parseInt(b.chapter);
		if (chapterDiff !== 0) return chapterDiff;
		return parseInt(a.verse) - parseInt(b.verse);
	});

	return filtered.map((v) => ({
		book: v.book,
		chapter: v.chapter,
		verse: v.verse,
		text: v.text,
	}));
}

/**
 * Brute-force search over the statically bundled Bible data. Used as a
 * fallback before the IndexedDB search index has finished seeding.
 */
export function bruteForceSearch(
	keyword: string,
	scope: SearchScope,
	currentBook?: Book
): VerseSearchResult[] {
	if (keyword.length < 2) return [];

	const results: VerseSearchResult[] = [];
	const keywords = keyword.toLowerCase().split(" ");

	// Filter books based on scope
	let booksToSearch = Books;
	if (scope === "book" && currentBook) {
		booksToSearch = [currentBook];
	} else if (scope === "old") {
		// Old Testament: first 39 books (Genesis to Malachi)
		booksToSearch = Books.slice(0, 39);
	} else if (scope === "new") {
		// New Testament: last 27 books (Matthew to Revelation)
		booksToSearch = Books.slice(39);
	}

	for (const book of booksToSearch) {
		for (const chapter of book.chapters) {
			for (const verse of chapter.verses) {
				const verseText = verse.text.toLowerCase();
				const match = keywords.every((word) => verseText.includes(word));
				if (match) {
					results.push({
						book: book.book,
						chapter: chapter.chapter,
						verse: verse.verse,
						text: verse.text,
					});
				}
			}
		}
	}

	return results;
}
