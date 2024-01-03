define(["require", "pixi/pixi.dev"], function(require, PIXI) {
    var Slot = function(slotNumber, parentContainer, cardSizeX, cardSizeY, slotSpacing, gScale) {
        var slot = this;
        slot.cards = [];
        slot.number = slotNumber;
        slot.parentContainer = parentContainer;
        slot.cardSizeY = cardSizeY;
        slot.cardSizeX = cardSizeX;
        slot.spacing = slotSpacing;

        //create empty rectangle
        /*var graphics = new PIXI.Graphics();
        graphics.lineStyle(2, 0x333333);*/
        var x = slot.number * slotSpacing;

        /*graphics.interactive = true;
        graphics.id = 'slot' + slot.number;
        graphics.type = 'slot' + slot.number; 
        graphics.drawRect(x, 0, cardSizeX, cardSizeY);
        console.log(x, 0, x+cardSizeX, cardSizeY);
        graphics.hitArea = new PIXI.Rectangle(x, 0, cardSizeX, cardSizeY);
        parentContainer.addChild(graphics);*/
        var obj = PIXI.Sprite.fromImage('assets/img/empty.png');
        obj.position.x = x + cardSizeX/2; 
        obj.position.y = cardSizeY/2; 
        obj.anchor.x = 0.5;
        obj.anchor.y = 0.5;
        obj.scale.x = 0.6*gScale.x;
        obj.scale.y = 0.6*gScale.y;
        obj.id = 'slot' + slot.number;
        obj.interactive = true;
        obj.type = 'slot' + slot.number;
        parentContainer.addChild(obj);


        /*graphics.mousedown = cardContainer.touchstart = function(data) {
            slot.parentContainer.removeChild(slot.container);
            slot.parentContainer.addChild(slot.container);
        };*/

        //slot.parentContainer.addChild(slot.container);
    };

    Slot.prototype.addCard = function(card) {
        var slot = this, c;
        if (c = slot.hasCard(card)) {
            c.sprite.anchor.x = 0.5;
            c.sprite.anchor.y = 0.5;
            c.sprite.position.x = c.sprite.origin.x;
            c.sprite.position.y = c.sprite.origin.y;
            return c;
        }
    
        var config = card.getOrigConfig();

        if (slot.cards.length > 0) {
            slot.cards[slot.cards.length-1].child = card;
            config.pos.x = slot.cards[slot.cards.length-1].sprite.position.x;
            config.pos.y = slot.cards[slot.cards.length-1].sprite.position.y + 20;
        } else {
            config.pos.x = slot.number * slot.spacing + (slot.cardSizeX/2);
            config.pos.y = slot.cardSizeY / 2;
        }

        config.container = slot.parentContainer;
        config.faceUp = true;
        config.type = 'slot' + slot.number;
        config.enabled = true;

        c = card.recreate(config);
/*        c.sprite.anchor.x = 0.5;
        c.sprite.anchor.y = 0.5;
        c.sprite.origin.x = config.pos.x;
        c.sprite.origin.y = config.pos.y;
        if (slot.cards.length > 0) {
            slot.cards[slot.cards.length-1].child = c;
            c.sprite.position.x = slot.cards[slot.cards.length-1].sprite.position.x;
            c.sprite.position.y = slot.cards[slot.cards.length-1].sprite.position.y + 20;
        } else {
            c.sprite.position.x = config.pos.x;
            c.sprite.position.y = config.pos.y;
        }*/

        slot.cards.push(c);

        if (card.child) {
            slot.addCard(card.child);
        }
        return c;
    };

    Slot.prototype.hasCard = function(card) {
        var i, c = null;
        for (i=0; i<this.cards.length; i++) {
            if (this.cards[i] === card) {
                c = this.cards[i];
            }
        }
        return c;
    };

    Slot.prototype.removeCard = function(card) {
        var i, c = null;
        for (i=0; i<this.cards.length; i++) {
            if (this.cards[i] === card) {
                c = this.cards.splice(i,1);
                if (this.cards[i-1]) {
                    this.cards[i-1].child = undefined;
                }
            }
        }

        return c;
    };

    Slot.prototype.getChildCards = function() {
    };

    return Slot;
});
