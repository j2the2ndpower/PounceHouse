define(function(require) {
    var io      = require("socketio");
    var socket  = io.connect('pounce.house');

    //Set up object types
    var User    = require('./user');
    var user = new User(socket);

    //Set up UI
    var stage = require('./graphics');
    require('./util')(socket);
    require('./dialog/login')(user);
    require('./dialog/lobby')(user, socket);
    require('./dialog/gameLobby')(stage, user, socket);
    require('./dialog/score')(user, socket);

});
