"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ParagraphInput, PositionedLine } from "./typeset/types";
import type { PreparedTextWithSegments } from "@chenglou/pretext";
import type { BreakOptions } from "./typeset/knuthPlass";

interface UseTypesetResult {
	lines: PositionedLine[] | null;
	error: Error | null;
}

const MAX_CACHE_SIZE = 200;
const preparedCache = new Map<string, PreparedTextWithSegments>();

export function useTypeset(
	input: ParagraphInput | null,
	containerWidth: number,
	containerEl: HTMLElement | null,
	enabled: boolean,
): UseTypesetResult {
	const [lines, setLines] = useState<PositionedLine[] | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const preparedRef = useRef<PreparedTextWithSegments | null>(null);
	const optsRef = useRef<BreakOptions>({ normalSpaceWidth: 4, hyphenWidth: 4 });
	const fontRef = useRef<string>("");

	const rebreak = useCallback((prepared: PreparedTextWithSegments, width: number, opts: BreakOptions, verseMap: ParagraphInput["verseMap"]) => {
		if (width <= 0) return;
		import("./typeset/knuthPlass").then(({ breakParagraph }) => {
			try {
				const result = breakParagraph(prepared, verseMap, width - 0.5, opts);
				setLines(result);
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err : new Error(String(err)));
				setLines(null);
			}
		});
	}, []);

	useEffect(() => {
		if (!enabled || !input || !containerEl || containerWidth <= 0) {
			setLines(null);
			setError(null);
			return;
		}

		let cancelled = false;

		const run = async () => {
			try {
				await document.fonts.ready;

				const cs = getComputedStyle(containerEl);
				const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
				if (!font || cancelled) return;
				fontRef.current = font;

				const { hyphenateText } = await import("./typeset/hyphenate");
				const hyphenatedText = await hyphenateText(input.text);

				const cacheKey = `${hyphenatedText}|${font}`;
				let prepared = preparedCache.get(cacheKey);

				if (!prepared) {
					const pretext = await import("@chenglou/pretext");
					prepared = pretext.prepareWithSegments(hyphenatedText, font);
					if (preparedCache.size >= MAX_CACHE_SIZE) {
						const firstKey = preparedCache.keys().next().value;
						if (firstKey !== undefined) preparedCache.delete(firstKey);
					}
					preparedCache.set(cacheKey, prepared);
				}

				if (cancelled) return;
				preparedRef.current = prepared;

				const { measureSpaceWidth, measureHyphenWidth } = await import("./typeset/pretextAdapter");
				optsRef.current = {
					normalSpaceWidth: measureSpaceWidth(font),
					hyphenWidth: measureHyphenWidth(font),
				};

				rebreak(prepared, containerWidth, optsRef.current, input.verseMap);
			} catch (err) {
				if (!cancelled) {
					console.warn("Typeset failed, falling back to native rendering:", err);
					setError(err instanceof Error ? err : new Error(String(err)));
					setLines(null);
				}
			}
		};

		run();

		return () => {
			cancelled = true;
		};
	}, [enabled, input, containerEl, containerWidth, rebreak]);

	return { lines, error };
}

export function clearTypesetCache(): void {
	preparedCache.clear();
}
