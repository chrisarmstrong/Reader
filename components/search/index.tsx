"use client";

import { useState } from "react";
import styles from "./Search.module.css";
import Link from "next/link";
import { Books } from "../../utils/Books";
import Debounce from "../../utils/Debounce";
import type { Book } from "../../types/bible";

interface SearchProps {
	active: boolean;
	dismiss: () => void;
}

interface SearchResultProps {
	book: string;
	chapter: string;
	verse: string;
	text: string;
}

export default function Search({ active, dismiss }: SearchProps) {
	const [searchKeyword, setSearchKeyword] = useState<string>("");
	const [searchHistory, setSearchHistory] = useState<string[]>([]);

	const updateSearchHistory = (keyword: string): void => {
		if (keyword.length > 1) {
			const history = [keyword, ...searchHistory];
			const uniqueHistory = [...new Set(history)];
			setSearchHistory(uniqueHistory.slice(0, 5));
			localStorage?.setItem("searchHistory", JSON.stringify(uniqueHistory));
		}
	};

	const handleSearch = Debounce((e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchKeyword(e.target.value);
		updateSearchHistory(e.target.value);
	}, 500);

	const getResults = (keyword: string): SearchResultProps[] => {
		const results: SearchResultProps[] = [];
		const keywords = keyword.toLowerCase().split(" ");

		Books.forEach((book) =>
			book.chapters.forEach((chapter) =>
				chapter.verses.forEach((verse) => {
					const verseText = verse.text.toLowerCase();
					const match = keywords.every((word) => verseText.includes(word));
					if (keyword.length > 1 && match) {
						results.push({
							book: book.book,
							chapter: chapter.chapter,
							verse: verse.verse,
							text: verse.text,
						});
					}
				})
			)
		);

		return results;
	};

	const getBookResults = (
		keyword: string
	): Array<{
		book: string;
		chapter: string | null;
		verse: string | null;
	}> => {
		const results: Array<{
			book: string;
			chapter: string | null;
			verse: string | null;
		}> = [];
		const keywords = keyword.toLowerCase().split(" ");

		Books.forEach((book) => {
			if (book.book.toLowerCase().includes(keywords[0])) {
				const chapterVerse = keywords[1]?.split(":") || null;
				const chapter = (chapterVerse && parseInt(chapterVerse[0])) || null;
				const verse =
					(chapterVerse && chapterVerse[1] && parseInt(chapterVerse[1])) ||
					null;

				if (chapter && chapter < book.chapters.length + 1) {
					if (verse && verse < book.chapters[chapter - 1].verses.length + 1) {
						results.push({
							book: book.book,
							chapter: chapter.toString(),
							verse: verse.toString(),
						});
					} else {
						results.push({
							book: book.book,
							chapter: chapter.toString(),
							verse: null,
						});
					}
				} else {
					results.push({
						book: book.book,
						chapter: null,
						verse: null,
					});
				}
			}
		});

		return results;
	};

	const highlightText = (text: string, keyword: string): JSX.Element => {
		if (!keyword) return <>{text}</>;

		const parts = text.split(new RegExp(`(${keyword})`, "gi"));
		return (
			<>
				{parts.map((part, index) =>
					part.toLowerCase() === keyword.toLowerCase() ? (
						<span key={index} className={styles.highlight}>
							{part}
						</span>
					) : (
						part
					)
				)}
			</>
		);
	};

	const results = getResults(searchKeyword);
	const bookResults = getBookResults(searchKeyword);

	return (
		<div className={styles.container} data-active={active}>
			<input
				type="text"
				placeholder="Search the Bible..."
				className={styles.searchInput}
				onChange={handleSearch}
				autoFocus={active}
			/>

			<div className={styles.resultsContainer}>
				<div className={styles.resultsList}>
					{/* Book Results */}
					{bookResults.length > 0 && (
						<div className={styles.bookResults}>
							{bookResults.map((result, i) => {
								let link = "/" + result.book.toLowerCase().replace(/\s+/g, "-");
								if (result.chapter) {
									link += result.verse
										? `#${result.chapter}:${result.verse}`
										: `#${result.chapter}`;
								}

								return (
									<Link
										key={`book-result-${i}`}
										href={link}
										className={styles.bookResult}
										onClick={dismiss}
									>
										{result.book}
										{result.chapter && ` ${result.chapter}`}
										{result.verse && `:${result.verse}`}
									</Link>
								);
							})}
						</div>
					)}

					{/* Search Results */}
					{searchKeyword.length > 1 && (
						<div className={styles.count}>
							{results.length} result{results.length !== 1 ? "s" : ""}
						</div>
					)}

					{results.map((result, i) => {
						const link = `/${result.book.toLowerCase().replace(/\s+/g, "-")}#${
							result.chapter
						}:${result.verse}`;

						return (
							<div key={`result-${i}`} className={styles.result}>
								<Link
									href={link}
									onClick={dismiss}
									style={{ textDecoration: "none", color: "inherit" }}
								>
									<div className={styles.resultMeta}>
										{result.book} {result.chapter}:{result.verse}
									</div>
									<div className={styles.resultText}>
										{highlightText(result.text, searchKeyword)}
									</div>
								</Link>
							</div>
						);
					})}

					{searchKeyword.length > 1 &&
						results.length === 0 &&
						bookResults.length === 0 && (
							<div className={styles.noResults}>
								No results found for &quot;{searchKeyword}&quot;
							</div>
						)}
				</div>
			</div>
		</div>
	);
}
