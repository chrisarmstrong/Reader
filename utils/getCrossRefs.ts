import type { CrossReference } from "../types/bible";
import BibleStorage from "./BibleStorage";

/**
 * Parse a verse ID like "Genesis-1:1" or "Song of Solomon-1:1" into components.
 * Uses lastIndexOf("-") since book names may contain spaces but not hyphens,
 * and the separator before chapter:verse is always the last hyphen.
 */
function parseVerseId(verseId: string): {
	book: string;
	chapter: string;
	verse: string;
} {
	const dashIndex = verseId.lastIndexOf("-");
	const book = verseId.substring(0, dashIndex);
	const [chapter, verse] = verseId.substring(dashIndex + 1).split(":");
	return { book, chapter, verse };
}

/**
 * Look up cross-references for a given verse from IndexedDB.
 * Returns an array of parsed CrossReference objects, sorted by relevance.
 */
export async function getCrossReferences(
	book: string,
	chapter: string,
	verse: string
): Promise<CrossReference[]> {
	const verseId = `${book}-${chapter}:${verse}`;
	const record = await BibleStorage.getCrossReferences(verseId);

	if (!record || record.refs.length === 0) return [];

	return record.refs.map((refId) => {
		const parsed = parseVerseId(refId);
		return {
			verseId: refId,
			book: parsed.book,
			chapter: parsed.chapter,
			verse: parsed.verse,
		};
	});
}
