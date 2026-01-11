// Migration utility to upgrade IndexedDB from version 1 to version 2
// Preserves reading positions and preferences

export interface MigrationResult {
	success: boolean;
	message: string;
	error?: string;
	preservedData?: {
		readingPosition?: any;
		preferences?: any[];
		bibleContent?: any[];
	};
}

export async function migrateBibleStorage(): Promise<MigrationResult> {
	console.log("=== Starting database migration ===");

	try {
		// Step 1: Export existing data from version 1
		console.log("Step 1: Exporting existing data...");
		const exportedData = await exportExistingData();
		console.log("Exported data:", exportedData);

		// Step 2: Close all connections and delete database
		console.log("Step 2: Deleting old database...");
		await deleteDatabase();

		// Step 3: Wait a moment for cleanup
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Step 4: Create new database with version 2
		console.log("Step 3: Creating new database...");
		await createNewDatabase();

		// Step 5: Import data back
		console.log("Step 4: Importing data...");
		await importData(exportedData);

		console.log("=== Migration complete ===");
		return {
			success: true,
			message:
				"Database upgraded successfully! Your reading position has been preserved.",
			preservedData: exportedData,
		};
	} catch (error) {
		console.error("Migration failed:", error);
		return {
			success: false,
			message:
				"Migration failed. Please try again or delete the database manually.",
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

async function exportExistingData(): Promise<{
	readingPosition?: any;
	preferences?: any[];
	bibleContent?: any[];
}> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open("BibleReaderDB");

		request.onerror = () => {
			console.error("Failed to open database for export");
			resolve({}); // Continue even if we can't export
		};

		request.onsuccess = () => {
			const db = request.result;
			const data: {
				readingPosition?: any;
				preferences?: any[];
				bibleContent?: any[];
			} = {};

			try {
				const storeNames = Array.from(db.objectStoreNames);
				console.log("Available stores for export:", storeNames);

				let completed = 0;
				const total = storeNames.length;

				if (total === 0) {
					db.close();
					resolve(data);
					return;
				}

				// Export reading positions
				if (storeNames.includes("readingPositions")) {
					const transaction = db.transaction(["readingPositions"], "readonly");
					const store = transaction.objectStore("readingPositions");
					const request = store.get("current");

					request.onsuccess = () => {
						data.readingPosition = request.result;
						console.log("Exported reading position:", data.readingPosition);
						completed++;
						if (completed === total) {
							db.close();
							resolve(data);
						}
					};

					request.onerror = () => {
						completed++;
						if (completed === total) {
							db.close();
							resolve(data);
						}
					};
				} else {
					completed++;
				}

				// Export preferences
				if (storeNames.includes("preferences")) {
					const transaction = db.transaction(["preferences"], "readonly");
					const store = transaction.objectStore("preferences");
					const request = store.getAll();

					request.onsuccess = () => {
						data.preferences = request.result;
						console.log("Exported preferences:", data.preferences);
						completed++;
						if (completed === total) {
							db.close();
							resolve(data);
						}
					};

					request.onerror = () => {
						completed++;
						if (completed === total) {
							db.close();
							resolve(data);
						}
					};
				} else {
					completed++;
				}

				// Export bible content
				if (storeNames.includes("bibleContent")) {
					const transaction = db.transaction(["bibleContent"], "readonly");
					const store = transaction.objectStore("bibleContent");
					const request = store.getAll();

					request.onsuccess = () => {
						data.bibleContent = request.result;
						console.log(
							"Exported bible content:",
							data.bibleContent?.length,
							"books"
						);
						completed++;
						if (completed === total) {
							db.close();
							resolve(data);
						}
					};

					request.onerror = () => {
						completed++;
						if (completed === total) {
							db.close();
							resolve(data);
						}
					};
				} else {
					completed++;
				}

				// If no stores to export
				if (total === 0) {
					db.close();
					resolve(data);
				}
			} catch (error) {
				console.error("Error during export:", error);
				db.close();
				resolve(data);
			}
		};

		// Timeout after 10 seconds
		setTimeout(() => {
			console.error("Export timeout");
			resolve({});
		}, 10000);
	});
}

async function deleteDatabase(): Promise<void> {
	return new Promise((resolve, reject) => {
		console.log("Deleting BibleReaderDB...");
		const request = indexedDB.deleteDatabase("BibleReaderDB");

		request.onsuccess = () => {
			console.log("Database deleted successfully");
			resolve();
		};

		request.onerror = () => {
			console.error("Error deleting database:", request.error);
			reject(request.error);
		};

		request.onblocked = () => {
			console.warn("Delete blocked - attempting to continue anyway");
			// Continue anyway after a short delay
			setTimeout(() => resolve(), 1000);
		};

		// Timeout after 10 seconds
		setTimeout(() => {
			console.log("Delete timeout - continuing anyway");
			resolve();
		}, 10000);
	});
}

async function createNewDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		console.log("Creating new database version 2...");
		const request = indexedDB.open("BibleReaderDB", 2);

		request.onerror = () => {
			console.error("Error creating database:", request.error);
			reject(request.error);
		};

		request.onsuccess = () => {
			const db = request.result;
			console.log("New database created, version:", db.version);
			console.log("Stores:", Array.from(db.objectStoreNames));
			resolve(db);
		};

		request.onupgradeneeded = (event) => {
			console.log("Creating database schema...");
			const target = event.target as IDBOpenDBRequest;
			const db = target.result;

			// Store for reading positions
			if (!db.objectStoreNames.contains("readingPositions")) {
				const store = db.createObjectStore("readingPositions", {
					keyPath: "id",
				});
				store.createIndex("book", "book", { unique: false });
				store.createIndex("lastUpdated", "lastUpdated", { unique: false });
				console.log("Created readingPositions store");
			}

			// Store for user preferences
			if (!db.objectStoreNames.contains("preferences")) {
				db.createObjectStore("preferences", { keyPath: "key" });
				console.log("Created preferences store");
			}

			// Store for cached Bible content
			if (!db.objectStoreNames.contains("bibleContent")) {
				const contentStore = db.createObjectStore("bibleContent", {
					keyPath: "book",
				});
				contentStore.createIndex("lastCached", "lastCached", {
					unique: false,
				});
				console.log("Created bibleContent store");
			}

			// Store for bookmarks (NEW in version 2)
			if (!db.objectStoreNames.contains("bookmarks")) {
				const bookmarkStore = db.createObjectStore("bookmarks", {
					keyPath: "id",
				});
				bookmarkStore.createIndex("createdAt", "createdAt", {
					unique: false,
				});
				bookmarkStore.createIndex("book", "book", { unique: false });
				console.log("Created bookmarks store");
			}

			console.log("Schema creation complete");
		};

		// Timeout after 10 seconds
		setTimeout(() => {
			console.error("Create database timeout");
			reject(new Error("Database creation timeout"));
		}, 10000);
	});
}

async function importData(data: {
	readingPosition?: any;
	preferences?: any[];
	bibleContent?: any[];
}): Promise<void> {
	const db = await createNewDatabase();

	return new Promise((resolve, reject) => {
		try {
			const storeNames = [];

			if (data.readingPosition) storeNames.push("readingPositions");
			if (data.preferences && data.preferences.length > 0)
				storeNames.push("preferences");
			if (data.bibleContent && data.bibleContent.length > 0)
				storeNames.push("bibleContent");

			if (storeNames.length === 0) {
				console.log("No data to import");
				db.close();
				resolve();
				return;
			}

			const transaction = db.transaction(storeNames, "readwrite");

			transaction.oncomplete = () => {
				console.log("Import complete");
				db.close();
				resolve();
			};

			transaction.onerror = () => {
				console.error("Import transaction error:", transaction.error);
				db.close();
				reject(transaction.error);
			};

			// Import reading position
			if (data.readingPosition) {
				const store = transaction.objectStore("readingPositions");
				store.put(data.readingPosition);
				console.log("Imported reading position");
			}

			// Import preferences
			if (data.preferences && data.preferences.length > 0) {
				const store = transaction.objectStore("preferences");
				data.preferences.forEach((pref) => {
					store.put(pref);
				});
				console.log("Imported", data.preferences.length, "preferences");
			}

			// Import bible content
			if (data.bibleContent && data.bibleContent.length > 0) {
				const store = transaction.objectStore("bibleContent");
				data.bibleContent.forEach((content) => {
					store.put(content);
				});
				console.log("Imported", data.bibleContent.length, "books");
			}
		} catch (error) {
			console.error("Error during import:", error);
			db.close();
			reject(error);
		}
	});
}
