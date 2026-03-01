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

	it("should return cross-references for a verse with refs", async () => {
		const refs = await getCrossReferences("Genesis", "1", "1");
		expect(refs).toHaveLength(4);
		expect(refs[0]).toEqual({
			verseId: "John-1:1",
			book: "John",
			chapter: "1",
			verse: "1",
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
		});
	});
});
