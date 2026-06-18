import { describe, it, expect } from "vitest";
import { buildParagraphRuns, getVerseIdAtOffset } from "./paragraphBuilder";
import type { Chapter, Verse } from "../../types/bible";

function makeVerse(verse: string, text: string, opts?: { paragraph?: boolean; poetry?: boolean }): Verse {
	return { verse, text, ...opts };
}

function makeChapter(chapter: string, verses: Verse[], title?: string): Chapter {
	return { chapter, verses, title };
}

describe("paragraphBuilder", () => {
	describe("buildParagraphRuns", () => {
		it("groups consecutive prose verses into a single paragraph run", () => {
			const ch = makeChapter("1", [
				makeVerse("1", "In the beginning God created the heaven and the earth."),
				makeVerse("2", "And the earth was without form, and void."),
			]);

			const runs = buildParagraphRuns(ch, false);
			expect(runs).toHaveLength(1);
			expect(runs[0]!.kind).toBe("paragraph");
			if (runs[0]!.kind === "paragraph") {
				expect(runs[0]!.input.verseMap).toHaveLength(2);
				expect(runs[0]!.input.text).toContain("In the beginning");
				expect(runs[0]!.input.text).toContain("And the earth");
			}
		});

		it("breaks on paragraph markers", () => {
			const ch = makeChapter("1", [
				makeVerse("1", "First verse."),
				makeVerse("2", "Second verse."),
				makeVerse("3", "Third verse.", { paragraph: true }),
				makeVerse("4", "Fourth verse."),
			]);

			const runs = buildParagraphRuns(ch, false);
			expect(runs).toHaveLength(2);
			expect(runs[0]!.kind).toBe("paragraph");
			expect(runs[1]!.kind).toBe("paragraph");
			if (runs[0]!.kind === "paragraph" && runs[1]!.kind === "paragraph") {
				expect(runs[0]!.input.verseMap).toHaveLength(2);
				expect(runs[1]!.input.verseMap).toHaveLength(2);
			}
		});

		it("separates poetry verses into individual runs", () => {
			const ch = makeChapter("1", [
				makeVerse("1", "Prose verse."),
				makeVerse("2", "Poetry line.", { poetry: true }),
				makeVerse("3", "More prose."),
			]);

			const runs = buildParagraphRuns(ch, false);
			expect(runs).toHaveLength(3);
			expect(runs[0]!.kind).toBe("paragraph");
			expect(runs[1]!.kind).toBe("poetry");
			expect(runs[2]!.kind).toBe("paragraph");
		});

		it("handles psalm titles", () => {
			const ch = makeChapter("3", [
				makeVerse("1", "Lord, how are they increased.", { poetry: true }),
			], "A Psalm of David");

			const runs = buildParagraphRuns(ch, false);
			expect(runs[0]!.kind).toBe("psalmTitle");
			if (runs[0]!.kind === "psalmTitle") {
				expect(runs[0]!.text).toBe("A Psalm of David");
			}
		});

		it("drops first character for single-chapter book drop cap", () => {
			const ch = makeChapter("1", [
				makeVerse("1", "The elder unto the elect lady."),
			]);

			const runs = buildParagraphRuns(ch, true);
			expect(runs).toHaveLength(1);
			if (runs[0]!.kind === "paragraph") {
				expect(runs[0]!.input.firstCharDropCap).toBe(true);
				expect(runs[0]!.input.text).toBe("he elder unto the elect lady.");
			}
		});

		it("does not drop first char for multi-chapter book", () => {
			const ch = makeChapter("1", [
				makeVerse("1", "In the beginning."),
			]);

			const runs = buildParagraphRuns(ch, false);
			if (runs[0]!.kind === "paragraph") {
				expect(runs[0]!.input.firstCharDropCap).toBe(false);
				expect(runs[0]!.input.text).toBe("In the beginning.");
			}
		});

		it("builds verse numbers map correctly", () => {
			const ch = makeChapter("5", [
				makeVerse("1", "First."),
				makeVerse("2", "Second."),
			]);

			const runs = buildParagraphRuns(ch, false);
			if (runs[0]!.kind === "paragraph") {
				expect(runs[0]!.verseNumbers.get("5:1")).toBe("1");
				expect(runs[0]!.verseNumbers.get("5:2")).toBe("2");
			}
		});

		it("computes correct verse map offsets", () => {
			const ch = makeChapter("1", [
				makeVerse("1", "Hello world."),
				makeVerse("2", "Goodbye."),
			]);

			const runs = buildParagraphRuns(ch, false);
			if (runs[0]!.kind === "paragraph") {
				const { verseMap, text } = runs[0]!.input;
				expect(text.slice(verseMap[0]!.start, verseMap[0]!.end)).toBe("Hello world.");
				expect(text.slice(verseMap[1]!.start, verseMap[1]!.end)).toBe("Goodbye.");
			}
		});
	});

	describe("getVerseIdAtOffset", () => {
		it("returns correct verse id for offsets within ranges", () => {
			const map = [
				{ start: 0, end: 10, verseId: "1:1" },
				{ start: 11, end: 20, verseId: "1:2" },
			];
			expect(getVerseIdAtOffset(map, 0)).toBe("1:1");
			expect(getVerseIdAtOffset(map, 5)).toBe("1:1");
			expect(getVerseIdAtOffset(map, 11)).toBe("1:2");
		});

		it("returns last verse id for out-of-range offset", () => {
			const map = [
				{ start: 0, end: 10, verseId: "1:1" },
			];
			expect(getVerseIdAtOffset(map, 99)).toBe("1:1");
		});
	});
});
