export interface Verse {
	verse: string;
	text: string;
	paragraph?: boolean;
}

export interface Chapter {
	chapter: string;
	verses: Verse[];
}

export interface Book {
	book: string;
	index: number;
	chapters: Chapter[];
}

export interface ReadingPosition {
	id?: string;
	book: number;
	chapter: number;
	verse: number;
	scrollPosition: number;
	lastUpdated: number;
}

export interface SearchResult {
	book: string;
	chapter: number;
	verse: number;
	text: string;
	matches?: Array<{
		indices: [number, number][];
	}>;
	score?: number;
}

export interface BibleStoragePreference {
	key: string;
	value: any;
	lastUpdated: number;
}

export interface BibleContent {
	book: string;
	content: Book;
	lastCached: number;
}

// Component Props Types
export interface MainProps {
	slug?: string;
	book?: Book;
}

export interface ReaderProps {
	book: Book;
	searchActive?: boolean;
	onChapterChange?: (chapter: number, verse: number) => void;
}

export interface ContentsProps {
	active: boolean;
	currentBook: Book;
	onBookSelect: (book: Book) => void;
	dismiss: () => void;
}

export interface SearchProps {
	active: boolean;
	dismiss: () => void;
}

export interface NavBarProps {
	onMenuToggle: () => void;
	onSearchToggle: () => void;
	onNextChapter: () => void;
	onPrevChapter: () => void;
	canGoNext?: boolean;
	canGoPrev?: boolean;
}
