import type { BibleEntity, CrossReference } from "../types/bible";
import BibleStorage from "./BibleStorage";

let verseEntitiesData: Record<string, string[]> | null = null;
let entitiesData: Record<string, BibleEntity> | null = null;
let entityVersesData: Record<string, string[]> | null = null;

async function loadVerseEntities(): Promise<Record<string, string[]>> {
	if (verseEntitiesData) return verseEntitiesData;
	const data = await import("../data/verseEntities.json");
	verseEntitiesData = data.default as Record<string, string[]>;
	return verseEntitiesData;
}

async function loadEntities(): Promise<Record<string, BibleEntity>> {
	if (entitiesData) return entitiesData;
	const data = await import("../data/entities.json");
	entitiesData = data.default as Record<string, BibleEntity>;
	return entitiesData;
}

async function loadEntityVerses(): Promise<Record<string, string[]>> {
	if (entityVersesData) return entityVersesData;
	const data = await import("../data/entityVerses.json");
	entityVersesData = data.default as Record<string, string[]>;
	return entityVersesData;
}

/**
 * Get all entities (people & places) mentioned in a specific verse.
 */
export async function getVerseEntities(
	book: string,
	chapter: string,
	verse: string
): Promise<BibleEntity[]> {
	const verseId = `${book}-${chapter}:${verse}`;
	const verseEntities = await loadVerseEntities();
	const entities = await loadEntities();

	const slugs = verseEntities[verseId];
	if (!slugs || slugs.length === 0) return [];

	return slugs
		.map((slug) => entities[slug])
		.filter((e): e is BibleEntity => e != null);
}

/**
 * Parse a verse ID like "Genesis-1:1" into components.
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
 * Look up a single entity by its slug.
 */
export async function getEntityBySlug(
	slug: string
): Promise<BibleEntity | null> {
	const entities = await loadEntities();
	return entities[slug] ?? null;
}

/**
 * Get all verse references for a specific entity, with verse text.
 */
export async function getEntityVerseRefs(
	slug: string
): Promise<CrossReference[]> {
	const entityVerses = await loadEntityVerses();
	const verseIds = entityVerses[slug];
	if (!verseIds || verseIds.length === 0) return [];

	const verseRecords = await BibleStorage.getVersesByIds(verseIds);
	const textMap = new Map(verseRecords.map((v) => [v.id, v.text]));

	return verseIds.map((refId) => {
		const parsed = parseVerseId(refId);
		return {
			verseId: refId,
			book: parsed.book,
			chapter: parsed.chapter,
			verse: parsed.verse,
			text: textMap.get(refId),
		};
	});
}
