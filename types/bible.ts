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

export interface VerseRecord {
	id: string; // "Genesis-1:1"
	book: string;
	bookIndex: number;
	chapter: string;
	verse: string;
	text: string;
}

export interface SearchIndexEntry {
	word: string;
	refs: string[]; // verse IDs
}

export interface Bookmark {
	id: string;
	book: string;
	chapter: string;
	verse: string;
	text: string;
	createdAt: number;
	note?: string;
}

export interface VerseNote {
	id: string;
	book: string;
	chapter: string;
	verse: string;
	content: string;
	createdAt: number;
	updatedAt: number;
}

export interface CrossReferenceRecord {
	id: string; // source verse ID, e.g. "Genesis-1:1"
	refs: string[]; // target verse IDs sorted by relevance
}

export interface CrossReference {
	verseId: string; // "Genesis-1:1"
	book: string; // "Genesis"
	chapter: string; // "1"
	verse: string; // "1"
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
	readingVerse?: string | null;
	onPlayAudio?: (chapter: number, verse: number) => void;
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
	currentPosition?: ReadingPosition | null;
	currentBook?: Book;
	visibleChapter?: number | null;
	isPlaying?: boolean;
	isAudioSupported?: boolean;
	onPlayPause?: () => void;
}
