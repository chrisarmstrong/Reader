export interface VerseMapEntry {
	start: number;
	end: number;
	verseId: string;
}

export interface ParagraphInput {
	text: string;
	verseMap: VerseMapEntry[];
	firstCharDropCap: boolean;
}

export type Run =
	| { kind: "paragraph"; input: ParagraphInput; verseNumbers: Map<string, string> }
	| { kind: "poetry"; verseId: string; verseNumber: string; text: string; isNewParagraph: boolean }
	| { kind: "psalmTitle"; text: string };

export type LineSegment =
	| { kind: "text"; text: string; width: number }
	| { kind: "space"; width: number };

export type LineSpacing =
	| { kind: "ragged" }
	| { kind: "overflow" }
	| { kind: "justified"; wordSpacingPx: number };

export interface PositionedLine {
	segments: LineSegment[];
	verseIds: string[];
	spacing: LineSpacing;
	isLast: boolean;
	wordWidth: number;
	spaceCount: number;
	naturalWidth: number;
	charStartOffset: number;
}
