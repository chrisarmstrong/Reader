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
	// Remove static export to keep dynamic routing working
	trailingSlash: true,
	images: {
		unoptimized: true,
	},
};

module.exports = nextConfig;
