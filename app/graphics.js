define(["pixi/pixi.dev"], function(PIXI) {
    var stage = new PIXI.Stage(0xf27138, true);
    stage.cardUndo=[];

    stage.findChildAt = function(x, y, searchContainer, origObj) {
        searchContainer = searchContainer || this;

        //search the children first in reverse order
        if (searchContainer.children.length) {
            var c = searchContainer.children.length;
            while (c--) {
                var result = this.findChildAt(x, y, searchContainer.children[c], origObj);
                if (result) { return result; }
            }
        } else {
            //var bounds = searchContainer.getBounds();
            //if (bounds.x < x && bounds.x+bounds.width > x && bounds.y < y && bounds.y+bounds.height > y && searchContainer !== origObj) {
            //if (searchContainer.__hit && searchContainer !== origObj) {
            //    return searchContainer;
            //} else {
                //double check with our own bounds calculation
                var bounds = searchContainer.bounds || searchContainer.getBounds();
                if (bounds.x < x && bounds.x+bounds.width > x && bounds.y < y && bounds.y+bounds.height > y && searchContainer !== origObj) {
                    return searchContainer;
                }
            //}
        }

        return null;
    };

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

        if (stage.cardUndo.length > 0) {
            var x;
            for (x=0; x<stage.cardUndo.length; x++) {
                stage.cardUndo[x].anchor.x = 0.5;
                stage.cardUndo[x].anchor.y = 0.5;
                stage.cardUndo[x].position.x = stage.cardUndo[x].origin.x;
                stage.cardUndo[x].position.y = stage.cardUndo[x].origin.y;
                stage.cardUndo.splice(x, 1);
            }
        }

        // render the stage
        renderer.render(stage);
    }

    return stage;

});
