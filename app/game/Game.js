define(["require", "pixi/pixi.dev", "./Deck", "./Card", "./Slot", 'jquery-ui/jquery-ui.min'], function(require, PIXI) {
    var Deck    = require('./Deck');
    var Card    = require('./Card');
    var Slot    = require('./Slot');
    var cardFrames = [],
    cardIds = [],
    baseWidth = 1920,
    baseHeight = 955,
    gScale = {x:window.innerWidth/baseWidth, y:window.innerWidth/baseWidth},
    cardSizeX = 167*0.6*gScale.x;
    cardSizeY = 243*0.6*gScale.y;

    var Game = function(stage, user, socket) {
        this.stage = stage;
        this.user = user;
        this.user.gScale = gScale;
        this.socket = socket;
        this.cards = {};
        this.slots = {};
        this.auxStack = [];
        this.auxStackUp = [];
        this.stacks = [];
        this.score = [];
        this.goalLeft = 13;
        this.goalText = {};
        this.lastPlays = 0;
        this.playerStuckCount = 0;
        this.playerCard = {};
        this.players = [];

        this.deck = new Deck();
    };

    Game.prototype.addGraphic = function(type, config) {
        var self = this;
        var obj = null;

        if (type === 'text') {
            obj = new PIXI.Text(config.text, {
                font: config.font,
                fill: config.fill,
                align: config.align
            });
            obj.anchor.x = 0.5;
            obj.anchor.y = 0.5;
            obj.alpha = config.alpha !== undefined ? config.alpha : 1;
            obj.position.x = config.pos.x;
            obj.position.y = config.pos.y;
            if (config.width) { obj.width = config.width; }
            if (config.height) { obj.height = config.height; }

            if (obj.visible && obj.container) {
                obj.container.addChild(obj);
            }
        } else if (type === 'graphic') {

        } else if (type === 'sprite') {
            obj = PIXI.Sprite.fromImage(config.texture);
            obj.position.x = config.pos.x;
            obj.position.y = config.pos.y;
            obj.anchor.x = 0.5;
            obj.anchor.y = 0.5;
            obj.scale.x = config.scale.x;
            obj.scale.y = config.scale.y; 
            obj.alpha = config.alpha !== undefined ? config.alpha : 1;
            obj.id = config.id;
            obj.interactive = true;
            obj.type = config.type;
            obj.container = config.container;
            obj.visible = config.visible !== undefined ? config.visible : true;

            if (obj.visible && obj.container) {
                obj.container.addChild(obj);
            }
        } 

        return obj;
    };

    Game.prototype.animateGraphic = function(graphic, config, callback, scope) {
        var self = this, c, newObj, done = false,
            now = new Date().getTime();

        if (!config._start) {
            config._start = now;
            config._i = setInterval(function() { self.animateGraphic(graphic,config,callback,scope); }, 1000/60);
            config._orig = {};
        }

        if (config.duration <= (now - config._start)) {
            clearInterval(config._i);
            done = true;

            if (callback !== undefined) {
                callback.call(scope || this);
            }
        }

        if (config.attr) {
            for (c in config.attr) {
                //nested config options?
                var obj = graphic, c2 = c, pc;
                while (c.toString().indexOf('.') >= 0) {
                    newObj = c.split('.');
                    obj = obj[newObj.shift()];
                    c = newObj.join('.');
                }

                //store original
                if (!config._orig[c2]) {
                    config._orig[c2] = obj[c];
                }

                //set new value based on % complete
                pc = (now - config._start) / config.duration;
                obj[c] = done ? config.attr[c2] : config._orig[c2] + (pc * (config.attr[c2] - config._orig[c2]));
            }
        }
        
        return;
    };

    Game.prototype.getCard = function(id) {
        return this.cards[id];
    };

    Game.prototype.getSlot = function(slotNumber) {
        return this.slots[slotNumber];
    };

    Game.prototype.localPos = function(pos) {
        var self = this;
        return {
            x: (self.user.clientWidth * pos.x),
            y: (self.user.clientHeight * pos.y)
        };
    };

    Game.prototype.updateGoal = function() {
        var self = this;
        self.goalText.setText(self.goalLeft);

        if (self.goalLeft === 0) {
            //Pounce, I WIN!
            self.socket.emit('gameWin', {
                user: self.user.username,
                game: currentGame._id
            });
        }
    };

    Game.prototype.onPlayerStuck = function(data) {
        var self = this, i;

        self.playerStuckCount = data.players;
        self.stuckContainer.removeChildren();
        self.stuckContainer.addChild(self.stuckButton);
        for (i=0; i<data.players; i++) {
            self.stuckContainer.addChild(self.stuckCirclesOn[i]);
        }

        for (i=data.players; i<data.maxPlayers; i++) {
            self.stuckContainer.addChild(self.stuckCirclesOff[i]);
        }

        if (data.players === 0 && self.stuckContainer.visible) {
            self.cardContainer.removeChild(self.stuckContainer);
            self.stuckContainer.visible = false;
        } else if (!self.stuckContainer.visible) {
            self.cardContainer.addChild(self.stuckContainer);
            self.stuckContainer.visible = true;
        }

        if (data.players == data.maxPlayers) {
            self.unstuck(data);
        }
    };

    Game.prototype.unstuck = function(data) {
        var self = this;

        //reset aux stack
        self.remainerContainer.reset = true;
        self.remainerContainer.click();

        //disable aux stack clicking during animation
        self.remainerContainer.enabled = false;

        //animate card from top to bottom
        var card = self.auxStack.pop();
        var sprite = card.sprite;
        var origX = sprite.position.x;
        self.animateGraphic(sprite, {
            duration: 300,
            attr: {
                "position.x": origX - (130 * gScale.x),
                "position.y": cardSizeY / 2 
            }
        }, function() {
            sprite.container.removeChild(sprite);
            sprite.container.addChildAt(sprite,0);
            self.animateGraphic(sprite, {
                duration: 300,
                attr: {
                    "position.x": cardSizeX / 2
                }
            }, function() {
                self.auxStack.unshift(card);

                //enable aux stack clicking
                card.origConfig.pos.x = cardSizeX / 2;
                card.origConfig.pos.y = cardSizeY / 2;
                self.remainerContainer.reset = false;
                self.remainerContainer.enabled = true;

                self.onPlayerStuck({players: 0, maxPlayers: data.maxPlayers});
            });
        });
    };

    Game.prototype.onReady = function(data) {
        var self = this;

        self.pounceText.setText('Ready?');
        self.pounceText.alpha = 1;
        self.pounceText.position.y = self.user.clientTop + (self.user.clientHeight/2);
        self.stage.addChild(self.pounceText);
        var i = setInterval(function() {
            clearInterval(i);
            $("#disableAll").hide();
            self.pounceText.setText("Go!");
            self.animateGraphic(self.pounceText, {
                duration: 500,
                attr: {
                    "alpha": 0,
                    "position.y": self.user.clientTop
                }
            }, function() {
                self.stage.removeChild(self.pounceText);
            });
        }, 1000);
    };

    Game.prototype.over = function(data) {
        var self = this;
        //show pounce message
        self.pounceText.setText('POUNCE!');
        self.stage.addChild(self.pounceText);
        self.animateGraphic(self.pounceText, {
            duration: 750,
            attr: {
                "alpha": 1,
                "position.y": self.user.clientTop + (self.user.clientHeight/2),
                "rotation": 360 * 0.0174532925
            }
        }, function() {
            self.scoreInterval = setInterval(function() {self.showScore(data);}, 1000);
        });

        //disable game play
    };

    Game.prototype.showScore = function(data) {
        var self = this, i, score;
        clearInterval(self.scoreInterval);
        self.stage.removeChild(self.pounceText);
        var html = '<table id="scoresheet" cellpadding=4 cellspacing=10><tr><td class="th" style="text-align: left">Player</td><td class="th">Cards Played</td><td class="th">Cards Remaining</td><td class="th">Pounce!</td><td class="th">Score</td><td class="th">Total</td></tr>';
        for (i in data.score) {
            score = data.score[i];
            html += '<tr ' + (data.user === i ? 'class="highlight"' : '') + '><td style="text-align: left">' + i + '</td><td>' + score.points + '</td><td>' + (-score.goalLeft) + '</td><td>' + score.pounce + '</td><td>' + score.score + '</td><td>' + score.total + '</tr>';
        }
        html += '</table>';
        $('#scoreScreen').html(html);
        $('#scoreScreen').dialog('open');
    };

    Game.prototype.cardPlayedOther = function(data) {
        var self = this, localPos;

        if (data.valid && data.type == 'table') {
            var pos = data.pos;
            var anchor = {x: self.user.clientWidth/2, y: self.user.clientHeight/2};

            //convert pos to local pos and offset
            pos = self.localPos(pos);
            pos.x += cardSizeX/2;
            pos.y += cardSizeY/2;

            var card = new Card(self.stage, self.socket, self.user, {
                id: data.source,
                faceUp: true,
                type: 'table',
                pos: pos,
                frameName: data.frameName,
                container: this.getCard('table'),
                enabled: false,
                sid: data.sid
            });
            this.stacks[data.sid] = this.stacks[data.sid] || [];
            this.stacks[data.sid].push(card);
            if (this.stacks[data.sid].length > 1) {
                card.sprite.position.x = this.stacks[data.sid][this.stacks[data.sid].length-2].sprite.position.x;
                card.sprite.position.y = this.stacks[data.sid][this.stacks[data.sid].length-2].sprite.position.y;
            } else {
                var sourcePos = self.getPlayerPos(data.user);
                card.sprite.position.x = sourcePos.x;
                card.sprite.position.y = sourcePos.y;
                self.animateGraphic(card.sprite, {
                    duration: 150,
                    attr: {
                        "position.y": pos.y, 
                        "position.x": pos.x
                    }
                });
            }
            card.sprite.rotation = self.getPlayerAngle(data.user) + Math.random() * 0.2 - 0.1;
        }

        if (self.playerCard[data.user]) {
            self.stage.removeChild(self.playerCard[data.user].sprite);
            delete self.playerCard[data.user];
        }
    };

    Game.prototype.getPlayerPos = function(user) {
        var self = this;
        var sourcePos = {x: self.user.clientWidth/2, y: (baseHeight*gScale.y)};
        var anchor =    {x: self.user.clientWidth/2, y: (baseHeight*gScale.y)/2};
        return self.rotatePos(sourcePos, anchor, self.getPlayerAngle(user));
    };

    Game.prototype.getPlayerAngle = function(user) {
        var self = this, full = Math.PI * 2;
        return full / self.players.length * (self.players.indexOf(user)+1);
    };

    Game.prototype.rotatePos = function(pos, anchor, angle) {
        var c = Math.cos(angle),
            s = Math.sin(angle),
            xs = (baseWidth/baseHeight),
            nx = (pos.x-anchor.x) * c * xs - (pos.y-anchor.y) * s + anchor.x,
            ny = (pos.x-anchor.x) * s + (pos.y-anchor.y) * c + anchor.y;

        return {x: nx, y: ny};
    };

    Game.prototype.cardMoved = function(data) {
        var self=this, card, pos;

        if (data.targetStack && data.targetStack !== 'none') {
            if (!self.playerCard[data.user]) {
                //create card
                self.playerCard[data.user] = new Card(self.stage, self.socket, self.user, {
                    id: 'playerCard', 
                    faceUp: true,
                    type: 'playerCard',
                    container: self.stage,
                    pos: {x: 0, y: 0},
                    frameName: data.frameName,
                    enabled: false
                });
            }

            //move card to current location
            card = self.playerCard[data.user].sprite;
            card.rotation = self.getPlayerAngle(data.user);
            var sourcePos = self.getPlayerPos(data.user);
            var targetPos = self.stacks[data.targetStack][self.stacks[data.targetStack].length-1].sprite.position;

            pos = {
                x: targetPos.x - ((targetPos.x - sourcePos.x) * data.distance),
                y: targetPos.y - ((targetPos.y - sourcePos.y) * data.distance) + self.user.clientTop
            };

            card.position.x = pos.x;
            card.position.y = pos.y;
        }
    };

    Game.prototype.cardPlayed = function(data) {
        var self = this;
        var card = this.getCard(data.source);
        var target = this.getCard(data.target);
        var child;
        if (!data.valid) {
            console.log("Invalid move");
            this.stage.cardUndo.push(card.sprite);
            while (child = card.child) {
                card = child;
                this.stage.cardUndo.push(card.sprite);
            }
        } else {
            self.lastPlays++;
            if (self.isStuck) {
                self.socket.emit('cancelStuck', {
                    user: self.user.username,
                    game: currentGame._id
                });
                self.isStuck = false;
            } else if (self.stuckContainer.visible === true && self.playerStuckCount === 0) {
                self.cardContainer.removeChild(self.stuckContainer);
                self.stuckContainer.visible = false;
            }

            if (card.sprite.type.substr(0,3) === 'aux') {
                var i;
                for (i=0; i<this.auxStackUp.length; i++) {
                    if(this.auxStackUp[i] === card) {
                        this.auxStackUp.splice(i, 1);
                    }
                }
                if (this.auxStackUp.length >= 1) {
                    this.auxStackUp[this.auxStackUp.length-1].enabled = true;
                }
            }

            if (card.sprite.type.substr(0,4) === 'slot') {
                this.slots[card.sprite.type.replace('slot','')].removeCard(card);

                //remove child cards
                var rCard = card;
                while (child = rCard.child) {
                    rCard = child;
                    this.slots[card.sprite.type.replace('slot','')].removeCard(rCard);
                }
            }

            if (data.sourceType === 'goalUp' || data.sourceType === 'goalDown') {
                self.goalLeft--;
                self.updateGoal();
            }

            if (data.type === 'table') {
                console.log("valid play to table");
                var config = card.getOrigConfig();
                config.container = this.getCard('table');
                config.type = 'table';
                config.enabled = false;
                config.faceUp = true;
                config.sid = data.sid;
                var bounds = card.sprite.getBounds();
                config.pos = {x: bounds.x + (cardSizeX/2), y: bounds.y + (cardSizeY/2) - self.user.clientTop};
                var c = card.recreate(config);
                this.stacks[data.sid] = this.stacks[data.sid] || [];
                this.stacks[data.sid].push(c);
                c.sprite.anchor.x = 0.5;
                c.sprite.anchor.y = 0.5;
                if (this.stacks[data.sid].length > 1) {
                    c.sprite.position.x = this.stacks[data.sid][this.stacks[data.sid].length-2].sprite.position.x;
                    c.sprite.position.y = this.stacks[data.sid][this.stacks[data.sid].length-2].sprite.position.y;
                }
                c.sprite.rotation = Math.random() * 0.2 - 0.1;
            } else if (data.type.toString().substr(0,4) === 'slot') {
                var slotNumber = data.type.replace('slot', '');
                this.slots[slotNumber].addCard(card);

                console.log('valid play to slot');
            }
        }
    };

    Game.prototype.start = function(data) {
        var self = this;
        var playerCount = data.players;
        self.players = data.playerList;

        //rotate table until we are in position
        var currentPos = self.players.indexOf(self.user.username);
        while (currentPos < self.players.length-1) {
            self.players.unshift(self.players.pop());
            currentPos++;
        }

        $('#gameLobby').dialog('close');
        $('#scoreScreen').dialog('close');
        if (self.stage.children.length > 0) {
            self.stage.removeChildren();
        }
        $('#disableAll').show();

        self.stage.setBackgroundColor(0x111111);
        texture = PIXI.Texture.fromImage("assets/img/woodbg.jpg");
        var gbg = new PIXI.TilingSprite(texture, window.innerWidth, window.innerHeight);
        var bgHeight = gScale.y * baseHeight;
        var bgTop = (window.innerHeight - bgHeight) / 2;
        gbg.position.x = 0;
        gbg.position.y = bgTop; 
        gbg.tileScale.x = gScale.x;
        gbg.tileScale.y = gScale.y;
        gbg.height = bgHeight; 
        gbg.id = 'table';
        gbg.type = 'table';

        var table = new PIXI.DisplayObjectContainer();
        table.position.x = 0;
        table.position.y = bgTop; 
        table.width = window.innerWidth;
        table.height = bgHeight - (gScale.y * 300); 
        table.type = 'table';
        table.id = 'table';
        table.interactive = true;
        table.hitArea = new PIXI.Rectangle(0, bgTop, table._width, table._height);
        self.cards = {};
        self.cards.table = table;

        var fontSize = Math.floor(30 * gScale.x);
        self.goalText = self.addGraphic('text', {
            text: self.goalLeft,
            font: 'bold ' + fontSize + 'px "Showcard Gothic"',
            fill: '#111111',
            align: 'center',
            pos: {x: (cardSizeX/2), y: cardSizeY + (30*gScale.y)},
            visible: false
        });

        //Update user info
        self.user.clientTop = bgTop;
        self.user.clientHeight = table._height;
        self.user.clientWidth = table._width;

        fontSize = Math.floor(200 * gScale.x);
        self.pounceText = self.addGraphic('text', {
                text: 'POUNCE!',
                font: 'bold ' + fontSize + 'px "Showcard Gothic"',
                fill: '#111111',
                align: 'center',
                pos: {x: (self.user.clientWidth/2), y: self.user.clientTop}, //self.user.clientTop + (self.user.clientHeight/2)},
                alpha: 0,
                visible: false 
        });

        self.stage.addChild(gbg);
        self.stage.addChild(table);

        //setup socket listeners
        self.socket.off("cardPlayed");
        self.socket.off("cardPlayedOther");
        self.socket.off("gameOver");
        self.socket.off("playerStuck");
        self.socket.off("gameReady");
        self.socket.off("cardMoved");
        self.socket.on("cardPlayed", function(data) { self.cardPlayed(data); });
        self.socket.on("cardPlayedOther", function(data) { self.cardPlayedOther(data); });
        self.socket.on("gameOver", function(data) { self.over(data); });
        self.socket.on("playerStuck", function(data) { self.onPlayerStuck(data); });
        self.socket.on("gameReady", function(data) { self.onReady(data); });
        self.socket.on("cardMoved", function(data) { self.cardMoved(data); });

        var cardLoader = new PIXI.AssetLoader(["assets/img/cards.json"]);
        cardLoader.onProgress = function(loader) {
            if (loader.loaded) {
                var cardName="";
                for (cardName in loader.json.frames) {
                    if (cardName !== "black_joker.png" && cardName !== "red_joker.png" && cardName !== "back.png") {
                        cardFrames.push(cardName);

                        //figure out an id for this card
                        var cardId = cardName
                        .replace('clubs', 'C')
                        .replace('diamonds', 'D')
                        .replace('hearts', 'H')
                        .replace('spades', 'S')
                        .replace('jack', '11')
                        .replace('queen', '12')
                        .replace('king', '13')
                        .replace('ace', 1)
                        .replace('_of_', '')
                        .replace('.png', '');
                        var m  = cardId.match(/^(\d*)([A-Z])/);
                        cardId = m[1] + ':' + m[2];
                        cardIds.push(cardId);
                    }
                }
            }
        };

        cardLoader.onComplete = function() {
            var x, c, i, slotSpacing = 130 * gScale.x;

            var cardContainer = new PIXI.DisplayObjectContainer();
            cardContainer.position.x = (window.innerWidth - (7*slotSpacing)) / 2;
            cardContainer.position.y = bgTop + bgHeight - (300*gScale.y);

            var remainerContainer = new PIXI.DisplayObjectContainer();
            remainerContainer.interactive=true;
            remainerContainer.position.y = 0;
            remainerContainer.position.x = (cardSizeX/2) + ((7*130) * gScale.x);

            self.stuckContainer = new PIXI.DisplayObjectContainer();
            self.stuckButton = self.addGraphic('sprite', {
                texture: 'assets/img/stuck.png',
                pos: {x: (16*gScale.x)*(playerCount-1)/2, y: 0},
                scale: {x: gScale.x, y: gScale.y},
                interactive: true,
                id: 'stuckButton',
                type: 'button',
                container: self.stuckContainer
            });
            self.stuckButton.buttonMode = true;
            self.stuckButton.click = self.stuckButton.tap = function(data) {
                self.socket.emit('playerStuck', {
                    user: self.user.username,
                    game: currentGame._id
                });
                self.isStuck = true;
            };

            self.stuckContainer.position.y = cardSizeY + (40 * gScale.y);
            self.stuckContainer.position.x = (cardSizeX) + ((7*130) * gScale.x) + (7*gScale.x);
            self.stuckContainer.position.x -= ((16 * gScale.x) * playerCount) /2;
            self.stuckContainer.visible = false;
            
            self.stuckCirclesOn = [];
            self.stuckCirclesOff = [];
            var circle;
            for (i = 0; i < playerCount; i++) {
                self.stuckCirclesOff.push(self.addGraphic('sprite', {
                    texture: 'assets/img/wait_empty.png',
                    scale: {x: gScale.x, y: gScale.y},
                    pos: {x: (16 * gScale.x * i), y: (35*gScale.y)},
                    container: self.stuckContainer
                }));
                circle = self.addGraphic('sprite', {
                    texture: 'assets/img/wait_full.png',
                    scale: {x: gScale.x, y: gScale.y},
                    pos: {x: (16 * gScale.x * i), y: (35*gScale.y)},
                    container: self.stuckContainer
                });
                self.stuckContainer.removeChild(circle);
                self.stuckCirclesOn.push(circle);
            }

            remainerContainer.click = remainerContainer.tap = function(data) {
                if (this.enabled === false) { return; }

                var cardsToFlip = self.auxStack.length < 3 ? self.auxStack.length : 3;
                if (!cardsToFlip || this.reset === true) {
                    //reset
                    self.auxStackUp.reverse();
                    for (i=0; i<self.auxStackUp.length; i++) {
                        c = self.auxStackUp[i].reset();
                        self.cards[c.sprite.id] = c;
                        self.auxStack.push(c);
                    }
                    self.auxStackUp = [];

                    //Maybe they are stuck?
                    if (self.lastPlays === 0 && !self.stuckContainer.visible) {
                        self.cardContainer.addChild(self.stuckContainer);
                        self.stuckContainer.visible = true;
                    }
                    self.lastPlays = 0;
                } else {
                    var l=0, sprite, newCard, config, posX, posY;
                    for (i=0; i<self.auxStackUp.length; i++) {
                        sprite = self.auxStackUp[i].sprite;
                        sprite.position.x = (833.5 + i/2) * gScale.x;
                        sprite.position.y = (cardSizeY/2) - (i/2 * gScale.y);
                        l = i;
                    }

                    for (i=0; i<cardsToFlip; i++) {
                        newCard = self.auxStack.pop();
                        posX = (833.5 + l/2 + i*20) * gScale.x;
                        posY = (cardSizeY/2) - (l/2 + i*20) * gScale.y;
                        config = {
                            faceUp: true,
                            container: cardContainer,
                            pos: {x: posX, y: posY},
                            type: "auxUp",
                            enabled: i<cardsToFlip-1 ? false : true,
                            frameName: newCard.origConfig.frameName,
                            id: newCard.origConfig.id
                        };

                        c = newCard.recreate(config);
                        self.cards[c.sprite.id] = c;
                        self.auxStackUp.push(c);
                    }
                }
            };

            //shuffle deck
            self.deck.shuffle(10);

            //draw 12 cards face down
            var cardList = self.deck.deal(17);
            var locX = cardSizeX/2, locY = cardSizeY/2;
            for (x=0; x<12; x++) {
                locX+=(0.5 * gScale.x);
                locY-=(0.5 * gScale.y);
                c = new Card(self.stage, self.socket, self.user, {
                    id: cardIds[cardList[x]],
                    faceUp: false,
                    type: 'goalDown',
                    container: cardContainer,
                    pos: {x: locX, y: locY},
                    frameName: cardFrames[cardList[x]],
                    enabled: true
                });
                self.cards[c.sprite.id] = c;
            }

            //draw 1 card face up
            c = new Card(self.stage, self.socket, self.user, {
                id: cardIds[cardList[12]],
                faceUp: true,
                type: 'goalUp',
                container: cardContainer,
                pos: {x: locX+(0.5 * gScale.x), y: locY-(0.5 * gScale.y)},
                frameName: cardFrames[cardList[12]],
                enabled: true
            });
            self.cards[c.sprite.id] = c;

            //draw 1 card face up x
            var slotNum = 0;
            for (x=13; x<17; x++) {
                slotNum++;
                var s = new Slot(slotNum, cardContainer, cardSizeX, cardSizeY, slotSpacing, gScale);
                self.slots[slotNum] = s;
                c = s.addCard(new Card(self.stage, self.socket, self.user, {
                    id: cardIds[cardList[x]],
                    faceUp: true,
                    type: 'slot' + slotNum,
                    container: cardContainer,
                    pos: {x: cardSizeX/2, y: cardSizeY/2},
                    frameName: cardFrames[cardList[x]]
                }));
                self.cards[c.sprite.id] = c;
            }

            //Add Rectangle
            var emptyAux = self.addGraphic('sprite', {
                texture: 'assets/img/empty_aux.png',
                pos: {x: cardSizeX/2, y: cardSizeY/2},
                scale: {x: 0.6*gScale.x, y: 0.6*gScale.x},
                interactive: true,
                id: 'emptyAux',
                type: 'emptyAux',
                container: remainerContainer
            });

            locX = cardSizeX/2;
            locY = cardSizeY/2;
            for (x=0; x<self.deck.cards.length; x++) {
                locX+=(0.5 * gScale.x);
                locY-=(0.5 * gScale.y);
                c = new Card(self.stage, self.socket, self.user, {
                    id: cardIds[self.deck.cards[x]],
                    faceUp: false,
                    type: 'auxDown',
                    container: remainerContainer,
                    pos: {x: locX, y: locY},
                    frameName: cardFrames[self.deck.cards[x]],
                    enabled: false
                });
                self.cards[c.sprite.id] = c;
                self.auxStack.push(c);
            }
            self.remainerContainer = remainerContainer;
            self.cardContainer = cardContainer;
            cardContainer.addChild(remainerContainer);
            cardContainer.addChild(self.goalText);
            self.stage.addChild(cardContainer);

            //Tell server we are ready
            self.socket.emit('gameLoaded', {
                user: self.user.username,
                game: currentGame._id
            });
        };
        cardLoader.load();
    };

    return Game;
});
