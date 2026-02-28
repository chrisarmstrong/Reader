"use client";

import { useEffect, useState, useRef } from "react";
import type { SeedProgress } from "./seedBibleData";

/**
 * Hook that triggers background seeding of the entire Bible into IndexedDB.
 *
 * On first load (or after a seed version bump), this seeds all verses and
 * builds an inverted search index. Subsequent loads skip seeding entirely.
 *
 * Returns the current seeding status so consumers can react when the
 * index becomes available (e.g., switch search to indexed mode).
 */
export function useBibleSeed(): SeedProgress {
	const [progress, setProgress] = useState<SeedProgress>({
		status: "idle",
		booksProcessed: 0,
		totalBooks: 0,
	});
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;

		(async () => {
			const { isSeedingNeeded, seedBibleData } = await import("./seedBibleData");

			const needed = await isSeedingNeeded();
			if (!needed) {
				setProgress({ status: "done", booksProcessed: 66, totalBooks: 66 });
				return;
			}

			// Dynamically import the full Books array — this is already
			// bundled in the JS, so no network request happens here
			const { Books } = await import("./Books");

			try {
				await seedBibleData(Books, (p) => setProgress(p));
			} catch (err) {
				console.error("Bible seeding failed:", err);
				setProgress((prev) => ({ ...prev, status: "error" }));
			}
		})();
	}, []);

	return progress;
}
