import type { PreparedTextWithSegments } from "@chenglou/pretext";

type PretextModule = typeof import("@chenglou/pretext");

let cachedModule: PretextModule | null = null;
let loadPromise: Promise<PretextModule> | null = null;

export async function loadPretext(): Promise<PretextModule> {
	if (cachedModule) return cachedModule;
	if (!loadPromise) {
		loadPromise = import("@chenglou/pretext").then((mod) => {
			cachedModule = mod;
			return mod;
		});
	}
	return loadPromise;
}

export async function awaitFont(fontShorthand: string): Promise<boolean> {
	try {
		await document.fonts.load(fontShorthand);
		return document.fonts.check(fontShorthand);
	} catch {
		return false;
	}
}

export function readContainerFont(el: HTMLElement): string {
	const style = getComputedStyle(el);
	return style.font;
}

export function measureSpaceWidth(font: string): number {
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) return 4;
	ctx.font = font;
	return ctx.measureText(" ").width;
}

export type { PreparedTextWithSegments, PretextModule };
