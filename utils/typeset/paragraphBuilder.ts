import type { Chapter, Verse } from "../../types/bible";
import type { ParagraphInput, VerseMapEntry, Run } from "./types";

export function buildParagraphRuns(
	chapter: Chapter,
	isSingleChapterBook: boolean,
): Run[] {
	const runs: Run[] = [];
	const verses = chapter.verses;

	if (chapter.title) {
		runs.push({ kind: "psalmTitle", text: chapter.title });
	}

	let currentParagraphVerses: Verse[] = [];
	let currentParagraphStart = 0;

	const flushParagraph = () => {
		if (currentParagraphVerses.length === 0) return;

		const isFirstRun = runs.length === 0 || (runs.length === 1 && runs[0]!.kind === "psalmTitle");
		const firstCharDropCap = isFirstRun && currentParagraphStart === 0 && isSingleChapterBook;

		const input = buildParagraphInput(
			currentParagraphVerses,
			chapter.chapter,
			firstCharDropCap,
		);

		const verseNumbers = new Map<string, string>();
		for (const v of currentParagraphVerses) {
			const id = `${chapter.chapter}:${v.verse}`;
			verseNumbers.set(id, v.verse);
		}

		runs.push({ kind: "paragraph", input, verseNumbers });
		currentParagraphVerses = [];
	};

	for (let i = 0; i < verses.length; i++) {
		const verse = verses[i]!;

		if (verse.poetry) {
			flushParagraph();
			runs.push({
				kind: "poetry",
				verseId: `${chapter.chapter}:${verse.verse}`,
				verseNumber: verse.verse,
				text: verse.text,
				isNewParagraph: !!verse.paragraph,
			});
			currentParagraphStart = i + 1;
			continue;
		}

		if (verse.paragraph && currentParagraphVerses.length > 0) {
			flushParagraph();
			currentParagraphStart = i;
		}

		currentParagraphVerses.push(verse);
	}

	flushParagraph();
	return runs;
}

function buildParagraphInput(
	verses: Verse[],
	chapterNum: string,
	firstCharDropCap: boolean,
): ParagraphInput {
	let text = "";
	const verseMap: VerseMapEntry[] = [];

	for (let i = 0; i < verses.length; i++) {
		const verse = verses[i]!;
		const verseId = `${chapterNum}:${verse.verse}`;

		if (i > 0) {
			text += " ";
		}

		let verseText = verse.text;
		if (firstCharDropCap && i === 0) {
			verseText = verseText.slice(1);
		}

		const start = text.length;
		text += verseText;
		const end = text.length;

		verseMap.push({ start, end, verseId });
	}

	return { text, verseMap, firstCharDropCap };
}

export function getVerseIdAtOffset(
	verseMap: VerseMapEntry[],
	offset: number,
): string {
	for (const entry of verseMap) {
		if (offset >= entry.start && offset < entry.end) {
			return entry.verseId;
		}
	}
	return verseMap[verseMap.length - 1]?.verseId ?? "";
}
