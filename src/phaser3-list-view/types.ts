export interface ListViewOptions {
	direction?: 'x' | 'y';
	autocull?: boolean;
	momentum?: boolean;
	bouncing?: boolean;
	snapping?: boolean;
	overflow?: number;
	padding?: number;
	searchForClicks?: boolean;
}

export interface ScrollerOptions {
	from?: number;
	to?: number;
	direction?: 'x' | 'y' | 'angle';
	momentum?: boolean;
	snapping?: boolean;
	bouncing?: boolean;
	deceleration?: number;
	overflow?: number;
	snapStep?: number;
	emitMoving?: boolean;
	duration?: number;
	speedLimit?: number;
	flickTimeThreshold?: number;
	offsetThreshold?: number;
	acceleration?: number;
	accelerationT?: number;
	maxAcceleration?: number;
	time?: any;
	multiplier?: number;
	swipeEnabled?: boolean;
	swipeThreshold?: number;
	swipeTimeThreshold?: number;
	minDuration?: number;
	addListeners?: boolean;
    infinite?: boolean;
}

export interface DragAxisPosition {
	x: number;
	y: number;
}

export interface Bounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface DispatchValues {
	step: number;
	total: number;
	percent: number;
}

export interface MaskLimits {
	x?: number;
	y?: number;
	angle?: number;
}

export interface DisplayObject extends Phaser.GameObjects.GameObject {
	x: number;
	y: number;
	width: number;
	height: number;
	visible: boolean;
	nominalWidth?: number;
	nominalHeight?: number;
} 