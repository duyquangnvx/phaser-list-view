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
	searchForClicks: false,
	mouseWheel: true,
	wheelFactor: 0.5
};

export default class ListView extends ListViewCore {
	protected scroller: DirectionalScroller;
	protected wheelEnabled: boolean;
	protected wheelEvents: {delta: number, time: number}[] = [];
	protected wheelEventTimer: Phaser.Time.TimerEvent | null = null;
	
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
		
		// Setup mouse wheel support if enabled
		this.wheelEnabled = this.options.mouseWheel || false;
		if (this.wheelEnabled) {
			this.setupWheelInput(zone);
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