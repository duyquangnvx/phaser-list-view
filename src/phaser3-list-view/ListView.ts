import Phaser from 'phaser';
import ListViewCore from './ListViewCore';
import DirectionalScroller from './DirectionalScroller';
import { parseBounds } from './utils/Util';
import { Bounds, ListViewOptions } from './types';

const defaultOptions: ListViewOptions = {
	direction: 'y',
	autocull: true,
	momentum: true,
	bouncing: true,
	snapping: false,
	overflow: 100,
	padding: 10,
	searchForClicks: false
};

export default class ListView extends ListViewCore {
	protected scroller: DirectionalScroller;
	
	constructor(
		game: Phaser.Scene,
		parent: Phaser.GameObjects.Container,
		bounds: Bounds,
		options: ListViewOptions = {}
	) {
		super(
			game,
			parent,
			parseBounds(bounds),
			Object.assign({}, defaultOptions, options)
		);
		
		// Create a zone for interaction
		const zone = this.game.add.zone(bounds.x, bounds.y, bounds.width, bounds.height);
		zone.setOrigin(0, 0);
		zone.setInteractive();
		parent.add(zone);
		
		// Create the scroller with same bounds as the list
		this.scroller = new DirectionalScroller(
			this.game,
			zone,
			Object.assign(
				{
					from: 0,
					to: 0
				},
				this.options
			)
		);
		
		// Listen for scroll updates
		this.scroller.events.onUpdate.addListener('update', (data: any) => {
			this._setPosition(data.total);
		});
		
		// Setup items when added
		this.events.onAdded.addListener('added', (limit: number) => {
			const to = Math.min(-limit, 0);
			this.scroller.setFromTo(0, to);
			
			if (this.options.searchForClicks) {
				this.scroller.registerClickables(this.items);
			}
		});
	}
	
	/**
	 * Clean up resources used by this list
	 */
	destroy(): void {
		if (this.scroller) {
			this.scroller.destroy();
			this.scroller = null as any;
		}
		
		super.destroy();
	}
	
	/**
	 * Reset the list and scroller to initial position
	 */
	reset(): void {
		this._setPosition(0);
		this.scroller.reset();
	}
} 