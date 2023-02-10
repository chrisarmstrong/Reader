import type { AppProps } from "next/app";

import { createGlobalStyle } from "styled-components";
import fonts from "../styles/fonts.css";

const GlobalStyles = createGlobalStyle`
  ${fonts}
`;

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
