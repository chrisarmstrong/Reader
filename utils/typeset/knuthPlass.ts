import type { PreparedTextWithSegments } from "@chenglou/pretext";
import type { VerseMapEntry, LineSegment, LineSpacing, PositionedLine } from "./types";
import { getVerseIdAtOffset } from "./paragraphBuilder";
import { SOFT_HYPHEN } from "./hyphenate";

const HUGE_BADNESS = 1e8;
const HYPHEN_PENALTY = 50;
const SHORT_LINE_RATIO = 0.6;
const RIVER_THRESHOLD = 1.5;
const INFEASIBLE_SPACE_RATIO = 0.4;
const OVERFLOW_SPACE_RATIO = 0.2;
const TIGHT_SPACE_RATIO = 0.65;

export interface BreakOptions {
	normalSpaceWidth: number;
	hyphenWidth: number;
}

type BreakCandidateKind = "start" | "space" | "soft-hyphen" | "end";

interface BreakCandidate {
	segIndex: number;
	kind: BreakCandidateKind;
}

interface LineStats {
	wordWidth: number;
	spaceCount: number;
	naturalWidth: number;
	trailingHyphen: boolean;
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
	hyphenWidth: number,
): LineStats {
	const from = breakCandidates[fromCandidate]!.segIndex;
	const to = breakCandidates[toCandidate]!.segIndex;
	const trailingHyphen = breakCandidates[toCandidate]!.kind === "soft-hyphen";

	let wordWidth = 0;
	let spaceCount = 0;
	for (let segIndex = from; segIndex < to; segIndex++) {
		const text = segments[segIndex]!;
		if (text === SOFT_HYPHEN) continue;
		if (isSpaceText(text)) {
			spaceCount++;
		} else {
			wordWidth += widths[segIndex]!;
		}
	}

	if (to > from && isSpaceText(segments[to - 1]!)) {
		spaceCount--;
	}

	if (trailingHyphen) {
		wordWidth += hyphenWidth;
	}

	return {
		wordWidth,
		spaceCount,
		naturalWidth: wordWidth + spaceCount * normalSpaceWidth,
		trailingHyphen,
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

	const hyphenCost = stats.trailingHyphen ? HYPHEN_PENALTY : 0;

	return badness + riverPenalty + tightPenalty + hyphenCost;
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

	const breakCandidates: BreakCandidate[] = [{ segIndex: 0, kind: "start" }];
	for (let segIndex = 0; segIndex < segmentCount; segIndex++) {
		const text = segments[segIndex]!;
		if (text === SOFT_HYPHEN) {
			if (segIndex + 1 < segmentCount) {
				breakCandidates.push({ segIndex: segIndex + 1, kind: "soft-hyphen" });
			}
			continue;
		}
		if (isSpaceText(text) && segIndex + 1 < segmentCount) {
			breakCandidates.push({ segIndex: segIndex + 1, kind: "space" });
		}
	}
	breakCandidates.push({ segIndex: segmentCount, kind: "end" });

	const candidateCount = breakCandidates.length;
	const dp: number[] = new Array(candidateCount).fill(Infinity);
	const previous: number[] = new Array(candidateCount).fill(-1);
	dp[0] = 0;

	for (let toCandidate = 1; toCandidate < candidateCount; toCandidate++) {
		const isLastLine = breakCandidates[toCandidate]!.kind === "end";

		for (let fromCandidate = toCandidate - 1; fromCandidate >= 0; fromCandidate--) {
			if (dp[fromCandidate] === Infinity) continue;
			const stats = getLineStats(
				segments,
				widths,
				breakCandidates,
				fromCandidate,
				toCandidate,
				opts.normalSpaceWidth,
				opts.hyphenWidth,
			);

			if (stats.naturalWidth > maxWidth * 2) break;

			const totalBadness = dp[fromCandidate]! + lineBadness(stats, maxWidth, opts.normalSpaceWidth, isLastLine);
			if (totalBadness < dp[toCandidate]!) {
				dp[toCandidate] = totalBadness;
				previous[toCandidate] = fromCandidate;
			}
		}
	}

	if (dp[candidateCount - 1] === Infinity) {
		const fallbackLines: PositionedLine[] = [];
		let from = 0;
		for (let to = 1; to < candidateCount; to++) {
			fallbackLines.push(
				buildLine(prepared, verseMap, breakCandidates, from, to, maxWidth, opts, to === candidateCount - 1),
			);
			from = to;
		}
		if (fallbackLines.length === 0 && candidateCount >= 2) {
			fallbackLines.push(
				buildLine(prepared, verseMap, breakCandidates, 0, candidateCount - 1, maxWidth, opts, true),
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
			opts,
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
	opts: BreakOptions,
	isLast: boolean,
): PositionedLine {
	const from = breakCandidates[fromCandidate]!.segIndex;
	const to = breakCandidates[toCandidate]!.segIndex;
	const trailingHyphen = breakCandidates[toCandidate]!.kind === "soft-hyphen" && !isLast;

	const lineSegments: LineSegment[] = [];
	let charOffset = 0;
	for (let i = 0; i < from; i++) {
		if (prepared.segments[i] !== SOFT_HYPHEN) {
			charOffset += prepared.segments[i]!.length;
		}
	}
	const charStartOffset = charOffset;

	const verseIdsSet = new Set<string>();
	for (let segIndex = from; segIndex < to; segIndex++) {
		const text = prepared.segments[segIndex]!;
		const width = prepared.widths[segIndex]!;

		if (text === SOFT_HYPHEN) {
			continue;
		}

		const vid = getVerseIdAtOffset(verseMap, charOffset);

		if (isSpaceText(text)) {
			lineSegments.push({ kind: "space", width });
		} else {
			lineSegments.push({ kind: "text", text, width });
			verseIdsSet.add(vid);
		}

		charOffset += text.length;
	}

	if (trailingHyphen) {
		lineSegments.push({ kind: "text", text: "-", width: opts.hyphenWidth });
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
	const naturalWidth = wordWidth + spaceCount * opts.normalSpaceWidth;

	let spacing: LineSpacing;
	if (isLast) {
		spacing = { kind: "ragged" };
	} else if (naturalWidth < maxWidth * SHORT_LINE_RATIO || spaceCount <= 0) {
		spacing = { kind: "ragged" };
	} else {
		const rawJustifiedSpace = (maxWidth - wordWidth) / spaceCount;
		if (rawJustifiedSpace < opts.normalSpaceWidth * OVERFLOW_SPACE_RATIO) {
			spacing = { kind: "overflow" };
		} else {
			const wordSpacingPx = rawJustifiedSpace - opts.normalSpaceWidth;
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
