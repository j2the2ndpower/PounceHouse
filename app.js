var static      = require('node-static');
var mongoose    = require('mongoose');
var User        = require('./assets/schema/User');
var Game        = require('./assets/schema/Game');
var serverUser  = require('./assets/js/user');
var fileServer  = new static.Server('./');

var app         = require('http').createServer(function handler (request, response) {
        fileServer.serve(request, response); // this will return the correct file
});

io          = require('socket.io').listen(app);

app.listen(3001);

var connStr = "mongodb://admin:a5f7ebfab2e98008b217f966f85897ef34ebc340ceef7a77@pounce.house:27017/pounce?authSource=admin";
var gameSlotCount = {};
var gameWaiting = {};
var gameLoading = {};
var gameSlot = {};
var gamePoints = {};
var gameStuck = {};
var users = {};
var games = {};

mongoose.connect(connStr).catch('error', err => {
  console.log("Error connecting to mongo db...");
  throw err;
});

/*    //clear Game list
    Game.remove({}, function(err) {
        if (err) { console.dir(err); }
    });
   */

// Listen for incoming connections from clients
io.sockets.on('connection', function (socket) {
    socket.on('newUser', function (data) {
        var user = new serverUser(socket);
        user.create(data);
    });

    socket.on("loginUser", function(data) {
        var user = new serverUser(socket);
        user.login(data);
    });
});

console.log('Server running at http://127.0.0.1:3001/');
