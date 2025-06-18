import Phaser from 'phaser';
import Scroller from './Scroller';
import { ScrollerOptions } from './types';

const defaultOptions: ScrollerOptions = {
	direction: 'angle',
	infinite: false,
	speedLimit: 1.5
};

export default class WheelScroller extends Scroller {
	private centerPoint: { x: number; y: number };
	private fullDiff: number;
	
	constructor(
		game: Phaser.Scene,
		clickObject: Phaser.GameObjects.GameObject,
		options: ScrollerOptions = {}
	) {
		super(
			game,
			clickObject,
			{ angle: (clickObject as any).width / 2 },
			Object.assign({}, defaultOptions, options)
		);
	}

	handleDown(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled) return;
		
		// Calculate center point of the wheel
		const width = (this.clickObject as any).width || 0;
		const height = (this.clickObject as any).height || 0;
		const x = (this.clickObject as any).x || 0;
		const y = (this.clickObject as any).y || 0;
		
		this.centerPoint = { 
			x: x + width / 2, 
			y: y + height / 2 
		};
		
		// Calculate angle between pointer and center
		this.old = this.down = Phaser.Math.Angle.Between(
			pointer.x,
			pointer.y,
			this.centerPoint.x,
			this.centerPoint.y
		);
		
		this.fullDiff = 0;
		
		super.handleDown(pointer);
	}

	handleMove(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled || !this.isDown) return;
		const x = pointer.x;
		const y = pointer.y;
		this.isScrolling = true;
		
		// Calculate current rotation angle
		const currentRotation = Phaser.Math.Angle.Between(
			x,
			y,
			this.centerPoint.x,
			this.centerPoint.y
		);
		
		let rotations = 0;
		let diffRotation = this.old - currentRotation;
		
		// Convert radians to degrees
		this.diff = Phaser.Math.RadToDeg(diffRotation);
		
		// Handle wrap-around for angles
		if (this.diff > 180) {
			rotations = 1;
		} else if (this.diff < -180) {
			rotations = -1;
		}
		
		if (rotations !== 0) {
			const fullCircle = rotations * Phaser.Math.DegToRad(360);
			diffRotation -= fullCircle;
			this.diff = Phaser.Math.RadToDeg(diffRotation);
		}
		
		this.diff = this.requestDiff(
			this.diff,
			this.target,
			this.min,
			this.max,
			this.o.overflow!
		);
		
		this.fullDiff -= this.diff;
		this.target -= this.diff;
		
		// Handle infinite rotation if enabled
		if (this.o.infinite) {
			this.target = this.wrapTarget(this.target, this.min, this.max);
		}
		
		this.old = currentRotation;
		
		// Store timestamp for event
		this.o.time.move = this.game.time.now;
		
		// Calculate the sector length based on the wheel diameter
		const diameter = (this.clickObject as any).width;
		const circumference = Math.PI * diameter;
		const sectorLength = circumference * (this.diff / 360);
		
		this.acc = Math.min(Math.abs(sectorLength / 30), this.o.maxAcceleration!);
		
		// Update scroll position
		this.scrollObject[this.o.direction!] = this.target;
		this.handleUpdate();
		
		if (this.o.emitMoving) {
			this.events.onInputMove.emit('move', pointer, x, y);
		}
	}

	handleUp(pointer: Phaser.Input.Pointer): void {
		// Calculate current angle on pointer up
		this.current = Phaser.Math.Angle.Between(
			pointer.x,
			pointer.y,
			this.centerPoint.x,
			this.centerPoint.y
		);
		
		super.handleUp(pointer);
	}

	private wrapTarget(target: number, min: number, max: number): number {
		let diff = 0;
		
		if (target > max) {
			diff = target - max;
			target = min + diff;
		} else if (target < min) {
			diff = min - target;
			target = max - diff;
		}
		
		return target;
	}
}