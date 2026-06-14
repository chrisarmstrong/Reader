"use client";

import {
	memo,
	useCallback,
	useMemo,
	useState,
	useTransition,
	useDeferredValue,
	useEffect,
	useRef,
} from "react";
import Link from "next/link";
import { Virtuoso } from "react-virtuoso";
import {
	Modal,
	TextInput,
	Stack,
	Group,
	Text,
	ActionIcon,
	Highlight,
	Box,
	Loader,
	SegmentedControl,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { Books } from "../../utils/Books";
import Debounce from "../../utils/Debounce";
import BibleStorage from "../../utils/BibleStorage";
import {
	indexedSearch,
	bruteForceSearch,
	type SearchScope,
	type VerseSearchResult as SearchResultProps,
} from "../../utils/searchVerses";
import type { Book } from "../../types/bible";

interface SearchProps {
	active: boolean;
	dismiss: () => void;
	currentBook?: Book;
	isIndexReady?: boolean;
}

function Search({ active, dismiss, currentBook, isIndexReady }: SearchProps) {
	const [searchKeyword, setSearchKeyword] = useState<string>(() => {
		if (typeof window !== "undefined") {
			return sessionStorage.getItem("searchKeyword") || "";
		}
		return "";
	});
	const [searchHistory, setSearchHistory] = useState<string[]>([]);
	const [isPending, startTransition] = useTransition();
	const [searchScope, setSearchScope] = useState<SearchScope>("all");

	// Indexed search results (async path)
	const [indexedResults, setIndexedResults] = useState<
		SearchResultProps[] | null
	>(null);
	const [isIndexSearching, setIsIndexSearching] = useState(false);
	const indexSearchVersion = useRef(0);

	// Load search scope from IndexedDB on mount
	useEffect(() => {
		BibleStorage.getPreference("searchScope", "all").then((scope) => {
			setSearchScope(scope as SearchScope);
		});
	}, []);

	// Defer the search scope for expensive computations while keeping UI responsive
	const deferredSearchScope = useDeferredValue(searchScope);

	// Persist search state to sessionStorage
	useEffect(() => {
		sessionStorage.setItem("searchKeyword", searchKeyword);
	}, [searchKeyword]);

	useEffect(() => {
		BibleStorage.savePreference("searchScope", searchScope);
	}, [searchScope]);

	// Run indexed search when the index is ready
	useEffect(() => {
		if (!isIndexReady || searchKeyword.length < 2) {
			setIndexedResults(null);
			return;
		}

		const version = ++indexSearchVersion.current;
		setIsIndexSearching(true);

		indexedSearch(searchKeyword, deferredSearchScope, currentBook)
			.then((results) => {
				// Only apply if this is still the latest search
				if (version === indexSearchVersion.current) {
					setIndexedResults(results);
				}
			})
			.catch((err) => {
				console.warn("Indexed search failed, falling back:", err);
				if (version === indexSearchVersion.current) {
					setIndexedResults(null);
				}
			})
			.finally(() => {
				if (version === indexSearchVersion.current) {
					setIsIndexSearching(false);
				}
			});
	}, [isIndexReady, searchKeyword, deferredSearchScope, currentBook]);

	const updateSearchHistory = useCallback((keyword: string): void => {
		if (keyword.length > 1) {
			setSearchHistory((prev) => {
				const history = [keyword, ...prev];
				const uniqueHistory = [...new Set(history)];
				const trimmed = uniqueHistory.slice(0, 5);
				localStorage?.setItem("searchHistory", JSON.stringify(trimmed));
				return trimmed;
			});
		}
	}, []);

	const handleSearch = useMemo(
		() =>
			Debounce((e: React.ChangeEvent<HTMLInputElement>) => {
				const value = e.target.value;
				startTransition(() => {
					setSearchKeyword(value);
					updateSearchHistory(value);
				});
			}, 300),
		[updateSearchHistory]
	);

	const getBookResults = (
		keyword: string
	): Array<{
		book: string;
		chapter: string | null;
		verse: string | null;
	}> => {
		// Avoid listing every book when the input is empty
		if (!keyword.trim()) return [];

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
		return <Highlight highlight={keyword}>{text}</Highlight>;
	};

	// Use indexed results when available, otherwise fall back to brute-force
	const fallbackResults = useMemo(
		() =>
			isIndexReady
				? []
				: bruteForceSearch(searchKeyword, deferredSearchScope, currentBook),
		// Only include currentBook when scope is "book", otherwise it causes unnecessary re-searches
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			searchKeyword,
			deferredSearchScope,
			isIndexReady,
			deferredSearchScope === "book" ? currentBook : null,
		]
	);

	const results = isIndexReady && indexedResults ? indexedResults : fallbackResults;

	const bookResults = useMemo(
		() => getBookResults(searchKeyword),
		[searchKeyword]
	);

	const searching = isIndexReady ? isIndexSearching : isPending;

	return (
		<Modal
			opened={active}
			onClose={dismiss}
			size="lg"
			fullScreen
			transitionProps={{ transition: "fade" }}
			withCloseButton={false}
			styles={{
				content: {
					padding: 0,
					height: "100dvh",
					paddingTop: "env(safe-area-inset-top)",
					paddingBottom: "env(safe-area-inset-bottom)",
				},
				body: {
					padding: 0,
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
					height: "100%",
				},
			}}
		>
			<Group
				justify="space-between"
				px="md"
				py="lg"
				style={{
					borderBottom: "1px solid var(--mantine-color-gray-2)",
					flexShrink: 0,
				}}
			>
				<TextInput
					placeholder="Search the Bible..."
					onChange={handleSearch}
					autoFocus
					style={{ flex: 1 }}
					variant="unstyled"
					size="md"
				/>
				<ActionIcon
					variant="transparent"
					size="lg"
					onClick={dismiss}
					aria-label="Close search"
				>
					<IconX size={20} />
				</ActionIcon>
			</Group>

			<Box
				style={{
					display: "flex",
					flexDirection: "column",
					flex: 1,
					overflow: "hidden",
				}}
			>
				{/* Search Scope Selector */}
				<Box px="md" pt="md" style={{ flexShrink: 0 }}>
					<SegmentedControl
						value={searchScope}
						onChange={(value) => setSearchScope(value as SearchScope)}
						data={[
							{ label: "All", value: "all" },
							{
								label: currentBook?.book || "Book",
								value: "book",
								disabled: !currentBook,
							},
							{ label: "Old", value: "old" },
							{ label: "New", value: "new" },
						]}
						fullWidth
						size="sm"
					/>
				</Box>

				{searching && searchKeyword.length > 1 && (
					<Group justify="center" p="md" style={{ flexShrink: 0 }}>
						<Loader size="sm" />
						<Text size="sm" c="dimmed">
							Searching...
						</Text>
					</Group>
				)}

				{/* Book Results */}
				{!searching && bookResults.length > 0 && (
					<Stack gap="xs" style={{ flexShrink: 0 }}>
						{bookResults.map((result, i) => {
							let link = "/" + result.book.toLowerCase().replace(/\s+/g, "-");
							if (result.chapter) {
								if (result.verse) {
									link += `?highlight=${result.chapter}:${result.verse}#${result.chapter}:${result.verse}`;
								} else {
									link += `#${result.chapter}`;
								}
							}

							return (
								<Link
									key={`book-result-${i}`}
									href={link}
									onClick={dismiss}
									style={{ textDecoration: "none" }}
								>
									<Box
										p="sm"
										style={{
											borderRadius: "var(--mantine-radius-sm)",
											backgroundColor: "var(--mantine-color-blue-0)",
											cursor: "pointer",
											transition: "background-color 0.2s",
										}}
										onMouseEnter={(e) =>
											(e.currentTarget.style.backgroundColor =
												"var(--mantine-color-blue-1)")
										}
										onMouseLeave={(e) =>
											(e.currentTarget.style.backgroundColor =
												"var(--mantine-color-blue-0)")
										}
									>
										<Text size="sm" fw={600}>
											{result.book}
											{result.chapter && ` ${result.chapter}`}
											{result.verse && `:${result.verse}`}
										</Text>
									</Box>
								</Link>
							);
						})}
					</Stack>
				)}

				{/* Search Results Count */}
				{!searching && searchKeyword.length > 1 && (
					<Text
						size="sm"
						c="dimmed"
						px="md"
						pt="md"
						mb="md"
						style={{ flexShrink: 0 }}
					>
						{results.length} result{results.length !== 1 ? "s" : ""} for &quot;
						{searchKeyword}&quot;
					</Text>
				)}

				{/* Search Results - Virtualized */}
				{!searching && results.length > 0 && (
					<Box style={{ flex: 1, minHeight: 0, position: "relative" }}>
						<Box
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								right: 0,
								bottom: 0,
							}}
						>
							<Virtuoso
								data={results}
								itemContent={(index, result) => {
									const link = `/${result.book
										.toLowerCase()
										.replace(/\s+/g, "-")}?highlight=${result.chapter}:${
										result.verse
									}#${result.chapter}:${result.verse}`;

									return (
										<Box px="md" key={`result-${index}`}>
											<Link
												href={link}
												onClick={dismiss}
												style={{ textDecoration: "none", display: "block" }}
											>
												<Box
													p="md"
													mb="md"
													style={{
														borderRadius: "var(--mantine-radius-sm)",
														border: "1px solid var(--mantine-color-gray-2)",
														cursor: "pointer",
														transition: "border-color 0.2s",
													}}
													onMouseEnter={(e) =>
														(e.currentTarget.style.borderColor =
															"var(--mantine-color-gray-4)")
													}
													onMouseLeave={(e) =>
														(e.currentTarget.style.borderColor =
															"var(--mantine-color-gray-2)")
													}
												>
													<Group justify="space-between" mb="xs">
														<Text size="sm" fw={500}>
															{result.book} {result.chapter}:{result.verse}
														</Text>
													</Group>
													<Text size="sm" component="div">
														{highlightText(result.text, searchKeyword)}
													</Text>
												</Box>
											</Link>
										</Box>
									);
								}}
							/>
						</Box>
					</Box>
				)}

				{/* No Results Message */}
				{!searching &&
					searchKeyword.length > 1 &&
					results.length === 0 &&
					bookResults.length === 0 && (
						<Text ta="center" c="dimmed" py="xl">
							No results found for &quot;{searchKeyword}&quot;
						</Text>
					)}
			</Box>
		</Modal>
	);
}

export default memo(Search);
