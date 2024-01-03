var mongoose    = require('mongoose');
var Schema      = mongoose.Schema;

//User Schema
var AppMessageSchema = new Schema({
    message: { type: String, required: true },
    code: { type: Number, required: true },
    time: { type: Date, required: true }
}, {
    collection: 'app_message',
    capped: {
        size: 1024,
        max: 1000,
        autoIndexId: true
    }
});

module.exports = mongoose.model('AppMessage', AppMessageSchema);
