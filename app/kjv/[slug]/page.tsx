import { Books } from "../../../utils/Books";
import Main from "../../../components/Main";
import { notFound } from "next/navigation";
import type { Book } from "../../../types/bible";

interface PageParams {
	slug: string;
}

interface PageProps {
	params: Promise<PageParams>;
}

// Generate static params (replaces getStaticPaths)
export async function generateStaticParams() {
	const allBooks = Books;

	return allBooks.map(({ book }) => ({
		slug: book?.toLowerCase().replace(/\s+/g, "-"),
	}));
}

export default async function KJVBookPage({ params }: PageProps) {
	const { slug } = await params;
	const books = Books;

	const book = books.filter(
		(book) =>
			book.book.toLowerCase().replace(/\s+/g, "-") === slug.replace(/\s+/g, "-")
	);

	if (!book || book.length === 0) {
		notFound();
	}

	return <Main slug={slug} book={book[0]} />;
}
