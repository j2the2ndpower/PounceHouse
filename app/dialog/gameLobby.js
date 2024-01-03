define(['require', 'jquery-ui/jquery-ui.min', 'jquery.dataTables.min', '../game/Game'], function(require) {
    var Game = require('../game/Game');

    var gameLobbyDialog = function(stage, user, socket) {
        //Dialogs
        $('#gameLobby').dialog({
            autoOpen: false,
            title: 'Game Lobby',
            width: "80%",
            dialogClass: "no-close",
            height: 580,
            buttons: [{
                id: 'startGame',
                text: 'Start Game',
                click: function() {
                    socket.emit('startGame', {user: user.username, id: currentGame._id});
                }
            }, {
                text: 'Leave Game',
                click: function() {
                    $('#gameLobby').dialog('close');
                    $('#lobby').dialog('open');
                    socket.emit('leaveGame', {user: user.username, id: currentGame._id});
                }
            }]
        });

        //socket callbacks

        socket.on("gameInfo", function(data) {
            $('#giName').html(data.name);
            $('#giOwner').html(data.owner);
            $('#giStatus').html(data.status);
            $('#giType').html(data.type);
            $('#giPlayers').html(data.players + '/' + data.maxPlayers);
            var playerList = '';
            $(data.playerList).each(function(i, o) {
                playerList += '<tr><td>' + o  + '</td></tr>';
            });
            playerList += '<tr><td><button id="addBot">Add Bot</button>';
            $('#playerList').html(playerList);

            if (data.owner == user.username) {
                if (data.maxPlayers == data.players) {
                    $('#startGame').button('enable');
                    $('#addBot').button().disable();
                } else {
                    $('#addBot').button().click(function(e) {
                        e.preventDefault();
                        socket.emit('addBot', {id: currentGame._id});
                    });
                    $('#startGame').button('disable');
                }
            } else {
                $('#startGame').button('disable');
                $('#addBot').button().disable();
            }
        });

        socket.on("gameChat", function(data) {
            $('#glGameChat').append((data.user ? data.user + '&gt; ' : '') + data.message + '<br />');
            $('#glGameChatContainer').scrollTop($('#glGameChatContainer')[0].scrollHeight);
        });


        socket.on('startGame', function(data) {
            game = new Game(stage, user, socket);
            game.start(data);
        });

    };

    return gameLobbyDialog;
});
