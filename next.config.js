/** @type {import('next').NextConfig} */
const nextConfig = {
	compiler: {
		// Enables the styled-components SWC transform
		styledComponents: true,
	},
	experimental: {
		// Enable if needed for performance
		optimizePackageImports: ["react-window", "styled-components"],
	},
	// Enable static exports for better PWA compatibility
	output: "export",
	trailingSlash: true,
	images: {
		unoptimized: true,
	},
};

module.exports = nextConfig;
