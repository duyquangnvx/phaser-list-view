export default class MathUtils {
	/**
	 * Returns the value closest to a divisor
	 */
	static nearestMultiple(n: number, m: number): number {
		return Math.round(n / m) * m;
	}

	/**
	 * Linear interpolation between two values
	 */
	static lerp(a: number, b: number, t: number): number {
		return a + (b - a) * t;
	}
} 