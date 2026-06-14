"use client";

import styles from "./TopBlur.module.css";

/**
 * Progressive blur strip fixed to the top edge of the viewport.
 *
 * Stacks several `backdrop-filter` layers, each blurring more than the last and
 * masked to reveal its blur only from a threshold upward. Compositing the
 * layers produces a smooth ramp where text scrolls "out of focus" as it passes
 * behind the status bar / Dynamic Island. A final white wash fades the very top
 * so the area behind the island reads as clean.
 *
 * Mobile-only (see CSS) since it targets notch / Dynamic Island devices, and
 * relies on the safe-area inset to size the fully-blurred region.
 */
export default function TopBlur() {
	return (
		<div className={styles.container} aria-hidden="true">
			<div className={`${styles.layer} ${styles.layer1}`} />
			<div className={`${styles.layer} ${styles.layer2}`} />
			<div className={`${styles.layer} ${styles.layer3}`} />
			<div className={`${styles.layer} ${styles.layer4}`} />
			<div className={`${styles.layer} ${styles.layer5}`} />
			<div className={`${styles.layer} ${styles.layer6}`} />
			<div className={styles.wash} />
		</div>
	);
}
