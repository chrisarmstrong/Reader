"use client";

import { useState, useEffect, type ReactNode } from "react";
import { IconArrowLeft, IconUser, IconMapPin } from "@tabler/icons-react";
import Link from "next/link";
import styles from "./VerseDetails.module.css";
import type { BibleEntity, CrossReference } from "../../types/bible";
import { getEntityVerseRefs } from "../../utils/getEntities";

/**
 * Parse markdown-style links in text and return React nodes.
 * Converts "[Gen. 2:8](/genesis#2:8)" into clickable Link components.
 */
function renderLinkedText(text: string, onNavigate: () => void): ReactNode[] {
	const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
	return parts.map((part, i) => {
		const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
		if (match) {
			return (
				<Link
					key={i}
					href={match[2]}
					className={styles.inlineVerseLink}
					onClick={onNavigate}
				>
					{match[1]}
				</Link>
			);
		}
		return part;
	});
}

interface EntityDetailProps {
	entity: BibleEntity;
	onBack: () => void;
	onClose: () => void;
}

export default function EntityDetail({
	entity,
	onBack,
	onClose,
}: EntityDetailProps) {
	const [verseRefs, setVerseRefs] = useState<CrossReference[]>([]);
	const [visibleRefs, setVisibleRefs] = useState(10);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		setVisibleRefs(10);
		getEntityVerseRefs(entity.slug)
			.then((refs) => {
				setVerseRefs(refs);
				setLoading(false);
			})
			.catch((error) => {
				console.error("Error loading entity verses:", error);
				setVerseRefs([]);
				setLoading(false);
			});
	}, [entity.slug]);

	const isPerson = entity.type === "person";

	return (
		<div>
			<div className={styles.entityDetailHeader}>
				<button
					className={styles.backButton}
					onPointerUp={(e) => {
						e.preventDefault();
						onBack();
					}}
					aria-label="Back"
				>
					<IconArrowLeft size={20} />
				</button>
				<div className={styles.entityDetailTitle}>
					<div className={styles.entityDetailIcon}>
						{isPerson ? (
							<IconUser size={20} />
						) : (
							<IconMapPin size={20} />
						)}
					</div>
					<div>
						<h3 className={styles.entityName}>{entity.name}</h3>
						<span className={styles.entityMeta}>
							{isPerson
								? [entity.gender, entity.alsoCalled ? `Also called: ${entity.alsoCalled}` : ""]
										.filter(Boolean)
										.join(" \u00B7 ")
								: [entity.featureType]
										.filter(Boolean)
										.join(" \u00B7 ")}
						</span>
					</div>
				</div>
			</div>

			{entity.description && (
				<p className={styles.entityDescription}>
					{renderLinkedText(entity.description, onClose)}
				</p>
			)}

			<div className={styles.crossRefsSection}>
				<h4 className={styles.crossRefsTitle}>
					Mentioned in {entity.verseCount || verseRefs.length} verse
					{(entity.verseCount || verseRefs.length) !== 1 ? "s" : ""}
				</h4>
				{loading ? (
					<p className={styles.entityMeta}>Loading verses...</p>
				) : (
					<>
						<div className={styles.crossRefsList}>
							{verseRefs.slice(0, visibleRefs).map((ref) => (
								<Link
									key={ref.verseId}
									href={`/${ref.book.toLowerCase().replace(/\s+/g, "-")}#${ref.chapter}:${ref.verse}`}
									className={styles.crossRefLink}
									onClick={onClose}
								>
									<span className={styles.crossRefReference}>
										{ref.book} {ref.chapter}:{ref.verse}
									</span>
									{ref.text && (
										<span className={styles.crossRefText}>
											{ref.text}
										</span>
									)}
								</Link>
							))}
						</div>
						{verseRefs.length > visibleRefs && (
							<button
								className={styles.showMoreButton}
								onClick={() =>
									setVisibleRefs((prev) => prev + 10)
								}
							>
								Show more ({verseRefs.length - visibleRefs}{" "}
								remaining)
							</button>
						)}
					</>
				)}
			</div>
		</div>
	);
}
