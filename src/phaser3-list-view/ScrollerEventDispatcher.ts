import Phaser from 'phaser';
import { ScrollerOptions } from './types';

export default class ScrollerEventDispatcher {
	private game: Phaser.Game;
	private clickObject: Phaser.GameObjects.GameObject;
	private options: ScrollerOptions;
	private enabled: boolean = true;
	public events: Record<string, Phaser.Events.EventEmitter>;
	
	constructor(game: Phaser.Game, clickObject: Phaser.GameObjects.GameObject, options: ScrollerOptions = {}) {
		this.game = game;
		this.clickObject = clickObject;
		this.options = Object.assign({}, options);
		
		this.addListeners();
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
		
		if (this.options.addListeners !== false) {
			// In Phaser 3, we need to make objects interactive
			const interactive = this.clickObject as Phaser.GameObjects.Zone;
			
			if (interactive.setInteractive) {
				interactive.setInteractive();
				
				// Add event listeners
				interactive.on('pointerdown', this.handleDown, this);
				interactive.on('pointerup', this.handleUp, this);
			}
		}
	}
	
	removeListeners(): void {
		if (this.options.addListeners !== false) {
			const interactive = this.clickObject as Phaser.GameObjects.Zone;
			
			if (interactive.off) {
				interactive.off('pointerdown', this.handleDown, this);
				interactive.off('pointerup', this.handleUp, this);
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
	
	handleDown(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled) return;
		
		this.events.onInputDown.emit('pointerdown', this.clickObject, pointer);
	}
	
	handleMove(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled) return;
		
		this.events.onInputMove.emit('pointermove', this.clickObject, pointer);
	}
	
	handleUp(pointer: Phaser.Input.Pointer): void {
		if (!this.enabled) return;
		
		this.events.onInputUp.emit('pointerup', this.clickObject, pointer);
	}
	
	destroy(): void {
		this.removeListeners();
		this.events = null as any;
		this.clickObject = null as any;
		this.game = null as any;
		this.options = null as any;
	}
} 