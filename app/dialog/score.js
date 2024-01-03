define(['jquery-ui/jquery-ui.min'], function(require) {
    var scoreScreen = function(user, socket) {
        //Dialogs
        $('#scoreScreen').dialog({
            autoOpen: false,
            closeOnEscape: false,
            title: 'Score',
            dialogClass: "no-close",
            width: 'auto',
            open: function() {
                $('#ssCont').button('option', 'label', 'Continue');
                $('#ssCont').button('option', 'disabled', false);
            },
            buttons: [{
                text: 'Continue',
                id: 'ssCont',
                click: function() {
                    $('#ssCont').button('option', 'label', 'Waiting for Others...');
                    $('#ssCont').button('option', 'disabled', true);
                    socket.emit('gameContinue', {
                        game: currentGame._id,
                        user: user.username
                    });
                }
            }]
        });
    };

    return scoreScreen;
});
