const SOFT_HYPHEN = "­";

let hyphenateFn: ((text: string) => string) | null = null;
let loadPromise: Promise<void> | null = null;

async function ensureLoaded(): Promise<void> {
	if (hyphenateFn) return;
	if (!loadPromise) {
		loadPromise = import("hyphen/en").then((mod) => {
			hyphenateFn = mod.hyphenateSync;
		});
	}
	return loadPromise;
}

export async function hyphenateText(text: string): Promise<string> {
	await ensureLoaded();
	if (!hyphenateFn) return text;
	return hyphenateFn(text);
}

export function hyphenateTextSync(text: string): string {
	if (!hyphenateFn) return text;
	return hyphenateFn(text);
}

export { SOFT_HYPHEN };
