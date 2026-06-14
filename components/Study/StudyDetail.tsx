"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
	IconArrowLeft,
	IconChevronUp,
	IconChevronDown,
	IconTrash,
	IconPlus,
} from "@tabler/icons-react";
import styles from "./Study.module.css";
import BibleStorage from "../../utils/BibleStorage";
import type { Study, StudyItem } from "../../types/bible";

interface StudyDetailProps {
	study: Study;
	onBack: () => void;
	onChange: (study: Study) => void;
	onNavigate: () => void;
}

export default function StudyDetail({
	study: initialStudy,
	onBack,
	onChange,
	onNavigate,
}: StudyDetailProps) {
	const [study, setStudy] = useState<Study>(initialStudy);
	const studyRef = useRef(study);
	studyRef.current = study;

	// Persist the latest study to IndexedDB and notify the parent list.
	const persist = useCallback(
		async (next: Study) => {
			try {
				const saved = await BibleStorage.saveStudy(next);
				onChange(saved);
			} catch (error) {
				console.error("Failed to save study:", error);
			}
		},
		[onChange]
	);

	// Save any pending edits when leaving the detail view.
	useEffect(() => {
		return () => {
			persist(studyRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const updateField = (field: "title" | "description", value: string) => {
		setStudy((prev) => ({ ...prev, [field]: value }));
	};

	const updateCommentary = (
		id: string,
		field: "heading" | "body",
		value: string
	) => {
		setStudy((prev) => ({
			...prev,
			items: prev.items.map((item) =>
				item.id === id && item.type === "commentary"
					? { ...item, [field]: value }
					: item
			),
		}));
	};

	const moveItem = (index: number, direction: -1 | 1) => {
		const target = index + direction;
		if (target < 0 || target >= study.items.length) return;
		const items = [...study.items];
		[items[index], items[target]] = [items[target], items[index]];
		const next = { ...study, items };
		setStudy(next);
		persist(next);
	};

	const removeItem = (id: string) => {
		const next = { ...study, items: study.items.filter((i) => i.id !== id) };
		setStudy(next);
		persist(next);
	};

	const addCommentary = () => {
		const item: StudyItem = {
			id: crypto.randomUUID(),
			type: "commentary",
			heading: "",
			body: "",
		};
		const next = { ...study, items: [...study.items, item] };
		setStudy(next);
		persist(next);
	};

	return (
		<>
			<div className={styles.header}>
				<button
					className={styles.iconButton}
					onPointerUp={(e) => {
						e.preventDefault();
						persist(studyRef.current);
						onBack();
					}}
					aria-label="Back to studies"
				>
					<IconArrowLeft size={24} />
				</button>
				<span className={styles.count}>
					{study.items.length}{" "}
					{study.items.length === 1 ? "item" : "items"}
				</span>
			</div>

			<div className={styles.content}>
				<input
					className={styles.titleInput}
					value={study.title}
					placeholder="Study title"
					onChange={(e) => updateField("title", e.target.value)}
					onBlur={() => persist(studyRef.current)}
				/>
				<textarea
					className={styles.descriptionInput}
					value={study.description ?? ""}
					placeholder="Add a description…"
					rows={2}
					onChange={(e) => updateField("description", e.target.value)}
					onBlur={() => persist(studyRef.current)}
				/>

				<div className={styles.itemsList}>
					{study.items.map((item, index) => (
						<div className={styles.itemCard} key={item.id}>
							<div className={styles.itemControls}>
								<button
									className={styles.controlButton}
									disabled={index === 0}
									onPointerUp={(e) => {
										e.preventDefault();
										moveItem(index, -1);
									}}
									aria-label="Move up"
								>
									<IconChevronUp size={18} />
								</button>
								<button
									className={styles.controlButton}
									disabled={index === study.items.length - 1}
									onPointerUp={(e) => {
										e.preventDefault();
										moveItem(index, 1);
									}}
									aria-label="Move down"
								>
									<IconChevronDown size={18} />
								</button>
								<button
									className={styles.controlButton}
									onPointerUp={(e) => {
										e.preventDefault();
										removeItem(item.id);
									}}
									aria-label="Remove item"
								>
									<IconTrash size={18} />
								</button>
							</div>

							{item.type === "verse" ? (
								<Link
									href={`/${item.book
										.toLowerCase()
										.replace(/\s+/g, "-")}?highlight=${item.chapter}:${
										item.verse
									}#${item.chapter}:${item.verse}`}
									className={styles.verseLink}
									onClick={onNavigate}
								>
									<span className={styles.verseReference}>
										{item.book} {item.chapter}:{item.verse}
									</span>
									<p className={styles.verseText}>{item.text}</p>
								</Link>
							) : (
								<>
									<input
										className={styles.commentaryHeading}
										value={item.heading ?? ""}
										placeholder="Heading (optional)"
										onChange={(e) =>
											updateCommentary(item.id, "heading", e.target.value)
										}
										onBlur={() => persist(studyRef.current)}
									/>
									<textarea
										className={styles.commentaryBody}
										value={item.body}
										placeholder="Write your commentary…"
										rows={3}
										onChange={(e) =>
											updateCommentary(item.id, "body", e.target.value)
										}
										onBlur={() => persist(studyRef.current)}
									/>
								</>
							)}
						</div>
					))}

					<button
						className={styles.addBlockButton}
						onPointerUp={(e) => {
							e.preventDefault();
							addCommentary();
						}}
					>
						<IconPlus size={18} />
						<span>Add commentary block</span>
					</button>
				</div>
			</div>
		</>
	);
}
