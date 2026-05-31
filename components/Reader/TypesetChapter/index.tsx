"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import styles from "../Reader.module.css";
import type { Chapter } from "../../../types/bible";
import { buildParagraphRuns } from "../../../utils/typeset/paragraphBuilder";
import { useTypeset } from "../../../utils/useTypeset";
import { renderPositionedLines } from "../../../utils/typeset/renderLines";

interface TypesetChapterProps {
	chapter: Chapter;
	bookName: string;
	chaptersCount: number;
	highlightVerse: string | null;
	readingVerse: string | null;
	selectedVerse: { chapter: string; verse: string } | null;
	onVerseClick: (chapter: string, verse: string, text: string) => void;
}

function TypesetParagraphRun({
	input,
	verseNumbers,
	containerEl,
	handlers,
}: {
	input: import("../../../utils/typeset/types").ParagraphInput;
	verseNumbers: Map<string, string>;
	containerEl: HTMLElement | null;
	handlers: {
		onPointerDown: (e: React.PointerEvent) => void;
		onPointerUp: (e: React.PointerEvent, verseId: string, text: string) => void;
		highlightVerse: string | null;
		readingVerse: string | null;
		selectedVerse: { chapter: string; verse: string } | null;
	};
}) {
	const { lines } = useTypeset(input, containerEl, true);

	if (!lines) {
		return (
			<>
				{input.verseMap.map((entry) => {
					const verseNum = verseNumbers.get(entry.verseId);
					const text = input.text.slice(entry.start, entry.end);
					return (
						<p
							key={entry.verseId}
							id={entry.verseId}
							className={`${styles.verse} verse`}
							onPointerDown={handlers.onPointerDown}
							onPointerUp={(e) =>
								handlers.onPointerUp(e, entry.verseId, text)
							}
						>
							{verseNum && <sup>{verseNum}&nbsp;</sup>}
							{text}
						</p>
					);
				})}
			</>
		);
	}

	return (
		<>
			{renderPositionedLines({
				lines,
				verseMap: input.verseMap,
				verseNumbers,
				handlers,
				paragraphText: input.text,
			})}
		</>
	);
}

export default function TypesetChapter({
	chapter,
	bookName,
	chaptersCount,
	highlightVerse,
	readingVerse,
	selectedVerse,
	onVerseClick,
}: TypesetChapterProps) {
	const [chapterEl, setChapterEl] = useState<HTMLDivElement | null>(null);
	const chapterRef = useCallback((node: HTMLDivElement | null) => {
		setChapterEl(node);
	}, []);
	const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
	const isSingleChapterBook = chaptersCount < 2;

	const runs = useMemo(
		() => buildParagraphRuns(chapter, isSingleChapterBook),
		[chapter, isSingleChapterBook],
	);

	const handlePointerDown = useCallback((e: React.PointerEvent) => {
		pointerStartRef.current = { x: e.clientX, y: e.clientY };
	}, []);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent, verseId: string, text: string) => {
			const start = pointerStartRef.current;
			pointerStartRef.current = null;
			if (!start) return;
			const dx = Math.abs(e.clientX - start.x);
			const dy = Math.abs(e.clientY - start.y);
			if (dx > 10 || dy > 10) return;
			const [ch, vs] = verseId.split(":");
			if (ch && vs) {
				onVerseClick(ch, vs, text);
			}
		},
		[onVerseClick],
	);

	const handlers = useMemo(
		() => ({
			onPointerDown: handlePointerDown,
			onPointerUp: handlePointerUp,
			highlightVerse,
			readingVerse,
			selectedVerse,
		}),
		[handlePointerDown, handlePointerUp, highlightVerse, readingVerse, selectedVerse],
	);

	const firstVerse = chapter.verses[0];
	const showDropCap = chaptersCount > 1 || !firstVerse;
	const dropCapChar = !showDropCap && firstVerse ? firstVerse.text[0] : null;

	return (
		<div
			ref={chapterRef}
			key={chapter.chapter}
			className={`${styles.chapter} ${bookName === "Psalms" ? styles.psalm : ""}`}
			id={chapter.chapter.toString()}
		>
			<h2 className={styles.chapterNumber}>
				{chaptersCount > 1 ? chapter.chapter : dropCapChar}
			</h2>

			{runs.map((run, runIdx) => {
				if (run.kind === "psalmTitle") {
					return (
						<span key={`st-${runIdx}`} className={styles.psalmTitle}>
							{run.text}
						</span>
					);
				}

				if (run.kind === "poetry") {
					return (
						<p
							key={run.verseId}
							id={run.verseId}
							className={`${styles.verse} verse ${styles.poetry} ${
								run.isNewParagraph ? styles.newParagraph : ""
							} ${highlightVerse === run.verseId ? styles.selected : ""} ${
								readingVerse === run.verseId ? styles.reading : ""
							} ${
								selectedVerse &&
								run.verseId === `${selectedVerse.chapter}:${selectedVerse.verse}`
									? styles.selected
									: ""
							}`}
							onPointerDown={handlePointerDown}
							onPointerUp={(e) =>
								handlePointerUp(e, run.verseId, run.text)
							}
						>
							<sup>{run.verseNumber}&nbsp;</sup>
							{run.text}
						</p>
					);
				}

				return (
					<TypesetParagraphRun
						key={`pr-${runIdx}`}
						input={run.input}
						verseNumbers={run.verseNumbers}
						containerEl={chapterEl}
						handlers={handlers}
					/>
				);
			})}
		</div>
	);
}
