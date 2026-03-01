#!/usr/bin/env node

/**
 * Build-time script to extract structural data from a KJV OSIS XML file
 * and inject it into the app's per-book JSON data files:
 *
 *   - `"paragraph": true`  on verses that start a new paragraph
 *   - `"poetry": true`     on verses inside <lg>/<l> (line group) elements
 *   - `"title": "..."`     on chapters that have a psalm superscription
 *
 * The OSIS XML uses <p> elements for prose paragraphs and <lg>/<l> for
 * poetic lines. Psalm superscriptions appear as <title type="psalm">.
 *
 * Source: https://github.com/seven1m/open-bibles (eng-kjv.osis.xml)
 * License: Public Domain (KJV)
 *
 * Usage: node scripts/addParagraphBreaks.mjs
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const OSIS_URL =
	"https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-kjv.osis.xml";
const LOCAL_XML = join(__dirname, "eng-kjv.osis.xml");
const DATA_DIR = join(__dirname, "..", "data", "kjv");

// OSIS abbreviation → app display name (matches book.book in KJV JSON data files)
// Same mapping used in convertCrossRefs.mjs
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

// Reverse mapping: app book name → OSIS abbreviation
const appNameToOsis = Object.fromEntries(
	Object.entries(osisToAppName).map(([osis, app]) => [app, osis])
);

/**
 * Strip XML tags from a string, leaving only text content.
 */
function stripTags(s) {
	return s.replace(/<[^>]+>/g, "").trim();
}

async function main() {
	// 1. Get the OSIS XML
	let xml;
	if (existsSync(LOCAL_XML)) {
		console.log("Reading local OSIS XML...");
		xml = readFileSync(LOCAL_XML, "utf-8");
	} else {
		console.log("Fetching KJV OSIS XML from GitHub...");
		const response = await fetch(OSIS_URL);
		if (!response.ok) {
			throw new Error(`Failed to fetch OSIS XML: ${response.status}`);
		}
		xml = await response.text();
		writeFileSync(LOCAL_XML, xml);
		console.log(`Cached to ${LOCAL_XML}`);
	}

	// ── 2a. Extract paragraph-starting verses ──────────────────────────
	//    Scan for <p> opens and <verse osisID="..."> tags in document order.
	//    The first verse encountered after each <p> open is a paragraph start.
	const pTokenRegex = /<p\b[^>]*>|<\/p\b[^>]*>|<verse\s+osisID="([^"]+)"/g;
	const paragraphVerses = new Set();
	let needFirstVerse = false;
	let match;

	while ((match = pTokenRegex.exec(xml)) !== null) {
		const tag = match[0];
		if (tag.startsWith("</p")) {
			needFirstVerse = false;
		} else if (tag.startsWith("<p")) {
			needFirstVerse = true;
		} else if (match[1] && needFirstVerse) {
			paragraphVerses.add(match[1]);
			needFirstVerse = false;
		}
	}

	console.log(
		`Found ${paragraphVerses.size} paragraph-starting verses in OSIS XML`
	);

	// ── 2b. Extract poetic verses (inside <lg> blocks) ─────────────────
	//    Verses wrapped in <lg><l>...</l></lg> are poetic lines.
	const lgTokenRegex =
		/<lg\b[^>]*>|<\/lg\b[^>]*>|<verse\s+osisID="([^"]+)"/g;
	const poetryVerses = new Set();
	let insideLg = false;

	while ((match = lgTokenRegex.exec(xml)) !== null) {
		const tag = match[0];
		if (tag.startsWith("</lg")) {
			insideLg = false;
		} else if (tag.startsWith("<lg")) {
			insideLg = true;
		} else if (match[1] && insideLg) {
			poetryVerses.add(match[1]);
		}
	}

	console.log(`Found ${poetryVerses.size} poetic verses in OSIS XML`);

	// ── 2c. Extract psalm titles (superscriptions) ─────────────────────
	//    Pattern: <chapter osisRef="Ps.N" ...> ... <title type="psalm"...>TEXT</title>
	const psalmTitleRegex =
		/<chapter\s+osisRef="(Ps\.\d+)"[^/]*\/>\s*<title\s+type="psalm"[^>]*>([\s\S]*?)<\/title>/g;
	// Map: "Ps.3" → "A Psalm of David, when he fled from Absalom his son."
	const psalmTitles = new Map();

	while ((match = psalmTitleRegex.exec(xml)) !== null) {
		const chapterRef = match[1]; // e.g. "Ps.3"
		const rawTitle = match[2];
		const cleanTitle = stripTags(rawTitle).replace(/\s+/g, " ").trim();
		if (cleanTitle) {
			psalmTitles.set(chapterRef, cleanTitle);
		}
	}

	console.log(`Found ${psalmTitles.size} psalm titles in OSIS XML`);

	// ── 3. Update each book JSON file ──────────────────────────────────
	const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
	let totalParagraphsAdded = 0;
	let totalPoetryAdded = 0;
	let totalTitlesAdded = 0;
	let booksUpdated = 0;

	for (const file of files) {
		const filePath = join(DATA_DIR, file);
		const book = JSON.parse(readFileSync(filePath, "utf-8"));
		const osisBook = appNameToOsis[book.book];

		if (!osisBook) {
			console.warn(`  Skipping ${file}: no OSIS mapping for "${book.book}"`);
			continue;
		}

		let paragraphsAdded = 0;
		let poetryAdded = 0;
		let titlesAdded = 0;

		for (const chapter of book.chapters) {
			// ── Psalm titles ──
			const chapterRef = `${osisBook}.${chapter.chapter}`;
			const psalmTitle = psalmTitles.get(chapterRef);
			if (psalmTitle) {
				chapter.title = psalmTitle;
				titlesAdded++;
			} else {
				delete chapter.title;
			}

			// ── Verse-level: paragraph + poetry ──
			chapter.verses = chapter.verses.map((v) => {
				const osisId = `${osisBook}.${chapter.chapter}.${v.verse}`;

				const shouldBeParagraph =
					paragraphVerses.has(osisId) && v.verse !== "1";
				const shouldBePoetry = poetryVerses.has(osisId);

				if (shouldBeParagraph && !v.paragraph) paragraphsAdded++;
				if (shouldBePoetry && !v.poetry) poetryAdded++;

				// Rebuild verse object with consistent property order:
				// verse, paragraph?, poetry?, text
				const newVerse = { verse: v.verse };
				if (shouldBeParagraph) newVerse.paragraph = true;
				if (shouldBePoetry) newVerse.poetry = true;
				newVerse.text = v.text;
				return newVerse;
			});
		}

		// Rebuild chapters with consistent property order:
		// chapter, title?, verses
		book.chapters = book.chapters.map((ch) => {
			const newCh = { chapter: ch.chapter };
			if (ch.title) newCh.title = ch.title;
			newCh.verses = ch.verses;
			return newCh;
		});

		writeFileSync(filePath, JSON.stringify(book, null, "\t") + "\n");

		const changes = paragraphsAdded + poetryAdded + titlesAdded;
		if (changes > 0) {
			const parts = [];
			if (paragraphsAdded) parts.push(`+${paragraphsAdded} paragraphs`);
			if (poetryAdded) parts.push(`+${poetryAdded} poetry`);
			if (titlesAdded) parts.push(`+${titlesAdded} titles`);
			console.log(`  ${book.book}: ${parts.join(", ")}`);
			booksUpdated++;
		}

		totalParagraphsAdded += paragraphsAdded;
		totalPoetryAdded += poetryAdded;
		totalTitlesAdded += titlesAdded;
	}

	console.log(
		`\nDone across ${booksUpdated} books: ${totalParagraphsAdded} paragraphs, ${totalPoetryAdded} poetry markers, ${totalTitlesAdded} psalm titles`
	);

	// Spot-checks
	const phlmVerses = [...paragraphVerses]
		.filter((id) => id.startsWith("Phlm."))
		.sort();
	console.log(
		`\nSpot-check — Philemon paragraph starts: ${phlmVerses.join(", ")}`
	);

	const ps3Title = psalmTitles.get("Ps.3");
	console.log(`Spot-check — Psalm 3 title: "${ps3Title}"`);

	const poeticPsCount = [...poetryVerses].filter((id) =>
		id.startsWith("Ps.")
	).length;
	console.log(`Spot-check — Poetic verses in Psalms: ${poeticPsCount}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
