import Phaser from 'phaser';
import { getWidthOrHeight } from './utils/Util';
import { Bounds, ListViewOptions, DisplayObject } from './types';

const defaultOptions: ListViewOptions = {
	direction: 'y',
	autocull: true,
	padding: 10,
	mouseWheel: false,
	wheelFactor: 0.5
};

export default class ListViewCore {
	protected game: Phaser.Scene;
	protected parent: Phaser.GameObjects.Container;
	protected bounds: Bounds;
	protected options: ListViewOptions;
	protected o: ListViewOptions;
	protected items: DisplayObject[];
	protected p: { xy: 'x' | 'y'; wh: 'width' | 'height' };
	protected grp: Phaser.GameObjects.Container;
	protected mask: Phaser.Display.Masks.GeometryMask;
	protected maskGraphics: Phaser.GameObjects.Graphics;
	protected position: number;
	protected length: number;
	public events: Record<string, Phaser.Events.EventEmitter>;
	
	constructor(
		game: Phaser.Scene,
		parent: Phaser.GameObjects.Container,
		bounds: Bounds,
		options: ListViewOptions = {}
	) {
		this.game = game;
		this.parent = parent;
		this.bounds = bounds;
		this.o = this.options = Object.assign({}, defaultOptions, options);
		
		this.items = [];
		
		// Set direction properties
		if (this.o.direction === 'y') {
			this.p = { xy: 'y', wh: 'height' };
		} else {
			this.p = { xy: 'x', wh: 'width' };
		}
		
		// Create container for list items
		this.grp = this.game.add.container(bounds.x, bounds.y);
		this.parent.add(this.grp);
		
		// Setup event emitters
		this.events = {
			onAdded: new Phaser.Events.EventEmitter()
		};
		
		this.position = 0;
		
		// Create mask
		this.createMask();
		
		// Add update listener to track container movement
		this.game.events.on('postupdate', this.updateMaskPosition.bind(this));
	}
	
	/**
	 * Update mask position in each frame to follow parent container
	 */
	private updateMaskPosition(): void {
		if (this.maskGraphics && this.parent) {
			// Get the world transform of the parent container
			const world = this.parent.getWorldTransformMatrix();
			
			// Update mask position
			this.maskGraphics.x = world.tx + this.bounds.x;
			this.maskGraphics.y = world.ty + this.bounds.y;
		}
	}
	
	/**
	 * Create mask for the list view
	 */
	private createMask(): void {
		// Create a standalone graphics object for the mask
		// It must not be part of any container to work properly
		this.maskGraphics = this.game.add.graphics();
		
		// Draw mask shape at origin (0,0) since we'll position it separately
		this.maskGraphics.clear();
		this.maskGraphics.fillStyle(0xffffff);
		this.maskGraphics.fillRect(0, 0, this.bounds.width, this.bounds.height);
		
		// Create mask from graphics
		this.mask = new Phaser.Display.Masks.GeometryMask(this.game, this.maskGraphics);
		
		// Apply mask to container
		this.grp.setMask(this.mask);
		
		// Position is set in updateMaskPosition
		this.maskGraphics.setVisible(false);
	}
	
	/**
	 * Add a child to the list
	 * Stacks them on top of each other by measuring their height and adding custom padding
	 * @param child The display object to add to the list
	 */
	add(child: DisplayObject): DisplayObject {
		this.items.push(child);
		
		// Calculate position for the new item
		let xy = 0;
		
		if (this.grp.length > 0) {
			const lastChild = this.grp.getAt(this.grp.length - 1) as DisplayObject;
			xy = lastChild[this.p.xy] + getWidthOrHeight(lastChild, this.p.wh) + this.o.padding!;
		}
		
		// Set position and add to group
		child[this.p.xy] = xy;
		this.grp.add(child);
		
		// Calculate total length
		this.length = xy + child[this.p.wh];
		
		// Dispatch onAdded event
		this.events.onAdded.emit('added', this.length - this.bounds[this.p.wh]);
		
		return child;
	}
	
	/**
	 * Add multiple children to the list at once
	 * @param children Array of display objects to add
	 */
	addMultiple(...children: DisplayObject[]): void {
		children.forEach(child => this.add(child));
	}
	
	/**
	 * Remove a child from the list
	 * @param child The display object to remove
	 */
	remove(child: DisplayObject): DisplayObject | undefined {
		this.grp.remove(child);
		
		const index = this.items.indexOf(child);
		if (index === -1) return undefined;
		
		this.items.splice(index, 1);
		return child;
	}
	
	/**
	 * Clean up resources used by this list
	 */
	destroy(): void {
		if (this.events.onAdded) {
			this.events.onAdded.removeAllListeners();
		}
		
		this.game.events.off('postupdate', this.updateMaskPosition.bind(this));

		// Cleanup mask resources
		if (this.maskGraphics) {
			this.maskGraphics.destroy();
		}
		
		this.events = null as any;
		this.grp.destroy();
		this.grp = null as any;
		this.game = null as any;
		this.parent = null as any;
		this.items = null as any;
	}
	
	/**
	 * Remove all children from the list
	 * Note: This does not reset the position of the list
	 */
	removeAll(): void {
		this.grp.removeAll();
		this.items = [];
		this.length = 0;
		
		// Emit onAdded event with limit 0 to notify subscribers that content was cleared
		this.events.onAdded.emit('added', 0);
	}
	
	/**
	 * Cull off-screen list elements to improve performance
	 * Automatically called when moving the list if autocull is enabled
	 */
	cull(): void {
		for (let i = 0; i < this.items.length; i++) {
			const child = this.items[i];
			child.visible = true;
			
			if (
				child[this.p.xy] +
				getWidthOrHeight(child, this.p.wh) +
				this.grp[this.p.xy] <
				this.bounds[this.p.xy]
			) {
				child.visible = false;
			} else if (
				child[this.p.xy] + this.grp[this.p.xy] >
				this.bounds[this.p.xy] + this.bounds[this.p.wh]
			) {
				child.visible = false;
			}
		}
	}
	
	/**
	 * Get position by item index
	 * @param index Index of the item
	 */
	getPositionByItemIndex(index: number): number {
		return -this.items[index][this.p.xy];
	}
	
	/**
	 * Move the list to a specific position
	 * @param position Target position
	 */
	scrollTo(position: number): void {
		if (this.scroller) {
			this.scroller.setTo(position);
		} else {
			this._setPosition(position);
		}
	}
	
	/**
	 * Move to a specific item by index
	 * @param index Index of the target item
	 */
	scrollToItem(index: number): void {
		if (this.scroller) {
			this.scroller.setTo(this.getPositionByItemIndex(index));
		} else {
			this._setPosition(this.getPositionByItemIndex(index));
		}
	}
	
	/**
	 * Tween to a specific position with animation
	 * @param position Target position
	 * @param duration Duration of the animation in seconds
	 */
	tweenToPosition(position: number, duration: number = 1): void {
		if (this.scroller) {
			this.scroller.tweenTo(duration, position);
		} else {
			// Simple tween fallback if no scroller is available
			this.game.tweens.add({
				targets: { pos: this.position },
				pos: position,
				duration: duration * 1000,
				ease: 'Quad.easeOut',
				onUpdate: (tween, target) => {
					this._setPosition(target.pos);
				}
			});
		}
	}
	
	/**
	 * Tween to a specific item by index with animation
	 * @param index Index of the target item
	 * @param duration Duration of the animation in seconds
	 */
	tweenToItem(index: number, duration: number = 1): void {
		this.tweenToPosition(this.getPositionByItemIndex(index), duration);
	}
	
	/**
	 * @private
	 * Set the position of the list
	 */
	_setPosition(position: number): void {
		this.position = position;
		this.grp[this.p.xy] = this.bounds[this.p.xy] + position;
		
		if (this.o.autocull) {
			this.cull();
		}
	}
	
	// Property to be defined by ListView subclass
	protected scroller: any;
} 