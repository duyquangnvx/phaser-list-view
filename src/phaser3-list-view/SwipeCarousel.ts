import Phaser from 'phaser';
import ListView from './ListView';
import { Bounds, ListViewOptions } from './types';

// Interface extends SwipeCarousel options
interface SwipeCarouselOptions extends ListViewOptions {
	offset?: {
		x?: number;
		y?: number;
	};
	swipeEnabled?: boolean;
}

const defaultOptions: SwipeCarouselOptions = {
	direction: 'x',
	autocull: true,
	momentum: false,
	bouncing: true,
	snapping: true,
	overflow: 100,
	padding: 10,
	swipeEnabled: true,
	offset: {
		x: 100
	}
};

export default class SwipeCarousel extends ListView {
	constructor(
		game: Phaser.Scene,
		parent: Phaser.GameObjects.Container,
		bounds: Bounds,
		options: SwipeCarouselOptions = {}
	) {
		super(game, parent, bounds, Object.assign({}, defaultOptions, options));

		if (this.scroller) {
			this.scroller.setSnapStep(bounds.width + (this.options.padding || 0));
		}
	}

	/**
	 * Move to the slide by index
	 * @param index The index of the slide to display
	 * @param duration The animation duration (seconds)
	 */
	moveToItem(index: number, duration: number = 1): void {
		this.tweenToItem(index, duration);
	}

	/**
	 * Move to the next slide
	 * @param duration The animation duration (seconds)
	 */
	next(duration: number = 0.5): void {
		if (!this.scroller) return;
		
		// Find the current slide index based on position
		const currentPos = this.getCurrentPosition();
		const snapStep = this.getSnapStep();
		if (!snapStep) return;
		
		const currentIndex = Math.round(currentPos / snapStep);
		
		// Move to the next slide if not the last slide
		if (currentIndex < this.items.length - 1) {
			this.tweenToItem(currentIndex + 1, duration);
		}
	}

	/**
	 * Move to the previous slide
	 * @param duration The animation duration (seconds)
	 */
	previous(duration: number = 0.5): void {
		if (!this.scroller) return;
		
		// Find the current slide index based on position
		const currentPos = this.getCurrentPosition();
		const snapStep = this.getSnapStep();
		if (!snapStep) return;
		
		const currentIndex = Math.round(currentPos / snapStep);
		
		// Move to the previous slide if not the first slide
		if (currentIndex > 0) {
			this.tweenToItem(currentIndex - 1, duration);
		}
	}
	
	/**
	 * Get the current position of the carousel
	 */
	private getCurrentPosition(): number {
		if (!this.scroller) return 0;
		const direction = this.options.direction || 'x';
		// Use the safe method to get the value
		return Math.abs(this.scroller.getCurrentPosition(direction));
	}
	
	/**
	 * Get the snapStep value from the scroller
	 */
	private getSnapStep(): number | null {
		if (!this.scroller) return null;
		return this.scroller.getSnapStep();
	}
}
