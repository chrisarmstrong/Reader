import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

let getCrossReferences: typeof import("./getCrossRefs").getCrossReferences;
let BibleStorage: typeof import("./BibleStorage").default;

describe("getCrossReferences", () => {
	beforeEach(async () => {
		globalThis.indexedDB = new IDBFactory();
		vi.resetModules();

		const storageModule = await import("./BibleStorage");
		BibleStorage = storageModule.default;

		// Initialize DB so the store is created
		await BibleStorage.init();

		// Seed sample verse data so text lookups work
		await BibleStorage.putVerses([
			{ id: "John-1:1", book: "John", bookIndex: 42, chapter: "1", verse: "1", text: "In the beginning was the Word, and the Word was with God, and the Word was God." },
			{ id: "Hebrews-11:3", book: "Hebrews", bookIndex: 57, chapter: "11", verse: "3", text: "Through faith we understand that the worlds were framed by the word of God." },
			{ id: "Revelation-4:11", book: "Revelation", bookIndex: 65, chapter: "4", verse: "11", text: "Thou art worthy, O Lord, to receive glory and honour and power." },
			{ id: "Isaiah-45:18", book: "Isaiah", bookIndex: 22, chapter: "45", verse: "18", text: "For thus saith the LORD that created the heavens." },
			{ id: "Romans-5:8", book: "Romans", bookIndex: 44, chapter: "5", verse: "8", text: "But God commendeth his love toward us." },
			{ id: "I John-4:9", book: "I John", bookIndex: 61, chapter: "4", verse: "9", text: "In this was manifested the love of God toward us." },
			{ id: "Isaiah-5:1", book: "Isaiah", bookIndex: 22, chapter: "5", verse: "1", text: "Now will I sing to my wellbeloved a song." },
			{ id: "I Kings-4:32", book: "I Kings", bookIndex: 10, chapter: "4", verse: "32", text: "And he spake three thousand proverbs: and his songs were a thousand and five." },
		]);

		// Seed sample cross-reference data
		await BibleStorage.putCrossReferences([
			{
				id: "Genesis-1:1",
				refs: [
					"John-1:1",
					"Hebrews-11:3",
					"Revelation-4:11",
					"Isaiah-45:18",
				],
			},
			{
				id: "John-3:16",
				refs: ["Romans-5:8", "I John-4:9"],
			},
			{
				id: "Song of Solomon-1:1",
				refs: ["Isaiah-5:1", "I Kings-4:32"],
			},
			{
				id: "Psalms-23:1",
				refs: [],
			},
		]);

		const crossRefModule = await import("./getCrossRefs");
		getCrossReferences = crossRefModule.getCrossReferences;
	});

	it("should return cross-references for a verse with refs and text", async () => {
		const refs = await getCrossReferences("Genesis", "1", "1");
		expect(refs).toHaveLength(4);
		expect(refs[0]).toEqual({
			verseId: "John-1:1",
			book: "John",
			chapter: "1",
			verse: "1",
			text: "In the beginning was the Word, and the Word was with God, and the Word was God.",
		});
	});

	it("should preserve relevance ordering", async () => {
		const refs = await getCrossReferences("Genesis", "1", "1");
		expect(refs[0].verseId).toBe("John-1:1");
		expect(refs[1].verseId).toBe("Hebrews-11:3");
		expect(refs[2].verseId).toBe("Revelation-4:11");
		expect(refs[3].verseId).toBe("Isaiah-45:18");
	});

	it("should return empty array for a verse with empty refs", async () => {
		const refs = await getCrossReferences("Psalms", "23", "1");
		expect(refs).toEqual([]);
	});

	it("should return empty array for an unknown verse", async () => {
		const refs = await getCrossReferences("FakeBook", "1", "1");
		expect(refs).toEqual([]);
	});

	it("should correctly parse verse IDs with spaces in book names", async () => {
		const refs = await getCrossReferences("Song of Solomon", "1", "1");
		expect(refs).toHaveLength(2);
		expect(refs[0]).toEqual({
			verseId: "Isaiah-5:1",
			book: "Isaiah",
			chapter: "5",
			verse: "1",
			text: "Now will I sing to my wellbeloved a song.",
		});
	});

	it("should correctly parse verse IDs with Roman numeral book names", async () => {
		const refs = await getCrossReferences("John", "3", "16");
		expect(refs).toHaveLength(2);
		expect(refs[1]).toEqual({
			verseId: "I John-4:9",
			book: "I John",
			chapter: "4",
			verse: "9",
			text: "In this was manifested the love of God toward us.",
		});
	});
});
