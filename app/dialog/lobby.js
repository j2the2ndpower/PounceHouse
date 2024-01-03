define(['jquery-ui/jquery-ui.min', "dataTables.jqueryui"], function(require) {
    var selectedGameId;
    var selectedGame = {};

    var lobbyDialog = function(user, socket) {
        //Dialogs
        $('#lobby').dialog({
            autoOpen: false,
            closeOnEscape: false,
            title: 'Lobby',
            dialogClass: "no-close",
            width: "80%",
            open: function() {
                selectedGameId = undefined;
                selectedGame = {};
                $( $.fn.dataTable.tables( true ) ).DataTable().columns.adjust();
                socket.emit("joinRoom", "lobby");
                socket.emit('gameListUpdate');
            },
            close: function() {
                socket.emit("leaveRoom", "lobby");
            },
            buttons: [{
                text: 'Join Game',
                click: function() {
                    socket.emit('joinGame', {
                        id: selectedGameId,
                        user: user.username
                    });
                }
            }, {
                text: 'Create Game',
                click: function() {
                    $('#createGame').dialog('open');
                }
            }]
        });

        $('#createGame').dialog({
            autoOpen: false,
            title: 'Create Game',
            buttons: [{
                text: 'Create Game',
                click: function() {
                    socket.emit('createGame', {
                        user: user.username,
                        name: $('#gameName').val(),
                        type: $('#gameType').val(),
                        players: $('#gameNumOfPlayers').val()
                    });
                }
            }, {
                text: 'Cancel',
                click: function() {
                    $(this).dialog('close');
                }
            }]
        });

        //UI Components

        $('#glEnterText').on('keypress', function(e) {
            if (e.charCode == 13 || e.keyCode == 13) {
                socket.emit('gameChat', {user: user.username, message: $('#glEnterText').val()});
                $('#glEnterText').val('');
            }
        });

        $('#gameNumOfPlayers').spinner({
            max: 6,
            min: 2
        });
        $('#gameType').selectmenu({
            width: '100%'
        });

        $('#gameList').dataTable({
            scrollY: "300px",
            //scrollCollapse: true,
            paging: false,
            jQueryUI: true,
            data: [],
            columns: [
                { title: "ID", visible: false },
                { title: "Name" },
                { title: "Owner" },
                { title: "Players" },
                { title: "Status" },
                { title: "Type" }
            ],
            columnDefs: [{
                targets: [0],
                visible: false,
                searchable: false
            }],
            createdRow: function ( row, data, index ) {
                $(row).id = data[0];
            }
        });

        $('#gameList tbody').on('click', 'tr', function (e) {
            e.preventDefault();
            var data = $('#gameList').DataTable().data();
            if (!data.length) { return; }

            $(selectedGame).removeClass('selected');
            selectedGame = this;
            selectedGameId = data[this._DT_RowIndex][0];

            $(this).addClass('selected');
        });

        $('#gameList tbody').on('dblclick', 'tr', function(e) {
            e.preventDefault();
            if (!selectedGameId) { return; }
            socket.emit('joinGame', {
                id: selectedGameId,
                user: user.username
            });
        });


        //Socket Callbacks

        socket.on("gameListUpdate", function(data) {
            var dt = $('#gameList').DataTable();
            var oldData = dt.data(), foundSelection = false;

            dt.clear();
            dt.rows.add(data);
            dt.draw();

            // Reselect
            x = 0;
            $('#gameList tr').each(function() {
                if ( this._DT_RowIndex !== undefined && data[this._DT_RowIndex][0] === selectedGameId ) {
                    $(this).addClass('selected');
                    foundSelection=true;
                }
                x++;
            });

            if(!foundSelection) { selectedGameId=undefined; selectedGame={}; }

        });

        socket.on("joinedGame", function(data) {
            $('#lobby').dialog('close');
            $('#createGame').dialog('close');
            currentGame = data;
            $('#glGameChat').html('');
            $('#gameLobby').dialog('open');
            socket.emit('joinRoom', 'G:' + data._id);
        });
    };

    return lobbyDialog;
});
