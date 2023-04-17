import styled, { css } from "styled-components";
import { Books } from "../../utils/Books";
import Main from "../../components/Main";

export default function Book({ params, book }) {
	if (params) {
		return <Main slug={params?.slug} book={book} />;
	}
}

export async function getStaticProps({ params }) {
	const books = await Books;

	const book = books.filter((book) => book.book.toLowerCase() == params.slug);

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

	return {
		paths: allBooks.map(({ book }) => `/kjv/${book.book}`) || [],
		fallback: true,
	};
}
