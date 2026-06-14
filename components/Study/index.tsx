"use client";

import { useState, useEffect } from "react";
import {
	IconX,
	IconPlus,
	IconNotebook,
	IconChevronRight,
	IconTrash,
} from "@tabler/icons-react";
import styles from "./Study.module.css";
import BibleStorage from "../../utils/BibleStorage";
import type { Study } from "../../types/bible";
import StudyDetail from "./StudyDetail";

interface StudyProps {
	active: boolean;
	dismiss: () => void;
}

export default function StudyOverlay({ active, dismiss }: StudyProps) {
	const [studies, setStudies] = useState<Study[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	useEffect(() => {
		if (active) {
			loadStudies();
		} else {
			setSelectedId(null);
		}
	}, [active]);

	const loadStudies = async () => {
		setIsLoading(true);
		try {
			const all = await BibleStorage.getAllStudies();
			setStudies(all);
		} catch (error) {
			console.error("Failed to load studies:", error);
			setStudies([]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCreate = async () => {
		try {
			const study = await BibleStorage.createStudy("Untitled study");
			setStudies((prev) => [study, ...prev]);
			setSelectedId(study.id);
		} catch (error) {
			console.error("Failed to create study:", error);
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await BibleStorage.deleteStudy(id);
			setStudies((prev) => prev.filter((s) => s.id !== id));
		} catch (error) {
			console.error("Failed to delete study:", error);
		}
	};

	// Keep the list in sync when the detail view edits a study.
	const handleStudyChange = (updated: Study) => {
		setStudies((prev) => {
			const next = prev.map((s) => (s.id === updated.id ? updated : s));
			// Re-sort by updatedAt descending to mirror storage ordering.
			return next.sort((a, b) => b.updatedAt - a.updatedAt);
		});
	};

	const formatMeta = (study: Study) => {
		const verseCount = study.items.filter((i) => i.type === "verse").length;
		const noteCount = study.items.filter((i) => i.type === "commentary").length;
		const parts: string[] = [];
		parts.push(`${verseCount} verse${verseCount !== 1 ? "s" : ""}`);
		if (noteCount > 0) {
			parts.push(`${noteCount} note${noteCount !== 1 ? "s" : ""}`);
		}
		return parts.join(" · ");
	};

	if (!active) return null;

	const selected = selectedId
		? studies.find((s) => s.id === selectedId) ?? null
		: null;

	if (selected) {
		return (
			<div className={styles.container} data-active={active}>
				<StudyDetail
					key={selected.id}
					study={selected}
					onBack={() => setSelectedId(null)}
					onChange={handleStudyChange}
					onNavigate={dismiss}
				/>
			</div>
		);
	}

	return (
		<div className={styles.container} data-active={active}>
			<div className={styles.header}>
				<h1>Studies</h1>
				{studies.length > 0 && (
					<span className={styles.count}>{studies.length}</span>
				)}
				<button
					className={`${styles.iconButton} ${styles.closeButton}`}
					onPointerUp={(e) => {
						e.preventDefault();
						dismiss();
					}}
					aria-label="Close"
				>
					<IconX size={24} />
				</button>
			</div>

			<button
				className={styles.newButton}
				onPointerUp={(e) => {
					e.preventDefault();
					handleCreate();
				}}
			>
				<IconPlus size={20} />
				<span>New study</span>
			</button>

			<div className={styles.content}>
				{isLoading ? (
					<div className={styles.loading}>Loading studies…</div>
				) : studies.length === 0 ? (
					<div className={styles.empty}>
						<IconNotebook size={48} opacity={0.3} />
						<p>No studies yet</p>
						<p className={styles.emptyHint}>
							Create a study to gather verses around a theme — like Jesus&apos;
							life in order, or people named John — and add your own commentary.
						</p>
					</div>
				) : (
					studies.map((study) => (
						<div className={styles.studyItem} key={study.id}>
							<button
								className={styles.studyLink}
								onPointerUp={(e) => {
									e.preventDefault();
									setSelectedId(study.id);
								}}
							>
								<div className={styles.studyTitle}>{study.title}</div>
								<div className={styles.studyMeta}>{formatMeta(study)}</div>
							</button>
							<button
								className={styles.removeButton}
								onPointerUp={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleDelete(study.id);
								}}
								aria-label="Delete study"
							>
								<IconTrash size={20} />
							</button>
							<IconChevronRight size={20} opacity={0.25} />
						</div>
					))
				)}
			</div>
		</div>
	);
}
