import Phaser from 'phaser';

/**
 * Class ScrollerEventDispatcher is responsible for handling events for the Scroller,
 * distributing input events to the child objects within a container
 */
export default class ScrollerEventDispatcher {
	private scene: Phaser.Scene;
	private clickObject: Phaser.GameObjects.GameObject;
	private items: Phaser.GameObjects.GameObject[] = [];
	private hoveredItem: Phaser.GameObjects.GameObject | null = null;
	private activeItem: Phaser.GameObjects.GameObject | null = null;
	private enabled: boolean = true;
	private isDown: boolean = false;

	constructor(scene: Phaser.Scene, clickObject: Phaser.GameObjects.GameObject) {
		this.scene = scene;
		this.clickObject = clickObject;
		// this.setupEventListeners();
	}

	/**
	 * Setup event listeners for input events
	 */
	private setupEventListeners(): void {
		this.clickObject.setInteractive();
		this.clickObject.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
		this.clickObject.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
		this.clickObject.on(Phaser.Input.Events.POINTER_OVER, this.handlePointerOver, this);
		this.clickObject.on(Phaser.Input.Events.POINTER_OUT, this.handlePointerOut, this);
		this.clickObject.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
	}

	/**
	 * Register a list of clickable objects
	 */
	public registerItems(items: Phaser.GameObjects.GameObject[]): void {
		// Check if hoveredItem is still in the list
		if (this.hoveredItem) {
			const stillExists = items.some(item => item === this.hoveredItem);
			if (!stillExists) {
				this.hoveredItem = null;
			}
		}
		
		this.items = items;
		
		// Check hover item with current pointers
		const pointers = this.scene.input.manager.pointers;
		for (let i = 0; i < pointers.length; i++) {
			const pointer = pointers[i];
			const bounds = this.getBounds(this.clickObject);
			
			if (pointer.active && Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y)) {
				this.updateHoveredItem(pointer);
				break;
			}
		}
	}

	/**
	 * Enable/disable dispatcher
	 */
	public enable(): void {
		this.enabled = true;
	}

	public disable(): void {
		this.enabled = false;
	}

	/**
	 * Clean up resources
	 */
	public destroy(): void {
		this.removeListeners();
		this.items = [];
		this.hoveredItem = null;
		this.activeItem = null;
		this.scene = null as any;
		this.clickObject = null as any;
	}

	/**
	 * Remove event listeners
	 */
	private removeListeners(): void {
		this.clickObject.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
		this.clickObject.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
		this.clickObject.off(Phaser.Input.Events.POINTER_OVER, this.handlePointerOver, this);
		this.clickObject.off(Phaser.Input.Events.POINTER_OUT, this.handlePointerOut, this);
		this.clickObject.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
	}

	/**
	 * Handle pointer down event
	 */
	private handlePointerDown(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled) return;

		this.isDown = true;
		
		// Find item under pointer
		const foundItem = this.findItemAtPointer(pointer);
		if (foundItem) {
			this.activeItem = foundItem;
			if ((foundItem as any).emit) {
				(foundItem as any).emit(Phaser.Input.Events.POINTER_DOWN, foundItem, pointer);
			}
		}
	}

	/**
	 * Handle pointer up event
	 */
	private handlePointerUp(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled || !this.isDown) return;

		this.isDown = false;
		
		// Find item under pointer
		const foundItem = this.findItemAtPointer(pointer);
		
		// If there is an active item and this is not a drag
		if (this.activeItem && !this.isDrag(pointer)) {
			if ((this.activeItem as any).emit) {
				(this.activeItem as any).emit(Phaser.Input.Events.POINTER_UP, this.activeItem, pointer);
			}
			
			// If active item and found item are the same object, send click event
			if (foundItem && foundItem === this.activeItem && (foundItem as any).emit) {
				(foundItem as any).emit('click', foundItem, pointer);
			}
		}
		// If there is no active item but found item under pointer
		else if (foundItem && !this.isDrag(pointer) && (foundItem as any).emit) {
			(foundItem as any).emit(Phaser.Input.Events.POINTER_UP, foundItem, pointer);
		}
		
		// Reset active item
		this.activeItem = null;
	}

	/**
	 * Handle pointer move event
	 */
	private handlePointerMove(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled) return;

		this.updateHoveredItem(pointer);
	}

	/**
	 * Handle pointer over event
	 */
	private handlePointerOver(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled) return;
		
		this.updateHoveredItem(pointer);
	}

	/**
	 * Handle pointer out event
	 */
	private handlePointerOut(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled) return;

		// Send pointer_out for hoveredItem
		if (this.hoveredItem && (this.hoveredItem as any).emit) {
			(this.hoveredItem as any).emit(Phaser.Input.Events.POINTER_OUT, this.hoveredItem, pointer);
			this.hoveredItem = null;
		}

		// Release activeItem if holding mouse
		if (this.activeItem && this.isDown && (this.activeItem as any).emit) {
			(this.activeItem as any).emit(Phaser.Input.Events.POINTER_UP, this.activeItem, pointer);
			this.activeItem = null;
		}
		
		this.isDown = false;
	}

	/**
	 * Update hovered item
	 */
	private updateHoveredItem(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled) return;
		
		// Find item under pointer
		const foundItem = this.findItemAtPointer(pointer);
		
		// No change if still the same object
		if (foundItem === this.hoveredItem) {
			return;
		}
		
		// Case 1: Left an item and moved to a different item or no item
		if (this.hoveredItem && (this.hoveredItem as any).emit) {
			(this.hoveredItem as any).emit(Phaser.Input.Events.POINTER_OUT, this.hoveredItem, pointer);
		}
		
		// Case 2: Moved to a new item
		if (foundItem) {
			this.hoveredItem = foundItem;
			if ((foundItem as any).emit) {
				(foundItem as any).emit(Phaser.Input.Events.POINTER_OVER, foundItem, pointer);
			}
		} else {
			// Left an item and no item under pointer
			this.hoveredItem = null;
		}
	}

	/**
	 * Find object at pointer position
	 */
	private findItemAtPointer(pointer: Phaser.Input.Pointer): Phaser.GameObjects.GameObject | null {
		if (!this.items || this.items.length === 0) return null;
		
		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i];
			if (!item || !(item as any).input || !(item as any).input.enabled) continue;
			
			const bounds = this.getBounds(item);
			if (Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y)) {
				return item;
			}
		}
		
		return null;
	}

	/**
	 * Get bounds of an object
	 */
	private getBounds(object: Phaser.GameObjects.GameObject): Phaser.Geom.Rectangle {
		if ((object as any).getBounds) {
			return (object as any).getBounds();
		}
		
		const worldMatrix = (object as any).getWorldTransformMatrix 
			? (object as any).getWorldTransformMatrix()
			: { tx: (object as any).x, ty: (object as any).y };
		
		return new Phaser.Geom.Rectangle(
			worldMatrix.tx, 
			worldMatrix.ty,
			(object as any).width || 0,
			(object as any).height || 0
		);
	}

	/**
	 * Check if it is a drag action
	 */
	private isDrag(pointer: Phaser.Input.Pointer): boolean {
		const threshold = 10; // Threshold to determine drag
		const distanceX = Math.abs(pointer.downX - pointer.upX);
		const distanceY = Math.abs(pointer.downY - pointer.upY);
		
		return distanceX > threshold || distanceY > threshold;
	}
} 