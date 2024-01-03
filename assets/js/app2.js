requirejs.config({
    baseUrl: "assets/js",
    paths: {
        "app": "../../app",
        "socketio": "../../socket.io/socket.io"
    },
    shim: {
        "socketio": {
            exports: "io"
        },
        "jquery-1.8.0.min": {
            exports: "$"
        },
        "jquery-ui/jquery-ui.min": ["jquery-1.8.0.min"],
        "jquery.dataTables.min": ["jquery-1.8.0.min"],
        "dataTables.jqueryui": ["jquery-ui/jquery-ui.min"],
        "pixi": {
            exports: "PIXI"
        }
    }
});

requirejs(["app/main"]);
