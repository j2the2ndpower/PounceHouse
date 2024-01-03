var mongoose    = require('mongoose');
var Schema      = mongoose.Schema;

//User Schema
var GameSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    players: { type: Number, required: true },
    maxPlayers: { type: Number, required: true },
    status: { type: String, required: true },
    owner: { type: String, required: true },
    playerList: {type: Array, required: false}
}, { collection: 'games'});

module.exports = mongoose.model('Game', GameSchema);
