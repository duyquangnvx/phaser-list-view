import { Scene } from 'phaser';
import { ListView, WheelScroller, SwipeCarousel } from '../../phaser3-list-view';

export class Game extends Scene
{
    private listView: ListView;
    private wheelScroller: WheelScroller;
    private swipeCarousel: SwipeCarousel;
    private items: Phaser.GameObjects.Container[] = [];
    private wheelItems: Phaser.GameObjects.Container[] = [];
    private carouselItems: Phaser.GameObjects.Container[] = [];
    private listViewContainer: Phaser.GameObjects.Container;
    private wheelEnabled: boolean = true;
    private scrollBarEnabled: boolean = true;
    private itemCount: number = 15;
    
    constructor ()
    {
        super('Game');
    }

    preload ()
    {
        this.load.setPath('assets');
        
        this.load.image('background', 'bg.png');
        this.load.image('logo', 'logo.png');
    }

    create ()
    {
        this.add.image(512, 384, 'background');
        this.add.image(512, 120, 'logo').setDepth(100);
        
        // ===== SIMPLIFIED APPROACH FOR MOVABLE LISTVIEW =====
        
        // Create a container that will hold everything
        this.listViewContainer = this.add.container(100, 0);
        
        // Create the background and border
        const listBounds = {
            x: 200,
            y: 250,
            width: 400,
            height: 300
        };
        
        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x333333, 0.8);
        bg.fillRect(listBounds.x, listBounds.y, listBounds.width, listBounds.height);
        this.listViewContainer.add(bg);
        
        // Border
        const border = this.add.graphics();
        border.lineStyle(2, 0xffffff, 1);
        border.strokeRect(listBounds.x, listBounds.y, listBounds.width, listBounds.height);
        this.listViewContainer.add(border);
        
        // Create ListView - the container is already at position 100,0
        this.listView = new ListView(
            this,
            this.listViewContainer,
            listBounds,
            {
                direction: 'y',
                momentum: true,
                bouncing: true,
                snapping: false,
                overflow: 140,
                padding: 10,
                mouseWheel: true,
                wheelFactor: 0.1,
                scrollBar: true,
                scrollBarColor: 0x777777,
                scrollBarAlpha: 0.8,
                scrollBarThickness: 10,
                scrollBarBorderRadius: 5
            }
        );
        
        // Create and add list items
        this.items = this.createListItems(this.itemCount);
        this.listView.addMultiple(...this.items);
        
        // Create movement controls
        this.createListViewControls();
        
        // Create a toggle for mouse wheel scrolling
        this.createWheelToggle();
        
        // Create a toggle for scrollbar
        this.createScrollBarToggle();
        
        // Create content manipulation controls
        this.createContentControls();
    }
    
    /**
     * Create controls to move the ListView container
     */
    createListViewControls() {
        // Left button
        const moveLeftBtn = this.add.rectangle(600, 300, 80, 40, 0xff0000, 0.8);
        moveLeftBtn.setInteractive();
        moveLeftBtn.on('pointerdown', () => {
            this.tweens.add({
                targets: this.listViewContainer,
                x: this.listViewContainer.x - 100,
                duration: 500,
                ease: 'Power2'
            });
        });
        
        const leftText = this.add.text(600, 300, 'Left', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Right button
        const moveRightBtn = this.add.rectangle(700, 300, 80, 40, 0x0000ff, 0.8);
        moveRightBtn.setInteractive();
        moveRightBtn.on('pointerdown', () => {
            this.tweens.add({
                targets: this.listViewContainer,
                x: this.listViewContainer.x + 100,
                duration: 500,
                ease: 'Power2'
            });
        });
        
        const rightText = this.add.text(700, 300, 'Right', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Reset position button
        const resetBtn = this.add.rectangle(650, 350, 120, 40, 0x00aa00, 0.8);
        resetBtn.setInteractive();
        resetBtn.on('pointerdown', () => {
            this.tweens.add({
                targets: this.listViewContainer,
                x: 100,
                y: 0,
                duration: 500,
                ease: 'Power2'
            });
        });
        
        const resetText = this.add.text(650, 350, 'Reset Pos', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
    }
    
    /**
     * Create toggle button for mouse wheel
     */
    createWheelToggle() {
        const toggleBtn = this.add.rectangle(800, 300, 140, 40, this.wheelEnabled ? 0x00aa00 : 0xaa0000, 0.8);
        toggleBtn.setInteractive();
        
        const toggleText = this.add.text(800, 300, this.wheelEnabled ? 'Wheel: ON' : 'Wheel: OFF', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        toggleBtn.on('pointerdown', () => {
            this.wheelEnabled = !this.wheelEnabled;
            toggleBtn.fillColor = this.wheelEnabled ? 0x00aa00 : 0xaa0000;
            toggleText.setText(this.wheelEnabled ? 'Wheel: ON' : 'Wheel: OFF');
            this.listView.enableWheel(this.wheelEnabled);
        });
    }
    
    /**
     * Create toggle button for scrollbar
     */
    createScrollBarToggle() {
        const toggleBtn = this.add.rectangle(800, 350, 140, 40, this.scrollBarEnabled ? 0x00aa00 : 0xaa0000, 0.8);
        toggleBtn.setInteractive();
        
        const toggleText = this.add.text(800, 350, this.scrollBarEnabled ? 'Scrollbar: ON' : 'Scrollbar: OFF', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        toggleBtn.on('pointerdown', () => {
            this.scrollBarEnabled = !this.scrollBarEnabled;
            toggleBtn.fillColor = this.scrollBarEnabled ? 0x00aa00 : 0xaa0000;
            toggleText.setText(this.scrollBarEnabled ? 'Scrollbar: ON' : 'Scrollbar: OFF');
            this.listView.enableScrollBar(this.scrollBarEnabled);
        });
    }
    
    /**
     * Create content manipulation controls
     */
    createContentControls(): void {
        // Add item button
        const addBtn = this.add.rectangle(650, 400, 80, 40, 0x00aa00, 0.8);
        addBtn.setInteractive();
        
        const addText = this.add.text(650, 400, 'Add Item', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        addBtn.on('pointerdown', () => {
            this.itemCount++;
            const newItem = this.createListItems(1)[0];
            this.listView.add(newItem);
            this.items.push(newItem);
        });
        
        // Add and scroll to item button
        const addScrollBtn = this.add.rectangle(700, 400, 80, 40, 0x44aa00, 0.8);
        addScrollBtn.setInteractive();
        
        const addScrollText = this.add.text(700, 400, 'Add+Scroll', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        addScrollBtn.on('pointerdown', () => {
            this.itemCount++;
            const newItem = this.createListItems(1)[0];
            this.listView.add(newItem, true);
            this.items.push(newItem);
        });
        
        // Remove item button
        const removeBtn = this.add.rectangle(800, 400, 80, 40, 0xaa0000, 0.8);
        removeBtn.setInteractive();
        
        const removeText = this.add.text(800, 400, 'Remove', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        removeBtn.on('pointerdown', () => {
            if (this.items.length > 0) {
                const lastItem = this.items.pop();
                if (lastItem) {
                    this.listView.remove(lastItem);
                    lastItem.destroy();
                    this.itemCount--;
                }
            }
        });
        
        // Reset content button
        const resetContentBtn = this.add.rectangle(850, 400, 100, 40, 0x0000aa, 0.8);
        resetContentBtn.setInteractive();
        
        const resetContentText = this.add.text(850, 400, 'Reset Items', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        resetContentBtn.on('pointerdown', () => {
            // Remove old items
            this.items.forEach(item => item.destroy());
            this.items = [];
            this.listView.removeAll();
            
            // Add new items
            this.itemCount = 15;
            this.items = this.createListItems(this.itemCount);
            
            // Reset position sau đó thêm các item mới
            this.listView.reset();
            
            // Thêm nội dung vào danh sách 
            this.listView.addMultiple(...this.items);
        });
    }
    
    /**
     * Create list items
     * @param count Number of items to create
     */
    createListItems(count: number): Phaser.GameObjects.Container[] {
        const items: Phaser.GameObjects.Container[] = [];
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
        
        for (let i = 0; i < count; i++) {
            // Create container for each item
            const itemContainer = this.add.container(0, 0);
            
            // Create background for the item
            const bg = this.add.graphics();
            bg.fillStyle(colors[i % colors.length], 0.7);
            bg.fillRoundedRect(0, 0, 380, 80, 10);
            
            // Add border for the item
            const border = this.add.graphics();
            border.lineStyle(2, 0xffffff, 0.8);
            border.strokeRoundedRect(0, 0, 380, 80, 10);
            
            // Add text content
            const text = this.add.text(190, 40, `Item #${i+1}`, {
                fontFamily: 'Arial',
                fontSize: 24,
                color: '#ffffff'
            }).setOrigin(0.5);
            
            // Add elements to the container
            itemContainer.add([bg, border, text]);
            itemContainer.setSize(380, 80);
            
            items.push(itemContainer);
        }

        return items;
    }
}
