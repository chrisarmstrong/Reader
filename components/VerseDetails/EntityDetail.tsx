"use client";

import { useState, useEffect, type ReactNode } from "react";
import { IconArrowLeft, IconUser, IconMapPin } from "@tabler/icons-react";
import Link from "next/link";
import styles from "./VerseDetails.module.css";
import type {
	BibleEntity,
	CrossReference,
	EntityFamilyMember,
} from "../../types/bible";
import { getEntityVerseRefs, getEntityBySlug } from "../../utils/getEntities";

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

type Tab = "about" | "verses" | "family";

interface EntityDetailProps {
	entity: BibleEntity;
	onBack: () => void;
	onClose: () => void;
	onEntitySelect: (entity: BibleEntity) => void;
}

export default function EntityDetail({
	entity,
	onBack,
	onClose,
	onEntitySelect,
}: EntityDetailProps) {
	const [verseRefs, setVerseRefs] = useState<CrossReference[]>([]);
	const [visibleRefs, setVisibleRefs] = useState(10);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<Tab>("verses");

	const isPerson = entity.type === "person";
	const hasFamily =
		isPerson &&
		entity.family &&
		Object.keys(entity.family).length > 0;
	const hasDescription = !!entity.description;

	useEffect(() => {
		setLoading(true);
		setVisibleRefs(10);
		setActiveTab("verses");
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

	const handleFamilyMemberTap = async (member: EntityFamilyMember) => {
		const memberEntity = await getEntityBySlug(member.slug);
		if (memberEntity) {
			onEntitySelect(memberEntity);
		}
	};

	const tabs: { key: Tab; label: string; show: boolean }[] = [
		{ key: "about", label: "About", show: hasDescription },
		{ key: "verses", label: "Verses", show: true },
		{ key: "family", label: "Family", show: !!hasFamily },
	];
	const visibleTabs = tabs.filter((t) => t.show);

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
					<div className={styles.entityDetailTitleText}>
						<h3 className={styles.entityName}>{entity.name}</h3>
						<span className={styles.entityMeta}>
							{isPerson
								? [
										entity.gender,
										entity.alsoCalled
											? `Also: ${entity.alsoCalled}`
											: "",
									]
										.filter(Boolean)
										.join(" \u00B7 ")
								: [entity.featureType]
										.filter(Boolean)
										.join(" \u00B7 ")}
						</span>
					</div>
				</div>
			</div>

			{visibleTabs.length > 1 && (
				<div className={styles.entityTabs}>
					{visibleTabs.map((tab) => (
						<button
							key={tab.key}
							className={`${styles.entityTab} ${activeTab === tab.key ? styles.entityTabActive : ""}`}
							onPointerUp={(e) => {
								e.preventDefault();
								setActiveTab(tab.key);
							}}
						>
							{tab.label}
						</button>
					))}
				</div>
			)}

			{activeTab === "about" && entity.description && (
				<div className={styles.entityTabContent}>
					<p className={styles.entityDescription}>
						{renderLinkedText(entity.description, onClose)}
					</p>
				</div>
			)}

			{activeTab === "verses" && (
				<div className={styles.entityTabContent}>
					<h4 className={styles.crossRefsTitle}>
						Mentioned in {entity.verseCount || verseRefs.length}{" "}
						verse
						{(entity.verseCount || verseRefs.length) !== 1
							? "s"
							: ""}
					</h4>
					{loading ? (
						<p className={styles.entityMeta}>Loading verses...</p>
					) : (
						<>
							<div className={styles.crossRefsList}>
								{verseRefs
									.slice(0, visibleRefs)
									.map((ref) => (
										<Link
											key={ref.verseId}
											href={`/${ref.book.toLowerCase().replace(/\s+/g, "-")}#${ref.chapter}:${ref.verse}`}
											className={styles.crossRefLink}
											onClick={onClose}
										>
											<span
												className={
													styles.crossRefReference
												}
											>
												{ref.book} {ref.chapter}:
												{ref.verse}
											</span>
											{ref.text && (
												<span
													className={
														styles.crossRefText
													}
												>
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
									Show more (
									{verseRefs.length - visibleRefs} remaining)
								</button>
							)}
						</>
					)}
				</div>
			)}

			{activeTab === "family" && entity.family && (
				<div className={styles.entityTabContent}>
					{entity.family.father && (
						<FamilyGroup
							label="Father"
							members={entity.family.father}
							onTap={handleFamilyMemberTap}
						/>
					)}
					{entity.family.mother && (
						<FamilyGroup
							label="Mother"
							members={entity.family.mother}
							onTap={handleFamilyMemberTap}
						/>
					)}
					{entity.family.partners && (
						<FamilyGroup
							label={
								entity.family.partners.length > 1
									? "Spouses"
									: "Spouse"
							}
							members={entity.family.partners}
							onTap={handleFamilyMemberTap}
						/>
					)}
					{entity.family.siblings && (
						<FamilyGroup
							label="Siblings"
							members={entity.family.siblings}
							onTap={handleFamilyMemberTap}
						/>
					)}
					{entity.family.children && (
						<FamilyGroup
							label="Children"
							members={entity.family.children}
							onTap={handleFamilyMemberTap}
						/>
					)}
				</div>
			)}
		</div>
	);
}

function FamilyGroup({
	label,
	members,
	onTap,
}: {
	label: string;
	members: EntityFamilyMember[];
	onTap: (member: EntityFamilyMember) => void;
}) {
	return (
		<div className={styles.familyGroup}>
			<h4 className={styles.familyGroupLabel}>{label}</h4>
			<div className={styles.entityChips}>
				{members.map((member) => (
					<button
						key={member.slug}
						className={styles.entityChip}
						onPointerUp={(e) => {
							e.preventDefault();
							onTap(member);
						}}
					>
						<IconUser size={14} />
						<span>{member.name}</span>
					</button>
				))}
			</div>
		</div>
	);
}
