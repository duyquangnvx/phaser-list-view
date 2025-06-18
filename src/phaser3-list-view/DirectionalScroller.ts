import Phaser from 'phaser';
import Scroller from './Scroller';
import { ScrollerOptions } from './types';

export default class DirectionalScroller extends Scroller {
	constructor(
		game: Phaser.Scene, 
		clickObject: Phaser.GameObjects.GameObject, 
		options: ScrollerOptions = {}
	) {
		super(
			game,
			clickObject,
			{ 
				x: (clickObject as any).width, 
				y: (clickObject as any).height 
			},
			options
		);
	}

	handleDown(pointer: Phaser.Input.Pointer): void {
		this.old = this.down = pointer[this.o.direction === 'x' ? 'x' : 'y'];
		super.handleDown(pointer);
	}

	handleUp(pointer: Phaser.Input.Pointer): void {
		this.current = pointer[this.o.direction === 'x' ? 'x' : 'y'];
		super.handleUp(pointer);
	}
} 