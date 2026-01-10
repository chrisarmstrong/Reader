export default function debounce<T extends (...args: any[]) => void>(
	func: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: NodeJS.Timeout | null = null;
	return function (this: any, ...args: Parameters<T>) {
		const context = this;
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => func.apply(context, args), delay);
	};
}
