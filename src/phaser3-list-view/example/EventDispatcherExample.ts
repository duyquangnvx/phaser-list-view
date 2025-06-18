import Phaser from 'phaser';
import { ListView, ScrollerEventDispatcher } from '../';

/**
 * Ví dụ về cách sử dụng ScrollerEventDispatcher để xử lý sự kiện
 * cho các item trong ListView
 */
export default class EventDispatcherExample extends Phaser.Scene {
	private listView: ListView | null = null;
	private eventDispatcher: ScrollerEventDispatcher | null = null;
	private container: Phaser.GameObjects.Container | null = null;
	private items: Phaser.GameObjects.Text[] = [];
	private statusText: Phaser.GameObjects.Text | null = null;

	constructor() {
		super({ key: 'EventDispatcherExample' });
	}

	preload() {
		// Tải các tài nguyên cần thiết
	}

	create() {
		// Tạo tiêu đề
		this.add.text(10, 10, 'ScrollerEventDispatcher Example', {
			fontSize: '24px',
			color: '#ffffff'
		});

		// Tạo text hiển thị trạng thái
		this.statusText = this.add.text(10, 50, 'Hover và click vào các item', {
			fontSize: '16px',
			color: '#ffffff'
		});

		// Tạo container cho danh sách các item
		this.container = this.add.container(0, 0);

		// Khởi tạo EventDispatcher
		this.eventDispatcher = new ScrollerEventDispatcher(this, this.container);

		// Tạo các item con
		for (let i = 0; i < 10; i++) {
			const item = this.createItem(i);
			this.container.add(item);
			this.items.push(item);
		}

		// Đăng ký các item với EventDispatcher
		this.eventDispatcher.registerItems(this.items);
		
		// Tạo background
		const background = this.add.rectangle(0, 0, 400, 300, 0x222222, 0.7);
		background.setOrigin(0, 0);
		background.setPosition(100, 100);

		// Tạo ListView với đúng cấu trúc constructor
		const bounds = {
			x: 100, 
			y: 100,
			width: 400,
			height: 300
		};
		
		const options = {
			direction: 'y' as 'y', // Type assertion để làm rõ là 'y'
			autocull: true,
			momentum: true, 
			bouncing: true,
			snapping: false,
			overflow: 100,
			padding: 10,
			mouseWheel: true,
			wheelFactor: 0.5,
			scrollBar: true,
			scrollBarColor: 0xcccccc,
			scrollBarAlpha: 0.8,
			itemSpacing: 10
		};
		
		this.listView = new ListView(this, this.container, bounds, options);
		
		// Thêm các item vào ListView
		for (const item of this.items) {
			this.listView.add(item);
		}
	}

	/**
	 * Tạo một item text với các xử lý sự kiện
	 */
	private createItem(index: number): Phaser.GameObjects.Text {
		const item = this.add.text(0, index * 40, `Item ${index + 1}`, {
			fontSize: '18px',
			color: '#ffffff',
			backgroundColor: '#333333',
			padding: {
				left: 10,
				right: 10,
				top: 10,
				bottom: 10
			}
		});

		// Đặt kích thước và làm cho item có thể tương tác
		item.setSize(380, 40);
		item.setInteractive({ useHandCursor: true });

		// Đăng ký các sự kiện
		item.on('pointerover', () => {
			item.setBackgroundColor('#555555');
			this.updateStatus(`Hover vào: ${item.text}`);
		});

		item.on('pointerout', () => {
			item.setBackgroundColor('#333333');
			this.updateStatus('Hover và click vào các item');
		});

		item.on('pointerdown', () => {
			item.setBackgroundColor('#888888');
			this.updateStatus(`Nhấn chuột trên: ${item.text}`);
		});

		item.on('pointerup', () => {
			item.setBackgroundColor('#555555');
			this.updateStatus(`Thả chuột trên: ${item.text}`);
		});

		item.on('click', () => {
			this.updateStatus(`Click vào: ${item.text}`);
			// Hiệu ứng nhấp nháy khi click
			this.tweens.add({
				targets: item,
				alpha: 0.5,
				duration: 100,
				yoyo: true,
				repeat: 1
			});
		});

		return item;
	}

	/**
	 * Cập nhật text trạng thái
	 */
	private updateStatus(message: string): void {
		if (this.statusText) {
			this.statusText.setText(message);
		}
	}
} 