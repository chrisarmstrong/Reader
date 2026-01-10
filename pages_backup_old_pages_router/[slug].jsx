import styled, { css } from "styled-components";
import { Books } from "../utils/Books";
import Main from "../components/Main";

export default function Book({ params, book }) {
	if (params && book) {
		return <Main slug={params?.slug} book={book} />;
	}
}

export async function getStaticProps({ params }) {
	const books = await Books;

	const book =
		books.filter(
			(book) => book.book.toLowerCase().replace(/\s+/g, "-") == params.slug
		) || null;

	if (!book) {
		return {
			notFound: true,
		};
	}
	return {
		props: {
			book: book[0],
			params: params,
		},
		revalidate: 60,
	};
}

export async function getStaticPaths() {
	const allBooks = await Books;

	const paths = allBooks.map(({ book, i }) => {
		if (book) {
			return `/${book?.toLowerCase().replace(/\s+/g, "-")}`;
		}
	});

	return {
		paths: paths,
		fallback: true,
	};
}
