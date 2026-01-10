import styled, { css } from "styled-components";
import { Books } from "../../utils/Books";
import Main from "../../components/Main";

export default function Book({ params, book }) {
	if (params && book) {
		return <Main slug={params?.slug} book={book} />;
	}
}

export async function getStaticProps({ params }) {
	const books = await Books;

	const book =
		books.filter(
			(book) =>
				book.book.toLowerCase().replace(/\s+/g, "-") ==
				params.slug.replace(/\s+/g, "-")
		) || null;

	if (!book) {
		return {
			notFound: true,
		};
	}
	if (book) {
		return {
			props: {
				book: book[0],
				params: params,
			},
			revalidate: 60,
		};
	}
}

export async function getStaticPaths() {
	const allBooks = Books;

	const paths = allBooks.map(({ book, i }) => {
		console.log("test", book.toLowerCase());
		if (book) {
			return `/kjv/${book?.toLowerCase().replace(/\s+/g, "-")}`;
		}
	});

	if (allBooks) {
		return {
			paths: paths,
			fallback: true,
		};
	}
}
