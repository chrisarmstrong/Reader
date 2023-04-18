import { useState } from "react";
import styled, { css } from "styled-components";
import Link from "next/link";

const Container = styled.div`
	position: fixed;
	width: 100%;
	top: 0;
	bottom: env(safe-area-inset-bottom);
	transition: left 0.2s ease-in, background 0.2s ease-in, opacity 0.2s;
	left: ${(props) => (props.active ? "0" : "-280px")};
	text-align: left;
	overflow: scroll;
	z-index: 1;
	opacity: ${(props) => (props.active ? "1" : "0")};
	pointer-events: ${(props) => (props.active ? "all" : "none")};
	${(props) =>
		props.active
			? css`
					background: linear-gradient(
						to right,
						rgba(255, 255, 255, 1) 0%,
						rgba(255, 255, 255, 1) 100px,
						rgba(255, 255, 255, 0.8) 300px,
						rgba(255, 255, 255, 0.4) 100%
					);
			  `
			: css`
					background: linear-gradient(
						to right,
						rgba(255, 255, 255, 1) 0%,
						rgba(255, 255, 255, 1) 50px,
						rgba(255, 255, 255, 0.4) 100%
					);
			  `};

	display: grid;
	grid-template-columns: 280px 1fr;

	.book-list {
		padding: 60px 24px;
	}
	.dismiss {
		width: 100%;
		height: 100%;
	}

	a {
		opacity: 0.4;
		transition: opacity 0.2s;
		width: 100%;
		padding: 6px 0;
		font-size: 36px;
		font-weight: 300;

		&:hover {
			opacity: 1;
		}
		cursor: pointer;
		display: block;
		text-decoration: none;
		color: inherit;
	}
`;

export default function Contents({ active, dismiss, books, goToPosition }) {
	return (
		<Container active={active}>
			<div className="book-list">
				{books.map((book, i) => (
					<Link
						key={book.book}
						href={"/" + book.book.toLowerCase().replace(/\s+/g, "-")}
						target="_self"
						data-index={i}
						onClick={() => {
							dismiss();
						}}
					>
						{book.book}
					</Link>
				))}
			</div>
			<div className="dismiss" onClick={dismiss}></div>
		</Container>
	);
}
