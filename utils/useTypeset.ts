"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ParagraphInput, PositionedLine } from "./typeset/types";
import type { PreparedTextWithSegments } from "@chenglou/pretext";

interface UseTypesetResult {
	lines: PositionedLine[] | null;
	error: Error | null;
}

const preparedCache = new Map<string, PreparedTextWithSegments>();

export function useTypeset(
	input: ParagraphInput | null,
	containerEl: HTMLElement | null,
	enabled: boolean,
): UseTypesetResult {
	const [lines, setLines] = useState<PositionedLine[] | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const preparedRef = useRef<PreparedTextWithSegments | null>(null);
	const widthRef = useRef<number>(0);
	const fontRef = useRef<string>("");
	const normalSpaceWidthRef = useRef<number>(0);

	const rebreak = useCallback((prepared: PreparedTextWithSegments, width: number, normalSpaceWidth: number, verseMap: ParagraphInput["verseMap"]) => {
		if (width <= 0) return;
		import("./typeset/knuthPlass").then(({ breakParagraph }) => {
			try {
				// Shrink by 0.5px to avoid sub-pixel overflow
				const result = breakParagraph(prepared, verseMap, width - 0.5, { normalSpaceWidth });
				setLines(result);
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err : new Error(String(err)));
				setLines(null);
			}
		});
	}, []);

	useEffect(() => {
		if (!enabled || !input || !containerEl) {
			setLines(null);
			setError(null);
			return;
		}

		let cancelled = false;

		const run = async () => {
			try {
				await document.fonts.ready;

				const font = getComputedStyle(containerEl).font;
				if (!font || cancelled) return;
				fontRef.current = font;

				const cacheKey = `${input.text}|${font}`;
				let prepared = preparedCache.get(cacheKey);

				if (!prepared) {
					const pretext = await import("@chenglou/pretext");
					prepared = pretext.prepareWithSegments(input.text, font);
					preparedCache.set(cacheKey, prepared);
				}

				if (cancelled) return;
				preparedRef.current = prepared;

				const { measureSpaceWidth } = await import("./typeset/pretextAdapter");
				normalSpaceWidthRef.current = measureSpaceWidth(font);

				const width = containerEl.offsetWidth;
				widthRef.current = width;
				rebreak(prepared, width, normalSpaceWidthRef.current, input.verseMap);
			} catch (err) {
				if (!cancelled) {
					console.warn("Typeset failed, falling back to native rendering:", err);
					setError(err instanceof Error ? err : new Error(String(err)));
					setLines(null);
				}
			}
		};

		run();

		const observer = new ResizeObserver((entries) => {
			if (cancelled) return;
			const entry = entries[0];
			if (!entry) return;
			const newWidth = entry.contentRect.width;
			if (Math.abs(newWidth - widthRef.current) < 1) return;
			widthRef.current = newWidth;

			if (preparedRef.current && input) {
				rebreak(preparedRef.current, newWidth, normalSpaceWidthRef.current, input.verseMap);
			}
		});

		observer.observe(containerEl);

		return () => {
			cancelled = true;
			observer.disconnect();
		};
	}, [enabled, input, containerEl, rebreak]);

	return { lines, error };
}

export function clearTypesetCache(): void {
	preparedCache.clear();
}
