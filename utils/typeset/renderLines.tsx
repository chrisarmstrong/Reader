"use client";

import { type ReactNode } from "react";
import type { PositionedLine, LineSegment } from "./types";
import styles from "../../components/Reader/Reader.module.css";
import { getVerseIdAtOffset } from "./paragraphBuilder";
import type { VerseMapEntry } from "./types";

interface VerseHandlers {
	onPointerDown: (e: React.PointerEvent) => void;
	onPointerUp: (e: React.PointerEvent, verseId: string, text: string) => void;
	highlightVerse: string | null;
	readingVerse: string | null;
	selectedVerse: { chapter: string; verse: string } | null;
}

interface RenderLinesProps {
	lines: PositionedLine[];
	verseMap: VerseMapEntry[];
	verseNumbers: Map<string, string>;
	handlers: VerseHandlers;
	paragraphText: string;
}

interface VerseChunk {
	verseId: string;
	segments: LineSegment[];
	isFirstOccurrence: boolean;
}

export function renderPositionedLines({
	lines,
	verseMap,
	verseNumbers,
	handlers,
	paragraphText,
}: RenderLinesProps): ReactNode {
	const seenVerseIds = new Set<string>();

	return lines.map((line, lineIdx) => {
		const wordSpacing =
			line.spacing.kind === "justified"
				? `${line.spacing.wordSpacingPx}px`
				: undefined;

		const chunks = groupSegmentsByVerse(line, verseMap, paragraphText, lineIdx);
		const lineKey = `ptl-${lineIdx}`;

		return (
			<div
				key={lineKey}
				className={`${styles.ptLine} ${line.isLast ? styles.ptLineLast : ""}`}
				style={wordSpacing ? { wordSpacing } : undefined}
			>
				{chunks.map((chunk, chunkIdx) => {
					const isFirstGlobal = !seenVerseIds.has(chunk.verseId);
					if (isFirstGlobal) seenVerseIds.add(chunk.verseId);

					const verseNum = verseNumbers.get(chunk.verseId);
					const chunkText = chunk.segments
						.filter((s) => s.kind === "text")
						.map((s) => (s as { kind: "text"; text: string; width: number }).text)
						.join(" ");

					const isHighlighted = handlers.highlightVerse === chunk.verseId;
					const isReading = handlers.readingVerse === chunk.verseId;
					const [, chVs] = chunk.verseId.split(":");
					const isSelected =
						handlers.selectedVerse &&
						chunk.verseId ===
							`${handlers.selectedVerse.chapter}:${handlers.selectedVerse.verse}`;

					const verseClasses = [
						styles.verse,
						"verse",
						isHighlighted ? styles.selected : "",
						isReading ? styles.reading : "",
						isSelected ? styles.selected : "",
					]
						.filter(Boolean)
						.join(" ");

					const fullVerseText =
						verseMap.find((v) => v.verseId === chunk.verseId)
							? paragraphText.slice(
									verseMap.find((v) => v.verseId === chunk.verseId)!.start,
									verseMap.find((v) => v.verseId === chunk.verseId)!.end,
								)
							: chunkText;

					return (
						<span key={`${lineKey}-${chunkIdx}`}>
							{isFirstGlobal && (
								<span
									id={chunk.verseId}
									className={styles.verseAnchor}
									aria-hidden="true"
								/>
							)}
							<span
								data-verse-id={chunk.verseId}
								className={verseClasses}
								onPointerDown={handlers.onPointerDown}
								onPointerUp={(e) =>
									handlers.onPointerUp(e, chunk.verseId, fullVerseText)
								}
							>
								{isFirstGlobal && verseNum && (
									<sup>{verseNum}&nbsp;</sup>
								)}
								{renderChunkContent(chunk.segments)}
							</span>
						</span>
					);
				})}
			</div>
		);
	});
}

function renderChunkContent(segments: LineSegment[]): string {
	const parts: string[] = [];
	for (const seg of segments) {
		if (seg.kind === "text") {
			parts.push(seg.text);
		} else {
			parts.push(" ");
		}
	}
	return parts.join("");
}

function groupSegmentsByVerse(
	line: PositionedLine,
	verseMap: VerseMapEntry[],
	fullText: string,
	lineIdx: number,
): VerseChunk[] {
	const chunks: VerseChunk[] = [];
	if (line.segments.length === 0) return chunks;

	// We need to find the character offset for this line's segments in the full text
	// Reconstruct offset by walking through segments
	let currentChunk: VerseChunk | null = null;

	// Use line's verseIds as a fallback, but do segment-level assignment
	// by tracking position in the text
	let textPosition = findLineTextStart(line, fullText);

	for (const seg of line.segments) {
		const verseId = getVerseIdAtOffset(verseMap, textPosition);

		if (!currentChunk || currentChunk.verseId !== verseId) {
			if (currentChunk) chunks.push(currentChunk);
			currentChunk = {
				verseId,
				segments: [seg],
				isFirstOccurrence: false,
			};
		} else {
			currentChunk.segments.push(seg);
		}

		if (seg.kind === "text") {
			textPosition += seg.text.length;
		} else {
			textPosition += 1; // space
		}
	}

	if (currentChunk) chunks.push(currentChunk);
	return chunks;
}

function findLineTextStart(line: PositionedLine, fullText: string): number {
	// Build the line's text content (excluding spaces at boundaries)
	const lineTextParts: string[] = [];
	for (const seg of line.segments) {
		if (seg.kind === "text") {
			lineTextParts.push(seg.text);
			break; // just need first word to find position
		}
	}

	if (lineTextParts.length === 0) return 0;

	const firstWord = lineTextParts[0]!;
	// Find this word in the full text - search from each possible position
	let idx = 0;
	while (idx < fullText.length) {
		const found = fullText.indexOf(firstWord, idx);
		if (found === -1) return 0;
		// Verify it's at a word boundary (start of text or preceded by space)
		if (found === 0 || fullText[found - 1] === " ") {
			return found;
		}
		idx = found + 1;
	}

	return 0;
}
