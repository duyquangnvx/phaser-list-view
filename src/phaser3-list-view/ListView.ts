import Phaser from 'phaser';
import ListViewCore from './ListViewCore';
import DirectionalScroller from './DirectionalScroller';
import { parseBounds } from './utils/Util';
import { Bounds, ListViewOptions, ScrollBarThumbData, DisplayObject } from './types';

const defaultOptions: ListViewOptions = {
	direction: 'y',
	autocull: true,
	momentum: true,
	bouncing: true,
	snapping: false,
	overflow: 100,
	padding: 10,
	searchForClicks: false,
	mouseWheel: true,
	wheelFactor: 0.5,
	scrollBar: true,
	scrollBarColor: 0xcccccc,
	scrollBarAlpha: 0.8,
	scrollBarThickness: 8,
	scrollBarBorderRadius: 3
};

export default class ListView extends ListViewCore {
	protected scroller: DirectionalScroller;
	protected wheelEnabled: boolean;
	protected wheelEvents: {delta: number, time: number}[] = [];
	protected wheelEventTimer: Phaser.Time.TimerEvent | null = null;
	protected scrollBarEnabled: boolean;
	protected scrollBarTrack: Phaser.GameObjects.Graphics;
	protected scrollBarThumb: Phaser.GameObjects.Graphics;
	protected scrollBarData: ScrollBarThumbData;
	protected _batchAdding: boolean = false;
	protected _pendingPosition: number | undefined;
	
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
			
			if (this.scrollBarEnabled) {
				this.updateScrollBarPosition(data.percent);
			}
		});
		
		// Setup items when added
		this.events.onAdded.addListener('added', (limit: number) => {
			// Store current position before updating bounds
			const currentPosition = this.scroller ? this.scroller.getCurrentPosition() : 0;
			const oldTo = this.getScrollTo();
			
			// Update scroller bounds
			const to = Math.min(-limit, 0);
			this.scroller.setFromTo(0, to);
			
			if (this.options.searchForClicks) {
				this.scroller.registerClickables(this.items);
			}
			
			// Create or update scrollbar when content changes
			if (this.scrollBarEnabled) {
				this.updateScrollBar(limit);
			}
			
			// Restore position or adjust it if content got shorter
			if (currentPosition !== 0) {
				// If we were at the very end of the content, stay at the end
				if (oldTo !== 0 && Math.abs(currentPosition - oldTo) < 10) {
					// User was likely at the bottom, so keep them at the bottom
					this.scrollTo(to);
				} else {
					// For other cases, try to maintain the same view position
					this.scrollTo(currentPosition);
				}
			}
		});
		
		// Setup mouse wheel support if enabled
		this.wheelEnabled = this.options.mouseWheel || false;
		if (this.wheelEnabled) {
			this.setupWheelInput(zone);
		}
		
		// Setup scrollbar if enabled
		this.scrollBarEnabled = this.options.scrollBar || false;
		if (this.scrollBarEnabled) {
			this.setupScrollBar();
		}
	}
	
	/**
	 * Setup wheel input for scrolling
	 */
	protected setupWheelInput(zone: Phaser.GameObjects.Zone): void {
		let lastWheelTime = 0;
		let wheelAcceleration = 1;
		
		// Attach wheel event listener to the game canvas
		this.game.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any[], deltaX: number, deltaY: number) => {
			// Skip if wheel is not enabled
			if (!this.wheelEnabled) return;
			
			// Check if pointer is over the zone
			const bounds = zone.getBounds();
			if (!bounds.contains(pointer.x, pointer.y)) return;
			
			// Calculate scroll amount based on direction
			const wheelFactor = this.options.wheelFactor || 0.5;
			let delta = 0;
			
			// Apply appropriate delta based on scroll direction
			if (this.o.direction === 'y') {
				delta = deltaY * wheelFactor;
			} else {
				delta = deltaX * wheelFactor;
			}
			
			// Skip if delta is too small
			if (Math.abs(delta) < 0.1) return;
			
			// Get current time
			const now = this.game.time.now;
			
			// Use acceleration if wheel events happen in quick succession
			if (now - lastWheelTime < 300) {
				// Increase acceleration with rapid wheel movement (max 2x)
				wheelAcceleration = Math.min(2, wheelAcceleration + 0.1);
			} else {
				// Reset acceleration after pause
				wheelAcceleration = 1;
			}
			
			// Update last wheel time
			lastWheelTime = now;
			
			// Add wheel event to queue
			this.wheelEvents.push({
				delta: delta * 10,
				time: now
			});
			
			// Process wheel events with debouncing (wait for multiple events)
			this.processWheelEvents(wheelAcceleration);
		});
	}
	
	/**
	 * Process wheel events with debouncing for smoother scrolling
	 */
	protected processWheelEvents(acceleration: number): void {
		// Clear any existing timer
		if (this.wheelEventTimer) {
			this.wheelEventTimer.remove();
		}
		
		// Set timer to process events after a short delay
		// This helps accumulate multiple rapid wheel events
		this.wheelEventTimer = this.game.time.delayedCall(50, () => {
			// Only process if we have events and scroller
			if (this.wheelEvents.length > 0 && this.scroller) {
				// Calculate accumulated delta
				let totalDelta = 0;
				const now = this.game.time.now;
				
				// Only include events from the last 200ms
				const recentEvents = this.wheelEvents.filter(e => now - e.time < 200);
				
				// Sum up deltas
				recentEvents.forEach(e => {
					totalDelta += e.delta;
				});
				
				// Apply accumulated scroll
				if (totalDelta !== 0) {
					this.scroller.applyWheelScroll(totalDelta, acceleration);
				}
				
				// Clear events
				this.wheelEvents = [];
			}
		});
	}
	
	/**
	 * Enable or disable wheel scrolling
	 */
	enableWheel(enable: boolean = true): void {
		this.wheelEnabled = enable;
		
		// Clear any pending wheel events when disabled
		if (!enable) {
			this.wheelEvents = [];
			if (this.wheelEventTimer) {
				this.wheelEventTimer.remove();
				this.wheelEventTimer = null;
			}
		}
	}
	
	/**
	 * Setup scrollbar elements
	 */
	protected setupScrollBar(): void {
		// Create scrollbar track
		this.scrollBarTrack = this.game.add.graphics();
		this.parent.add(this.scrollBarTrack);
		
		// Create scrollbar thumb
		this.scrollBarThumb = this.game.add.graphics();
		this.parent.add(this.scrollBarThumb);
		
		// Make scroll thumb interactive for drag behavior
		this.scrollBarThumb.setInteractive(new Phaser.Geom.Rectangle(0, 0, 1, 1), 
			Phaser.Geom.Rectangle.Contains);
			
		// Add drag events
		this.initScrollBarInteraction();
		
		// Initial draw of the scrollbar (empty state)
		this.updateScrollBar(0);
	}
	
	/**
	 * Setup scrollbar drag interactions
	 */
	protected initScrollBarInteraction(): void {
		if (!this.scrollBarThumb) return;
		
		this.scrollBarThumb.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			// Stop any ongoing scrolling
			if (this.scroller) {
				this.scroller.cancel();
			}
			
			// Track initial position for drag
			const startDragPos = this.o.direction === 'y' ? pointer.y : pointer.x;
			const startScrollPos = this.scroller ? this.scroller.getCurrentPosition() : 0;
			
			// Add drag move handler
			const moveHandler = (p: Phaser.Input.Pointer) => {
				if (!this.scrollBarData) return;
				
				const currentPos = this.o.direction === 'y' ? p.y : p.x;
				const delta = currentPos - startDragPos;
				
				// Calculate scroll position based on drag distance
				const availableTrack = this.scrollBarData.trackSize - this.scrollBarData.thumbSize;
				// Use the current visible length and position to determine scrolling range
				const scrollRange = this.getScrollRange();
				
				// Map thumb movement to scroll position
				const dragPercent = delta / availableTrack;
				const scrollDelta = dragPercent * scrollRange;
				const newScrollPos = startScrollPos - scrollDelta;
				
				// Apply scroll
				if (this.scroller) {
					this.scroller.setTo(newScrollPos);
				}
			};
			
			// Add up/out handler to clean up
			const upHandler = () => {
				this.game.input.off('pointermove', moveHandler);
				this.game.input.off('pointerup', upHandler);
				this.game.input.off('pointerout', upHandler);
				
				// Re-enable scroller's own interactions
				if (this.scroller) {
					this.scroller.enable();
				}
			};
			
			// Temporarily disable scroller's interactions to prevent conflicts
			if (this.scroller) {
				this.scroller.disable();
			}
			
			// Setup event handlers
			this.game.input.on('pointermove', moveHandler);
			this.game.input.on('pointerup', upHandler);
			this.game.input.on('pointerout', upHandler);
		});
		
		// Also make track clickable to jump to position
		this.scrollBarTrack.setInteractive(new Phaser.Geom.Rectangle(0, 0, 1, 1),
			Phaser.Geom.Rectangle.Contains);
			
		this.scrollBarTrack.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			if (!this.scrollBarData || !this.scroller) return;
			
			// Get click position relative to track
			const isVertical = this.scrollBarData.isVertical;
			const trackStart = isVertical ? this.scrollBarData.trackY : this.scrollBarData.trackX;
			const trackEnd = trackStart + this.scrollBarData.trackSize;
			const clickPos = isVertical ? pointer.y : pointer.x;
			
			// Calculate percentage of click position along track
			const clickPercent = (clickPos - trackStart) / (trackEnd - trackStart);
			
			// Get scroll info using our helper method
			const scrollInfo = this.getScrollInfo();
			if (!scrollInfo) return;
			
			// Calculate target position
			const targetScrollPos = scrollInfo.min + (Math.abs(scrollInfo.max - scrollInfo.min) * (1 - clickPercent));
			
			// Animate scroll to this position
			this.scroller.tweenTo(0.3, targetScrollPos);
		});
	}
	
	/**
	 * Helper method to get scroll range safely
	 */
	protected getScrollRange(): number {
		if (!this.scroller) return 0;
		
		// Get the max scroll length regardless of direction
		let min = 0;
		let max = 0;
		
		// Get latest scroll bounds
		const from = this.getScrollFrom();
		const to = this.getScrollTo();
		
		// Calculate range
		return Math.abs(to - from);
	}
	
	/**
	 * Get scroll from position
	 */
	protected getScrollFrom(): number {
		// Access scroller's internal values indirectly
		if (this.scroller) {
			// The scroller typically sets "from" as 0
			return 0;
		}
		return 0;
	}
	
	/**
	 * Get scroll to position
	 */
	protected getScrollTo(): number {
		// Calculate the maximum scrollable distance
		if (this.items.length === 0) return 0;
		
		// Use the position data to determine max scroll value
		// This should be negative of the total content length minus the visible area
		const contentLength = this.length || 0;
		const visibleLength = this.bounds[this.p.wh] || 0;
		
		return Math.min(0, -(contentLength - visibleLength));
	}
	
	/**
	 * Get scroll information safely
	 */
	protected getScrollInfo(): { min: number; max: number; current: number } | null {
		if (!this.scroller) return null;
		
		return {
			min: this.getScrollFrom(),
			max: this.getScrollTo(),
			current: this.scroller.getCurrentPosition()
		};
	}
	
	/**
	 * Update scrollbar based on content size
	 * @param contentSize Size of content
	 */
	protected updateScrollBar(contentSize: number): void {
		if (!this.scrollBarEnabled || !this.scrollBarTrack || !this.scrollBarThumb) return;
		
		// Clear previous graphics
		this.scrollBarTrack.clear();
		this.scrollBarThumb.clear();
		
		// Get options
		const barThickness = this.options.scrollBarThickness || 8;
		const barColor = this.options.scrollBarColor || 0xcccccc;
		const barAlpha = this.options.scrollBarAlpha || 0.8;
		const borderRadius = this.options.scrollBarBorderRadius || 3;
		
		// Calculate dimensions and positions
		const isVertical = this.o.direction === 'y';
		
		// Position track at the edge of the bounds
		let trackX = this.bounds.x;
		let trackY = this.bounds.y;
		let trackWidth = barThickness;
		let trackHeight = this.bounds.height;
		
		// For horizontal scrolling
		if (!isVertical) {
			trackX = this.bounds.x;
			trackY = this.bounds.y + this.bounds.height - barThickness;
			trackWidth = this.bounds.width;
			trackHeight = barThickness;
		} else {
			// For vertical scrolling
			trackX = this.bounds.x + this.bounds.width - barThickness;
			trackY = this.bounds.y;
			trackWidth = barThickness;
			trackHeight = this.bounds.height;
		}
		
		// Draw track (background of scrollbar)
		this.scrollBarTrack.fillStyle(barColor, barAlpha * 0.5);
		this.scrollBarTrack.fillRoundedRect(trackX, trackY, trackWidth, trackHeight, borderRadius);
		
		// Calculate thumb size and position
		// Thumb size is relative to content size vs visible area
		const visibleRatio = Math.min(1, this.bounds[isVertical ? 'height' : 'width'] / Math.max(1, contentSize));
		
		let thumbWidth = trackWidth;
		let thumbHeight = Math.max(20, trackHeight * visibleRatio);
		
		if (!isVertical) {
			thumbWidth = Math.max(20, trackWidth * visibleRatio);
			thumbHeight = trackHeight;
		}
		
		// Create or update data for scrollbar
		this.scrollBarData = {
			thumbSize: isVertical ? thumbHeight : thumbWidth,
			trackSize: isVertical ? trackHeight : trackWidth,
			isVertical: isVertical,
			trackX: trackX,
			trackY: trackY
		};
		
		// Draw initial thumb at position 0
		this.updateScrollBarPosition(0);
	}
	
	/**
	 * Update scroll thumb position based on scroll percentage
	 * @param percent Scroll position as percentage (0-1)
	 */
	protected updateScrollBarPosition(percent: number): void {
		if (!this.scrollBarEnabled || !this.scrollBarThumb || !this.scrollBarData) return;
		
		// Bounds check
		percent = Math.max(0, Math.min(1, percent));
		
		// Clear previous thumb
		this.scrollBarThumb.clear();
		
		// Get options
		const barColor = this.options.scrollBarColor || 0xcccccc;
		const barAlpha = this.options.scrollBarAlpha || 0.8;
		const borderRadius = this.options.scrollBarBorderRadius || 3;
		const isVertical = this.scrollBarData.isVertical;
		
		// Calculate thumb position based on percent
		const availableTrack = this.scrollBarData.trackSize - this.scrollBarData.thumbSize;
		const thumbOffset = percent * availableTrack;
		
		// Calculate thumb position
		let thumbX = this.scrollBarData.trackX;
		let thumbY = this.scrollBarData.trackY;
		const thumbWidth = isVertical ? this.options.scrollBarThickness || 8 : this.scrollBarData.thumbSize;
		const thumbHeight = isVertical ? this.scrollBarData.thumbSize : this.options.scrollBarThickness || 8;
		
		// Position thumb based on direction
		if (isVertical) {
			thumbY += thumbOffset;
		} else {
			thumbX += thumbOffset;
		}
		
		// Draw thumb
		this.scrollBarThumb.fillStyle(barColor, barAlpha);
		this.scrollBarThumb.fillRoundedRect(thumbX, thumbY, thumbWidth, thumbHeight, borderRadius);
	}
	
	/**
	 * Enable or disable scrollbar
	 */
	enableScrollBar(enable: boolean = true): void {
		this.scrollBarEnabled = enable;
		
		// Setup scrollbar if it wasn't enabled before
		if (enable && !this.scrollBarTrack) {
			this.setupScrollBar();
		}
		
		// Show or hide existing scrollbar
		if (this.scrollBarTrack) {
			this.scrollBarTrack.setVisible(enable);
		}
		
		if (this.scrollBarThumb) {
			this.scrollBarThumb.setVisible(enable);
		}
	}
	
	/**
	 * Clean up resources used by this list
	 */
	destroy(): void {
		if (this.wheelEnabled) {
			this.game.input.off('wheel');
		}
		
		if (this.wheelEventTimer) {
			this.wheelEventTimer.remove();
			this.wheelEventTimer = null;
		}
		
		// Clean up scrollbar graphics
		if (this.scrollBarTrack) {
			this.scrollBarTrack.destroy();
			this.scrollBarTrack = null as any;
		}
		
		if (this.scrollBarThumb) {
			this.scrollBarThumb.destroy();
			this.scrollBarThumb = null as any;
		}
		
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
	
	/**
	 * Add a child to the list and optionally auto-scroll to new item
	 * @param child The display object to add
	 * @param scrollToItem Whether to scroll to the newly added item
	 */
	add(child: DisplayObject, scrollToItem: boolean = false): DisplayObject {
		// Add item to list with parent's implementation
		const result = super.add(child);
		
		// Optionally scroll to the newly added item
		if (scrollToItem) {
			// Use a small delay to ensure list updates first
			this.game.time.delayedCall(50, () => {
				this.tweenToItem(this.items.length - 1);
			});
		}
		
		return result;
	}
	
	/**
	 * Add multiple items to list and optionally scroll to the last added item
	 * @param children Items to add to the list
	 */
	addMultiple(...children: DisplayObject[]): void {
		// Use a temporary flag to prevent scrolling reset during batch adds
		this._batchAdding = true;
		
		// Add all items
		children.forEach((child, index) => {
			if (index === children.length - 1) {
				// Last item, reset batch flag
				this._batchAdding = false;
			}
			this.add(child);
		});
	}
	
	/**
	 * Add multiple items and scroll to the last one
	 * @param children Items to add to the list
	 */
	addMultipleAndScrollToLast(...children: DisplayObject[]): void {
		// Add all items
		this.addMultiple(...children);
		
		// Scroll to the last item
		if (children.length > 0) {
			// Use a small delay to ensure list updates first
			this.game.time.delayedCall(50, () => {
				this.tweenToItem(this.items.length - 1);
			});
		}
	}
	
	/**
	 * Override parent's _setPosition to handle batch operations
	 */
	_setPosition(position: number): void {
		// If we're batch adding, only update thumb position but don't
		// move the list until the batch is complete
		if (this._batchAdding) {
			// Update thumb position only if we need to
			if (this.scrollBarEnabled && this.scrollBarThumb) {
				const percent = this.calculateScrollPercent(position);
				this.updateScrollBarPosition(percent);
			}
			
			// Store position for later application
			this._pendingPosition = position;
		} else {
			// Apply position normally using parent implementation
			super._setPosition(position);
			
			// Clear any pending position
			this._pendingPosition = undefined;
		}
	}
	
	/**
	 * Calculate scroll percentage based on current position
	 * @param position Current scroll position 
	 */
	protected calculateScrollPercent(position: number): number {
		const info = this.getScrollInfo();
		if (!info || info.min === info.max) return 0;
		
		return Math.min(1, Math.max(0, 
			1 - ((position - info.min) / (info.max - info.min))
		));
	}
	
	/**
	 * Set option value
	 * @param key Option key
	 * @param value Option value
	 */
	setOption(key: string, value: any): void {
		if (this.o && key in this.o) {
			(this.o as any)[key] = value;
		}
	}
	
	/**
	 * Get option value
	 * @param key Option key
	 * @returns Option value or undefined
	 */
	getOption(key: string): any {
		if (this.o && key in this.o) {
			return (this.o as any)[key];
		}
		return undefined;
	}
	
	/**
	 * Set main axis alignment
	 * @param align Alignment value: 'start', 'center', or 'end'
	 */
	setAlign(align: 'start' | 'center' | 'end'): void {
		this.setOption('align', align);
	}
	
	/**
	 * Get main axis alignment
	 */
	getAlign(): 'start' | 'center' | 'end' {
		return this.getOption('align') || 'start';
	}
	
	/**
	 * Set cross axis alignment for content
	 * @param align Alignment value: 'start', 'center', or 'end'
	 */
	setContentAlign(align: 'start' | 'center' | 'end'): void {
		this.setOption('contentAlign', align);
	}
	
	/**
	 * Get cross axis alignment for content
	 */
	getContentAlign(): 'start' | 'center' | 'end' {
		return this.getOption('contentAlign') || 'start';
	}
	
	/**
	 * Set uniform width for all items
	 * @param width Width value or undefined to use original sizes
	 */
	setUniformWidth(width?: number): void {
		this.setOption('uniformWidth', width);
	}
	
	/**
	 * Set uniform height for all items
	 * @param height Height value or undefined to use original sizes
	 */
	setUniformHeight(height?: number): void {
		this.setOption('uniformHeight', height);
	}
	
	/**
	 * Get uniform width value
	 */
	getUniformWidth(): number | undefined {
		return this.getOption('uniformWidth');
	}
	
	/**
	 * Get uniform height value
	 */
	getUniformHeight(): number | undefined {
		return this.getOption('uniformHeight');
	}
	
	/**
	 * Set spacing between items
	 * @param spacing Spacing value or undefined to use padding
	 */
	setItemSpacing(spacing?: number): void {
		this.setOption('itemSpacing', spacing);
	}
	
	/**
	 * Get spacing between items
	 */
	getItemSpacing(): number | undefined {
		return this.getOption('itemSpacing');
	}
} 