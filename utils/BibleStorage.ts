// IndexedDB utility for persistent Bible reading position
// More reliable than localStorage on iOS PWAs
import type {
	ReadingPosition,
	BibleStoragePreference,
	BibleContent,
	Book,
	Bookmark,
	VerseNote,
	VerseRecord,
	ChapterRecord,
	SearchIndexEntry,
	CrossReferenceRecord,
	RedLetterRecord,
} from "../types/bible";

class BibleStorage {
	private dbName: string;
	private version: number;
	private db: IDBDatabase | null;

	constructor() {
		this.dbName = "BibleReaderDB";
		this.version = 6;
		this.db = null;
	}

	async init(): Promise<IDBDatabase> {
		console.log("init() called, current db:", this.db ? "exists" : "null");

		if (this.db) {
			console.log("Returning existing db, version:", this.db.version);
			return this.db;
		}

		return new Promise((resolve, reject) => {
			console.log("Opening IndexedDB...");
			const request = indexedDB.open(this.dbName, this.version);

			// Add timeout to prevent hanging
			const timeout = setTimeout(() => {
				console.error("IndexedDB open timeout after 5 seconds");
				reject(new Error("Database open timeout"));
			}, 5000);

			request.onerror = () => {
				clearTimeout(timeout);
				console.error("IndexedDB error:", request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				clearTimeout(timeout);
				this.db = request.result;
				console.log("IndexedDB opened successfully, version:", this.db.version);
				console.log("Available stores:", Array.from(this.db.objectStoreNames));
				resolve(this.db);
			};

			request.onupgradeneeded = (event) => {
				console.log("IndexedDB upgrade needed");
				const target = event.target as IDBOpenDBRequest;
				const db = target.result;
				const oldVersion = event.oldVersion;

				console.log(`Upgrading from version ${oldVersion} to ${this.version}`);

				// Store for reading positions
				if (!db.objectStoreNames.contains("readingPositions")) {
					console.log("Creating readingPositions store");
					const store = db.createObjectStore("readingPositions", {
						keyPath: "id",
					});
					store.createIndex("book", "book", { unique: false });
					store.createIndex("lastUpdated", "lastUpdated", { unique: false });
				}

				// Store for user preferences
				if (!db.objectStoreNames.contains("preferences")) {
					console.log("Creating preferences store");
					db.createObjectStore("preferences", { keyPath: "key" });
				}

				// Store for cached Bible content (backup to service worker cache)
				if (!db.objectStoreNames.contains("bibleContent")) {
					console.log("Creating bibleContent store");
					const contentStore = db.createObjectStore("bibleContent", {
						keyPath: "book",
					});
					contentStore.createIndex("lastCached", "lastCached", {
						unique: false,
					});
				}

				// Store for bookmarks
				if (!db.objectStoreNames.contains("bookmarks")) {
					console.log("Creating bookmarks store");
					const bookmarkStore = db.createObjectStore("bookmarks", {
						keyPath: "id",
					});
					bookmarkStore.createIndex("createdAt", "createdAt", {
						unique: false,
					});
					bookmarkStore.createIndex("book", "book", { unique: false });
				}

				// Store for verse notes
				if (!db.objectStoreNames.contains("notes")) {
					console.log("Creating notes store");
					const notesStore = db.createObjectStore("notes", {
						keyPath: "id",
					});
					notesStore.createIndex("createdAt", "createdAt", {
						unique: false,
					});
					notesStore.createIndex("updatedAt", "updatedAt", {
						unique: false,
					});
					notesStore.createIndex("verseRef", ["book", "chapter", "verse"], {
						unique: false,
					});
				}

				// Store for individual verses (for offline seeding & indexed search)
				if (!db.objectStoreNames.contains("verses")) {
					console.log("Creating verses store");
					const versesStore = db.createObjectStore("verses", {
						keyPath: "id",
					});
					versesStore.createIndex("book", "book", { unique: false });
					versesStore.createIndex("bookIndex", "bookIndex", {
						unique: false,
					});
				}

				// Store for inverted search index (word -> verse IDs)
				if (!db.objectStoreNames.contains("searchIndex")) {
					console.log("Creating searchIndex store");
					db.createObjectStore("searchIndex", { keyPath: "word" });
				}

				// Store for cross-references (verse ID -> array of related verse IDs)
				if (!db.objectStoreNames.contains("crossReferences")) {
					console.log("Creating crossReferences store");
					db.createObjectStore("crossReferences", { keyPath: "id" });
				}

				// Store for chapter metadata (psalm titles, etc.)
				if (!db.objectStoreNames.contains("chapters")) {
					console.log("Creating chapters store");
					const chaptersStore = db.createObjectStore("chapters", {
						keyPath: "id",
					});
					chaptersStore.createIndex("book", "book", { unique: false });
				}

				// Store for red letter verses (words of Jesus) keyed by book name
				if (!db.objectStoreNames.contains("redLetterVerses")) {
					console.log("Creating redLetterVerses store");
					db.createObjectStore("redLetterVerses", { keyPath: "book" });
				}

				console.log("Upgrade complete");
			};

			request.onblocked = () => {
				clearTimeout(timeout);
				console.warn("IndexedDB upgrade blocked - please close other tabs");
				reject(new Error("Database upgrade blocked - please close other tabs"));
			};
		});
	}

	// Save reading position
	async saveReadingPosition(
		book: number,
		chapter: number,
		verse = 1,
		scrollPosition = 0
	): Promise<ReadingPosition> {
		await this.init();

		const transaction = this.db!.transaction(["readingPositions"], "readwrite");
		const store = transaction.objectStore("readingPositions");

		const position = {
			id: "current", // Single current position
			book,
			chapter,
			verse,
			scrollPosition,
			lastUpdated: Date.now(),
		};

		return new Promise((resolve, reject) => {
			const request = store.put(position);
			request.onsuccess = () => resolve(position);
			request.onerror = () => reject(request.error);
		});
	}

	// Get reading position
	async getReadingPosition(): Promise<ReadingPosition | null> {
		await this.init();

		const transaction = this.db!.transaction(["readingPositions"], "readonly");
		const store = transaction.objectStore("readingPositions");

		return new Promise((resolve, reject) => {
			const request = store.get("current");
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => reject(request.error);
		});
	}

	// Save user preference
	async savePreference(
		key: string,
		value: any
	): Promise<BibleStoragePreference> {
		await this.init();

		const transaction = this.db!.transaction(["preferences"], "readwrite");
		const store = transaction.objectStore("preferences");

		const preference = { key, value, lastUpdated: Date.now() };

		return new Promise((resolve, reject) => {
			const request = store.put(preference);
			request.onsuccess = () => resolve(preference);
			request.onerror = () => reject(request.error);
		});
	}

	// Get user preference
	async getPreference(key: string, defaultValue: any = null): Promise<any> {
		await this.init();

		const transaction = this.db!.transaction(["preferences"], "readonly");
		const store = transaction.objectStore("preferences");

		return new Promise((resolve, reject) => {
			const request = store.get(key);
			request.onsuccess = () => {
				const result = request.result;
				resolve(result ? result.value : defaultValue);
			};
			request.onerror = () => reject(request.error);
		});
	}

	// Cache Bible content in IndexedDB as backup
	async cacheBibleBook(bookName: string, content: Book): Promise<BibleContent> {
		await this.init();

		const transaction = this.db!.transaction(["bibleContent"], "readwrite");
		const store = transaction.objectStore("bibleContent");

		const bookData = {
			book: bookName,
			content,
			lastCached: Date.now(),
		};

		return new Promise((resolve, reject) => {
			const request = store.put(bookData);
			request.onsuccess = () => resolve(bookData);
			request.onerror = () => reject(request.error);
		});
	}

	// Get cached Bible content
	async getCachedBibleBook(bookName: string): Promise<Book | null> {
		await this.init();

		const transaction = this.db!.transaction(["bibleContent"], "readonly");
		const store = transaction.objectStore("bibleContent");

		return new Promise((resolve, reject) => {
			const request = store.get(bookName);
			request.onsuccess = () => {
				const result = request.result;
				resolve(result ? result.content : null);
			};
			request.onerror = () => reject(request.error);
		});
	}

	// Clear all data (for reset functionality)
	async clearAll(): Promise<void> {
		await this.init();

		const storeNames = ["readingPositions", "preferences", "bibleContent", "notes"];
		const transaction = this.db!.transaction(storeNames, "readwrite");

		const clearPromises = storeNames.map((storeName) => {
			return new Promise<void>((resolve, reject) => {
				const request = transaction.objectStore(storeName).clear();
				request.onsuccess = () => resolve(void 0);
				request.onerror = () => reject(request.error);
			});
		});

		await Promise.all(clearPromises);
	}

	// Bookmark methods
	async addBookmark(
		book: string,
		chapter: string,
		verse: string,
		text: string,
		note?: string
	): Promise<Bookmark> {
		console.log("=== addBookmark called ===", { book, chapter, verse });

		try {
			await this.init();
			console.log("DB initialized, version:", this.db?.version);
			console.log(
				"Available stores:",
				this.db ? Array.from(this.db.objectStoreNames) : "DB is null"
			);

			if (!this.db) {
				throw new Error("Database not initialized");
			}

			const transaction = this.db.transaction(["bookmarks"], "readwrite");
			console.log("Transaction created");

			transaction.oncomplete = () =>
				console.log("Transaction completed successfully");
			transaction.onerror = (e) => console.error("Transaction error:", e);
			transaction.onabort = () => console.error("Transaction aborted");

			const store = transaction.objectStore("bookmarks");
			console.log("Store accessed");

			const bookmark: Bookmark = {
				id: `${book}-${chapter}:${verse}`,
				book,
				chapter,
				verse,
				text,
				createdAt: Date.now(),
				note,
			};

			console.log("Bookmark object created:", bookmark);

			return new Promise((resolve, reject) => {
				const request = store.put(bookmark);
				console.log("Put request initiated");

				request.onsuccess = () => {
					console.log("✓ Bookmark added successfully:", bookmark.id);
					resolve(bookmark);
				};
				request.onerror = () => {
					console.error("✗ Error adding bookmark:", request.error);
					reject(request.error);
				};
			});
		} catch (error) {
			console.error("Exception in addBookmark:", error);
			throw error;
		}
	}

	async removeBookmark(id: string): Promise<void> {
		await this.init();

		const transaction = this.db!.transaction(["bookmarks"], "readwrite");
		const store = transaction.objectStore("bookmarks");

		return new Promise((resolve, reject) => {
			const request = store.delete(id);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async getBookmark(id: string): Promise<Bookmark | null> {
		await this.init();

		const transaction = this.db!.transaction(["bookmarks"], "readonly");
		const store = transaction.objectStore("bookmarks");

		return new Promise((resolve, reject) => {
			const request = store.get(id);
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => reject(request.error);
		});
	}

	async getAllBookmarks(): Promise<Bookmark[]> {
		console.log("Getting all bookmarks...");
		await this.init();

		const transaction = this.db!.transaction(["bookmarks"], "readonly");
		const store = transaction.objectStore("bookmarks");
		const index = store.index("createdAt");

		return new Promise((resolve, reject) => {
			const request = index.openCursor(null, "prev"); // Most recent first
			const bookmarks: Bookmark[] = [];

			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					bookmarks.push(cursor.value);
					cursor.continue();
				} else {
					console.log(`Found ${bookmarks.length} bookmarks`);
					resolve(bookmarks);
				}
			};
			request.onerror = () => {
				console.error("Error getting bookmarks:", request.error);
				reject(request.error);
			};
		});
	}

	async isBookmarked(
		book: string,
		chapter: string,
		verse: string
	): Promise<boolean> {
		const id = `${book}-${chapter}:${verse}`;
		const bookmark = await this.getBookmark(id);
		return bookmark !== null;
	}

	// Note methods
	async addNote(
		book: string,
		chapter: string,
		verse: string,
		content: string
	): Promise<VerseNote> {
		await this.init();

		const transaction = this.db!.transaction(["notes"], "readwrite");
		const store = transaction.objectStore("notes");

		const now = Date.now();
		const note: VerseNote = {
			id: crypto.randomUUID(),
			book,
			chapter,
			verse,
			content,
			createdAt: now,
			updatedAt: now,
		};

		return new Promise((resolve, reject) => {
			const request = store.put(note);
			request.onsuccess = () => resolve(note);
			request.onerror = () => reject(request.error);
		});
	}

	async updateNote(id: string, content: string): Promise<VerseNote> {
		await this.init();

		const transaction = this.db!.transaction(["notes"], "readwrite");
		const store = transaction.objectStore("notes");

		return new Promise((resolve, reject) => {
			const getRequest = store.get(id);
			getRequest.onsuccess = () => {
				const note = getRequest.result as VerseNote | undefined;
				if (!note) {
					reject(new Error(`Note not found: ${id}`));
					return;
				}
				note.content = content;
				note.updatedAt = Date.now();
				const putRequest = store.put(note);
				putRequest.onsuccess = () => resolve(note);
				putRequest.onerror = () => reject(putRequest.error);
			};
			getRequest.onerror = () => reject(getRequest.error);
		});
	}

	async deleteNote(id: string): Promise<void> {
		await this.init();

		const transaction = this.db!.transaction(["notes"], "readwrite");
		const store = transaction.objectStore("notes");

		return new Promise((resolve, reject) => {
			const request = store.delete(id);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async getNotesForVerse(
		book: string,
		chapter: string,
		verse: string
	): Promise<VerseNote[]> {
		await this.init();

		const transaction = this.db!.transaction(["notes"], "readonly");
		const store = transaction.objectStore("notes");
		const index = store.index("verseRef");

		return new Promise((resolve, reject) => {
			const request = index.openCursor(
				IDBKeyRange.only([book, chapter, verse]),
				"prev"
			);
			const notes: VerseNote[] = [];

			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
					.result;
				if (cursor) {
					notes.push(cursor.value);
					cursor.continue();
				} else {
					// Sort by updatedAt descending
					notes.sort((a, b) => b.updatedAt - a.updatedAt);
					resolve(notes);
				}
			};
			request.onerror = () => reject(request.error);
		});
	}

	// --- Bible seeding methods ---

	// Store a batch of verses in a single transaction
	async putVerses(verses: VerseRecord[]): Promise<void> {
		await this.init();

		const transaction = this.db!.transaction(["verses"], "readwrite");
		const store = transaction.objectStore("verses");

		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);

			for (const verse of verses) {
				store.put(verse);
			}
		});
	}

	// Store a batch of search index entries in a single transaction
	async putSearchIndexEntries(entries: SearchIndexEntry[]): Promise<void> {
		await this.init();

		const transaction = this.db!.transaction(["searchIndex"], "readwrite");
		const store = transaction.objectStore("searchIndex");

		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);

			for (const entry of entries) {
				store.put(entry);
			}
		});
	}

	// Look up verse IDs for a word from the search index
	async getSearchIndexEntry(word: string): Promise<SearchIndexEntry | null> {
		await this.init();

		const transaction = this.db!.transaction(["searchIndex"], "readonly");
		const store = transaction.objectStore("searchIndex");

		return new Promise((resolve, reject) => {
			const request = store.get(word);
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => reject(request.error);
		});
	}

	// Fetch multiple verses by their IDs
	async getVersesByIds(ids: string[]): Promise<VerseRecord[]> {
		await this.init();

		const transaction = this.db!.transaction(["verses"], "readonly");
		const store = transaction.objectStore("verses");

		const results: VerseRecord[] = [];

		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve(results);
			transaction.onerror = () => reject(transaction.error);

			for (const id of ids) {
				const request = store.get(id);
				request.onsuccess = () => {
					if (request.result) {
						results.push(request.result);
					}
				};
			}
		});
	}

	// Store a batch of cross-reference entries in a single transaction
	async putCrossReferences(entries: CrossReferenceRecord[]): Promise<void> {
		await this.init();

		const transaction = this.db!.transaction(
			["crossReferences"],
			"readwrite"
		);
		const store = transaction.objectStore("crossReferences");

		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);

			for (const entry of entries) {
				store.put(entry);
			}
		});
	}

	// Get cross-references for a verse by its ID
	async getCrossReferences(
		verseId: string
	): Promise<CrossReferenceRecord | null> {
		await this.init();

		const transaction = this.db!.transaction(
			["crossReferences"],
			"readonly"
		);
		const store = transaction.objectStore("crossReferences");

		return new Promise((resolve, reject) => {
			const request = store.get(verseId);
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => reject(request.error);
		});
	}

	// Store a batch of chapter records in a single transaction
	async putChapters(chapters: ChapterRecord[]): Promise<void> {
		await this.init();

		const transaction = this.db!.transaction(["chapters"], "readwrite");
		const store = transaction.objectStore("chapters");

		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);

			for (const chapter of chapters) {
				store.put(chapter);
			}
		});
	}

	// Get chapter metadata by ID (e.g. "Psalms-3")
	async getChapter(chapterId: string): Promise<ChapterRecord | null> {
		await this.init();

		const transaction = this.db!.transaction(["chapters"], "readonly");
		const store = transaction.objectStore("chapters");

		return new Promise((resolve, reject) => {
			const request = store.get(chapterId);
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => reject(request.error);
		});
	}

	// Get count of verses in the store (to check seeding status)
	async getVerseCount(): Promise<number> {
		await this.init();

		const transaction = this.db!.transaction(["verses"], "readonly");
		const store = transaction.objectStore("verses");

		return new Promise((resolve, reject) => {
			const request = store.count();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	// --- Red letter verse methods ---

	// Store a batch of red letter records (one per book)
	async putRedLetterVerses(entries: RedLetterRecord[]): Promise<void> {
		await this.init();

		const transaction = this.db!.transaction(
			["redLetterVerses"],
			"readwrite"
		);
		const store = transaction.objectStore("redLetterVerses");

		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);

			for (const entry of entries) {
				store.put(entry);
			}
		});
	}

	// Get red letter verse data for a specific book
	async getRedLetterVersesForBook(
		bookName: string
	): Promise<RedLetterRecord | null> {
		await this.init();

		const transaction = this.db!.transaction(
			["redLetterVerses"],
			"readonly"
		);
		const store = transaction.objectStore("redLetterVerses");

		return new Promise((resolve, reject) => {
			const request = store.get(bookName);
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => reject(request.error);
		});
	}

	// Get all notes
	async getAllNotes(): Promise<VerseNote[]> {
		await this.init();

		const transaction = this.db!.transaction(["notes"], "readonly");
		const store = transaction.objectStore("notes");

		return new Promise((resolve, reject) => {
			const request = store.getAll();
			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	}

	// Export all notes and bookmarks as JSON
	async exportData(): Promise<string> {
		const [bookmarks, notes] = await Promise.all([
			this.getAllBookmarks(),
			this.getAllNotes(),
		]);

		return JSON.stringify({ bookmarks, notes }, null, 2);
	}

	// Import notes and bookmarks from JSON
	async importData(json: string): Promise<{ bookmarks: number; notes: number }> {
		const data = JSON.parse(json);
		let bookmarkCount = 0;
		let noteCount = 0;

		if (Array.isArray(data.bookmarks)) {
			await this.init();
			const tx = this.db!.transaction(["bookmarks"], "readwrite");
			const store = tx.objectStore("bookmarks");

			await new Promise<void>((resolve, reject) => {
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
				tx.onabort = () => reject(tx.error);

				for (const bookmark of data.bookmarks) {
					if (bookmark.id && bookmark.book && bookmark.chapter && bookmark.verse) {
						store.put(bookmark);
						bookmarkCount++;
					}
				}
			});
		}

		if (Array.isArray(data.notes)) {
			await this.init();
			const tx = this.db!.transaction(["notes"], "readwrite");
			const store = tx.objectStore("notes");

			await new Promise<void>((resolve, reject) => {
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
				tx.onabort = () => reject(tx.error);

				for (const note of data.notes) {
					if (note.id && note.book && note.chapter && note.verse && note.content) {
						store.put(note);
						noteCount++;
					}
				}
			});
		}

		return { bookmarks: bookmarkCount, notes: noteCount };
	}
}

// Export singleton instance
export default new BibleStorage();
