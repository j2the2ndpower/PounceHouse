define(function(require) {
    var load = function(socket) {
        socket.on("errorMsg", function(data) {
            $("#errorMsg").html("<p>" + data.err + "</p>");
            $("#errorMsg").dialog({
                dialogClass: "alert",
                title: data.name,
                width: 400,
                buttons: [{
                    text: "OK",
                    click: function() {
                        $(this).dialog("close");
                    }
                }]
            });
        });
    };

    return load;
});
