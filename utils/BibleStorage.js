// IndexedDB utility for persistent Bible reading position
// More reliable than localStorage on iOS PWAs

class BibleStorage {
	constructor() {
		this.dbName = "BibleReaderDB";
		this.version = 1;
		this.db = null;
	}

	async init() {
		if (this.db) return this.db;

		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.version);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				this.db = request.result;
				resolve(this.db);
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;

				// Store for reading positions
				if (!db.objectStoreNames.contains("readingPositions")) {
					const store = db.createObjectStore("readingPositions", {
						keyPath: "id",
					});
					store.createIndex("book", "book", { unique: false });
					store.createIndex("lastUpdated", "lastUpdated", { unique: false });
				}

				// Store for user preferences
				if (!db.objectStoreNames.contains("preferences")) {
					db.createObjectStore("preferences", { keyPath: "key" });
				}

				// Store for cached Bible content (backup to service worker cache)
				if (!db.objectStoreNames.contains("bibleContent")) {
					const contentStore = db.createObjectStore("bibleContent", {
						keyPath: "book",
					});
					contentStore.createIndex("lastCached", "lastCached", {
						unique: false,
					});
				}
			};
		});
	}

	// Save reading position
	async saveReadingPosition(book, chapter, verse = 1, scrollPosition = 0) {
		await this.init();

		const transaction = this.db.transaction(["readingPositions"], "readwrite");
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
	async getReadingPosition() {
		await this.init();

		const transaction = this.db.transaction(["readingPositions"], "readonly");
		const store = transaction.objectStore("readingPositions");

		return new Promise((resolve, reject) => {
			const request = store.get("current");
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => reject(request.error);
		});
	}

	// Save user preference
	async savePreference(key, value) {
		await this.init();

		const transaction = this.db.transaction(["preferences"], "readwrite");
		const store = transaction.objectStore("preferences");

		const preference = { key, value, lastUpdated: Date.now() };

		return new Promise((resolve, reject) => {
			const request = store.put(preference);
			request.onsuccess = () => resolve(preference);
			request.onerror = () => reject(request.error);
		});
	}

	// Get user preference
	async getPreference(key, defaultValue = null) {
		await this.init();

		const transaction = this.db.transaction(["preferences"], "readonly");
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
	async cacheBibleBook(bookName, content) {
		await this.init();

		const transaction = this.db.transaction(["bibleContent"], "readwrite");
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
	async getCachedBibleBook(bookName) {
		await this.init();

		const transaction = this.db.transaction(["bibleContent"], "readonly");
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
	async clearAll() {
		await this.init();

		const storeNames = ["readingPositions", "preferences", "bibleContent"];
		const transaction = this.db.transaction(storeNames, "readwrite");

		const clearPromises = storeNames.map((storeName) => {
			return new Promise((resolve, reject) => {
				const request = transaction.objectStore(storeName).clear();
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			});
		});

		return Promise.all(clearPromises);
	}
}

// Export singleton instance
export default new BibleStorage();
