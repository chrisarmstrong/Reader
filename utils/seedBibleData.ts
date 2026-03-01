import type {
	Book,
	VerseRecord,
	ChapterRecord,
	SearchIndexEntry,
	CrossReferenceRecord,
	RedLetterRecord,
} from "../types/bible";
import BibleStorage from "./BibleStorage";

// Seed version — bump this to force a re-seed when the data/schema changes
const SEED_VERSION = 6;

// How many books to process per chunk before yielding to the browser
const BOOKS_PER_CHUNK = 3;

export type SeedStatus = "idle" | "seeding" | "done" | "error";

export interface SeedProgress {
	status: SeedStatus;
	booksProcessed: number;
	totalBooks: number;
}

type ProgressCallback = (progress: SeedProgress) => void;

// Common English words excluded from the search index. These words appear in
// nearly every verse, so indexing them bloats IndexedDB without improving search
// quality. Keeping the index smaller also reduces the chance of browser eviction.
export const STOP_WORDS = new Set([
	"the",
	"and",
	"of",
	"to",
	"in",
	"that",
	"it",
	"is",
	"was",
	"for",
	"be",
	"as",
	"he",
	"his",
	"not",
	"on",
	"with",
	"but",
	"by",
	"they",
	"at",
	"or",
	"an",
	"if",
	"so",
	"my",
	"me",
	"we",
	"no",
	"do",
	"up",
	"ye",
]);

/**
 * Tokenize verse text into lowercase words, stripping punctuation.
 * Filters out single-character words and stopwords.
 */
export function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9' ]/g, " ")
		.split(/\s+/)
		.filter((w) => w.length > 1 && !STOP_WORDS.has(w));
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
 *  2. Writes chapter metadata (psalm titles, etc.) into the `chapters` store
 *  3. Builds an inverted index (word → verse IDs) in the `searchIndex` store
 *  4. Saves a seed version flag so we skip on subsequent loads
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
	const allChapters: ChapterRecord[] = [];

	for (let i = 0; i < totalBooks; i += BOOKS_PER_CHUNK) {
		const chunk = books.slice(i, i + BOOKS_PER_CHUNK);
		const verses: VerseRecord[] = [];

		for (const book of chunk) {
			for (const chapter of book.chapters) {
				// Collect chapter metadata
				const chapterRecord: ChapterRecord = {
					id: `${book.book}-${chapter.chapter}`,
					book: book.book,
					bookIndex: book.index,
					chapter: chapter.chapter,
				};
				if (chapter.title) chapterRecord.title = chapter.title;
				allChapters.push(chapterRecord);

				for (const verse of chapter.verses) {
					const id = `${book.book}-${chapter.chapter}:${verse.verse}`;
					const record: VerseRecord = {
						id,
						book: book.book,
						bookIndex: book.index,
						chapter: chapter.chapter,
						verse: verse.verse,
						text: verse.text,
					};
					if (verse.paragraph) record.paragraph = true;
					if (verse.poetry) record.poetry = true;
					verses.push(record);

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

	// Write chapter metadata in batches
	const CHAPTER_BATCH_SIZE = 500;
	for (let i = 0; i < allChapters.length; i += CHAPTER_BATCH_SIZE) {
		const batch = allChapters.slice(i, i + CHAPTER_BATCH_SIZE);
		await BibleStorage.putChapters(batch);
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

	// Seed cross-references from pre-built JSON
	const crossRefModule = await import("../data/crossRefs.json");
	const crossRefData: Record<string, string[]> = crossRefModule.default;
	const crossRefEntries: CrossReferenceRecord[] = Object.entries(
		crossRefData
	).map(([id, refs]) => ({ id, refs }));

	const CROSS_REF_BATCH_SIZE = 500;
	for (let i = 0; i < crossRefEntries.length; i += CROSS_REF_BATCH_SIZE) {
		const batch = crossRefEntries.slice(i, i + CROSS_REF_BATCH_SIZE);
		await BibleStorage.putCrossReferences(batch);
		await yieldToBrowser();
	}

	// Seed red letter verses from pre-built JSON
	const redLetterModule = await import("../data/redLetterVerses.json");
	const redLetterData: Record<string, Record<string, string[]>> =
		redLetterModule.default;
	const redLetterEntries: RedLetterRecord[] = Object.entries(
		redLetterData
	).map(([book, chapters]) => ({ book, chapters }));

	await BibleStorage.putRedLetterVerses(redLetterEntries);
	if (typeof window !== "undefined") {
		window.dispatchEvent(new Event("redLetterChanged"));
	}
	await yieldToBrowser();

	// Mark seeding as complete
	await BibleStorage.savePreference("seedVersion", SEED_VERSION);

	report("done", totalBooks);
}
