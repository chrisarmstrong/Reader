"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
	Modal,
	TextInput,
	Group,
	Text,
	ActionIcon,
	Highlight,
	Box,
	Loader,
	SegmentedControl,
} from "@mantine/core";
import { Virtuoso } from "react-virtuoso";
import { IconX, IconCheck, IconPlus } from "@tabler/icons-react";
import Debounce from "../../utils/Debounce";
import BibleStorage from "../../utils/BibleStorage";
import {
	indexedSearch,
	bruteForceSearch,
	type SearchScope,
	type VerseSearchResult,
} from "../../utils/searchVerses";

interface StudySearchProps {
	active: boolean;
	dismiss: () => void;
	// Refs ("Book-chapter:verse") already in the study, so rows can show their state
	existingRefs: Set<string>;
	onToggleVerse: (verse: VerseSearchResult, isAdded: boolean) => void;
}

const refOf = (v: { book: string; chapter: string; verse: string }) =>
	`${v.book}-${v.chapter}:${v.verse}`;

export default function StudySearch({
	active,
	dismiss,
	existingRefs,
	onToggleVerse,
}: StudySearchProps) {
	const [keyword, setKeyword] = useState("");
	const [scope, setScope] = useState<SearchScope>("all");
	const [results, setResults] = useState<VerseSearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isIndexReady, setIsIndexReady] = useState(false);
	const searchVersion = useRef(0);

	// Reset transient state and check whether the search index is seeded
	useEffect(() => {
		if (!active) {
			setKeyword("");
			setResults([]);
			return;
		}
		BibleStorage.getVerseCount()
			.then((count) => setIsIndexReady(count > 0))
			.catch(() => setIsIndexReady(false));
	}, [active]);

	// Run the search whenever the keyword or scope changes
	useEffect(() => {
		if (keyword.length < 2) {
			setResults([]);
			setIsSearching(false);
			return;
		}

		const version = ++searchVersion.current;
		setIsSearching(true);

		const run = async (): Promise<VerseSearchResult[]> => {
			if (isIndexReady) {
				try {
					return await indexedSearch(keyword, scope);
				} catch (error) {
					console.warn("Indexed search failed, falling back:", error);
				}
			}
			return bruteForceSearch(keyword, scope);
		};

		run()
			.then((found) => {
				if (version === searchVersion.current) setResults(found);
			})
			.finally(() => {
				if (version === searchVersion.current) setIsSearching(false);
			});
	}, [keyword, scope, isIndexReady]);

	const handleInput = useMemo(
		() =>
			Debounce((e: React.ChangeEvent<HTMLInputElement>) => {
				setKeyword(e.target.value);
			}, 300),
		[]
	);

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
					placeholder="Search for verses to add…"
					onChange={handleInput}
					autoFocus
					style={{ flex: 1 }}
					variant="unstyled"
					size="md"
				/>
				<ActionIcon
					variant="transparent"
					size="lg"
					onClick={dismiss}
					aria-label="Done"
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
				<Box px="md" pt="md" style={{ flexShrink: 0 }}>
					<SegmentedControl
						value={scope}
						onChange={(value) => setScope(value as SearchScope)}
						data={[
							{ label: "All", value: "all" },
							{ label: "Old", value: "old" },
							{ label: "New", value: "new" },
						]}
						fullWidth
						size="sm"
					/>
				</Box>

				{isSearching && keyword.length > 1 && (
					<Group justify="center" p="md" style={{ flexShrink: 0 }}>
						<Loader size="sm" />
						<Text size="sm" c="dimmed">
							Searching…
						</Text>
					</Group>
				)}

				{!isSearching && keyword.length > 1 && (
					<Text
						size="sm"
						c="dimmed"
						px="md"
						pt="md"
						mb="md"
						style={{ flexShrink: 0 }}
					>
						{results.length} result{results.length !== 1 ? "s" : ""} for &quot;
						{keyword}&quot;
					</Text>
				)}

				{!isSearching && results.length > 0 && (
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
									const added = existingRefs.has(refOf(result));
									return (
										<Box px="md" key={`result-${index}`}>
											<Box
												p="md"
												mb="md"
												onClick={() => onToggleVerse(result, added)}
												style={{
													borderRadius: "var(--mantine-radius-sm)",
													border: added
														? "1px solid var(--mantine-color-green-4)"
														: "1px solid var(--mantine-color-gray-2)",
													backgroundColor: added
														? "var(--mantine-color-green-0)"
														: undefined,
													cursor: "pointer",
													transition: "border-color 0.2s",
												}}
											>
												<Group justify="space-between" mb="xs" wrap="nowrap">
													<Text size="sm" fw={500}>
														{result.book} {result.chapter}:{result.verse}
													</Text>
													{added ? (
														<IconCheck
															size={18}
															color="var(--mantine-color-green-6)"
														/>
													) : (
														<IconPlus size={18} opacity={0.4} />
													)}
												</Group>
												<Text size="sm" component="div">
													<Highlight highlight={keyword}>
														{result.text}
													</Highlight>
												</Text>
											</Box>
										</Box>
									);
								}}
							/>
						</Box>
					</Box>
				)}

				{!isSearching && keyword.length > 1 && results.length === 0 && (
					<Text ta="center" c="dimmed" py="xl">
						No results found for &quot;{keyword}&quot;
					</Text>
				)}
			</Box>
		</Modal>
	);
}
