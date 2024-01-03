$(function(){

    // create an new instance of a pixi stage
    var stage = new PIXI.Stage(0x97C56E, true);
    var lastEmit = $.now();

    // create a renderer instance
    var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, null);

    // add the renderer view element to the DOM
    document.body.appendChild(renderer.view);
    renderer.view.style.position = "absolute";
    renderer.view.style.top = "0px";
    renderer.view.style.left = "0px";
    requestAnimFrame( animate );

    var defaultCharacter = "Waluigi_Dancing.png";

    function createBunny(x, y, id, color, character)
    {
        var texture = PIXI.Texture.fromImage("tp/" + (character || defaultCharacter));

        // create our little bunny friend..
        var bunny = new PIXI.Sprite(texture);

        // enable the bunny to be interactive.. this will allow it to respond to mouse and touch events
        bunny.interactive = true;
        // this button mode will mean the hand cursor appears when you rollover the bunny with your mouse
        bunny.buttonMode = true;

        // center the bunnys anchor point
        bunny.anchor.x = 0.5;
        bunny.anchor.y = 0.5;
        // make it a bit bigger, so its easier to touch
        bunny.scale.x = bunny.scale.y = 0.75;

        bunny.maxSpeed = 20;
        bunny.speedX = 0;
        bunny.speedY = 0;

        //bunny.tint = color === 'blue' ? 0x00FFFF : 0xFFFF00;
        bunny.id = id;

        bunny.pressKey = function(pressed, keyCode) {
            var velocity = pressed ? this.maxSpeed : -this.maxSpeed;
            if (keyCode) {
                switch(keyCode) {
                    case 87:
                    case 38:
                        this.setSpeed(0,-velocity);
                        break;
                    case 65:
                    case 37:
                        this.setSpeed(-velocity, 0);
                        break;
                    case 68:
                    case 39:
                        this.setSpeed(velocity, 0);
                        break;
                    case 40:
                    case 83:
                        this.setSpeed(0, velocity);
                        break;
                    default:
                        break;
                }
            }
        };

        bunny.setSpeed = function (x,y) {
            this.speedX += x;
            if (this.speedX < 0) { this.speedX = Math.max(this.speedX, -this.maxSpeed); }
            else                 { this.speedX = Math.min(this.speedX,  this.maxSpeed); }

            this.speedY += y;
            if (this.speedY < 0) { this.speedY = Math.max(this.speedY, -this.maxSpeed); }
            else                 { this.speedY = Math.min(this.speedY,  this.maxSpeed); }
        };

        // use the mousedown and touchstart
        bunny.mousedown = bunny.touchstart = function(data)
        {
            // stop the default event...
            data.originalEvent.preventDefault();

            // store a reference to the data
            // The reason for this is because of multitouch
            // we want to track the movement of this particular touch
            this.data = data;
            this.alpha = 0.9;
            this.dragging = true;
        };

        // set the events for when the mouse is released or a touch is released
        bunny.mouseup = bunny.mouseupoutside = bunny.touchend = bunny.touchendoutside = function(data)
        {
            this.alpha = 1
            this.dragging = false;
            // set the interaction data to null
            this.data = null;
        };

        // set the callbacks for when the mouse or a touch moves
        bunny.mousemove = bunny.touchmove = function(data)
        {
            if (this.id === 'me') { 
                var newPosition = data.getLocalPosition(this.parent);

                if($.now() - lastEmit > 30){
                    socket.emit('mousemove',{
                        'x': newPosition.x,
                        'y': newPosition.y,
                        'dragging': this.dragging,
                        'id': this.clientId,
                        'character': this.character
                    });
                    lastEmit = $.now();
                }

                if(this.dragging) {
                    this.position.x = newPosition.x;
                    this.position.y = newPosition.y;
                }
            }
        }

        // move the sprite to its designated position
        bunny.position.x = x;
        bunny.position.y = y;

        // add it to the stage
        stage.addChild(bunny);

        return bunny;
    }

    function animate() {
        //Move bunnies if they have speed
        for (b in bunnies) {
            if (bunnies[b].speedX) { bunnies[b].x += bunnies[b].speedX; }
            if (bunnies[b].speedY) { bunnies[b].y += bunnies[b].speedY; }
        }

        //Tell the server where we are going
        if (bunnies['me'].speedX || bunnies['me'].speedY) {
            if($.now() - lastEmit > 30){
                socket.emit('mousemove',{
                    'x': bunnies['me'].x,
                    'y': bunnies['me'].y,
                    'dragging': 2,
                    'id': bunnies['me'].clientId,
                    'character': bunnies['me'].character
                });
                lastEmit = $.now();
            }
        }
        requestAnimFrame(animate);

        // render the stage
        renderer.render(stage);
    }

    // Generate an unique ID
    var id = Math.round($.now()*Math.random());
    var clients = {};
    var bunnies = {};


    var socket = io.connect(window.location.host);

    bunnies['me'] = createBunny(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 'me', 'blue');
    bunnies['me'].clientId = id;

    $('.character').on('click', function(e, div, v3, v4) {
        var newChar = e.target.src.toString().replace(/^.*\/\/.*\//, "");
        var oldX = bunnies['me'].x, oldY = bunnies['me'].y, oldId = bunnies['me'].clientId;
        stage.removeChild(bunnies['me']);
        console.log("I'm changing my character with id: " + oldId);
        bunnies['me'] = createBunny(oldX, oldY, 'me', 'blue', newChar);
        bunnies['me'].clientId = oldId;

        socket.emit('changeChar',{
            'id': oldId,
            'character': newChar,
            'x': oldX,
            'y': oldY
        });
        lastEmit = $.now();
    });    

    $(document).on('keydown', function(e) {
        bunnies['me'].pressKey(true, e.keyCode);
    });

    $(document).on('keyup', function(e) {
        bunnies['me'].pressKey(false, e.keyCode);
    });

    socket.on('moving', function (data) {
        if(! (data.id in clients)){
            // a new user has come online. create a cursor for them
            bunnies[data.id] = createBunny(data.x, data.y, data.id, 'red', data.character);
            //cursors[data.id] = $('<div class="cursor">').appendTo('#cursors');
        }

        // Is the user drawing?
        if(data.dragging && clients[data.id]) {
            // Draw a line on the canvas. clients[data.id] holds
            // the previous position of this user's mouse pointer
            bunnies[data.id].position.x = data.x;
            bunnies[data.id].position.y = data.y;
        }

        // Saving the current client state
        clients[data.id] = data;
        clients[data.id].updated = $.now();
    });

    socket.on('keepAlive', function (data) {
        clients[data.id].updated = $.now();
    });

    socket.on('changeChar', function (data) {
        console.dir(data);   
        stage.removeChild(bunnies[data.id]);
        bunnies[data.id] = createBunny(data.x, data.y, data.id, 'red', data.character);
        clients[data.id].updated = $.now();
        console.log("Character changed: " + data.id);
    });

    var prev = {};

    // Remove inactive clients after 10 seconds of inactivity
    setInterval(function(){
        if($.now() - lastEmit > 30){
            socket.emit('keepAlive',{
                'id': bunnies['me'].clientId
            });
            lastEmit = $.now();
        }

        for(ident in clients){
            if($.now() - clients[ident].updated > 10000){
                // Last update was more than 10 seconds ago.
                // This user has probably closed the page

                if (clients[ident]) {
                    stage.removeChild(bunnies[ident]);
                    delete clients[ident];
                    delete bunnies[ident];
                }
            }
        }
    },10000);
});