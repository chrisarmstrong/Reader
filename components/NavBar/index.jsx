import styled from "styled-components";

const Container = styled.div`
	width: 100%;
	position: fixed;
	padding-bottom: env(safe-area-inset-bottom);

	left: 0;
	right: 0;
	display: flex;
	justify-content: space-between;
	z-index: 99;

	@media all and (max-width: 820px) {
		background: white;
		border-top: 1px solid rgb(0 0 0 /0.1);
		bottom: 0;
	}

	button {
		height: 60px;
		padding: 12px 24px;
		background: none;
		outline: none;
		border: none;
		font-family: "Family", georgia, serif;
		font-size: 16px;
		font-style: italic;
		opacity: 0.4;
		transition: opacity 0.2s;
		cursor: pointer;
		color: black;

		&:hover {
			opacity: 1;
		}
	}
`;

export default function Navbar({
	setBookNavVisible,
	bookNavVisible,
	setSearchVisible,
}) {
	return (
		<Container>
			<button
				onClick={() => {
					setBookNavVisible(!bookNavVisible);
					console.log(bookNavVisible);
				}}
			>
				Index
			</button>
			<button
				onClick={() => {
					setSearchVisible(true);
				}}
			>
				Search
			</button>
		</Container>
	);
}
