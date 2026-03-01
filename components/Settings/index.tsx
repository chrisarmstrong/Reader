"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Settings.module.css";
import BibleStorageInstance from "../../utils/BibleStorage";

export default function Settings() {
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [redLetterEnabled, setRedLetterEnabled] = useState(true);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);

	useEffect(() => {
		BibleStorageInstance.getPreference("redLetterEnabled", true).then(
			(val) => setRedLetterEnabled(val)
		);
	}, []);

	const handleRedLetterToggle = async () => {
		const newValue = !redLetterEnabled;
		setRedLetterEnabled(newValue);
		await BibleStorageInstance.savePreference("redLetterEnabled", newValue);
	};

	const handleExport = async () => {
		try {
			const json = await BibleStorageInstance.exportData();
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `bible-reader-data-${new Date().toISOString().slice(0, 10)}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			setStatusMessage("Data exported successfully");
		} catch {
			setStatusMessage("Export failed");
		}
	};

	const handleImportClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const result = await BibleStorageInstance.importData(text);
			setStatusMessage(
				`Imported ${result.bookmarks} bookmark${result.bookmarks !== 1 ? "s" : ""} and ${result.notes} note${result.notes !== 1 ? "s" : ""}`
			);
		} catch {
			setStatusMessage("Import failed — invalid file format");
		}

		// Reset file input so re-selecting the same file triggers onChange
		e.target.value = "";
	};

	return (
		<div className={styles.container}>
			<a
				className={styles.backLink}
				href="#"
				onClick={(e) => {
					e.preventDefault();
					router.back();
				}}
			>
				&larr; Back
			</a>

			<h1 className={styles.title}>Settings</h1>

			<div className={styles.section}>
				<h2 className={styles.sectionTitle}>Display</h2>
				<div className={styles.settingRow}>
					<span className={styles.settingLabel}>Red Letter</span>
					<span
						className={styles.toggleIndicator}
						data-enabled={redLetterEnabled}
						onClick={handleRedLetterToggle}
					/>
				</div>
			</div>

			<div className={styles.section}>
				<h2 className={styles.sectionTitle}>Data</h2>
				<button className={styles.button} onClick={handleExport}>
					Export Notes &amp; Bookmarks
				</button>
				<button className={styles.button} onClick={handleImportClick}>
					Import Notes &amp; Bookmarks
				</button>
				<input
					ref={fileInputRef}
					type="file"
					accept=".json"
					className={styles.fileInput}
					onChange={handleFileChange}
				/>
				{statusMessage && (
					<p className={styles.statusMessage}>{statusMessage}</p>
				)}
			</div>
		</div>
	);
}
