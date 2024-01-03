define(function() {
    var user = function(socket) {
        var self=this;
        this.username = "";
        this.password = "";
        this.socket = socket;
        this.randId = Math.floor(Math.random() * 50);
        
        this.socket.on("userCreated", function(data) { self.onCreated(data); });
        this.socket.on("loginSuccess", function(data) { self.onLogin(data); }); 
    };

    user.prototype.login = function(username, password, reconnect) {
        reconnect = reconnect || false;
        this.socket.emit("loginUser", {
            username: username,
            password: password,
            reconnect: reconnect
        });
    };

    user.prototype.serverUpdate = function(data) {
        this.username = data.username;
        this.password = data.password;
    };

    user.prototype.create = function(username, password, confirmp) {
        this.socket.emit('newUser', {
            username: username, 
            password: password, 
            confirm: confirmp
        });
    };

    user.prototype.onCreated = function(data) {
        this.serverUpdate(data);
        $("#createAccountBox").dialog('close');
        $("#lobby").dialog('open');
    };

    user.prototype.onLogin = function(data) {
        this.serverUpdate(data);
        if (!data.reconnected) {
            if ($("#stayLoggedIn").prop('checked')) {
                document.cookie = "username=" + data.username + "; expires=-1; path=/";
                document.cookie = "password=" + data.password + "; expires=-1; path=/";
            } else {
                document.cookie = "username=; expires=0; path=/";
                document.cookie = "password=; expires=0; path=/";
            }
        }
        $("#loginBox").dialog('close');
        $("#lobby").dialog('open');
    };

    user.prototype.getUsername = function() {
        return this.username;
    };

    user.prototype.updateSocket = function(socket) {
        this.socket = socket;
    };
    
    return user;
});
