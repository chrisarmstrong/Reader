#!/usr/bin/env node

/**
 * Build-time script to convert OpenBible.info cross-reference CSV data
 * into a compact JSON file keyed by the app's verse ID format.
 *
 * Source: https://github.com/shandran/openbible (cross_references_expanded.csv)
 * License: Creative Commons Attribution (OpenBible.info)
 *
 * Usage: node scripts/convertCrossRefs.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CSV_URL =
	"https://raw.githubusercontent.com/shandran/openbible/master/cross_references_expanded.csv";
const LOCAL_CSV = join(__dirname, "cross_references_expanded.csv");

// OSIS abbreviation → app display name (matches book.book in KJV JSON data files)
const osisToAppName = {
	Gen: "Genesis",
	Exod: "Exodus",
	Lev: "Leviticus",
	Num: "Numbers",
	Deut: "Deuteronomy",
	Josh: "Joshua",
	Judg: "Judges",
	Ruth: "Ruth",
	"1Sam": "I Samuel",
	"2Sam": "II Samuel",
	"1Kgs": "I Kings",
	"2Kgs": "II Kings",
	"1Chr": "I Chronicles",
	"2Chr": "II Chronicles",
	Ezra: "Ezra",
	Neh: "Nehemiah",
	Esth: "Esther",
	Job: "Job",
	Ps: "Psalms",
	Prov: "Proverbs",
	Eccl: "Ecclesiastes",
	Song: "Song of Solomon",
	Isa: "Isaiah",
	Jer: "Jeremiah",
	Lam: "Lamentations",
	Ezek: "Ezekiel",
	Dan: "Daniel",
	Hos: "Hosea",
	Joel: "Joel",
	Amos: "Amos",
	Obad: "Obadiah",
	Jonah: "Jonah",
	Mic: "Micah",
	Nah: "Nahum",
	Hab: "Habakkuk",
	Zeph: "Zephaniah",
	Hag: "Haggai",
	Zech: "Zechariah",
	Mal: "Malachi",
	Matt: "Matthew",
	Mark: "Mark",
	Luke: "Luke",
	John: "John",
	Acts: "Acts",
	Rom: "Romans",
	"1Cor": "I Corinthians",
	"2Cor": "II Corinthians",
	Gal: "Galatians",
	Eph: "Ephesians",
	Phil: "Philippians",
	Col: "Colossians",
	"1Thess": "I Thessalonians",
	"2Thess": "II Thessalonians",
	"1Tim": "I Timothy",
	"2Tim": "II Timothy",
	Titus: "Titus",
	Phlm: "Philemon",
	Heb: "Hebrews",
	Jas: "James",
	"1Pet": "I Peter",
	"2Pet": "II Peter",
	"1John": "I John",
	"2John": "II John",
	"3John": "III John",
	Jude: "Jude",
	Rev: "Revelation",
};

/**
 * Convert an OSIS reference like "Gen.1.1" to app verse ID like "Genesis-1:1".
 * For ranges like "Rev.16.8-Rev.16.9", uses the start verse.
 */
function osisToVerseId(osisRef) {
	// Handle ranges — take the start verse
	const ref = osisRef.includes("-") ? osisRef.split("-")[0] : osisRef;
	const parts = ref.split(".");
	if (parts.length !== 3) return null;
	const [osisBook, chapter, verse] = parts;
	const appBook = osisToAppName[osisBook];
	if (!appBook) return null;
	return `${appBook}-${chapter}:${verse}`;
}

async function main() {
	let csvText;
	if (existsSync(LOCAL_CSV)) {
		console.log("Reading local CSV...");
		csvText = readFileSync(LOCAL_CSV, "utf-8");
	} else {
		console.log("Fetching cross-reference CSV...");
		const response = await fetch(CSV_URL);
		if (!response.ok) {
			throw new Error(`Failed to fetch CSV: ${response.status}`);
		}
		csvText = await response.text();
	}

	const lines = csvText.split("\n");
	console.log(`Parsing ${lines.length - 1} rows...`);

	// Group: sourceVerseId → [{ target, votes }]
	const crossRefs = new Map();
	let skipped = 0;

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const cols = line.split(",");
		const fromOsis = cols[0]; // e.g., "Gen.1.1"
		const toOsis = cols[1]; // e.g., "Rev.21.6"
		const votes = parseInt(cols[2], 10) || 0;

		const fromId = osisToVerseId(fromOsis);
		const toId = osisToVerseId(toOsis);

		if (!fromId || !toId) {
			skipped++;
			continue;
		}

		if (!crossRefs.has(fromId)) {
			crossRefs.set(fromId, []);
		}
		crossRefs.get(fromId).push({ ref: toId, votes });
	}

	console.log(
		`Processed ${crossRefs.size} source verses, skipped ${skipped} invalid rows`
	);

	// Sort each verse's cross-references by votes descending, then extract just the ref IDs
	const output = {};
	for (const [sourceId, targets] of crossRefs) {
		targets.sort((a, b) => b.votes - a.votes);
		output[sourceId] = targets.map((t) => t.ref);
	}

	const outputPath = join(__dirname, "..", "data", "crossRefs.json");
	writeFileSync(outputPath, JSON.stringify(output));

	const sizeMB = (Buffer.byteLength(JSON.stringify(output)) / 1024 / 1024).toFixed(1);
	console.log(`Written to ${outputPath} (${sizeMB} MB)`);

	// Spot-check
	const gen1 = output["Genesis-1:1"];
	if (gen1) {
		console.log(`\nSpot-check Genesis 1:1 → top 5 refs:`);
		gen1.slice(0, 5).forEach((ref) => console.log(`  ${ref}`));
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
