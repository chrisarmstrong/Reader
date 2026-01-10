declare module "*.module.css" {
	const classes: { [key: string]: string };
	export default classes;
}

declare module "*.module.scss" {
	const classes: { [key: string]: string };
	export default classes;
}

// CSS custom properties (CSS variables) support
declare module "*.css" {
	const content: string;
	export default content;
}
