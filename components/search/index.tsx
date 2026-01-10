"use client";

import { memo, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
	Modal,
	TextInput,
	Stack,
	Group,
	Text,
	ActionIcon,
	Highlight,
	Box,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
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

function Search({ active, dismiss }: SearchProps) {
	const [searchKeyword, setSearchKeyword] = useState<string>("");
	const [searchHistory, setSearchHistory] = useState<string[]>([]);

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
				setSearchKeyword(e.target.value);
				updateSearchHistory(e.target.value);
			}, 500),
		[updateSearchHistory]
	);

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
		return (
			<Highlight highlight={keyword} weight={700} size="sm">
				{text}
			</Highlight>
		);
	};

	const results = useMemo(() => getResults(searchKeyword), [searchKeyword]);
	const bookResults = useMemo(
		() => getBookResults(searchKeyword),
		[searchKeyword]
	);

	return (
		<Modal
			opened={active}
			onClose={dismiss}
			size="lg"
			fullScreen
			withCloseButton={false}
			styles={{
				content: { padding: 0 },
				body: {
					padding: 0,
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
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

			<Stack gap="md" p="md" style={{ overflow: "auto", flex: 1 }}>
				{/* Book Results */}
				{bookResults.length > 0 && (
					<Stack gap="xs">
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
				{searchKeyword.length > 1 && (
					<Text size="sm" c="dimmed">
						{results.length} result{results.length !== 1 ? "s" : ""}
					</Text>
				)}

				{/* Search Results */}
				<Stack gap="md">
					{results.map((result, i) => {
						const link = `/${result.book
							.toLowerCase()
							.replace(/\s+/g, "-")}?highlight=${result.chapter}:${
							result.verse
						}#${result.chapter}:${result.verse}`;

						return (
							<Link
								key={`result-${i}`}
								href={link}
								onClick={dismiss}
								style={{ textDecoration: "none" }}
							>
								<Box
									p="md"
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
									<Text size="sm" lineClamp={2}>
										{highlightText(result.text, searchKeyword)}
									</Text>
								</Box>
							</Link>
						);
					})}
				</Stack>

				{/* No Results Message */}
				{searchKeyword.length > 1 &&
					results.length === 0 &&
					bookResults.length === 0 && (
						<Text ta="center" c="dimmed" py="xl">
							No results found for &quot;{searchKeyword}&quot;
						</Text>
					)}
			</Stack>
		</Modal>
	);
}

export default memo(Search);
