var User = require('../schema/User');
var Game = require('../schema/Game');
var serverGame = require('./game');

var serverUser = function(socket) {
    var self = this;
    self.socket = socket;
    self.schema = {};
    self.game = undefined;
    self.loggedIn = false;

    socket.on("joinRoom", function(room) {
        self.joinRoom(room);
    });

    socket.on("leaveRoom", function(room) {
        self.leaveRoom(room);
    });

    socket.on("createGame", function(data) {
        self.game = new serverGame(self);
        self.game.create(data);
    });

    socket.on("addBot", function(data) {
        if (self.game) {
            self.game.addBot();
        }
    });

    socket.on("joinGame", function(data) {
        self.joinGame(data);
    });

    socket.on('leaveGame', function(data) {
        self.leaveGame(data);
    });

    socket.on("startGame", function(data) {
        if (self.game) {
            self.game.start();
        }
    });

    socket.on("gameListUpdate", function() {
        self.sendGameList(false);
    });

    socket.on("moveCard", function(data) {
        socket.broadcast.to('G:'+data.game).emit('cardMoved', data);
    });

    socket.on("dropCard", function(data) {
        if (self.game) {
            self.game.onCardPlayed(self, data);
        }
    });

    socket.on("cancelMove", function(data) {
        if (self.game) {
            self.game.onCancelMove(self, data);
        }
    });

    socket.on("playerStuck", function(data) {
        if (self.game) {
            self.game.onPlayerStuck(data);
        }
    });

    socket.on("cancelStuck", function(data) {
        if (self.game) {
            self.game.onPlayerCancelStuck(data);
        }
    });

    socket.on("gameChat", function(data) {
        io.sockets.in(socket.room).emit('gameChat', data);
    });

    socket.on("gameWin", function(data) {
        if (self.game) {
            self.game.onGameWin(data);
        }
    });

    socket.on("gameLoaded", function(data) {
        if (self.game) {
            self.game.onGameLoaded(data);
        }
    });

    socket.on("gameContinue", function(data) {
        if (self.game) {
            self.game.onGameContinue(data);
        }
    });

};

serverUser.prototype.sendGameList = function(broadcast) {
    var self = this;
    var socket = self.socket;

    Game.find({status: "Waiting for Players"}, function(err, data) {
        if (!err) {
            var gameList = [], game;
            for (game in data) {
                gameList.push([data[game]._id, data[game].name, data[game].owner, data[game].players + '/' + data[game].maxPlayers, data[game].status, data[game].type]);
            }

            if (broadcast) {
                io.sockets.in('lobby').emit('gameListUpdate', gameList);
            } else {
                socket.emit('gameListUpdate', gameList);
            }
        }
    });
};

serverUser.prototype.create = function(data) {
    var self = this;
    var socket = self.socket;

    if (!data.username || !data.password) {
        socket.emit("errorMsg", {
            name: "User Error",
            code: 50,
            err: 'Please enter a value for Username and Password.'
        });
        return;
    }

    if (data.password !== data.confirm) {
        socket.emit("errorMsg", {
            name: "User Error",
            code: 75,
            err: 'Passwords must match.'
        });
        return;
    }

    User.findOne({username: data.username}, function(err, user) {
        if (user) {
            socket.emit("errorMsg", {
                name: 'User Error',
                code: 100,
                err: 'User already exists.'
            });
            return;
        }

        self.schema = new User(data);
        self.schema.save(function(err) {
            if (err) {
                self.socket.emit("errorMsg", err);
            } else {
                self.socket.emit('userCreated', data);
            }
        });
    });
};

serverUser.prototype.login = function(data) {
    var self = this;
    var socket = self.socket;

    if (data.reconnect) {
        User.findOne({username: data.username, password: data.password}, function(err, user) {
            if (!err && user) {
                data.password = user.password;
                data.reconnected = true;
                socket.emit("loginSuccess", data);
                self.schema = user;
            }
        });
        return;
    }

    User.findOne({username: data.username}, function(err, user) {
        if (!user) {
            socket.emit("errorMsg", {
                name: "User Error",
                code: 200,
                err: 'Invalid username / password'
            });
            return;
        }

        user.comparePassword(data.password, function(err, isMatch) {
            if (err) {
                socket.emit("errorMsg", err);
            } else if (!isMatch) {
                socket.emit("errorMsg", {
                    name: "User Error",
                    code: 300,
                    err: "Invalid username / password"
                });
            } else {
                data.password = user.password;
                data.reconnected = false;
                socket.emit("loginSuccess", data);
                self.schema = user;
            }
        });
    });
};

serverUser.prototype.joinRoom = function(room) {
    var self = this;
    var socket = self.socket;

    if (socket.room) {
        self.leaveRoom(socket.room);
    };

    socket.room=room;
    socket.join(room);
    if (room.substr(0,2) == 'G:') {
        socket.emit("gameChat", {message: "You have joined the game!"});
    }
};

serverUser.prototype.leaveRoom = function(room) {
    var self = this;
    var socket = self.socket;

    socket.room=undefined;
    socket.leave(room);
};

serverUser.prototype.joinGame = function(data) {
    var self = this;
    var socket = self.socket;

    var game = serverGame.findGame(data.id);
    if (self.canJoin(data, game)) {
        self.game = game;

        //update lobby
        self.sendGameList(true);

        //update the users in game
        var gameData = game.schema.toObject();
        socket.emit('gameInfo', gameData);
        io.sockets.in('G:'+data.id).emit('gameInfo', gameData);
    }
};

serverUser.prototype.canJoin = function(data, game) {
    var self = this;
    var socket = self.socket;

    if (!data.id || !game) {
        socket.emit('errorMsg', {
            name: "Game Error",
            code: 100,
            err: 'Please select an active Game.'
        });
        return false;
    }

    var gameData = game.schema;
    if (gameData.playerList.indexOf(data.user) >= 0 ) {
        //assume reconnecting...
        socket.emit('joinedGame', gameData);
        socket.emit('gameInfo', gameData);
        socket.broadcast.to('G:'+data.id).emit('gameChat', {message: data.user+' has reconnected...'});
        return true;
    }

    if (gameData.players >= gameData.maxPlayers) {
        socket.emit('errorMsg', {
            name: "Game Error",
            code: 100,
            err: 'Game is full.'
        });
        return false;
    } else {
        socket.emit("joinedGame", gameData);
        socket.broadcast.in('G:' + gameData._id).emit('gameChat', {message: data.user + ' has joined the game!'});
        gameData.players++;
        gameData.playerList.push(data.user);

        game.save();

        return true;
    }
};

serverUser.prototype.leaveGame = function(data) {
    var self = this;
    var socket = self.socket;

    var game = serverGame.findGame(data.id);
    if (!game ) {
        return false;
    }

    var gameData = game.schema;

    //update player list
    var i = gameData.playerList.indexOf(data.user);
    if (i >= 0) {
        gameData.playerList.splice(i, 1);
    }
    gameData.players--;

    //update ownership
    if (data.user == gameData.owner && gameData.players > 0) {
        gameData.owner = gameData.playerList[0];
    }

    //remove game if no one is there
    if (gameData.players === 0) {
        game.remove();
    } else {
        game.save();
    }

    self.game = undefined;

    //update users in room
    io.sockets.in('G:'+data.id).emit('gameChat', {message: data.user + ' has left the game!'});
    io.sockets.in('G:'+data.id).emit('gameInfo', gameData);

    //update lobby
    self.sendGameList(true);
};


module.exports = serverUser;
