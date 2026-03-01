#!/usr/bin/env node

/**
 * Build-time script to extract paragraph break positions from a KJV OSIS XML
 * file and inject `"paragraph": true` into the app's per-book JSON data files.
 *
 * The OSIS XML uses <p> elements to wrap groups of verses that belong to the
 * same paragraph. This script identifies the first verse inside each <p> block
 * and marks it as a paragraph start — except for verse 1 of each chapter,
 * which inherently starts a new section due to the chapter break.
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

	// 2. Extract paragraph-starting verses from the OSIS XML.
	//    Scan for <p> opens and <verse osisID="..."> tags in document order.
	//    The first verse encountered after each <p> open is a paragraph start.
	const tokenRegex = /<p\b[^>]*>|<\/p\b[^>]*>|<verse\s+osisID="([^"]+)"/g;
	const paragraphVerses = new Set();
	let needFirstVerse = false;
	let match;

	while ((match = tokenRegex.exec(xml)) !== null) {
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

	// 3. Update each book JSON file
	const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
	let totalAdded = 0;
	let totalRemoved = 0;
	let booksUpdated = 0;

	for (const file of files) {
		const filePath = join(DATA_DIR, file);
		const book = JSON.parse(readFileSync(filePath, "utf-8"));
		const osisBook = appNameToOsis[book.book];

		if (!osisBook) {
			console.warn(`  Skipping ${file}: no OSIS mapping for "${book.book}"`);
			continue;
		}

		let added = 0;
		let removed = 0;

		for (const chapter of book.chapters) {
			chapter.verses = chapter.verses.map((v) => {
				const osisId = `${osisBook}.${chapter.chapter}.${v.verse}`;
				// Mark as paragraph if OSIS says so, but skip verse 1 of each chapter
				// (the chapter break itself serves as the paragraph boundary)
				const shouldBeParagraph =
					paragraphVerses.has(osisId) && v.verse !== "1";

				if (shouldBeParagraph && !v.paragraph) added++;
				if (!shouldBeParagraph && v.paragraph) removed++;

				// Rebuild the verse object with consistent property order:
				// verse, paragraph (if true), text
				const newVerse = { verse: v.verse };
				if (shouldBeParagraph) newVerse.paragraph = true;
				newVerse.text = v.text;
				return newVerse;
			});
		}

		writeFileSync(filePath, JSON.stringify(book, null, "\t") + "\n");

		if (added > 0 || removed > 0) {
			console.log(`  ${book.book}: +${added} -${removed} paragraph breaks`);
			booksUpdated++;
		}

		totalAdded += added;
		totalRemoved += removed;
	}

	console.log(
		`\nDone: ${totalAdded} breaks added, ${totalRemoved} removed across ${booksUpdated} books`
	);

	// Spot-check: show Philemon paragraph verses
	const phlmVerses = [...paragraphVerses]
		.filter((id) => id.startsWith("Phlm."))
		.sort();
	console.log(`\nSpot-check — Philemon paragraph starts in OSIS: ${phlmVerses.join(", ")}`);

	// Spot-check: show Genesis paragraph verses (first 10)
	const genVerses = [...paragraphVerses]
		.filter((id) => id.startsWith("Gen."))
		.sort((a, b) => {
			const [, ca, va] = a.split(".");
			const [, cb, vb] = b.split(".");
			return Number(ca) - Number(cb) || Number(va) - Number(vb);
		});
	console.log(
		`Spot-check — Genesis paragraph starts (first 10): ${genVerses.slice(0, 10).join(", ")}`
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
