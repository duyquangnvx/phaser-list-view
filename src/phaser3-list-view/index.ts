import Scroller from './Scroller';
import ListView from './ListView';
import ListViewCore from './ListViewCore';
import SwipeCarousel from './SwipeCarousel';
import WheelScroller from './WheelScroller';
import DirectionalScroller from './DirectionalScroller';
import ScrollerEventDispatcher from './ScrollerEventDispatcher';

/**
 * Phaser 3 ListView - A UI component library for scrollable lists and carousels
 * Typescript implementation of phaser-list-view for Phaser 3
 */
class PhaserListView {
	static Scroller = Scroller;
	static ListView = ListView;
	static ListViewCore = ListViewCore;
	static SwipeCarousel = SwipeCarousel;
	static WheelScroller = WheelScroller;
	static DirectionalScroller = DirectionalScroller;
	static ScrollerEventDispatcher = ScrollerEventDispatcher;
}

// Export all components
export {
	Scroller,
	ListView,
	ListViewCore,
	SwipeCarousel,
	WheelScroller,
	DirectionalScroller,
	ScrollerEventDispatcher
};

// Attach to window for browser usage
if (typeof window !== 'undefined') {
	(window as any).PhaserListView = PhaserListView;
}

export default PhaserListView; 