var socket = io.connect('pounce.house:3000');
var stage = new PIXI.Stage(0xf27138, true);

stage.findChildAt = function(x, y, searchContainer, origObj) {
    searchContainer = searchContainer || stage;

    //search the children first in reverse order
    if (searchContainer.children.length) {
        var c;
        for (c=searchContainer.children.length-1; c>=0; c--) {
            var result;
            if (result = stage.findChildAt(x, y, searchContainer.children[c], origObj)) {
                return result;
            }
        }
    } else {
        var bounds = searchContainer.getBounds();
        if (bounds.x < x && bounds.x+bounds.width > x && bounds.y < y && bounds.y+bounds.height > y && searchContainer !== origObj) {
            return searchContainer;
        }
    }
};

var user = {},
    cardUndo = [],
    gScale = 0.6,
    cardSizeX = 167*gScale;
    cardSizeY = 243*gScale;

// create a renderer instance
var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, null);
document.body.appendChild(renderer.view);
renderer.view.style.position = "absolute";
renderer.view.style.top = "0px";
renderer.view.style.left = "0px";
requestAnimFrame( animate );

var texture = PIXI.Texture.fromImage("assets/img/title.png");
var title = new PIXI.Sprite(texture);
title.position.x = (window.innerWidth - 835) / 2;
title.position.y = 40;

texture = PIXI.Texture.fromImage("assets/img/raybg.jpg");
var bg = new PIXI.Sprite(texture);
bg.position.x = (window.innerWidth / 2);
bg.position.y = 325;
bg.rotating = true;
bg.anchor.x = 0.5;
bg.anchor.y = 0.5;

stage.addChild(bg);
stage.addChild(title);

function animate() {
    requestAnimFrame(animate);

    if (bg.rotating) {
        bg.rotation += 0.005;
    }

    if (cardUndo.length > 0) {
        var x;
        for (x=0; x<cardUndo.length; x++) {
            cardUndo[x].anchor.x = 0.5;
            cardUndo[x].anchor.y = 0.5;
            cardUndo[x].position.x = cardUndo[x].origin.x;
            cardUndo[x].position.y = cardUndo[x].origin.y;
            cardUndo.splice(x);
        }
    }

    // render the stage
    renderer.render(stage);
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) != -1) return c.substring(name.length,c.length);
    }
    return "";
}

$(function() {
    $("#login").button().on('click', function(e) {
        e.preventDefault();
        socket.emit("loginUser", {
            username: $("#username").val(),
            password: $("#password").val(),
            reconnect: false
        });
    });
    $("#cantLogin").button().on('click', function(e) {
        e.preventDefault();
    }).hide();
    $("#createAccount").button().on('click', function(e) {
        e.preventDefault();
        socket.emit('newUser', {
            username: $("#ca_username").val(),
            password: $("#ca_password").val(),
            confirm:  $("#ca_confirm").val()
        });
    });
    $("#newAccount").button().on('click', function(e) {
        e.preventDefault();
        $("#loginBox").dialog("close");
        $("#createAccountBox").dialog("open");
    });
    $("#loginBox").dialog({
        autoOpen: false,
        closeOnEscape: false,
        title: "Login",
        dialogClass: "no-close"
    });
    $("#createAccountBox").dialog({
        autoOpen: false,
        closeOnEscape: false,
        title: "Create Account",
        dialogClass: "no-close"
    });

    socket.on("userCreated", function(data) {
        user = data;
        $("#createAccountBox").dialog('close');
        $("#lobby").dialog('open');
    });

    socket.on("loginSuccess", function(data) {
        user = data;
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
    });

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

        console.log("Got game list update");
        console.dir(data);
    });

    socket.on("joinedGame", function(data) {
        $('#lobby').dialog('close');
        $('#createGame').dialog('close');
        currentGame = data;
        $('#glGameChat').html('');
        $('#gameLobby').dialog('open');
        console.log(data);
        socket.emit('joinRoom', 'G:' + data._id);
    });

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
        $('#playerList').html(playerList);

        if (data.owner == user.username && data.maxPlayers == data.players) {
           $('#startGame').button('enable');
        } else {
           $('#startGame').button('disable');
        }
    });

    socket.on("gameChat", function(data) {
        $('#glGameChat').append((data.user ? data.user + '&gt; ' : '') + data.message + '<br />');
        $('#glGameChatContainer').scrollTop($('#glGameChatContainer')[0].scrollHeight);
    });

    var oldUser, oldPw;
    if (oldUser = getCookie('username')) {
        $("#username").val(oldUser);
        if (oldPw = getCookie('password')) {
            socket.emit("loginUser", {
                username: oldUser,
                password: oldPw,
                reconnect: true
            });
        }
    } else {
      $("#loginBox").dialog('open');
    }

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
            console.log("Emitting joinRoom('lobby') and gameListUpdate");
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
                    user: user,
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

    var selectedGame = {},
        selectedGameId;
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


    /* GAME TIME */
    var myDeck = {};
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

    var cardFrames = [], cardIds = [];
    var Card = function(id, faceUp, type, container, pos) {
        var card = this;

        card.flip = function() {
            card.faceUp = !card.faceUp;
            card.sprite.container.removeChild(card.sprite);
            card.sprite = card.makeSprite(card.sprite.id, card.faceUp, card.sprite.type, card.sprite.container, {x: card.sprite.position.x, y: card.sprite.position.y});
            card.sprite.container.addChild(card.sprite);
        }

        card.makeSprite = function(id, faceUp, type, container, pos) {
            var frameName = "";
            if (faceUp) {
                frameName = cardFrames[id];
            } else {
                frameName = "back.png";
            }

            var sprite = PIXI.Sprite.fromFrame(frameName);
            sprite.position.x = pos.x;
            sprite.position.y = pos.y;
            sprite.anchor.x = 0.5;
            sprite.anchor.y = 0.5;
            sprite.scale.x = sprite.scale.y = 0.6;
            sprite.id = id;
            sprite.cardId = cardIds[id];
            sprite.interactive = true;
            sprite.z = 0;
            sprite.origin = {x: pos.x, y: pos.y};
            sprite.type = type;
            sprite.container = container;
        
            sprite.mousedown = sprite.touchstart = function(data) {
                if (!card.faceUp || !card.enabled) {
                    return;
                }

                data.originalEvent.preventDefault();

                var bounds = data.target.getBounds()
                var anchor = {};
                anchor.x = (data.originalEvent.clientX - bounds.x) / bounds.width;
                anchor.y = (data.originalEvent.clientY - bounds.y) / bounds.height;
                this.position.x += (anchor.x - this.anchor.x) * bounds.width;
                this.position.y += (anchor.y - this.anchor.y) * bounds.height;
                this.anchor.x = anchor.x;
                this.anchor.y = anchor.y;

                this.data = data;
                this.alpha = 0.9;
                this.dragging = true;

                this.container.removeChild(this);
                this.container.addChild(this);
            };

            sprite.mouseup = sprite.mouseupoutside = sprite.touchend = sprite.touchendoutside = function(data) {
                if (!card.faceUp || !card.enabled) {
                    return;
                }

                var target = stage.findChildAt(data.originalEvent.clientX, data.originalEvent.clientY, undefined, this);

                var upCard = this;
                socket.off("invalidMove:"+this.cardId);
                socket.on("invalidMove:"+this.cardId, function(data) {
                    cardUndo.push(upCard);
                });

                socket.on("legalMove:"+this.cardId, function(data) {
                    if (data.type === 'table') {
                        
                        gameStacks[data.sid].push(upCard);

                        //remove card from where it came from
                        upCard.container.removeChild(upCard);
                    } else if (data.type === 'slot') {
                        if (target.child !== upCard) {
                            console.log('Adding card to slot');
                            target.currentSlot.addCard(upCard.sprite.id, true, 'slot', upCard.sprite.position, target);
                            upCard.container.removeChild(upCard);
                            delete upCard;
                        }
                    }
                    console.log(data);
                });

                socket.emit("dropCard", {
                    game: currentGame._id,
                    user: user.username,
                    source: this.cardId,
                    target: target.sid || target.cardId,
                    type: target.type
                });

                this.alpha = 1;
                this.dragging = false;
                this.data = null;
            };

            sprite.mousemove = sprite.touchmove = function(data) {
                if (!card.faceUp || !card.enabled || !this.parent) {
                    return;
                }

                var newPosition = data.getLocalPosition(this.parent);

                if(this.dragging) {
                    this.position.x = newPosition.x;
                    this.position.y = newPosition.y;
                }
            };

            sprite.click = sprite.tap = function(data) {
                data.originalEvent.preventDefault();
                if (!card.faceUp && card.enabled) {
                    card.enabled = false;
                    card.flip();
                    card.enabled = true;
                }
            };

            return sprite;
        };

        card.faceUp = faceUp;
        card.enabled = true;
        card.sprite = card.makeSprite(id, faceUp, type, container, pos);
        card.sprite.container.addChild(card.sprite);
    };

    var Slot = function(slotNumber, parentContainer) {
        var slot = this;
        slot.cards = [];
        slot.parentContainer = parentContainer;

        //create slot container
        var cardContainer = new PIXI.DisplayObjectContainer();
        cardContainer.position.x = slotNumber * 130;
        cardContainer.position.y = 0; 
        //cardContainer.interactive=true;
        //cardContainer.hitArea = new PIXI.Rectangle(0,0, cardSizeX, cardSizeY);
        slot.container = cardContainer;

        //create empty rectangle
        var graphics = new PIXI.Graphics();
        graphics.lineStyle(2, 0x333333);
        graphics.drawRect(0, 0, cardSizeX, cardSizeY);
        graphics.hitArea = new PIXI.Rectangle(0, 0, cardSizeX, cardSizeY);
        graphics.interactive = true;
        cardContainer.addChild(graphics);

        cardContainer.mousedown = cardContainer.touchstart = function(data) {
            slot.parentContainer.removeChild(slot.container);
            slot.parentContainer.addChild(slot.container);
        };

        slot.parentContainer.addChild(slot.container);
    };

    Slot.prototype.addCard = function(id, faceUp, type, pos, target) {
        var slot = this;

        var c = new Card(id, faceUp, type, slot.container, pos);
        if (target) {
            target.child = c;
            c.sprite.anchor.x = 0.5;
            c.sprite.anchor.y = 0.5;
            c.sprite.position.x = target.position.x;
            c.sprite.position.y = target.position.y + 15;
        } else {
            c.sprite.position.x = cardSizeX/2;
            c.sprite.position.y = cardSizeY/2;
        }
        c.currentSlot = slot;
        return c;
    };

    Slot.prototype.removeCard = function() {
    };

    Slot.prototype.getChildCards = function() {
    };

    socket.on('startGame', function(data) {
        $('#gameLobby').dialog('close');
        texture = PIXI.Texture.fromImage("assets/img/woodbg.jpg");
        var gbg = new PIXI.TilingSprite(texture, window.innerWidth, window.innerHeight);
        gbg.position.x = 0; 
        gbg.position.y = 0;
        gbg.tileScale.x = 0.6;
        gbg.tileScale.y = 0.6;
        gbg.cardId = 'table';

        stage.removeChild(bg);
        stage.addChild(gbg);

        var cardLoader = new PIXI.AssetLoader(["assets/img/cards.json"]);
        cardLoader.onProgress = function(loader) {
            if (loader.loaded) {
                var cardName="";
                for (cardName in loader.json.frames) {
                    if (cardName !== "black_joker.png" && cardName !== "red_joker.png" && cardName !== "back.png") {
                        cardFrames.push(cardName);

                        //figure out an id for this card
                        var cardId = cardName
                        .replace('clubs', 'C')
                        .replace('diamonds', 'D')
                        .replace('hearts', 'H')
                        .replace('spades', 'S')
                        .replace('jack', '11')
                        .replace('queen', '12')
                        .replace('king', '13')
                        .replace('ace', 1)
                        .replace('_of_', '')
                        .replace('.png', '');
                        var m  = cardId.match(/^(\d*)([A-Z])/);
                        cardId = m[1] + ':' + m[2];
                        cardIds.push(cardId);
                    }
                }
            }
        };

        cardLoader.onComplete = function() {
            var x, c;

            var cardContainer = new PIXI.DisplayObjectContainer();
            cardContainer.position.x = (window.innerWidth - 1010 - 83.5) / 2;
            cardContainer.position.y = window.innerHeight - 300;

            var remainerContainer = new PIXI.DisplayObjectContainer();
            remainerContainer.interactive=true;
            remainerContainer.position.y = 0;

            var auxStack = [];
            var auxStackUp = [];
            remainerContainer.click = remainerContainer.tap = function(data) {
                var cardsToFlip = auxStack.length < 3 ? auxStack.length : 3;
                if (!cardsToFlip) {
                    var i;
                    //reset
                    auxStackUp.reverse();
                    for (i=0; i<auxStackUp.length; i++) {
                        var newCard = auxStackUp[i];
                        c = new Card(newCard.sprite.id, false, 'auxDown', remainerContainer, {x: (cardSizeX/2) + i/2, y: (cardSizeY/2)-i/2});
                        c.enabled = false;
                        newCard.sprite.container.removeChild(newCard.sprite);
                        auxStack.push(c);
                    }
                    auxStackUp = [];
                } else {
                    var i, l=0;
                    for (i=0; i<auxStackUp.length; i++) {
                        auxStackUp[i].sprite.position.x = 833.5 + i/2;
                        auxStackUp[i].sprite.position.y = (cardSizeY/2) - i/2;
                        l = i;
                    }

                    for (i=0; i<cardsToFlip; i++) {
                        var newCard = auxStack.pop();

                        //add to cardContainer
                        c = new Card(newCard.sprite.id, true, 'auxUp', cardContainer, {x: (833.5 + l/2 + i*20), y: ((cardSizeY/2) - l/2 - i*20)});
                        newCard.sprite.container.removeChild(newCard.sprite);
                        auxStackUp.push(c);
                    }
                }
            };

            //shuffle deck
            myDeck = new Deck();
            myDeck.shuffle(10);

            //draw 12 cards face down
            var cardList = myDeck.deal(17);
            var locX = cardSizeX/2, locY = cardSizeY/2;
            for (x=0; x<12; x++) {
                locX+=0.5;
                locY-=0.5;
                c = new Card(cardList[x], false, 'goalDown', cardContainer, {x: locX, y: locY});
            }

            //draw 1 card face up
            c = new Card(cardList[12], true, 'goalUp', cardContainer, {x: locX+1, y: locY-1});

            //draw 1 card face up x 
            var slotNum = 0;
            for (x=13; x<17; x++) {
                slotNum++;
                var s = new Slot(slotNum, cardContainer);
                c = s.addCard(cardList[x], true, 'slot', {x: cardSizeX/2, y: cardSizeY/2}, undefined);
            }

            remainerContainer.position.x = (cardSizeX/2) + (7*130);

            //Add Rectangle
            var graphics = new PIXI.Graphics();
            graphics.lineStyle(2, 0x333333);
            graphics.drawRect(0,0, cardSizeX, cardSizeY);
            graphics.hitArea = new PIXI.Rectangle(0, 0, cardSizeX, cardSizeY);
            graphics.interactive = true;
            remainerContainer.addChild(graphics);

            locX = cardSizeX/2;
            locY = cardSizeY/2;
            for (x=17; x<myDeck.cards.length; x++) {
                locX+=0.5;
                locY-=0.5;
                c = new Card(myDeck.cards[x], false, 'auxDown', remainerContainer, {x: locX, y: locY});
                c.enabled = false;
                auxStack.push(c);
            }
            cardContainer.addChild(remainerContainer);
            stage.addChild(cardContainer);
        }
        cardLoader.load();
        
    });
});
