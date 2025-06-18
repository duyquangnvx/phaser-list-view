import Phaser from 'phaser';
import MathUtils from './utils/MathUtils';
import { dispatchClicks } from './utils/Util';
import { ScrollerOptions, MaskLimits, DispatchValues } from './types';

const defaultOptions: ScrollerOptions = {
	from: 0,
	to: 200,
	direction: 'y',
	momentum: false,
	snapping: false,
	bouncing: false,
	deceleration: 0.5,
	overflow: 20,
	snapStep: 10,
	emitMoving: false,
	duration: 2,
	speedLimit: 3,
	flickTimeThreshold: 100,
	offsetThreshold: 30,
	acceleration: 0.5,
	accelerationT: 250,
	maxAcceleration: 4,
	time: {},
	multiplier: 1,
	swipeEnabled: false,
	swipeThreshold: 5,
	swipeTimeThreshold: 250,
	minDuration: 0.5,
	addListeners: true,
	infinite: false
};

export default class Scroller {
	protected game: Phaser.Scene;
	protected clickObject: Phaser.GameObjects.GameObject;
	protected maskLimits: MaskLimits;
	protected o: ScrollerOptions;
	protected enabled: boolean = true;
	protected isScrolling: boolean = false;
	protected isDown: boolean = false;
	public events: Record<string, Phaser.Events.EventEmitter>;
	protected scrollObject: Record<string, number> = {};
	protected tweenScroll: Phaser.Tweens.Tween;
	protected dispatchValues: DispatchValues = { step: 0, total: 0, percent: 0 };
	protected clickables: Phaser.GameObjects.GameObject[] = [];
	protected destroyed: boolean = false;
	protected min: number;
	protected max: number;
	protected maxOffset: number;
	protected target: number;
	protected requested: number;
	protected old: number;
	protected down: number;
	protected diff: number;
	protected acc: number;
	protected current: number;
	protected length: number;
	protected previousTotal: number;

	constructor(
		game: Phaser.Scene,
		clickObject: Phaser.GameObjects.GameObject,
		maskLimits: MaskLimits = {},
		options: ScrollerOptions = {}
	) {
		this.game = game;
		this.clickObject = clickObject;
		this.maskLimits = maskLimits;
		this.o = Object.assign({}, defaultOptions, options);

		this.updateMinMax();

		this.addListeners();

		this.init();

		// Create a tween for scrolling
		this.tweenScroll = this.game.tweens.add({
			targets: this.scrollObject,
			duration: 0,
			ease: 'Quad.easeOut',
			paused: true,
			onUpdate: () => this.handleUpdate(),
			onComplete: () => this.handleComplete()
		});
	}

	destroy(): void {
		if (this.tweenScroll) {
			this.tweenScroll.stop();
			this.tweenScroll.remove();
		}
		
		this.removeListeners();
		
		if (this.clickObject) {
			this.clickObject.destroy();
		}
		
		this.clickables = [];
		this.o = null as any;
		this.maskLimits = null as any;
		this.enabled = false;
		this.game = null as any;
		this.dispatchValues = null as any;
		this.isDown = null as any;
		this.target = null as any;
		this.destroyed = true;
	}

	addListeners(): void {
		// Create event emitters
		this.events = {
			onUpdate: new Phaser.Events.EventEmitter(),
			onInputUp: new Phaser.Events.EventEmitter(),
			onInputDown: new Phaser.Events.EventEmitter(),
			onInputMove: new Phaser.Events.EventEmitter(),
			onComplete: new Phaser.Events.EventEmitter(),
			onSwipe: new Phaser.Events.EventEmitter()
		};

		if (this.o.addListeners !== false) {
			// Make the object interactive for input events
			const interactive = this.clickObject;
			if (interactive.setInteractive) {
				interactive.setInteractive();
				interactive.on('pointerdown', this.handleDown, this);
				interactive.on('pointerup', this.handleUp, this);
				interactive.on('pointerout', this.handleUp, this);
			}
		}
	}

	removeListeners(): void {
		if (this.o.addListeners !== false) {
			const interactive = this.clickObject;
			
			if (interactive.off) {
				interactive.off('pointerdown', this.handleDown, this);
				interactive.off('pointerup', this.handleUp, this);
				interactive.off('pointerout', this.handleUp, this);
			}
		}

		// Remove all event listeners
		for (const eventName in this.events) {
			if (this.events.hasOwnProperty(eventName)) {
				this.events[eventName].removeAllListeners();
			}
		}
	}

	enable(): void {
		this.enabled = true;
	}

	disable(): void {
		this.enabled = false;
	}

	init(): void {
		this.scrollObject[this.o.direction!] = this.o.from!;
		this.maxOffset = this.maskLimits[this.o.direction!]! * this.o.speedLimit!;
		this.previousTotal = this.o.from!;
		this.enable();
	}

	reset(): void {
		if (this.tweenScroll) {
			this.tweenScroll.pause();
		}
		this.o.multiplier = 1;
		this.init();
	}

	setFromTo(_from: number, _to: number): void {
		this.o.from = _from;
		this.o.to = _to;
		this.updateMinMax();
	}

	isTweening(): boolean {
		return this.tweenScroll?.isPlaying() || false;
	}

	registerClickables(clickables: Phaser.GameObjects.GameObject[]): void {
		this.clickables = clickables;
	}

	handleDown(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled) return;
		
		this.isDown = true;
		this.target = this.requested = this.scrollObject[this.o.direction!];
		this.o.time.down = pointer.downTime;
		
		// In Phaser 3, we need to track the pointer move ourselves
		this.old = pointer[this.o.direction === 'x' ? 'x' : 'y'];
		this.down = this.old;
		
		// Setup pointer move tracking
		if (this.o.addListeners !== false) {
			this.game.input.on('pointermove', this.handleMove, this);
		}

		// Check if block is currently scrolling and set multiplier
		if (
			this.isTweening() &&
			this.o.time.down - this.o.time.up < this.o.accelerationT!
		) {
			// Swipe while animation was happening, increase multiplier
			this.o.multiplier! += this.o.acceleration!;
		} else {
			// Reset
			this.o.multiplier = 1;
		}

		// Stop tween for touch-to-stop
		if (this.tweenScroll && this.tweenScroll.isPlaying()) {
			this.tweenScroll.stop();
		}

		dispatchClicks(pointer, this.clickables, 'pointerdown');
		this.events.onInputDown.emit('down', pointer);
	}

	handleMove(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled || !this.isDown) return;
		this.isScrolling = true;
		
		// Get position based on direction
		const x = pointer.x;
		const y = pointer.y;
		const currentPosition = this.o.direction === 'x' ? x : y;
		this.diff = this.old - currentPosition;


		this.diff = this.requestDiff(
			this.diff,
			this.target,
			this.min,
			this.max,
			this.o.overflow!
		);
		this.target -= this.diff;
		this.old = currentPosition;

		// Store timestamp for event
		this.o.time.move = this.game.time.now;

		this.acc = Math.min(Math.abs(this.diff / 30), this.o.maxAcceleration!);

		// Go ahead and move the scroll
		this.scrollObject[this.o.direction!] = this.target;
		this.handleUpdate();

		if (this.o.emitMoving) {
			this.events.onInputMove.emit('move', pointer, x, y);
		}
	}

	handleUp(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled || !this.isDown) return;
		
		this.isDown = false;

		// Remove move listener
		if (this.o.addListeners !== false) {
			this.game.input.off('pointermove', this.handleMove, this);
		}

		// Store timestamp for event
		this.o.time.up = pointer.upTime;
		
		// Reset multiplier if it's been too long since the last touch
		if (this.o.time.up - this.o.time.down > this.o.accelerationT!) {
			this.o.multiplier = 1;
		}

		// Special handling for bouncing - check if we've scrolled past the limit
		if (!this.o.infinite) {
			if (this.scrollObject[this.o.direction!] > this.max) {
				this.target = this.max;
				this.tweenTo(this.o.bouncing ? 1 : 0.01, this.target);
				
				dispatchClicks(pointer, this.clickables, 'pointerup');
				this.events.onInputUp.emit('up', pointer);
				return;
			} else if (this.scrollObject[this.o.direction!] < this.min) {
				this.target = this.min;
				this.tweenTo(this.o.bouncing ? 1 : 0.01, this.target);
				
				dispatchClicks(pointer, this.clickables, 'pointerup');
				this.events.onInputUp.emit('up', pointer);
				return;
			}
		}

		const scrollOptions = {
			duration: this.o.duration!,
			target: this.target
		};

		// Add momentum if enabled
		if (this.o.momentum && this.isScrolling) {
			this.addMomentum(scrollOptions);
		}

		// Add swiping if enabled
		if (this.o.swipeEnabled) {
			this.addSwiping(scrollOptions, pointer);
		}

		// Add snapping if enabled
		if (this.o.snapping) {
			this.addSnapping(scrollOptions);
		}

		// Apply min/max limits
		this.addLimits(scrollOptions);

		// Calculate duration based on distance
		this.calculateDuration(scrollOptions);

		// Start the tween
		this.tweenTo(scrollOptions.duration, scrollOptions.target);

		dispatchClicks(pointer, this.clickables, 'pointerup');
		this.events.onInputUp.emit('up', pointer);
	}

	protected addMomentum(options: { duration: number; target: number }): void {
		if (!this.o.momentum) return;
		
		// Calculate distance moved after release
		let offset = Math.pow(this.acc, 2) * this.maskLimits[this.o.direction!]!;
		offset = Math.min(this.maxOffset, offset);
		offset = this.diff > 0 
			? -this.o.multiplier! * offset 
			: this.o.multiplier! * offset;

		// Apply offset if flick time is fast enough and offset is large enough
		if (
			this.o.time.up - this.o.time.move < this.o.flickTimeThreshold! &&
			offset !== 0 &&
			Math.abs(offset) > this.o.offsetThreshold!
		) {
			options.target += offset;
		}
	}

	protected addSwiping(options: { duration: number; target: number }, pointer: Phaser.Input.Pointer): void {
		// Calculate swipe distance and direction
		const swipeDistance = Math.abs(this.down - this.current);
		
		if (
			this.o.swipeEnabled &&
			this.o.time.up - this.o.time.down < this.o.swipeTimeThreshold! &&
			swipeDistance > this.o.swipeThreshold!
		) {
			const direction = pointer[this.o.direction!] < this.down ? 'forward' : 'backward';
			
			if (direction === 'forward') {
				options.target -= this.o.snapStep! / 2;
			} else {
				options.target += this.o.snapStep! / 2;
			}
			
			this.events.onSwipe.emit('swipe', direction);
		}
	}

	protected addSnapping(options: { duration: number; target: number }): void {
		if (!this.o.snapping) return;
		options.target = MathUtils.nearestMultiple(options.target, this.o.snapStep!);
	}

	protected addLimits(options: { duration: number; target: number }): void {
		if (this.o.infinite) return;
		
		options.target = Math.max(this.min, Math.min(this.max, options.target));
	}

	protected calculateDuration(options: { duration: number; target: number }): void {
		const distance = Math.abs(options.target - this.scrollObject[this.o.direction!]);
		options.duration = this.o.duration! * distance / this.maxOffset;
		options.duration = Math.max(this.o.minDuration!, options.duration);
	}

	protected requestDiff(diff: number, target: number, min: number, max: number, overflow: number): number {
		if (this.o.infinite) return diff;
		
		// Handle case when overflow is 0 (no bouncing/elasticity effect)
		if (overflow === 0) {
			// When overflow is 0, we strictly enforce limits
			// If target would go beyond max, adjust diff to keep it exactly at max
			if (target > max) {
				return diff + (target - max); // Add extra diff to move back to max
			} 
			// If target would go below min, adjust diff to keep it exactly at min
			else if (target < min) {
				return diff - (min - target); // Subtract from diff to move back to min
			}
			// Within limits, use normal diff
			return diff;
		}
		
		// Normal case with elasticity (overflow > 0)
		let scale = 0;
		if (target > max) {
			scale = (max + overflow - target) / overflow;
			diff *= scale;
		} else if (target < min) {
			scale = -(min - overflow - target) / overflow;
			diff *= scale;
		}
		
		return diff;
	}

	tweenToSnap(duration: number, snapIndex: number): void {
		const target = this.o.from! + (snapIndex * this.o.snapStep!);
		this.tweenTo(duration, target);
	}

	tweenTo(duration: number, target: number): void {
		if (this.destroyed) return;
		if (duration === 0) return this.setTo(target);

		// Prepare tween
		const newTweenData: any = {};
		newTweenData[this.o.direction!] = target;

		// Reset and restart tween
		if (this.tweenScroll) {
			this.tweenScroll.stop();
			
			// Update tween data
			this.tweenScroll = this.game.tweens.add({
				targets: this.scrollObject,
				duration: duration * 1000,
				ease: 'Quad.easeOut',
				...newTweenData,
				onUpdate: () => this.handleUpdate(),
				onComplete: () => this.handleComplete()
			});
		}
	}

	cancel(): void {
		this.isDown = false;
		this.isScrolling = false;
		
		if (this.tweenScroll && this.tweenScroll.isPlaying()) {
			this.tweenScroll.stop();
		}
	}

	setTo(target: number): void {
		this.cancel();
		this.scrollObject[this.o.direction!] = target;
		this.target = target;
		this.handleUpdate();
		this.handleComplete();
	}

	handleUpdate(): void {
		if (!this.enabled || this.destroyed) return;

		let totalValue;
		
		// Handle different cases for infinite scrolling
		if (this.o.infinite) {
			// Use Phaser.Math.Wrap to keep value within min-max range
			totalValue = Phaser.Math.Wrap(
				this.scrollObject[this.o.direction!],
				this.min,
				this.max
			);
		} else {
			totalValue = this.scrollObject[this.o.direction!];
		}

		// Calculate step based on previous value
		let step = totalValue - this.previousTotal;
		
		// Handle case when dragging from one side to the other in infinite mode
		if (this.o.infinite) {
			if (step < -this.length / 2) {
				step = step + this.length;
			} else if (step > this.length / 2) {
				step = step - this.length;
			}
		}

		// Update dispatch values
		this.dispatchValues.step = step;
		this.dispatchValues.total = totalValue;
		
		if (this.o.from !== this.o.to) {
			const range = this.o.to! - this.o.from!;
			// Calculate percentage - for infinite, use the helper function
			if (this.o.infinite) {
				this.dispatchValues.percent = this.percentageBetween(
					this.dispatchValues.total,
					this.o.from!,
					this.o.to!
				);
			} else {
				this.dispatchValues.percent = (this.dispatchValues.total - this.o.from!) / range;
			}
		}

		// Save current total value for next update	
		this.previousTotal = totalValue;

		// Emit update event
		this.events.onUpdate.emit('update', this.dispatchValues);
	}

	// Helper function for calculating percentage for infinite scrolling
	protected percentageBetween(value: number, min: number, max: number): number {
		const range = max - min;
		// Normalize value within min-max range
		if (value < min) {
			value += Math.ceil((min - value) / range) * range;
		} else if (value > max) {
			value -= Math.ceil((value - max) / range) * range;
		}
		
		return (value - min) / range;
	}

	handleComplete(): void {
		if (!this.enabled || this.destroyed) return;
		
		this.isScrolling = false;
		
		// Reset multiplier
		this.o.multiplier = 1;
		
		// Emit complete event
		this.events.onComplete.emit('complete');
	}

	protected updateMinMax(): void {
		// Calculate min/max positions
		this.min = Math.min(this.o.from!, this.o.to!);
		this.max = Math.max(this.o.from!, this.o.to!);
		// Calculate length for step computations in infinite mode
		this.length = Math.abs(this.max - this.min);
		// Initialize the previous total
		this.previousTotal = this.o.from!;
	}

	/**
	 * Get the current snap step value
	 */
	getSnapStep(): number {
		return this.o.snapStep || 0;
	}
	
	/**
	 * Set the snap step value
	 */
	setSnapStep(value: number): void {
		this.o.snapStep = value;
	}
	
	/**
	 * Get current position value for the specified direction
	 */
	getCurrentPosition(direction: string = ''): number {
		const dir = direction || this.o.direction || 'y';
		return this.scrollObject[dir];
	}

	/**
	 * Apply wheel scroll with momentum and bouncing behaviors
	 * @param delta Amount to scroll by
	 * @param acceleration Acceleration factor for momentum (0-2 recommended)
	 */
	applyWheelScroll(delta: number, acceleration: number = 1): void {
		// Cancel any ongoing animations
		this.cancel();
		
		// Get current position
		const currentPos = this.scrollObject[this.o.direction!];
		
		// Calculate target position with acceleration
		const targetPos = currentPos + delta * acceleration;
		
		// Determine scroll limits
		let finalTarget = targetPos;
		
		// Apply limits if not infinite scrolling
		if (!this.o.infinite) {
			finalTarget = Math.max(this.min, Math.min(this.max, targetPos));
			
			// Special case for bouncing when scrolling past limits
			if (targetPos > this.max || targetPos < this.min) {
				// Apply bouncing effect
				if (this.o.bouncing) {
					// Calculate how far past the limit we tried to scroll
					const overscroll = targetPos - finalTarget;
					
					// Use overscroll to determine amount of bounce
					// The further past the limit, the larger the bounce
					if (Math.abs(overscroll) > 20) {
						// Apply bounce effect - go slightly past limit then back
						const bouncePos = finalTarget + (overscroll * 0.2);
						
						// First bounce past limit
						this.tweenTo(0.2, bouncePos);
						
						// Then back to limit
						setTimeout(() => {
							if (!this.destroyed) {
								this.tweenTo(0.5, finalTarget);
							}
						}, 150);
						
						return;
					}
				}
			}
		}
		
		// Calculate duration based on distance and acceleration
		// Longer distances and higher acceleration = longer duration
		const distance = Math.abs(finalTarget - currentPos);
		let duration = Math.min(2, 0.3 + (distance / (100 + acceleration * 30)) * (1 + acceleration * 0.2));
		
		// Ensure minimum duration for small movements
		duration = Math.max(0.2, duration);
		
		// Apply scroll with calculated duration
		this.tweenTo(duration, finalTarget);
	}
} 