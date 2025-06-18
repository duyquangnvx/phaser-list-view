import { Scene } from 'phaser';
import { ListView, SwipeCarousel } from '../../phaser3-list-view';

export class Game extends Scene
{
    private listView: ListView;
    private swipeCarousel: SwipeCarousel;
    private items: Phaser.GameObjects.Container[] = [];
    private carouselItems: Phaser.GameObjects.Container[] = [];
    private listViewContainer: Phaser.GameObjects.Container;
    private wheelEnabled: boolean = true;
    private scrollBarEnabled: boolean = true;
    private itemCount: number = 2;
    private currentAlign: 'start' | 'center' | 'end' = 'start';
    private currentContentAlign: 'start' | 'center' | 'end' = 'start';
    private uniformSizes: boolean = false;
    
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
                scrollBarBorderRadius: 5,
                align: this.currentAlign,
                contentAlign: this.currentContentAlign
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
        
        // Create alignment controls
        this.createAlignmentControls();
    }
    
    /**
     * Create controls to move the ListView container
     */
    createListViewControls() {
        // Left button
        const moveLeftBtn = this.add.rectangle(600, 300, 80, 40, 0xff0000, 0.8);
        moveLeftBtn.setInteractive();
        moveLeftBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
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
        moveRightBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
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
        resetBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
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
        
        toggleBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
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
        
        toggleBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.scrollBarEnabled = !this.scrollBarEnabled;
            toggleBtn.fillColor = this.scrollBarEnabled ? 0x00aa00 : 0xaa0000;
            toggleText.setText(this.scrollBarEnabled ? 'Scrollbar: ON' : 'Scrollbar: OFF');
            this.listView.enableScrollBar(this.scrollBarEnabled);
        });
    }
    
    /**
     * Create alignment control buttons
     */
    createAlignmentControls(): void {
        // Main alignment controls (start, center, end)
        const alignTitle = this.add.text(650, 450, 'Main Align:', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0, 0.5);
        
        // Start align button
        const alignStartBtn = this.add.rectangle(750, 450, 80, 30, this.currentAlign === 'start' ? 0x00aa00 : 0x444444, 0.8);
        alignStartBtn.setInteractive();
        
        const alignStartText = this.add.text(750, 450, 'Start', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        alignStartBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.setAlignment('start');
            alignStartBtn.fillColor = 0x00aa00;
            alignCenterBtn.fillColor = 0x444444;
            alignEndBtn.fillColor = 0x444444;
        });
        
        // Center align button
        const alignCenterBtn = this.add.rectangle(840, 450, 80, 30, this.currentAlign === 'center' ? 0x00aa00 : 0x444444, 0.8);
        alignCenterBtn.setInteractive();
        
        const alignCenterText = this.add.text(840, 450, 'Center', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        alignCenterBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.setAlignment('center');
            alignStartBtn.fillColor = 0x444444;
            alignCenterBtn.fillColor = 0x00aa00;
            alignEndBtn.fillColor = 0x444444;
        });
        
        // End align button
        const alignEndBtn = this.add.rectangle(930, 450, 80, 30, this.currentAlign === 'end' ? 0x00aa00 : 0x444444, 0.8);
        alignEndBtn.setInteractive();
        
        const alignEndText = this.add.text(930, 450, 'End', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        alignEndBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.setAlignment('end');
            alignStartBtn.fillColor = 0x444444;
            alignCenterBtn.fillColor = 0x444444;
            alignEndBtn.fillColor = 0x00aa00;
        });
        
        // Cross alignment controls (for content)
        const contentAlignTitle = this.add.text(650, 490, 'Cross Align:', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0, 0.5);
        
        // Content start align button
        const contentAlignStartBtn = this.add.rectangle(750, 490, 80, 30, this.currentContentAlign === 'start' ? 0x00aa00 : 0x444444, 0.8);
        contentAlignStartBtn.setInteractive();
        
        const contentAlignStartText = this.add.text(750, 490, 'Start', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        contentAlignStartBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.setContentAlignment('start');
            contentAlignStartBtn.fillColor = 0x00aa00;
            contentAlignCenterBtn.fillColor = 0x444444;
            contentAlignEndBtn.fillColor = 0x444444;
        });
        
        // Content center align button
        const contentAlignCenterBtn = this.add.rectangle(840, 490, 80, 30, this.currentContentAlign === 'center' ? 0x00aa00 : 0x444444, 0.8);
        contentAlignCenterBtn.setInteractive();
        
        const contentAlignCenterText = this.add.text(840, 490, 'Center', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        contentAlignCenterBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.setContentAlignment('center');
            contentAlignStartBtn.fillColor = 0x444444;
            contentAlignCenterBtn.fillColor = 0x00aa00;
            contentAlignEndBtn.fillColor = 0x444444;
        });
        
        // Content end align button
        const contentAlignEndBtn = this.add.rectangle(930, 490, 80, 30, this.currentContentAlign === 'end' ? 0x00aa00 : 0x444444, 0.8);
        contentAlignEndBtn.setInteractive();
        
        const contentAlignEndText = this.add.text(930, 490, 'End', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        contentAlignEndBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.setContentAlignment('end');
            contentAlignStartBtn.fillColor = 0x444444;
            contentAlignCenterBtn.fillColor = 0x444444;
            contentAlignEndBtn.fillColor = 0x00aa00;
        });
        
        // Toggle for uniform sizing
        const uniformSizeBtn = this.add.rectangle(750, 530, 160, 30, this.uniformSizes ? 0x00aa00 : 0x444444, 0.8);
        uniformSizeBtn.setInteractive();
        
        const uniformSizeText = this.add.text(750, 530, 'Uniform Sizes', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        uniformSizeBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.uniformSizes = !this.uniformSizes;
            uniformSizeBtn.fillColor = this.uniformSizes ? 0x00aa00 : 0x444444;
            
            // Set uniform sizes
            if (this.uniformSizes) {
                this.listView.setUniformWidth(350);
                this.listView.setUniformHeight(60);
            } else {
                this.listView.setUniformWidth(undefined);
                this.listView.setUniformHeight(undefined);
            }
            
            // Re-layout items
            this.listView.relayout();
        });
    }
    
    /**
     * Set main alignment (start, center, end)
     */
    setAlignment(align: 'start' | 'center' | 'end'): void {
        this.currentAlign = align;
        this.listView.setAlign(align);
        this.listView.relayout();
    }
    
    /**
     * Set content alignment (along cross axis)
     */
    setContentAlignment(align: 'start' | 'center' | 'end'): void {
        this.currentContentAlign = align;
        this.listView.setContentAlign(align);
        this.listView.relayout();
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
        
        addBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
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
        
        addScrollBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
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
        
        removeBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
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
        
        resetContentBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
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
        const itemWidth = 340;
        const itemHeight = 80;

        const items: Phaser.GameObjects.Container[] = [];
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
        
        for (let i = 0; i < count; i++) {
            // Create container for each item
            const itemContainer = this.add.container(0, 0);
            
            // Create background for the item
            const bg = this.add.graphics();
            bg.fillStyle(colors[i % colors.length], 0.7);
            bg.fillRoundedRect(0, 0, itemWidth, itemHeight, 10);
            
            // Add border for the item
            const border = this.add.graphics();
            border.lineStyle(2, 0xffffff, 0.8);
            border.strokeRoundedRect(0, 0, itemWidth, itemHeight, 10);
            
            // Add text content
            const text = this.add.text(itemWidth / 2, itemHeight / 2, `Item #${i+1}`, {
                fontFamily: 'Arial',
                fontSize: 24,
                color: '#ffffff'
            }).setOrigin(0.5);


            
            // Add elements to the container
            itemContainer.add([bg, border, text]);
            itemContainer.setSize(itemWidth, itemHeight);

            itemContainer.setInteractive({
                hitArea: new Phaser.Geom.Rectangle(itemWidth / 2, itemHeight / 2, itemWidth, itemHeight),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains
            });
            const itemIndex = i + 1;
            
            itemContainer.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
                console.log(`Item #${itemIndex} clicked at position ${pointer.x}, ${pointer.y}`);

            });
            
            itemContainer.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
                console.log(`Item #${itemIndex} released at position ${pointer.x}, ${pointer.y}`);
            });
            
            itemContainer.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
                // console.log(`Item #${itemIndex} moved to position ${pointer.x}, ${pointer.y}`);
            });
            
            itemContainer.on(Phaser.Input.Events.POINTER_OUT, (pointer: Phaser.Input.Pointer) => {
                console.log(`Item #${itemIndex} mouse left`);
                
            });
            
            items.push(itemContainer);
        }

        return items;
    }
}
