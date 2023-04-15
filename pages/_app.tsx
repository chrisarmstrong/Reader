import type { AppProps } from "next/app";

import { createGlobalStyle } from "styled-components";

const GlobalStyles = createGlobalStyle`
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

`;

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
