import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

// Reset IndexedDB and re-import the singleton between tests
let BibleStorage: typeof import("./BibleStorage").default;

describe("BibleStorage — studies", () => {
	beforeEach(async () => {
		globalThis.indexedDB = new IDBFactory();
		vi.resetModules();
		const module = await import("./BibleStorage");
		BibleStorage = module.default;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("creates the studies store on init", async () => {
		const db = await BibleStorage.init();
		expect(db.objectStoreNames.contains("studies")).toBe(true);
	});

	it("creates a study with defaults", async () => {
		const study = await BibleStorage.createStudy("Jesus' life");

		expect(study.id).toBeTruthy();
		expect(study.title).toBe("Jesus' life");
		expect(study.items).toEqual([]);
		expect(study.createdAt).toEqual(expect.any(Number));
		expect(study.updatedAt).toEqual(expect.any(Number));
	});

	it("falls back to a default title when blank", async () => {
		const study = await BibleStorage.createStudy("   ");
		expect(study.title).toBe("Untitled study");
	});

	it("retrieves a study by id", async () => {
		const created = await BibleStorage.createStudy("People named John");
		const fetched = await BibleStorage.getStudy(created.id);
		expect(fetched).toEqual(created);
	});

	it("returns null for a missing study", async () => {
		expect(await BibleStorage.getStudy("nope")).toBeNull();
	});

	it("lists studies most-recently-updated first", async () => {
		const a = await BibleStorage.createStudy("A");
		await new Promise((r) => setTimeout(r, 2));
		const b = await BibleStorage.createStudy("B");

		const all = await BibleStorage.getAllStudies();
		expect(all.map((s) => s.id)).toEqual([b.id, a.id]);
	});

	it("saveStudy persists changes and bumps updatedAt", async () => {
		const study = await BibleStorage.createStudy("Draft");
		await new Promise((r) => setTimeout(r, 2));

		const saved = await BibleStorage.saveStudy({
			...study,
			title: "Final",
		});

		expect(saved.title).toBe("Final");
		expect(saved.updatedAt).toBeGreaterThan(study.updatedAt);

		const fetched = await BibleStorage.getStudy(study.id);
		expect(fetched?.title).toBe("Final");
	});

	it("deletes a study", async () => {
		const study = await BibleStorage.createStudy("Temp");
		await BibleStorage.deleteStudy(study.id);
		expect(await BibleStorage.getStudy(study.id)).toBeNull();
	});

	it("adds a verse to a study", async () => {
		const study = await BibleStorage.createStudy("Creation");
		const updated = await BibleStorage.addVerseToStudy(study.id, {
			book: "Genesis",
			chapter: "1",
			verse: "1",
			text: "In the beginning…",
		});

		expect(updated.items).toHaveLength(1);
		const item = updated.items[0];
		expect(item.type).toBe("verse");
		if (item.type === "verse") {
			expect(item.book).toBe("Genesis");
			expect(item.chapter).toBe("1");
			expect(item.verse).toBe("1");
		}
	});

	it("does not add the same verse twice", async () => {
		const study = await BibleStorage.createStudy("Creation");
		const verse = {
			book: "Genesis",
			chapter: "1",
			verse: "1",
			text: "In the beginning…",
		};
		await BibleStorage.addVerseToStudy(study.id, verse);
		const updated = await BibleStorage.addVerseToStudy(study.id, verse);

		expect(updated.items).toHaveLength(1);
	});

	it("removes a verse from a study", async () => {
		const study = await BibleStorage.createStudy("Creation");
		await BibleStorage.addVerseToStudy(study.id, {
			book: "Genesis",
			chapter: "1",
			verse: "1",
			text: "In the beginning…",
		});

		const updated = await BibleStorage.removeVerseFromStudy(
			study.id,
			"Genesis",
			"1",
			"1"
		);
		expect(updated.items).toHaveLength(0);
	});

	it("throws when adding to a missing study", async () => {
		await expect(
			BibleStorage.addVerseToStudy("missing", {
				book: "Genesis",
				chapter: "1",
				verse: "1",
				text: "x",
			})
		).rejects.toThrow();
	});

	it("round-trips studies through export/import", async () => {
		const study = await BibleStorage.createStudy("Exported");
		await BibleStorage.addVerseToStudy(study.id, {
			book: "John",
			chapter: "3",
			verse: "16",
			text: "For God so loved the world…",
		});

		const json = await BibleStorage.exportData();
		const parsed = JSON.parse(json);
		expect(Array.isArray(parsed.studies)).toBe(true);
		expect(parsed.studies).toHaveLength(1);

		// Wipe and re-import
		globalThis.indexedDB = new IDBFactory();
		vi.resetModules();
		const fresh = (await import("./BibleStorage")).default;

		const result = await fresh.importData(json);
		expect(result.studies).toBe(1);

		const imported = await fresh.getAllStudies();
		expect(imported).toHaveLength(1);
		expect(imported[0].title).toBe("Exported");
		expect(imported[0].items).toHaveLength(1);
	});
});
