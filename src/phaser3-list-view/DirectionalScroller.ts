import Scroller from './Scroller';
import { ScrollerOptions } from './types';

export default class DirectionalScroller extends Scroller {
	constructor(
		game: Phaser.Scene, 
		container: Phaser.GameObjects.GameObject, 
		options: ScrollerOptions = {}
	) {
		super(
			game,
			container,
			{ 
				x: (container as any).width, 
				y: (container as any).height 
			},
			options
		);
	}

	handlePointerDown(pointer: Phaser.Input.Pointer): void {
		this.old = this.down = pointer[this.options.direction === 'x' ? 'x' : 'y'];
		super.handlePointerDown(pointer);
	}

	handlePointerUp(pointer: Phaser.Input.Pointer): void {
		this.current = pointer[this.options.direction === 'x' ? 'x' : 'y'];
		super.handlePointerUp(pointer);
	}
} 