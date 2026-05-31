import type { PreparedTextWithSegments } from "@chenglou/pretext";
import type { VerseMapEntry, LineSegment, LineSpacing, PositionedLine } from "./types";
import { getVerseIdAtOffset } from "./paragraphBuilder";

const HUGE_BADNESS = 1e8;
const SHORT_LINE_RATIO = 0.6;
const RIVER_THRESHOLD = 1.5;
const INFEASIBLE_SPACE_RATIO = 0.4;
const OVERFLOW_SPACE_RATIO = 0.2;
const TIGHT_SPACE_RATIO = 0.65;

export interface BreakOptions {
	normalSpaceWidth: number;
}

interface BreakCandidate {
	segIndex: number;
}

interface LineStats {
	wordWidth: number;
	spaceCount: number;
	naturalWidth: number;
}

function isSpaceText(text: string): boolean {
	return text.trim().length === 0;
}

function getLineStats(
	segments: readonly string[],
	widths: readonly number[],
	breakCandidates: readonly BreakCandidate[],
	fromCandidate: number,
	toCandidate: number,
	normalSpaceWidth: number,
): LineStats {
	const from = breakCandidates[fromCandidate]!.segIndex;
	const to = breakCandidates[toCandidate]!.segIndex;

	let wordWidth = 0;
	let spaceCount = 0;
	for (let segIndex = from; segIndex < to; segIndex++) {
		const text = segments[segIndex]!;
		if (isSpaceText(text)) {
			spaceCount++;
		} else {
			wordWidth += widths[segIndex]!;
		}
	}

	if (to > from && isSpaceText(segments[to - 1]!)) {
		spaceCount--;
	}

	return {
		wordWidth,
		spaceCount,
		naturalWidth: wordWidth + spaceCount * normalSpaceWidth,
	};
}

function lineBadness(
	stats: LineStats,
	maxWidth: number,
	normalSpaceWidth: number,
	isLastLine: boolean,
): number {
	if (isLastLine) {
		if (stats.wordWidth > maxWidth) return HUGE_BADNESS;
		return 0;
	}

	if (stats.spaceCount <= 0) {
		const slack = maxWidth - stats.wordWidth;
		if (slack < 0) return HUGE_BADNESS;
		return slack * slack * 10;
	}

	const justifiedSpace = (maxWidth - stats.wordWidth) / stats.spaceCount;
	if (justifiedSpace < 0) return HUGE_BADNESS;
	if (justifiedSpace < normalSpaceWidth * INFEASIBLE_SPACE_RATIO) return HUGE_BADNESS;

	const ratio = (justifiedSpace - normalSpaceWidth) / normalSpaceWidth;
	const absRatio = Math.abs(ratio);
	const badness = absRatio * absRatio * absRatio * 1000;

	const riverExcess = justifiedSpace / normalSpaceWidth - RIVER_THRESHOLD;
	const riverPenalty = riverExcess > 0
		? 5000 + riverExcess * riverExcess * 10000
		: 0;

	const tightThreshold = normalSpaceWidth * TIGHT_SPACE_RATIO;
	const tightPenalty = justifiedSpace < tightThreshold
		? 3000 + (tightThreshold - justifiedSpace) * (tightThreshold - justifiedSpace) * 10000
		: 0;

	return badness + riverPenalty + tightPenalty;
}

export function breakParagraph(
	prepared: PreparedTextWithSegments,
	verseMap: VerseMapEntry[],
	maxWidth: number,
	opts: BreakOptions,
): PositionedLine[] {
	const segments = prepared.segments;
	const widths = prepared.widths;
	const segmentCount = segments.length;

	if (segmentCount === 0) return [];

	const breakCandidates: BreakCandidate[] = [{ segIndex: 0 }];
	for (let segIndex = 0; segIndex < segmentCount; segIndex++) {
		const text = segments[segIndex]!;
		if (isSpaceText(text) && segIndex + 1 < segmentCount) {
			breakCandidates.push({ segIndex: segIndex + 1 });
		}
	}
	breakCandidates.push({ segIndex: segmentCount });

	const candidateCount = breakCandidates.length;
	const dp: number[] = new Array(candidateCount).fill(Infinity);
	const previous: number[] = new Array(candidateCount).fill(-1);
	dp[0] = 0;

	for (let toCandidate = 1; toCandidate < candidateCount; toCandidate++) {
		const isLastLine = toCandidate === candidateCount - 1;

		for (let fromCandidate = toCandidate - 1; fromCandidate >= 0; fromCandidate--) {
			if (dp[fromCandidate] === Infinity) continue;
			const stats = getLineStats(
				segments,
				widths,
				breakCandidates,
				fromCandidate,
				toCandidate,
				opts.normalSpaceWidth,
			);

			if (stats.naturalWidth > maxWidth * 2) break;

			const totalBadness = dp[fromCandidate]! + lineBadness(stats, maxWidth, opts.normalSpaceWidth, isLastLine);
			if (totalBadness < dp[toCandidate]!) {
				dp[toCandidate] = totalBadness;
				previous[toCandidate] = fromCandidate;
			}
		}
	}

	// If DP couldn't find any valid path (e.g. single oversized word), use greedy fallback
	if (dp[candidateCount - 1] === Infinity) {
		const fallbackLines: PositionedLine[] = [];
		let from = 0;
		for (let to = 1; to < candidateCount; to++) {
			fallbackLines.push(
				buildLine(prepared, verseMap, breakCandidates, from, to, maxWidth, opts.normalSpaceWidth, to === candidateCount - 1),
			);
			from = to;
		}
		if (fallbackLines.length === 0 && candidateCount >= 2) {
			fallbackLines.push(
				buildLine(prepared, verseMap, breakCandidates, 0, candidateCount - 1, maxWidth, opts.normalSpaceWidth, true),
			);
		}
		return fallbackLines;
	}

	const breakIndices: number[] = [];
	let current = candidateCount - 1;
	while (current > 0) {
		if (previous[current] === -1) {
			current--;
			continue;
		}
		breakIndices.push(current);
		current = previous[current]!;
	}
	breakIndices.reverse();

	const lines: PositionedLine[] = [];
	let fromCandidate = 0;

	for (let idx = 0; idx < breakIndices.length; idx++) {
		const toCandidate = breakIndices[idx]!;
		const isLast = toCandidate === candidateCount - 1;
		const line = buildLine(
			prepared,
			verseMap,
			breakCandidates,
			fromCandidate,
			toCandidate,
			maxWidth,
			opts.normalSpaceWidth,
			isLast,
		);
		lines.push(line);
		fromCandidate = toCandidate;
	}

	return lines;
}

function buildLine(
	prepared: PreparedTextWithSegments,
	verseMap: VerseMapEntry[],
	breakCandidates: readonly BreakCandidate[],
	fromCandidate: number,
	toCandidate: number,
	maxWidth: number,
	normalSpaceWidth: number,
	isLast: boolean,
): PositionedLine {
	const from = breakCandidates[fromCandidate]!.segIndex;
	const to = breakCandidates[toCandidate]!.segIndex;

	const lineSegments: LineSegment[] = [];
	let charOffset = 0;
	for (let i = 0; i < from; i++) {
		charOffset += prepared.segments[i]!.length;
	}
	const charStartOffset = charOffset;

	const verseIdsSet = new Set<string>();
	for (let segIndex = from; segIndex < to; segIndex++) {
		const text = prepared.segments[segIndex]!;
		const width = prepared.widths[segIndex]!;
		const vid = getVerseIdAtOffset(verseMap, charOffset);

		if (isSpaceText(text)) {
			lineSegments.push({ kind: "space", width });
		} else {
			lineSegments.push({ kind: "text", text, width });
			verseIdsSet.add(vid);
		}

		charOffset += text.length;
	}

	// Trim trailing spaces
	while (lineSegments.length > 0 && lineSegments[lineSegments.length - 1]!.kind === "space") {
		lineSegments.pop();
	}

	let wordWidth = 0;
	let spaceCount = 0;
	for (const seg of lineSegments) {
		if (seg.kind === "space") {
			spaceCount++;
		} else {
			wordWidth += seg.width;
		}
	}
	const naturalWidth = wordWidth + spaceCount * normalSpaceWidth;

	let spacing: LineSpacing;
	if (isLast) {
		spacing = { kind: "ragged" };
	} else if (naturalWidth < maxWidth * SHORT_LINE_RATIO || spaceCount <= 0) {
		spacing = { kind: "ragged" };
	} else {
		const rawJustifiedSpace = (maxWidth - wordWidth) / spaceCount;
		if (rawJustifiedSpace < normalSpaceWidth * OVERFLOW_SPACE_RATIO) {
			spacing = { kind: "overflow" };
		} else {
			const wordSpacingPx = rawJustifiedSpace - normalSpaceWidth;
			spacing = { kind: "justified", wordSpacingPx };
		}
	}

	return {
		segments: lineSegments,
		verseIds: Array.from(verseIdsSet),
		spacing,
		isLast,
		wordWidth,
		spaceCount,
		naturalWidth,
		charStartOffset,
	};
}

// Re-export for testing
export { lineBadness as _lineBadness, getLineStats as _getLineStats };
