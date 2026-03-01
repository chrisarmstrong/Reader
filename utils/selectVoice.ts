// Shared voice selection for Web Speech API
// Returns the best available English voice, or null to use the browser default.

export function selectVoice(
	voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
	if (!voices.length) return null;

	const lower = (s?: string) => s?.toLowerCase() ?? "";
	const isEnglish = (v: SpeechSynthesisVoice) =>
		lower(v.lang).startsWith("en");
	const englishVoices = voices.filter(isEnglish);
	const byName = (list: SpeechSynthesisVoice[], substr: string) =>
		list.find((v) => lower(v.name).includes(substr.toLowerCase()));

	// If the browser default is already English, don't override — the system
	// default is typically the highest-quality voice the OS offers.
	const defaultVoice = voices.find((v) => v.default);
	if (defaultVoice && isEnglish(defaultVoice)) return null;

	// Otherwise pick the best English voice we can find.
	// Priority: Premium → Enhanced → Siri → first English → first available
	const premium =
		byName(englishVoices, "premium") || byName(voices, "premium");
	if (premium) return premium;
	const enhanced =
		byName(englishVoices, "enhanced") || byName(voices, "enhanced");
	if (enhanced) return enhanced;
	const siri = byName(englishVoices, "siri") || byName(voices, "siri");
	if (siri) return siri;

	return englishVoices[0] || voices[0] || null;
}

// Helper: resolve a voice with retry/polling for browsers that load voices async.
export function loadVoice(
	onVoice: (voice: SpeechSynthesisVoice | null) => void
): () => void {
	const assign = () => {
		const voices = window.speechSynthesis.getVoices();
		if (voices && voices.length) {
			onVoice(selectVoice(voices));
			return true;
		}
		return false;
	};

	// Try immediately
	if (!assign()) {
		let retries = 0;
		const poll = () => {
			if (assign()) return;
			if (retries++ < 12) setTimeout(poll, 250);
		};
		poll();
	}

	const handler = () => assign();
	window.speechSynthesis.addEventListener("voiceschanged", handler);
	return () =>
		window.speechSynthesis.removeEventListener("voiceschanged", handler);
}
