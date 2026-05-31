import { describe, it, expect } from "vitest";
import { hyphenateText, SOFT_HYPHEN } from "./hyphenate";

describe("hyphenate", () => {
	it("does not hyphenate short words", () => {
		expect(hyphenateText("the and but")).toBe("the and but");
	});

	it("hyphenates words with known prefixes", () => {
		const result = hyphenateText("unbroken");
		expect(result).toContain(SOFT_HYPHEN);
		expect(result).toBe(`un${SOFT_HYPHEN}broken`);
	});

	it("hyphenates words with known suffixes", () => {
		const result = hyphenateText("righteous");
		expect(result).toContain(SOFT_HYPHEN);
		expect(result).toBe(`righte${SOFT_HYPHEN}ous`);
	});

	it("preserves whitespace", () => {
		const result = hyphenateText("hello  world");
		expect(result).toBe("hello  world");
	});

	it("does not hyphenate words shorter than 5 chars", () => {
		expect(hyphenateText("able")).toBe("able");
	});

	it("handles punctuation gracefully", () => {
		const result = hyphenateText("unbroken,");
		expect(result).toContain(SOFT_HYPHEN);
	});

	it("handles empty string", () => {
		expect(hyphenateText("")).toBe("");
	});

	it("handles single word", () => {
		const result = hyphenateText("understanding");
		expect(result).toContain(SOFT_HYPHEN);
	});
});
