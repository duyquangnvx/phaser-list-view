import { Bounds, DisplayObject } from '../types';

export const CONFIG = {
	AUTO_DETECT_THRESHOLD: 8
};

/**
 * Parse and validate bounds object
 */
export function parseBounds(bounds: Bounds): Bounds {
	bounds.x = bounds.x ?? 0;
	bounds.y = bounds.y ?? 0;
	
	if (bounds.width <= 0) {
		console.warn('PhaserListView: bounds.width <= 0');
	} else if (bounds.height <= 0) {
		console.warn('PhaserListView: bounds.height <= 0');
	}
	
	return bounds;
}

/**
 * Get width or height of an object, preferring "nominal" dimensions if available
 */
export function getWidthOrHeight(displayObject: DisplayObject, widthOrHeight: 'width' | 'height'): number {
	const capitalizedDimension = capitalizeFirstLetter(widthOrHeight);
	return displayObject[`nominal${capitalizedDimension}` as keyof DisplayObject] as number || 
		   displayObject[widthOrHeight];
}

/**
 * Capitalize the first letter of a string
 */
export function capitalizeFirstLetter(string: string): string {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Find a child in a nested structure using a predicate function
 */
export function findChild<T extends Phaser.GameObjects.GameObject>(
	children: T[], 
	predicate: (child: T) => boolean, 
	scope: any = null
): T | false {
	if (!children) return false;
	
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (!child) continue;
		
		if (predicate.call(scope, child)) {
			return child;
		}
		
		// Check if the child has children property and recursively search
		const childChildren = (child as any).list || (child as any).children;
		if (childChildren) {
			const found = findChild(childChildren, predicate, scope);
			if (found) {
				return found as T;
			}
		}
	}
	
	return false;
}

/**
 * Detect if a pointer drag has exceeded threshold
 */
export function detectDrag(pointer: Phaser.Input.Pointer): boolean {
	const distanceX = Math.abs(pointer.downX - pointer.upX);
	const distanceY = Math.abs(pointer.downY - pointer.upY);
	
	return (
		distanceX > CONFIG.AUTO_DETECT_THRESHOLD ||
		distanceY > CONFIG.AUTO_DETECT_THRESHOLD
	);
}

/**
 * Dispatch click events to clickable objects under pointer
 */
export function dispatchClicks(
	pointer: Phaser.Input.Pointer,
	clickables: Phaser.GameObjects.GameObject[],
	eventType: string
): Phaser.GameObjects.GameObject | false {
	if (eventType === 'pointerup' && detectDrag(pointer)) return false;
	
	// Find object under point since Phaser doesn't support click propagation
	const found = findChild(clickables, clickable => {
		// Bỏ qua các đối tượng không có input hoặc input không được bật
		if (!(clickable as any).input || !(clickable as any).input.enabled) {
			return false;
		}

		// Get the world position of the clickable
		const worldPosition = (clickable as any).getWorldTransformMatrix 
			? (clickable as any).getWorldTransformMatrix()
			: { tx: (clickable as any).x, ty: (clickable as any).y };
		
		const x = worldPosition.tx;
		const y = worldPosition.ty;
		
		// Check if the object is interactive and if pointer is within its bounds
		const width = (clickable as any).width || 0;
		const height = (clickable as any).height || 0;
		const rect = new Phaser.Geom.Rectangle(x, y, width, height);
		
		return Phaser.Geom.Rectangle.Contains(rect, pointer.x, pointer.y);
	});
	
	// Chỉ emit sự kiện nếu tìm thấy đối tượng và đối tượng có phương thức emit
	if (found && (found as any).emit) {
		(found as any).emit(eventType, found, pointer, true);
	}
	
	return found;
} 