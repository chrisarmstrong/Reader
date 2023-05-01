import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`



  /* Box sizing rules */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  /* Remove default margin */
  body,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p,
  ol,
  ul {
    margin: 0;
  }

  /* Remove default padding */
  body,
  p {
    padding: 0;
  }

  /* Remove list styles on ul, ol elements */
  ol,
  ul {
    list-style: none;
  }

  /* Set default font size */
  html {
    font-size: 16px;
  }

  /* Reset default font family */
  body {
    --ink-black: #1a1f2e;

    font-family: var(--serif), georgia, serif;
    color: var(--ink-black);
    // background: #eadcda10;
    display: block;
  }
`;

export default GlobalStyle;
