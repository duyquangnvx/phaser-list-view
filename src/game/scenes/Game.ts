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
                padding: 10
            }
        );
        
        // Create and add list items
        this.items = this.createListItems(15);
        this.listView.addMultiple(...this.items);
        
        // Create movement controls
        this.createListViewControls();
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
