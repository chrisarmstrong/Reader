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

		const chunks = groupSegmentsByVerse(line, verseMap);
		const lineKey = `ptl-${lineIdx}`;

		return (
			<div
				key={lineKey}
				className={`${styles.ptLine}${line.isLast ? ` ${styles.ptLineLast}` : ""}`}
				style={wordSpacing ? { wordSpacing } : undefined}
			>
				{chunks.map((chunk, chunkIdx) => {
					const isFirstGlobal = !seenVerseIds.has(chunk.verseId);
					if (isFirstGlobal) seenVerseIds.add(chunk.verseId);

					const verseNum = verseNumbers.get(chunk.verseId);

					const isHighlighted = handlers.highlightVerse === chunk.verseId;
					const isReading = handlers.readingVerse === chunk.verseId;
					const isSelected =
						handlers.selectedVerse != null &&
						chunk.verseId ===
							`${handlers.selectedVerse.chapter}:${handlers.selectedVerse.verse}`;

					const verseClasses = [
						styles.verse,
						"verse",
						isHighlighted && styles.selected,
						isReading && styles.reading,
						isSelected && styles.selected,
					]
						.filter(Boolean)
						.join(" ");

					const entry = verseMap.find((v) => v.verseId === chunk.verseId);
					const fullVerseText = entry
						? paragraphText.slice(entry.start, entry.end)
						: "";

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
): VerseChunk[] {
	const chunks: VerseChunk[] = [];
	if (line.segments.length === 0) return chunks;

	let currentChunk: VerseChunk | null = null;
	let textPosition = line.charStartOffset;

	for (const seg of line.segments) {
		const verseId = getVerseIdAtOffset(verseMap, textPosition);

		if (!currentChunk || currentChunk.verseId !== verseId) {
			if (currentChunk) chunks.push(currentChunk);
			currentChunk = {
				verseId,
				segments: [seg],
			};
		} else {
			currentChunk.segments.push(seg);
		}

		if (seg.kind === "text") {
			textPosition += seg.text.length;
		} else {
			textPosition += 1;
		}
	}

	if (currentChunk) chunks.push(currentChunk);
	return chunks;
}
