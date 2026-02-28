import type { Book, VerseRecord, SearchIndexEntry } from "../types/bible";
import BibleStorage from "./BibleStorage";

// Seed version — bump this to force a re-seed when the data/schema changes
const SEED_VERSION = 1;

// How many books to process per chunk before yielding to the browser
const BOOKS_PER_CHUNK = 3;

export type SeedStatus = "idle" | "seeding" | "done" | "error";

export interface SeedProgress {
	status: SeedStatus;
	booksProcessed: number;
	totalBooks: number;
}

type ProgressCallback = (progress: SeedProgress) => void;

/**
 * Tokenize verse text into lowercase words, stripping punctuation.
 * Returns unique words for a given text.
 */
function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9' ]/g, " ")
		.split(/\s+/)
		.filter((w) => w.length > 1);
}

/**
 * Check whether seeding is needed by comparing the stored seed version.
 */
export async function isSeedingNeeded(): Promise<boolean> {
	try {
		const storedVersion = await BibleStorage.getPreference("seedVersion", null);
		return storedVersion !== SEED_VERSION;
	} catch {
		return true;
	}
}

/**
 * Yield to the browser event loop so the UI stays responsive.
 */
function yieldToBrowser(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Seed the entire Bible into IndexedDB:
 *  1. Writes all verses into the `verses` store
 *  2. Builds an inverted index (word → verse IDs) in the `searchIndex` store
 *  3. Saves a seed version flag so we skip on subsequent loads
 *
 * Books are processed in small chunks with yielding to keep the UI responsive.
 */
export async function seedBibleData(
	books: Book[],
	onProgress?: ProgressCallback
): Promise<void> {
	const totalBooks = books.length;
	const invertedIndex = new Map<string, string[]>();

	const report = (status: SeedStatus, booksProcessed: number) => {
		onProgress?.({ status, booksProcessed, totalBooks });
	};

	report("seeding", 0);

	// Process books in chunks
	for (let i = 0; i < totalBooks; i += BOOKS_PER_CHUNK) {
		const chunk = books.slice(i, i + BOOKS_PER_CHUNK);
		const verses: VerseRecord[] = [];

		for (const book of chunk) {
			for (const chapter of book.chapters) {
				for (const verse of chapter.verses) {
					const id = `${book.book}-${chapter.chapter}:${verse.verse}`;
					verses.push({
						id,
						book: book.book,
						bookIndex: book.index,
						chapter: chapter.chapter,
						verse: verse.verse,
						text: verse.text,
					});

					// Build inverted index entries
					const words = tokenize(verse.text);
					for (const word of words) {
						let refs = invertedIndex.get(word);
						if (!refs) {
							refs = [];
							invertedIndex.set(word, refs);
						}
						refs.push(id);
					}
				}
			}
		}

		// Write this chunk of verses to IndexedDB
		await BibleStorage.putVerses(verses);

		report("seeding", Math.min(i + BOOKS_PER_CHUNK, totalBooks));

		// Yield between chunks so the UI stays responsive
		await yieldToBrowser();
	}

	// Write the inverted index in batches
	const indexEntries: SearchIndexEntry[] = [];
	for (const [word, refs] of invertedIndex) {
		indexEntries.push({ word, refs });
	}

	// Write index entries in batches of 500
	const INDEX_BATCH_SIZE = 500;
	for (let i = 0; i < indexEntries.length; i += INDEX_BATCH_SIZE) {
		const batch = indexEntries.slice(i, i + INDEX_BATCH_SIZE);
		await BibleStorage.putSearchIndexEntries(batch);
		await yieldToBrowser();
	}

	// Mark seeding as complete
	await BibleStorage.savePreference("seedVersion", SEED_VERSION);

	report("done", totalBooks);
}
