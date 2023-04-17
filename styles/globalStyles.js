import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`

@font-face {
  font-family: "Family";
  src: url("/fonts/family-light.woff2") format("woff2");
  font-weight: 300;
  font-style: normal;
}

@font-face {
  font-family: "Family";
  src: url("/fonts/family-light-italic.woff2") format("woff2");
  font-weight: 300;
  font-style: italic;
}

@font-face {
  font-family: "Family";
  src: url("/fonts/family-regular.woff2") format("woff2");
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: "Family";
  src: url("/fonts/family-regular-italic.woff2") format("woff2");
  font-weight: normal;
  font-style: italic;
}

@font-face {
  font-family: "Family";
  src: url("/fonts/family-bold.woff2") format("woff2");
  font-weight: bold;
  font-style: normal;
}

@font-face {
  font-family: "Family";
  src: url("/fonts/family-bold-italic.woff2") format("woff2");
  font-weight: bold;
  font-style: italic;
}


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
    font-family: Family, georgia, serif;
    color: #1a1f2e;
    // background: #eadcda10;
  }
`;

export default GlobalStyle;
