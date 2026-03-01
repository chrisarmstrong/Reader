/**
 * Scrolls to a specific Bible verse by chapter and verse number
 * @param chapter - The chapter number
 * @param verse - Optional verse number
 * @param behavior - Scroll behavior ('instant' or 'smooth')
 */
export function scrollToVerse(
	chapter: number,
	verse?: number,
	behavior: ScrollBehavior = "instant"
): void {
	const id = verse ? `${chapter}:${verse}` : chapter.toString();
	const element = document.getElementById(id);
	if (element) {
		element.scrollIntoView({ behavior, block: "center" });
	}
}
