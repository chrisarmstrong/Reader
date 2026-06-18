import { describe, it, expect } from "vitest";
import { breakParagraph, _lineBadness, _getLineStats } from "./knuthPlass";
import type { PreparedTextWithSegments } from "@chenglou/pretext";

const OPTS = { normalSpaceWidth: 5, hyphenWidth: 4 };

function makePrepared(words: string[], wordWidth: number, spaceWidth: number): PreparedTextWithSegments {
	const segments: string[] = [];
	const widths: number[] = [];

	for (let i = 0; i < words.length; i++) {
		if (i > 0) {
			segments.push(" ");
			widths.push(spaceWidth);
		}
		segments.push(words[i]!);
		widths.push(wordWidth);
	}

	return {
		segments,
		widths,
	} as unknown as PreparedTextWithSegments;
}

describe("knuthPlass", () => {
	describe("breakParagraph", () => {
		it("returns empty array for empty input", () => {
			const prepared = { segments: [], widths: [] } as unknown as PreparedTextWithSegments;
			const result = breakParagraph(prepared, [], 200, OPTS);
			expect(result).toEqual([]);
		});

		it("keeps single-line paragraph on one line", () => {
			const prepared = makePrepared(["Hello", "world"], 30, 5);
			const verseMap = [{ start: 0, end: 11, verseId: "1:1" }];
			const result = breakParagraph(prepared, verseMap, 200, OPTS);
			expect(result).toHaveLength(1);
			expect(result[0]!.isLast).toBe(true);
			expect(result[0]!.spacing.kind).toBe("ragged");
		});

		it("breaks long text into multiple lines", () => {
			const words = Array.from({ length: 20 }, (_, i) => `word${i}`);
			const prepared = makePrepared(words, 40, 5);
			const verseMap = [{ start: 0, end: words.join(" ").length, verseId: "1:1" }];
			const result = breakParagraph(prepared, verseMap, 200, OPTS);

			expect(result.length).toBeGreaterThan(1);

			const lastLine = result[result.length - 1]!;
			expect(lastLine.isLast).toBe(true);
			expect(lastLine.spacing.kind).toBe("ragged");

			for (let i = 0; i < result.length - 1; i++) {
				const line = result[i]!;
				expect(line.spacing.kind).not.toBe("ragged");
			}
		});

		it("justifies non-last lines", () => {
			const words = Array.from({ length: 10 }, () => "test");
			const prepared = makePrepared(words, 30, 5);
			const verseMap = [{ start: 0, end: words.join(" ").length, verseId: "1:1" }];
			const result = breakParagraph(prepared, verseMap, 150, OPTS);

			expect(result.length).toBeGreaterThan(1);
			const firstLine = result[0]!;
			if (firstLine.spacing.kind === "justified") {
				expect(typeof firstLine.spacing.wordSpacingPx).toBe("number");
			}
		});

		it("assigns correct verse IDs across multiple verses", () => {
			const prepared = makePrepared(["Hello", "world.", "Goodbye", "now."], 40, 5);
			const verseMap = [
				{ start: 0, end: 12, verseId: "1:1" },
				{ start: 13, end: 25, verseId: "1:2" },
			];
			const result = breakParagraph(prepared, verseMap, 200, OPTS);

			const allVerseIds = result.flatMap((l) => l.verseIds);
			expect(allVerseIds).toContain("1:1");
			expect(allVerseIds).toContain("1:2");
		});

		it("handles very narrow width gracefully", () => {
			const prepared = makePrepared(["Supercalifragilistic"], 200, 5);
			const verseMap = [{ start: 0, end: 20, verseId: "1:1" }];
			const result = breakParagraph(prepared, verseMap, 50, OPTS);
			expect(result.length).toBeGreaterThanOrEqual(1);
		});

		it("can break at soft hyphens", () => {
			const SOFT_HYPHEN = "­";
			const segments = ["justifi", SOFT_HYPHEN, "cation"];
			const widths = [40, 0, 35];
			const prepared = { segments, widths } as unknown as PreparedTextWithSegments;
			const verseMap = [{ start: 0, end: 14, verseId: "1:1" }];
			const result = breakParagraph(prepared, verseMap, 50, OPTS);
			expect(result.length).toBeGreaterThanOrEqual(1);
			const allText = result.flatMap(l => l.segments.filter(s => s.kind === "text").map(s => (s as any).text)).join("");
			expect(allText).toContain("-");
		});

		it("tracks charStartOffset correctly", () => {
			const words = Array.from({ length: 10 }, () => "word");
			const prepared = makePrepared(words, 40, 5);
			const verseMap = [{ start: 0, end: words.join(" ").length, verseId: "1:1" }];
			const result = breakParagraph(prepared, verseMap, 200, OPTS);

			expect(result[0]!.charStartOffset).toBe(0);
			if (result.length > 1) {
				expect(result[1]!.charStartOffset).toBeGreaterThan(0);
			}
		});
	});

	describe("lineBadness", () => {
		it("returns 0 for last line that fits", () => {
			const stats = { wordWidth: 100, spaceCount: 3, naturalWidth: 115, trailingHyphen: false };
			const badness = _lineBadness(stats, 200, 5, true);
			expect(badness).toBe(0);
		});

		it("returns HUGE_BADNESS for overflowing last line", () => {
			const stats = { wordWidth: 300, spaceCount: 0, naturalWidth: 300, trailingHyphen: false };
			const badness = _lineBadness(stats, 200, 5, true);
			expect(badness).toBe(1e8);
		});

		it("penalizes tight spacing", () => {
			const normalStats = { wordWidth: 140, spaceCount: 3, naturalWidth: 155, trailingHyphen: false };
			const normalBadness = _lineBadness(normalStats, 160, 5, false);

			const tightStats = { wordWidth: 155, spaceCount: 3, naturalWidth: 170, trailingHyphen: false };
			const tightBadness = _lineBadness(tightStats, 160, 5, false);

			expect(tightBadness).toBeGreaterThan(normalBadness);
		});

		it("adds penalty for trailing hyphen", () => {
			const noHyphen = { wordWidth: 140, spaceCount: 3, naturalWidth: 155, trailingHyphen: false };
			const withHyphen = { wordWidth: 140, spaceCount: 3, naturalWidth: 155, trailingHyphen: true };
			expect(_lineBadness(withHyphen, 160, 5, false)).toBeGreaterThan(_lineBadness(noHyphen, 160, 5, false));
		});
	});

	describe("getLineStats", () => {
		it("counts words and spaces correctly", () => {
			const segments = ["hello", " ", "world", " ", "test"];
			const widths = [30, 5, 35, 5, 25];
			const candidates = [
				{ segIndex: 0, kind: "start" as const },
				{ segIndex: 2, kind: "space" as const },
				{ segIndex: 4, kind: "space" as const },
				{ segIndex: 5, kind: "end" as const },
			];
			const stats = _getLineStats(segments, widths, candidates, 0, 3, 5, 4);

			expect(stats.wordWidth).toBe(90);
			expect(stats.spaceCount).toBe(2);
			expect(stats.naturalWidth).toBe(100);
		});

		it("accounts for hyphen width at soft-hyphen breaks", () => {
			const SOFT_HYPHEN = "­";
			const segments = ["justi", SOFT_HYPHEN, "fi"];
			const widths = [30, 0, 10];
			const candidates = [
				{ segIndex: 0, kind: "start" as const },
				{ segIndex: 2, kind: "soft-hyphen" as const },
				{ segIndex: 3, kind: "end" as const },
			];
			const stats = _getLineStats(segments, widths, candidates, 0, 1, 5, 4);
			expect(stats.wordWidth).toBe(34); // 30 + 4 (hyphen)
			expect(stats.trailingHyphen).toBe(true);
		});
	});
});
