import { describe, it, expect } from "vitest";
import { hyphenateText, SOFT_HYPHEN } from "./hyphenate";

describe("hyphenate", () => {
	it("does not hyphenate short words", async () => {
		const result = await hyphenateText("the and but");
		expect(result).toBe("the and but");
	});

	it("hyphenates multi-syllable words", async () => {
		const result = await hyphenateText("righteousness");
		expect(result).toContain(SOFT_HYPHEN);
	});

	it("preserves whitespace", async () => {
		const result = await hyphenateText("the  Lord");
		expect(result).toBe("the  Lord");
	});

	it("handles empty string", async () => {
		expect(await hyphenateText("")).toBe("");
	});

	it("handles KJV vocabulary correctly", async () => {
		const result = await hyphenateText("abomination");
		expect(result).toContain(SOFT_HYPHEN);
		const parts = result.split(SOFT_HYPHEN);
		expect(parts.length).toBeGreaterThan(1);
		expect(parts.join("")).toBe("abomination");
	});

	it("handles commandments", async () => {
		const result = await hyphenateText("commandments");
		expect(result).toContain(SOFT_HYPHEN);
	});

	it("handles mixed text with punctuation", async () => {
		const result = await hyphenateText("In the beginning God created the heaven and the earth.");
		expect(result).toContain(SOFT_HYPHEN);
		// The soft hyphens should be in longer words like "beginning", "created"
		expect(result.replace(new RegExp(SOFT_HYPHEN, "g"), "")).toBe(
			"In the beginning God created the heaven and the earth."
		);
	});
});
