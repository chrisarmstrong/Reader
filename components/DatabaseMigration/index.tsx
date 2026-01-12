"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./DatabaseMigration.module.css";
import {
	migrateBibleStorage,
	type MigrationResult,
} from "../../utils/migrateBibleStorage";

export default function DatabaseMigration() {
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<MigrationResult | null>(null);
	const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
	const [updateStatus, setUpdateStatus] = useState<string | null>(null);

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

	const handleCheckForUpdates = async () => {
		setIsCheckingUpdates(true);
		setUpdateStatus(null);

		try {
			// Check if service worker is registered
			if (!("serviceWorker" in navigator)) {
				setUpdateStatus("Service worker not supported in this browser");
				setIsCheckingUpdates(false);
				return;
			}

			const registration = await navigator.serviceWorker.getRegistration();
			if (!registration) {
				setUpdateStatus("Service worker not registered");
				setIsCheckingUpdates(false);
				return;
			}

			setUpdateStatus("Checking for updates...");

			// Force check for updates
			await registration.update();

			// Check if there's a waiting service worker (new version ready)
			if (registration.waiting) {
				setUpdateStatus("Update found! Installing...");
				// Tell the waiting service worker to take over
				registration.waiting.postMessage({ type: "SKIP_WAITING" });

				// Listen for the controlling service worker to change
				navigator.serviceWorker.addEventListener("controllerchange", () => {
					setUpdateStatus("Update installed! Reloading...");
					setTimeout(() => {
						window.location.reload();
					}, 1000);
				});
			} else if (registration.installing) {
				setUpdateStatus("Update found! Installing...");
				// Wait for the installing worker to become waiting
				registration.installing.addEventListener("statechange", (e: Event) => {
					const target = e.target as ServiceWorker;
					if (target.state === "installed") {
						if (navigator.serviceWorker.controller) {
							setUpdateStatus("Update installed! Reloading...");
							setTimeout(() => {
								window.location.reload();
							}, 1000);
						}
					}
				});
			} else {
				setUpdateStatus("You're running the latest version!");
			}
		} catch (error) {
			setUpdateStatus(
				`Error checking for updates: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		} finally {
			setIsCheckingUpdates(false);
		}
	};

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<Link href="/" className={styles.backButton}>
					← Back to Reader
				</Link>
				<h1 className={styles.title}>App Updates</h1>

				<div className={styles.section}>
					<h2 className={styles.sectionTitle}>Check for Updates</h2>
					<div className={styles.info}>
						<p>
							Check if a new version of the app is available and install it
							without losing your bookmarks or reading position.
						</p>
					</div>

					<button
						className={styles.upgradeButton}
						onPointerUp={(e) => {
							e.preventDefault();
							handleCheckForUpdates();
						}}
						disabled={isCheckingUpdates}
					>
						{isCheckingUpdates ? "Checking..." : "Check for Updates"}
					</button>

					{updateStatus && (
						<div className={styles.updateStatus}>
							<p>{updateStatus}</p>
						</div>
					)}
				</div>

				<div className={styles.section}>
					<h2 className={styles.sectionTitle}>Database Upgrade</h2>
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
											Right-click &quot;BibleReaderDB&quot; and select
											&quot;Delete database&quot;
										</li>
										<li>Refresh the page</li>
									</ol>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
