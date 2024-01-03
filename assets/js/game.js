var mongoose        = require('mongoose');
var gameModel      = require('../schema/Game');
var serverAI        = require('./ai');

var serverGame = function(user) {
    this.init();
    this.schema = {};
    this.bots = [];
    this.user = user;
};

serverGame.prototype.init = function() {
    this.slotCount = 0;
    this.usersReady = [];
    this.usersLoading = [];
    this.usersStuck = [];
    this.slots = {};
    this.score = {};
};

serverGame.prototype.create = function(data) {
    var self = this;
    var user = self.user;

    self.schema = new gameModel({
        owner: data.user,
        maxPlayers: data.players,
        players: 1,
        type: data.type,
        name: data.name,
        status: "Waiting for Players",
        playerList: [data.user]
    });

    self.schema.save().then((record) => {
        user.socket.emit("joinedGame", record);
        user.socket.emit('gameInfo', record);
        user.sendGameList(true);
        user.game = self;

        //update static game list array
        serverGame.gameList[record._id] = self;
    }).catch((err) => {
        console.dir(err);
        user.socket.emit("errorMsg", err);
    });
};

serverGame.prototype.broadcast = function(e, data, socket) {
    var self = this;

    if (socket) {
        socket.broadcast.to('G:'+self.schema._id).emit(e, data);
    } else {
        io.sockets.in('G:'+self.schema._id).emit(e, data);
    }
    self.bots.forEach(function(bot) {
        bot.fireEvent(e, data);
    }); 
};

serverGame.prototype.addBot = function() {
    var self = this, bot = new serverAI();
    bot.joinGame(self);
    self.bots.push(bot);
};

serverGame.prototype.start = function() {
    var self = this, u;
    self.init();

    self.schema.status = "Playing";
    self.save();

    //init user scores
    for (u = 0; u < self.schema.playerList.length; u++) {
        self.score[self.schema.playerList[u]] = {
            points: 0,
            pounce: 0,
            goalLeft: 13
        };
    }

    self.broadcast('startGame', self.schema.toObject());
};

serverGame.prototype.stop = function() {
};


serverGame.prototype.newSlot = function(card) {
    var self = this,
        sid = self.schema._id + ':' + self.slotCount;

    self.slots[sid] = [card];
    self.slotCount++;

    return sid;
};

serverGame.prototype.onCardPlayed = function(user, data) {
    var self = this;
    var socket = user.socket;
    var m, cardNum, cardSuit, targetNum, targetSuit;

    //get source card data
    m = data.source.split(':');
    cardNum = parseInt(m[0],0);
    cardSuit = m[1];

    //get target card data
    if (data.target !== 'invalid' && data.target !== 'table') {
        m = data.target.split(':');
        targetNum = parseInt(m[0],0);
        targetSuit = m[1];

        if (data.sid && self.slots[data.sid]) {
            var tCard = self.slots[data.sid][self.slots[data.sid].length-1];
            if (tCard !== data.target) {
                m = tCard.split(':');
                targetNum = parseInt(m[0],0);
                targetSuit = m[1];
            }
        }
    }


    //assume invalid
    data.valid = false;

    //Valid play to table
    if (data.type && data.type == 'table' && !data.child) {
        if (cardNum == 1 && data.target == 'table') {
            data.sid = self.newSlot(data.source);
            data.valid = true;
        } else if (parseInt(cardNum,0)-1==targetNum && cardSuit == targetSuit) {
            data.valid = true;
        }

        //keep score
        if (data.valid) {
            self.score[data.user].points++;
        }

    //Valid play to slot
    } else if (data.type && data.type.substr(0,4) == 'slot') {
        if (data.target.substr(0,4) == 'slot') {
            data.valid = true;
        } else if (parseInt(cardNum, 0)+1 == targetNum) {
            var checkSuit = [];
            checkSuit.push(cardSuit == 'D' || cardSuit == 'H' ? 'R': 'B');
            checkSuit.push(targetSuit == 'D' || targetSuit == 'H' ? 'R': 'B');
            if (checkSuit.indexOf('B') >= 0 && checkSuit.indexOf('R') >= 0) {
                data.valid = true;
            }
        }
    }

    if (data.valid && data.sid) {
        self.slots[data.sid] = self.slots[data.sid] || [];
        self.slots[data.sid].push(data.source);
    }

    if (data.valid && data.sourceType.substr(0,4) === 'goal') {
        self.score[data.user].goalLeft--;
    }

//    console.log("User (" + data.user + ") played " + data.source + " on " + data.target + "[valid: " + data.valid + "]");

    if (socket) {
        socket.emit("cardPlayed", data);
    } else {
        user.fireEvent("cardPlayed", data);
    }

    if (data.type == 'table') {
        self.broadcast('cardPlayedOther', data, socket);
    }
    return;
};

serverGame.prototype.onCancelMove = function(user, data) {
    var self = this;

    data.valid = false; 
    data.type = 'invalid';
    self.broadcast('cardPlayedOther', data, user.socket);
};

serverGame.prototype.onPlayerStuck = function(data) {
    var self = this;
    var socket = self.user.socket;

    console.log("player stuck..");
    if (self.usersStuck.indexOf(data.user) < 0) {
        self.usersStuck.push(data.user);
    }

    data.players = self.usersStuck.length;
    data.maxPlayers = self.schema.maxPlayers;
    self.broadcast('playerStuck', data);

    if (data.players >= data.maxPlayers) {
        self.usersStuck = [];
    }
};

serverGame.prototype.onPlayerCancelStuck = function(data) {
    var self = this;
    console.log("cancel stuck... " + data.user);
    if (self.usersStuck) {
        self.usersStuck.splice(self.usersStuck.indexOf(data.user), 1);
        data.players = self.usersStuck.length;
        data.maxPlayers = self.schema.maxPlayers;
        self.broadcast('playerStuck', data);
    }
};

serverGame.prototype.onGameWin = function(data) {
    var self = this;

    console.log("User (" + data.user + ") won game: " + data.game);
    self.score[data.user].pounce++;
    data.score = self.score;
    self.broadcast('gameOver', data);
    console.log("Waiting for users to be ready for next round...");
};

serverGame.prototype.onGameLoaded = function(data) {
    var self = this;

    console.log('User (' + data.user + ') is loaded.');
    if (self.usersLoading.indexOf(data.user) < 0) {
        self.usersLoading.push(data.user);
    }

    if (self.usersLoading.length >= self.schema.maxPlayers) {
        self.usersLoading = [];
        self.broadcast('gameReady', {});
        console.log("Ready Go!");
    }
};

serverGame.prototype.onGameContinue = function(data) {
    var self = this;

    console.log('User (' + data.user + ') is ready.');
    if (self.usersReady.indexOf(data.user) < 0) {
        self.usersReady.push(data.user);
    }

    if (self.usersReady.length >= self.schema.maxPlayers) {
        self.usersReady = [];
        self.start(data);
        console.log("Starting next round!");
    }
};

serverGame.prototype.save = function() {
    var self = this;

    self.schema.save().catch((err) => {
        if (err) { console.dir(err); }
    });
};

serverGame.prototype.remove = function() {
    var self = this;

    console.log("Removing game...");
    self.schema.remove({_id: self.schema._id});
    delete serverGame.gameList[self.schema._id];
    delete self;
};

//STATICS
serverGame.gameList = {};
serverGame.findGame = function(id) {
    return serverGame.gameList[id];
};

module.exports = serverGame;
