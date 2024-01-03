define(["require", "pixi/pixi.dev"], function(require, PIXI) {
    var Card = function(stage, socket, user, config) {
        var card = this;

        card.stage = stage;
        card.socket = socket;
        card.user = user;
        card.faceUp = config.faceUp;
        card.lastEmit = 0;
        card.origContainer = config.container;
        card.origConfig = {
            faceUp: config.faceUp,
            enabled: config.enabled,
            container: card.origContainer,
            pos: {x:config.pos.x, y:config.pos.y},
            frameName: config.frameName,
            id: config.id,
            type: config.type
        };
        card.enabled = !config.enabled === false;
        card.sprite = card.makeSprite(config);
        card.sprite.container.addChild(card.sprite);
    };

    Card.prototype.globalPos = function(pos) {
        var card = this;

        return {
            x: (pos.x / card.user.clientWidth),
            y: (pos.y - card.user.clientTop) / card.user.clientHeight
        };
        
    };

    Card.prototype.flip = function() {
        var card = this, config;

        //reconfigure
        card.faceUp = !card.faceUp;
        config = card.origConfig;
        config.faceUp = card.faceUp;
        config.type = card.sprite.type;
        config.container = card.sprite.container;
        config.pos = card.sprite.position;

        //create and remove
        card.sprite.container.removeChild(card.sprite);
        card.sprite = card.makeSprite(config);
        card.sprite.container.addChild(card.sprite);
    };

    Card.prototype.reset = function() {
        return this.recreate(this.origConfig);
    };

    Card.prototype.recreate = function(config) {
        var card = this;

        //recreate card properties
        card.faceUp = config.faceUp;
        if (config.enabled === undefined) { config.enabled = true; }
        card.enabled = !config.enabled === false;

        //create and remove
        card.sprite.container.removeChild(card.sprite);
        card.sprite = card.makeSprite(config);
        card.sprite.container.addChild(card.sprite);

        return card;
    };

    Card.prototype.getOrigConfig = function() {
        var oc = this.origConfig;
        return {
            id: oc.id,
            type: oc.type,
            container: oc.container,
            frameName: oc.frameName,
            pos: {x:oc.pos.x, y:oc.pos.y},
            faceUp: oc.faceUp,
            enabled: oc.enabled
        };
    };

    Card.prototype.moveWith = function(card) {
        this.sprite.anchor.x = card.sprite.anchor.x;
        this.sprite.anchor.y = card.sprite.anchor.y;
        this.sprite.position.x = card.sprite.position.x;
        this.sprite.position.y = card.sprite.position.y + 20;
    };

    Card.prototype.makeSprite = function(config) {
        var card = this;

        card.frameName = config.frameName;
        var sprite = PIXI.Sprite.fromFrame(config.faceUp ? config.frameName : "back.png");
        sprite.position.x = config.pos.x;
        sprite.position.y = config.pos.y;
        sprite.anchor.x = 0.5;
        sprite.anchor.y = 0.5;
        sprite.scale.x = card.user.gScale.x * 0.6;
        sprite.scale.y = card.user.gScale.y * 0.6;
        sprite.id = config.id;
        sprite.sid = config.sid;
        sprite.interactive = true;
        sprite.z = 0;
        sprite.origin = {x:sprite.position.x, y:sprite.position.y};
        sprite.type = config.type;
        sprite.container = config.container;

        sprite.mousedown = sprite.touchstart = function(data) {
            if (!card.faceUp || !card.enabled) {
                card.cancelmouse = true;
                return false;
            } else {
                card.cancelmouse = false;
            }

            data.originalEvent.preventDefault();

            var bounds = data.target.getBounds();
            var anchor = {};
            anchor.x = (data.originalEvent.clientX - bounds.x) / bounds.width;
            anchor.y = (data.originalEvent.clientY - bounds.y) / bounds.height;
            this.position.x += (anchor.x - this.anchor.x) * bounds.width;
            this.position.y += (anchor.y - this.anchor.y) * bounds.height;
            this.anchor.x = anchor.x;
            this.anchor.y = anchor.y;

            this.data = data;
            this.alpha = 0.9;
            this.dragging = true;

            //Move to top (z-index)
            this.container.removeChild(this);
            this.container.addChild(this);

            if (card.child) {
                card.child.sprite.mousedown(data);
            }
        };

        sprite.mouseup = sprite.mouseupoutside = sprite.touchend = sprite.touchendoutside = function(data) {
            if (!card.faceUp || !card.enabled || card.cancelmouse) {
                return;
            }

            this.alpha = 1;
            this.dragging = false;
            this.data = null;
            var bounds = this.getBounds();

            var targetX = data.originalEvent.clientX - (this.anchor.x * bounds.width) + (bounds.width/2),
                targetY = data.originalEvent.clientY - (this.anchor.y * bounds.height) + (card.child ? 10 : bounds.height/2);
        
            var target = card.stage.findChildAt(targetX, targetY, undefined, this);
            if (target === null) { target = {}; } 

            //get % of width and height in parent container of TOP LEFT corner of card
            var globalPos = card.globalPos({
                x: data.originalEvent.clientX - (this.anchor.x * bounds.width),
                y: data.originalEvent.clientY - (this.anchor.y * bounds.height)
            });

            card.socket.emit("dropCard", {
                game: currentGame._id,
                user: card.user.username,
                source: this.id,
                target: target.id || 'invalid',
                sid: target.sid,
                type: target.type || 'invalid',
                sourceType: card.sprite.type,
                child: !!(card.child),
                pos: globalPos,
                frameName: card.frameName
            });

            card.targetStack = undefined;

            var child, cCard = card;
            while (child = cCard.child) {
                cCard = child;
                cCard.sprite.alpha =1;
                cCard.sprite.dragging = false;
                cCard.sprite.data = null;
            }
        };

        sprite.mousemove = sprite.touchmove = function(data) {
            if (!this.dragging || card.cancelmouse) { return; }

            //console.log(this.id + ' moving');
            if (!card.faceUp || !card.enabled || !this.parent) {
                return;
            }

            var newPosition = data.getLocalPosition(this.parent);
            this.position.x = newPosition.x;
            this.position.y = newPosition.y;

            if (card.child) {
                card.child.sprite.mousemove(data);
            } else {
                if ( $.now() - card.lastEmit > 30 ) {
                    var bounds = this.getBounds(),
                        distance, tBounds, origDistance;

                    //does this card have a target already?
                    if (card.targetStack == undefined) {
                        //find target stack
                        var s = 0, c, tid;

                        //make target id
                        tid = card.sprite.id.split(':');
                        tid[0] = parseInt(tid[0],0)-1;
                        tid = tid.join(':');

                        card.targetStack = 'none';
                        for (s in game.stacks) {
                            c = game.stacks[s][game.stacks[s].length-1];
                            if (c.sprite.id == tid) {
                                card.targetStack = s;
                                break;
                            }
                        }
                    }

                    //is there a proper target stack?
                    if (card.targetStack !== 'none') {
                        //calculate distance from target stack
                        tBounds = game.stacks[card.targetStack][game.stacks[card.targetStack].length-1].sprite.getBounds();
                        distance = Math.sqrt(Math.pow(bounds.x - tBounds.x, 2) + Math.pow(bounds.y - tBounds.y, 2))
                        origDistance = Math.sqrt(Math.pow(card.sprite.origin.x - tBounds.x, 2) + Math.pow(card.sprite.origin.y - tBounds.y, 2));
                        distance /= origDistance;
                    }

                    if (data.originalEvent.clientY < card.user.clientHeight + card.user.clientTop) { 
                        card.socket.emit('moveCard', {
                            game: currentGame._id,
                            user: card.user.username,
                            source: this.id,
                            targetStack: card.targetStack,
                            distance: distance,
                            frameName: card.frameName
                        });
                        card.isMoving = true;
                    } else if (card.isMoving) {
                        card.socket.emit('cancelMove', {
                            game: currentGame._id,
                            user: card.user.username,
                            source: this.id,
                            targetStack: card.targetStack,
                            distance: distance,
                            frameName: card.frameName
                        });
                        card.isMoving = false;
                    }
                    card.lastEmit = $.now();
                }
            }
        };

        sprite.click = sprite.tap = function(data) {
            data.originalEvent.preventDefault();
            if (!card.faceUp && card.enabled) {
                card.enabled = false;
                card.flip();
                card.enabled = true;
            }
        };

        return sprite;
    };

    return Card;
});
