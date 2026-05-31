declare module "hyphen/en" {
	export function hyphenateSync(text: string, options?: { hyphenChar?: string; minWordLength?: number }): string;
	export function hyphenate(text: string, options?: { hyphenChar?: string; minWordLength?: number }): Promise<string>;
}
