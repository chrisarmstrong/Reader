"use client";

import { useState } from "react";
import styles from "./DatabaseMigration.module.css";
import {
	migrateBibleStorage,
	type MigrationResult,
} from "../../utils/migrateBibleStorage";

export default function DatabaseMigration() {
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<MigrationResult | null>(null);

	const handleMigrate = async () => {
		setIsLoading(true);
		setResult(null);

		try {
			const migrationResult = await migrateBibleStorage();
			setResult(migrationResult);

			if (migrationResult.success) {
				// Reload the page after a short delay to use the new database
				setTimeout(() => {
					window.location.href = "/";
				}, 2000);
			}
		} catch (error) {
			setResult({
				success: false,
				message: "Unexpected error during migration",
				error: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<h1 className={styles.title}>Database Upgrade</h1>

				<div className={styles.info}>
					<p>
						A database upgrade is required to enable new features like
						bookmarks.
					</p>
					<p>
						Your reading position and preferences will be preserved during the
						upgrade.
					</p>
				</div>

				{!result && (
					<button
						className={styles.upgradeButton}
						onPointerUp={(e) => {
							e.preventDefault();
							handleMigrate();
						}}
						disabled={isLoading}
					>
						{isLoading ? "Upgrading..." : "Upgrade Database"}
					</button>
				)}

				{result && (
					<div
						className={`${styles.result} ${
							result.success ? styles.success : styles.error
						}`}
					>
						<p className={styles.resultMessage}>{result.message}</p>

						{result.success && (
							<p className={styles.redirect}>Redirecting to home page...</p>
						)}

						{result.error && (
							<details className={styles.errorDetails}>
								<summary>Error details</summary>
								<pre>{result.error}</pre>
							</details>
						)}

						{!result.success && (
							<div className={styles.manualSteps}>
								<h3>Manual Fix</h3>
								<ol>
									<li>Open browser DevTools (F12)</li>
									<li>Go to Application → Storage → IndexedDB</li>
									<li>
										Right-click "BibleReaderDB" and select "Delete database"
									</li>
									<li>Refresh the page</li>
								</ol>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
