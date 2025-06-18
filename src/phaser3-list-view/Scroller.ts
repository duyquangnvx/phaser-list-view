import Phaser from 'phaser';
import MathUtils from './utils/MathUtils';
import { ScrollerOptions, MaskLimits, DispatchValues } from './types';

// Default scroller configuration
const DEFAULT_OPTIONS: ScrollerOptions = {
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
    infinite: false,
};

export default class Scroller {
    // Core properties
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.GameObject;
    protected options: ScrollerOptions;
    private maskLimits: MaskLimits;
    private scrollObject: Record<string, number> = {};
    private dispatchValues: DispatchValues = { step: 0, total: 0, percent: 0 };
    private tweenScroll?: Phaser.Tweens.Tween;
    protected events: Record<string, Phaser.Events.EventEmitter> = {};

    // State tracking
    private enabled = true;
    private isScrolling = false;
    private isDown = false;
    private destroyed = false;
    private activePointer: Phaser.Input.Pointer | null = null;

    // Scroll calculations
    private min = 0;
    private max = 0;
    private maxOffset = 0;
    private target = 0;
    protected old = 0;
    protected down = 0;
    private diff = 0;
    private acc = 0;
    protected current = 0;
    private length = 0;
    private previousTotal = 0;

    constructor(
        scene: Phaser.Scene,
        container: Phaser.GameObjects.GameObject,
        maskLimits: MaskLimits = {},
        options: Partial<ScrollerOptions> = {},
    ) {
        this.scene = scene;
        this.container = container;
        this.maskLimits = maskLimits;
        this.options = { ...DEFAULT_OPTIONS, ...options };

        this.initialize();
        this.setupEvents();
        this.createScrollTween();
    }

    // Initialization Methods
    private initialize(): void {
        this.scrollObject[this.options.direction!] = this.options.from!;
        this.maxOffset = this.maskLimits[this.options.direction!]! * this.options.speedLimit!;
        this.previousTotal = this.options.from!;
        this.updateBoundaries();
        this.enable();
    }

    private setupEvents(): void {
        this.events = {
            onUpdate: new Phaser.Events.EventEmitter(),
            onInputUp: new Phaser.Events.EventEmitter(),
            onInputDown: new Phaser.Events.EventEmitter(),
            onInputMove: new Phaser.Events.EventEmitter(),
            onInputOut: new Phaser.Events.EventEmitter(),
            onComplete: new Phaser.Events.EventEmitter(),
            onSwipe: new Phaser.Events.EventEmitter(),
        };

        if (this.options.addListeners) {
            this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
            this.scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
            this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
        }
    }

    private createScrollTween(): void {
        this.tweenScroll = this.scene.tweens.add({
            targets: this.scrollObject,
            duration: 0,
            ease: 'Quad.easeOut',
            paused: true,
            onUpdate: () => this.updateTween(),
            onComplete: () => this.completeTween(),
        });
    }

    // Cleanup Methods
    public destroy(): void {
        this.tweenScroll?.stop().remove();
        this.removeEventListeners();
        this.container?.destroy();
        this.options = null as any;
        this.maskLimits = null as any;
        this.enabled = false;
        this.scene = null as any;
        this.dispatchValues = null as any;
        this.isDown = null as any;
        this.target = null as any;
        this.destroyed = true;
    }

    private removeEventListeners(): void {
        if (this.options.addListeners) {
            this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
            this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
            this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
        }

        Object.values(this.events).forEach((event) => event.removeAllListeners());
    }

    // Pointer Interaction Methods
    private isPointerOverObject(pointer: Phaser.Input.Pointer): boolean {
        const bounds = this.getClickObjectBounds();
        return Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y);
    }

    private getClickObjectBounds(): Phaser.Geom.Rectangle {
        if ((this.container as any).getBounds) {
            return (this.container as any).getBounds();
        }

        const worldMatrix = (this.container as any).getWorldTransformMatrix
            ? (this.container as any).getWorldTransformMatrix()
            : { tx: (this.container as any).x, ty: (this.container as any).y };

        return new Phaser.Geom.Rectangle(
            worldMatrix.tx,
            worldMatrix.ty,
            (this.container as any).width || 0,
            (this.container as any).height || 0,
        );
    }

    protected handlePointerDown(pointer: Phaser.Input.Pointer): void {
        if (!this.enabled || !this.isPointerOverObject(pointer)) return;

        this.activePointer = pointer;
        this.startScroll(pointer);
    }

    protected handlePointerMove(pointer: Phaser.Input.Pointer): void {
        if (!this.enabled || !this.activePointer || this.activePointer.id !== pointer.id) return;

        this.updateScroll(pointer);
    }

    protected handlePointerUp(pointer: Phaser.Input.Pointer): void {
        if (!this.enabled || !this.activePointer || this.activePointer.id !== pointer.id) return;

        this.endScroll(pointer);
        this.activePointer = null;
    }

    // Scroll Control Methods
    public enable(): void {
        this.enabled = true;
    }

    public disable(): void {
        this.enabled = false;
    }

    public reset(): void {
        this.tweenScroll?.pause();
        this.options.multiplier = 1;
        this.initialize();
    }

    public setFromTo(from: number, to: number): void {
        this.options.from = from;
        this.options.to = to;
        this.updateBoundaries();
    }

    public isTweening(): boolean {
        return this.tweenScroll?.isPlaying() || false;
    }

    // Scroll Handling Methods
    private startScroll(pointer: Phaser.Input.Pointer): void {
        if (!this.enabled) return;

        this.isDown = true;
        this.target = this.scrollObject[this.options.direction!];
        this.options.time.down = pointer.downTime;
        this.old = this.down = pointer[this.options.direction === 'x' ? 'x' : 'y'];

        if (this.isTweening() && this.options.time.down - this.options.time.up < this.options.accelerationT!) {
            this.options.multiplier! += this.options.acceleration!;
        } else {
            this.options.multiplier = 1;
        }

        this.tweenScroll?.stop();
        this.events.onInputDown.emit('down', pointer);
    }

    private updateScroll(pointer: Phaser.Input.Pointer): void {
        if (!this.enabled || !this.isDown) return;

        this.isScrolling = true;
        const currentPosition = pointer[this.options.direction === 'x' ? 'x' : 'y'];
        this.diff = this.old - currentPosition;
        this.diff = this.calculateDiff(this.diff, this.target, this.min, this.max, this.options.overflow!);
        this.target -= this.diff;
        this.old = currentPosition;
        this.options.time.move = this.scene.time.now;
        this.acc = Math.min(Math.abs(this.diff / 30), this.options.maxAcceleration!);

        this.scrollObject[this.options.direction!] = this.target;
        this.updateTween();

        if (this.options.emitMoving) {
            this.events.onInputMove.emit('move', pointer, pointer.x, pointer.y);
        }
    }

    private endScroll(pointer: Phaser.Input.Pointer): void {
        if (!this.enabled || !this.isDown) return;

        this.isDown = false;
        this.options.time.up = pointer.upTime;

        if (this.options.time.up - this.options.time.down > this.options.accelerationT!) {
            this.options.multiplier = 1;
        }

        if (!this.options.infinite) {
            if (this.scrollObject[this.options.direction!] > this.max) {
                this.target = this.max;
                this.tweenTo(this.options.bouncing ? 1 : 0.01, this.target);
                this.events.onInputUp.emit('up', pointer);
                return;
            } else if (this.scrollObject[this.options.direction!] < this.min) {
                this.target = this.min;
                this.tweenTo(this.options.bouncing ? 1 : 0.01, this.target);
                this.events.onInputUp.emit('up', pointer);
                return;
            }
        }

        const scrollOptions = {
            duration: this.options.duration!,
            target: this.target,
        };

        if (this.options.momentum && this.isScrolling) {
            this.applyMomentum(scrollOptions);
        }
        if (this.options.swipeEnabled) {
            this.applySwipe(scrollOptions, pointer);
        }
        if (this.options.snapping) {
            this.applySnapping(scrollOptions);
        }

        this.applyLimits(scrollOptions);
        this.calculateScrollDuration(scrollOptions);
        this.tweenTo(scrollOptions.duration, scrollOptions.target);

        this.events.onInputUp.emit('up', pointer);
    }

    // Scroll Effects
    private applyMomentum(options: { duration: number; target: number }): void {
        if (!this.options.momentum) return;

        let offset = Math.pow(this.acc, 2) * this.maskLimits[this.options.direction!]!;
        offset = Math.min(this.maxOffset, offset);
        offset = this.diff > 0 ? -this.options.multiplier! * offset : this.options.multiplier! * offset;

        if (
            this.options.time.up - this.options.time.move < this.options.flickTimeThreshold! &&
            offset !== 0 &&
            Math.abs(offset) > this.options.offsetThreshold!
        ) {
            options.target += offset;
        }
    }

    private applySwipe(options: { duration: number; target: number }, pointer: Phaser.Input.Pointer): void {
        const swipeDistance = Math.abs(this.down - this.current);
        if (
            this.options.swipeEnabled &&
            this.options.time.up - this.options.time.down < this.options.swipeTimeThreshold! &&
            swipeDistance > this.options.swipeThreshold!
        ) {
            const direction = pointer[this.options.direction!] < this.down ? 'forward' : 'backward';
            options.target += direction === 'forward' ? -this.options.snapStep! / 2 : this.options.snapStep! / 2;
            this.events.onSwipe.emit('swipe', direction);
        }
    }

    private applySnapping(options: { duration: number; target: number }): void {
        if (!this.options.snapping) return;
        options.target = MathUtils.nearestMultiple(options.target, this.options.snapStep!);
    }

    private applyLimits(options: { duration: number; target: number }): void {
        if (this.options.infinite) return;
        options.target = Math.max(this.min, Math.min(this.max, options.target));
    }

    private calculateScrollDuration(options: { duration: number; target: number }): void {
        const distance = Math.abs(options.target - this.scrollObject[this.options.direction!]);
        options.duration = this.options.duration! * distance / this.maxOffset;
        options.duration = Math.max(this.options.minDuration!, options.duration);
    }

    private calculateDiff(diff: number, target: number, min: number, max: number, overflow: number): number {
        if (this.options.infinite) return diff;

        if (overflow === 0) {
            if (target > max) return diff + (target - max);
            if (target < min) return diff - (min - target);
            return diff;
        }

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

    // Tween Methods
    public tweenToSnap(duration: number, snapIndex: number): void {
        const target = this.options.from! + snapIndex * this.options.snapStep!;
        this.tweenTo(duration, target);
    }

    public tweenTo(duration: number, target: number): void {
        if (this.destroyed || duration === 0) {
            this.setTo(target);
            return;
        }

        this.tweenScroll?.stop();
        this.tweenScroll = this.scene.tweens.add({
            targets: this.scrollObject,
            duration: duration * 1000,
            ease: 'Quad.easeOut',
            [this.options.direction!]: target,
            onUpdate: () => this.updateTween(),
            onComplete: () => this.completeTween(),
        });
    }

    public cancel(): void {
        this.isDown = false;
        this.isScrolling = false;
        this.tweenScroll?.stop();
    }

    public setTo(target: number): void {
        this.cancel();
        this.scrollObject[this.options.direction!] = target;
        this.target = target;
        this.updateTween();
        this.completeTween();
    }

    private updateTween(): void {
        if (!this.enabled || this.destroyed) return;

        let totalValue = this.options.infinite
            ? Phaser.Math.Wrap(this.scrollObject[this.options.direction!], this.min, this.max)
            : this.scrollObject[this.options.direction!];

        let step = totalValue - this.previousTotal;
        if (this.options.infinite) {
            if (step < -this.length / 2) step += this.length;
            else if (step > this.length / 2) step -= this.length;
        }

        this.dispatchValues.step = step;
        this.dispatchValues.total = totalValue;
        this.dispatchValues.percent = this.options.infinite
            ? this.calculatePercentage(this.dispatchValues.total, this.options.from!, this.options.to!)
            : (this.dispatchValues.total - this.options.from!) / (this.options.to! - this.options.from!);

        this.previousTotal = totalValue;
        this.events.onUpdate.emit('update', this.dispatchValues);
    }

    private calculatePercentage(value: number, min: number, max: number): number {
        const range = max - min;
        if (value < min) value += Math.ceil((min - value) / range) * range;
        else if (value > max) value -= Math.ceil((value - max) / range) * range;
        return (value - min) / range;
    }

    private completeTween(): void {
        if (!this.enabled || this.destroyed) return;
        this.isScrolling = false;
        this.options.multiplier = 1;
        this.events.onComplete.emit('complete');
    }

    // Utility Methods
    private updateBoundaries(): void {
        this.min = Math.min(this.options.from!, this.options.to!);
        this.max = Math.max(this.options.from!, this.options.to!);
        this.length = Math.abs(this.max - this.min);
        this.previousTotal = this.options.from!;
    }

    public getSnapStep(): number {
        return this.options.snapStep || 0;
    }

    public setSnapStep(value: number): void {
        this.options.snapStep = value;
    }

    public getCurrentPosition(direction: string = ''): number {
        return this.scrollObject[direction || this.options.direction || 'y'];
    }

    // Wheel Scroll Handling
    public applyWheelScroll(delta: number, acceleration: number = 1): void {
        this.cancel();
        const currentPos = this.scrollObject[this.options.direction!];
        let targetPos = currentPos + delta * acceleration;
        let finalTarget = this.options.infinite ? targetPos : Math.max(this.min, Math.min(this.max, targetPos));

        if (!this.options.infinite && (targetPos > this.max || targetPos < this.min)) {
            if (this.options.bouncing) {
                const overscroll = targetPos - finalTarget;
                if (Math.abs(overscroll) > 20) {
                    const bouncePos = finalTarget + overscroll * 2;
                    this.tweenTo(0.2, bouncePos);
                    setTimeout(() => {
                        if (!this.destroyed) this.tweenTo(0.5, finalTarget);
                    }, 150);
                    return;
                }
            }
        }

        const distance = Math.min(2, 0.3 + (Math.abs(finalTarget - currentPos) / (100 + acceleration * 30)) * (1 + acceleration * 0.2));
        this.tweenTo(Math.max(0.2, distance), finalTarget);
    }

    public getEvents(): Record<string, Phaser.Events.EventEmitter> {
        return this.events;
    }

    public getOptions(): ScrollerOptions {
        return this.options;
    }
}