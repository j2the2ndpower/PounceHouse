var Deck = function() {
    var i=0;
    this.cards = [];

    for(i=0; i<52; i++) {
        this.cards.push(i);
    }
};

Deck.prototype.shuffle = function(n) {
    var i=0, j=0;
    for (i=0; i < n; i++) {
        for(j=0; j < this.cards.length; j++) {
            var k = Math.floor(Math.random() * this.cards.length);
            var temp = this.cards[j];
            this.cards[j] = this.cards[k];
            this.cards[k] = temp;
        }
    }
};

Deck.prototype.deal = function(n) {
    n = n || 1;
    if (this.cards.length >= n) {
        var cards = [], i=0;
        for (i=0; i < n; i++) {
            cards.push(this.cards.shift());
        }
        return cards;
    }

    return [];
};

module.exports = Deck;
