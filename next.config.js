/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
	dest: "public",
});

module.exports = withPWA({
	pwa: {
		dest: "public",
		disable: process.env.NODE_ENV === "development",
		register: true,
		sw: "service-worker.js",
	},
	compiler: {
		// Enables the styled-components SWC transform
		styledComponents: true,
	},
});
