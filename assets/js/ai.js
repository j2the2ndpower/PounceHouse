var Game = require('../schema/Game');
var Deck = require('./deck');
var cardData = require('../img/cards.json');
var serverGame = require('./game');

var aiNames = ['Rocky E Bola',
               'Silly Susan',
               'Scary Sam',
               'Tastless Ted',
               'Hubcap Harry',
               'Patty Cake'];

var serverAI = function() {
    var self = this;
    self.difficulty = 'normal';
    self.awareness = 0.75;

    self.listening = {};
    self.create();
};

serverAI.prototype.reset = function() {
    var self = this;

    self.goalCards = [];
    self.slots = [];
    self.auxStack = [];
    self.auxStackUp = [];
    self.stacks = {};
    self.stackMemory = {};
    self.score = [];
    self.lastPlays = 0;
    self.goalLeft = 13;
    self.playerStuckCount = 0;
    self.players = [];
    self.isStuck = false;
    self.deck = new Deck();

    var cardName, cardIds = [], cardFrames = {};

    for (cardName in cardData.frames) { 
        if (cardName !== "black_joker.png" && cardName !== "red_joker.png" && cardName !== "back.png") {
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
            cardFrames[cardId] = cardName;
        }
    }
    self.cardIds = cardIds;
    self.cardFrames = cardFrames;

    var tableSpots = [];
    for (x=5; x<=95; x+=10) {
        for (y=25; y<=75; y+=25) {
            tableSpots.push({
                x: x/100,
                y: y/100,
                distance: Math.sqrt(Math.pow(50-x,2)+Math.pow(100-y,2)),
                open: true
            });
        }
    }

    self.tableSpots = tableSpots;
};

serverAI.prototype.deal = function() {
    var self = this;

    //shuffle deck
    self.deck.shuffle(10);

    var mapFunc = function(obj) { return self.cardIds[obj]; };

    //set up hand
    self.goalCards = self.deck.deal(13).map(mapFunc);
    self.slots = [];
    for (var x = 0; x < 4; x++) {
        self.slots.push(self.deck.deal(1).map(mapFunc));
    }
    self.auxStack = self.deck.deal(35).map(mapFunc);
    self.printHand();
};

serverAI.prototype.create = function() {
    var self = this;

    self.name = '[BOT] ' + aiNames[Math.floor(Math.random()*aiNames.length)];

    self.listen('startGame', function(data) {
        //clear memory
        self.reset();
        self.deal();

        if (self.game) {
            self.game.onGameLoaded({
                user: self.name,
                game: self.game._id
            });
        } 
    });

    self.listen('cardPlayedOther', function(data) {
        if (data.type == 'table' && data.valid) {
            if (self.stacks[data.sid]) {
                self.stacks[data.sid].push(data);
            } else {
                self.stacks[data.sid] = [data];
            }
            self.lastPlays++;
            self.isStuck = false;
            self.cardLayed(data);
        }
    });


    var playLoop = function() {
        self.think();
        self.thinking = setTimeout(function() {
            playLoop();
        }, 1000);
    };

    self.listen('gameReady', function(data) {
        setTimeout(function() {
            playLoop();
        }, 1500);
    });

    self.listen('gameOver', function(data) {
        clearTimeout(self.thinking);

        self.game.onGameContinue({
            game: self.game.schema._id,
            user: self.name
        });
    }); 

    self.listen('playerStuck', function(data) {
        var self = this, i;

        self.playerStuckCount = data.players;

        if (data.players == data.maxPlayers) {
            self.unstuck(data);
        }
    });

    self.listen('cardPlayed', function(data) {
        var self = this, card;

        if (data.valid === true) {
            if (data.sourceType === 'goalUp') {
                self.goalLeft--;
                card = self.goalCards.pop();
            } else if (data.sourceType === 'auxUp') {
                card = self.auxStackUp.pop();
            } else if (data.sourceType.substr(0,4) === 'slot') {
                var slot = data.sourceType.substr(4,1);
                card = self.slots[slot].pop();
            }

            if (data.target.substr(0,4) == 'slot') {
                var slot = data.target.substr(4,1);
                if (slot >= 0 && slot <= 3) {
                    self.slots[slot].push(card);
                }
            }

            self.lastPlays++;
            self.unstuck();
            self.cardLayed(data);

            if (self.goalLeft === 0) {
                //Pounce, I WIN!
                if (self.game) {
                    self.game.onGameWin({
                        user: self.name,
                        game: self.game.schema._id
                    });
                }
            }
            self.printHand();
        } else {
            var e = new Error('dummy');
            console.dir(data);
            console.dir(e.stack);
        }
    });
};

serverAI.prototype.cardLayed = function(data) {
    var self = this, pos = data.pos || {x:0, y:0};

    self.tableSpots.forEach(function(spot) {
        if ((pos.x > spot.x - 0.05 && pos.x < spot.x + 0.05)
        &&  (pos.y > spot.y - 0.25 && pos.y < spot.y + 0.25)) {
            spot.open = false;
        }
    });
};

serverAI.prototype.findSpot = function() {
    var self = this, targetSpot = {x: 0, y: 0}, sd = 1000;

    self.tableSpots.forEach(function(spot) {
        if (spot.open && spot.distance < sd) {
            targetSpot = spot;
            sd = spot.distance;
        }
    });

    return targetSpot;
};

serverAI.prototype.printHand = function() {
    var self = this;

    var goalLeft = self.goalCards.length;
    var topGoalCard = self.goalCards[goalLeft-1];
    
    var slotText = "";
    self.slots.forEach(function(slot) {
        if (Array.isArray(slot) && slot.length > 0) {
            slot.forEach(function(card) {
                slotText += ',' + card;
            });
        } else {
            slotText += 'E';
        }
        slotText += ' ';
    });

    var topAuxCard = self.auxStackUp[self.auxStackUp.length-1];
    var auxUp = self.auxStackUp.length;
    var auxDown = self.auxStack.length;

    console.log(self.name + " hand: " + topGoalCard + "(" + goalLeft + ") " + slotText + " " + topAuxCard + " (" + auxUp + "/" + auxDown + ")");
};

serverAI.prototype.unstuck = function(data) {
    var self = this;

    //reset aux stack
    self.resetAux = true;
    self.flipAux();

    var card = self.auxStack.pop();
    self.auxStack.unshift(card);

    self.resetAux = false;
    self.isStuck = false;
    self.game.onPlayerCancelStuck({
        user: self.name,
        game: self.game.schema._id
    });
};

serverAI.prototype.flipAux = function() {
    var self = this;
    var cardsToFlip = self.auxStack.length < 3 ? self.auxStack.length : 3;
    if (!cardsToFlip || self.resetAux === true) {
        //reset
        self.auxStackUp.reverse();
        for (i=0; i<self.auxStackUp.length; i++) {
            self.auxStack.push(self.auxStackUp[i]);
        }
        self.auxStackUp = [];

        if (self.lastPlays == 0) {
            self.isStuck = true;
        }

        self.lastPlays = 0;
    } else {
        var l=0, sprite, newCard, config, posX, posY;
        for (i=0; i<cardsToFlip; i++) {
            self.auxStackUp.push(self.auxStack.pop());
        }
    }

    self.printHand();
};

serverAI.prototype.listen = function(e, func) {
    var self = this;

    self.listening[e] = func;
};

serverAI.prototype.fireEvent = function(e, data) {
    var self = this;

    if (self.listening.hasOwnProperty(e) && typeof self.listening[e] == 'function') {
        self.listening[e].call(self, data);
    }
};

serverAI.prototype.canJoin = function(game) {
    var self = this,
        gameData = game.schema;

    if (!gameData._id || !gameData) {
        return false;
    }

    if (gameData.players >= gameData.maxPlayers) {
        return false;
    } else {
        return true;
    }
};

serverAI.prototype.joinGame = function(game) {
    var self = this,
        gameData = game.schema;

    if (self.canJoin(game)) {
        io.sockets.in('G:' + gameData._id).emit('gameChat', {message: self.name + ' has joined the game!'});
        gameData.players++;
        gameData.playerList.push(self.name);
        gameData.save();

        self.game = game;

        //update lobby
        self.sendGameList();

        //update the users in game
        io.sockets.in('G:'+gameData._id).emit('gameInfo', gameData);
    } else {
    }
};

serverAI.prototype.sendGameList = function() {
    var self = this;

    Game.find({status: "Waiting for Players"}, function(err, data) {
        if (!err) {
            var gameList = [], game;
            for (game in data) {
                gameList.push([data[game]._id, data[game].name, data[game].owner, data[game].players + '/' + data[game].maxPlayers, data[game].status, data[game].type]);
            }

            io.sockets.in('lobby').emit('gameListUpdate', gameList);
        }
    });
};

serverAI.prototype.leaveGame = function(data) {
};

serverAI.prototype.moveCard = function(card, sid, callback) {
    var self = this;
    var speed = 500, /*200 - (200 * self.awareness) + 1*/ start, distance, dt = new Date();

    start = dt.getTime();

    var sendEvent = function() {
        var t = (new Date()).getTime();
        distance = 1 - ((t-start)/speed);

        var data  = {
            game: self.game.schema._id,
            user: self.name,
            source: card,
            targetStack: sid,
            distance: distance,
            t: t,
            speed: speed,
            start: start,
            frameName: self.cardFrames[card]
        };

        self.game.broadcast('cardMoved', data);

        if ((t-start) < speed) {
            setTimeout(function() { sendEvent(); }, 10);
        } else {
            if (typeof callback === 'function') {
                callback.call();
            }
        }
    }

    sendEvent();
};

serverAI.prototype.playCardField = function(card, sid, source) {
    var self = this, pos = {x: 0.15, y: 0.15};

    if (typeof card === 'string' && card !== "") {
        var m = card.split(':');
        if (m[0] === '1') {
            pos = self.findSpot();
        }
    }
    
    var target;
    if (sid !== 'table') {
        var target = self.stackMemory[sid][self.stackMemory[sid].length-1];
    }

    var data = {
      game: self.game.schema._id, 
      user: self.name,
      source: card,
      target: sid == 'table' ? sid : target.source,
      sid: sid,
      type: 'table',
      sourceType: source,
      child: false,
      pos: pos, 
      frameName: self.cardFrames[card]
    };

    if (sid !== 'table') {
        self.moveCard(card, sid, function() {
            self.game.onCardPlayed(self, data);
        });
    } else {
        self.game.onCardPlayed(self, data);
    }
};

serverAI.prototype.playCardSlot = function(card, slot, source) {
    var self = this, target;
    
    if (typeof slot == 'number') {
        target = self.slots[slot][self.slots[slot].length-1];
    } else {
        target = slot;
    }

    var data = {
      game: self.game.schema._id,
      user: self.name,
      source: card,
      target: target || 'slot' + slot,
      type: 'slot' + slot,
      sourceType: source,
      child: false,
      pos: { x: 0.4726097074468085, y: 0.37426019165177854 },
      frameName: self.cardFrames[card]
    };

    self.game.onCardPlayed(self, data);
};

serverAI.prototype.think = function() {
    var self = this;

    //Scan field -- difficulty determines awareness
    for (var sid in self.stacks) {
        if (Math.floor(Math.random()*100)+1 <= self.awareness*100) {
            //update stack memory
            self.stackMemory[sid] = self.stacks[sid].map(function(s) {return s;});
        }
    }

    var canPlayField = function(card) {
        if (!card) { return false; }

        var m = card.split(':'),
            cardNum = parseInt(m[0]),
            cardSuit = m[1];

        if (Math.floor(Math.random()*100)+1 > self.awareness*100) {
            return false;
        }

        if (cardNum == 1) {
            return 'table';
        } else {
            for (var sid in self.stackMemory) {
                var target = self.stackMemory[sid][self.stackMemory[sid].length-1];
                if (target) {
                        var m2 = target.source.split(':'),
                        targetNum = parseInt(m2[0]),
                        targetSuit = m2[1];

                    if (cardSuit == targetSuit && parseInt(cardNum) == parseInt(targetNum)+1) {
                        return sid;
                    }
                }
            } 
        }

        return false;
    };

    var canPlaySlot = function(card) {
        if (!card) { return false; }

        var m = card.split(':'),
            cardNum = parseInt(m[0]),
            cardSuit = m[1],
            slotNum = -1,
            emptySlot = false;

        if (Math.floor(Math.random()*100)+1 > self.awareness*100) {
            return false;
        }

        self.slots.forEach(function(slot) {
            slotNum++;
            if (slot.length > 0 ) {
                var target = slot[slot.length-1],
                    m2 = target.split(':'),
                    targetNum = parseInt(m2[0]),
                    targetSuit = m2[1];
                
                if (parseInt(cardNum, 0)+1 == targetNum) {
                    var checkSuit = [];
                    checkSuit.push(cardSuit == 'D' || cardSuit == 'H' ? 'R': 'B');
                    checkSuit.push(targetSuit == 'D' || targetSuit == 'H' ? 'R': 'B');
                    if (checkSuit.indexOf('B') >= 0 && checkSuit.indexOf('R') >= 0) {
                        return slotNum;
                    }
                }
            } else {
                emptySlot = slotNum;
            }
        });

        if (emptySlot !== false) {
            return emptySlot;
        }

        return false;
    };

    //Play cards to pounce
        //1. Play top goal stack card on field
        var goalCard = self.goalCards[self.goalCards.length-1], playSid, playSlot;
        if ((playSid = canPlayField(goalCard))!==false) {
            self.playCardField(goalCard, playSid, 'goalUp');
            return;
        }

        //2. Play single slot card on field
        var thisSlot=-1;
        self.slots.forEach(function(slot) {
            thisSlot++;
            if (slot.length == 1 && (playSid = canPlayField(slot[0])) !== false) {
                self.playCardField(slot[0], playSid, 'slot'+thisSlot);
                return;
            }
        });

        //3. Play top goal stack card on slot
        if ((playSlot = canPlaySlot(goalCard)) !== false) {
            self.playCardSlot(goalCard, playSlot, 'goalUp');
            return;
        }

        //4. Play bottom slot card on another slot
        var thisSlot=-1;
        self.slots.forEach(function(slot) {
            thisSlot++;
            if ((playSlot = canPlaySlot(slot[0]))!==false) {
                //slot is not empty?
                if (self.slots[playSlot].length > 0) {
                    self.playCardSlot(slot[0], playSlot, 'slot'+thisSlot);
                    return;
                }
            }
        });

        //5. RARE: Move partial slot stack to another slot in order to play slot card on field AND replace with goal card
        thisSlot=-1;
        self.slots.forEach(function(slot) {
            thisSlot++;
            if ((playSlot = canPlaySlot(slot[1])!==false) && (playSid = canPlayField(slot[0]))) {
                self.playCardSlot(slot[1], playSlot, 'slot'+thisSlot);
                return;
            }
        });
    
    //6. Play card from aux stack onto field in order to play goal card in field
    //7. Play card from aux stack onto slot stack in order to play goal card on slot.
    //8. Play any number of cards from aux stack in order to do 6 or 7 with next cards.

    var topAuxCard = self.auxStackUp[self.auxStackUp.length-1];
    if ((playSid = canPlayField(topAuxCard))!==false) {
        self.playCardField(topAuxCard, playSid, 'auxUp');
        return;
    }

    if ((playSlot = canPlaySlot(topAuxCard))!==false) {
        self.playCardSlot(topAuxCard, playSlot, 'auxUp');
        return;
    }

    //Play cards for points
        //1. Play top slot card on field
        var thisSlot=-1;
        self.slots.forEach(function(slot) {
            thisSlot++;
            if (slot.length > 0 && (playSid = canPlayField(slot[slot.length-1]))!==false) {
                self.playCardField(slot[slot.length-1], playSid, 'slot'+thisSlot);
                return;
            }
        });

        //2. Play card from aux stack onto field
        
        //3. Move partial slot stack to another slot in order to:
            //a. play slot card on field

    //Make options
        //1. Flip aux stack
    if (!self.isStuck) {
        self.flipAux(); 
    } else {
        self.game.onPlayerStuck({
            user: self.name,
            game: self.game.schema._id
        }); 
    }

    //Getting Stuck
        //1. Play card from aux stack onto slot stack 
        //2. Say I'm Stuck
};

module.exports = serverAI;
