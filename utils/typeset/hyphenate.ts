const SOFT_HYPHEN = "­";

const PREFIXES = [
	"anti", "auto", "be", "bi", "co", "com", "con", "contra", "counter", "de",
	"dis", "en", "em", "ex", "extra", "fore", "hyper", "il", "im", "in", "inter",
	"intra", "ir", "macro", "mal", "micro", "mid", "mis", "mono", "multi", "non",
	"omni", "out", "over", "para", "poly", "post", "pre", "pro", "pseudo",
	"quasi", "re", "retro", "semi", "sub", "super", "sur", "syn", "tele", "trans",
	"tri", "ultra", "un", "under",
];

const SUFFIXES = [
	"able", "ible", "tion", "sion", "ment", "ness", "ous", "ious", "eous", "ful",
	"less", "ive", "ative", "itive", "al", "ial", "ical", "ing", "ling",
	"ed", "er", "est", "ism", "ist", "ity", "ety", "ty", "ence", "ance", "ly",
	"fy", "ify", "ize", "ise", "ure", "ture",
];

function hyphenateWord(word: string): string[] {
	const lower = word.toLowerCase().replace(/[.,;:!?"'—–\-()[\]]/g, "");
	if (lower.length < 5) return [word];

	for (const prefix of PREFIXES) {
		if (lower.startsWith(prefix) && lower.length - prefix.length >= 3) {
			return [word.slice(0, prefix.length), word.slice(prefix.length)];
		}
	}

	for (const suffix of SUFFIXES) {
		if (lower.endsWith(suffix) && lower.length - suffix.length >= 3) {
			const cut = word.length - suffix.length;
			return [word.slice(0, cut), word.slice(cut)];
		}
	}

	return [word];
}

export function hyphenateText(text: string): string {
	const tokens = text.split(/(\s+)/);
	let result = "";
	for (const token of tokens) {
		if (/^\s+$/.test(token)) {
			result += token;
			continue;
		}
		const parts = hyphenateWord(token);
		result += parts.length <= 1 ? token : parts.join(SOFT_HYPHEN);
	}
	return result;
}

export { SOFT_HYPHEN };
