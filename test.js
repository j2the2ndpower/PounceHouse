var Pi = function() {
    this.n = 1;
    this.x = 0;
    this.lcount = 0;
    this.lookup = {};
    this.tmp = [];
    this.val = ["3"];
    //this.init(8, Math.pow(2,14)+8);
    //this.init2(4, Math.pow(2, 16));
};

Pi.prototype.next = function() {
    var p = new Fraction((120*this.n-89)*this.n+16, (((512*this.n-1024)*this.n+712)*this.n-206)*this.n+21);
    this.x = p.add(16*this.x).mod(1);
    this.n += 1;

    return this.x.mul(16).floor().valueOf().toString(16);
};

Pi.prototype.init = function(len, tot) {
    var i, t;
    len = len || 5;
    console.log("Initialization sequence has begun:");

    for (i=1; i <= tot; i++) {
        t = this.next();
        this.val.push(t);
        for (var o = 0; o < this.tmp.length; o++) {
            this.tmp[o]+=t;
        }
        this.tmp.push(t);

        if (this.tmp[0] && this.tmp[0].length == len) {
            var s = this.tmp.shift(), p = this.lookup;
            for (var c=0; c<s.length; c++) {
                if (!p.hasOwnProperty(s.charAt(c))) {
                    if (c==len-1) {
                        p[s.charAt(c)] = i;
                        this.lcount++;
                    } else {
                        p[s.charAt(c)] = {};
                    }
                }
                p = p[s.charAt(c)];
            }
        }

        if (this.lcount >= Math.pow(16, len)) {
            console.log("Found all possible combinations @: " + i);
            break;
        }
    };

    console.log("Initialization sequence complete: " + this.lcount + " combinations found.");
};

Pi.prototype.init2 = function(len, tot) {
    var i, t;
    len = len || 4;
    console.log("Init2 begin:");

    for (i=1; i <=tot; i++) {
        t = Math.floor((i * Math.PI)%1*16*Math.pow(10, len-1)).toString(16);

        var p = this.lookup;
        for (var c=0; c<t.length; c++) {
            if (!p.hasOwnProperty(t.charAt(c))) {
                if (c==len-1) {
                    p[t.charAt(c)] = i;
                    this.lcount++;
                } else {
                    p[t.charAt(c)] = {};
                }
            }
            p = p[t.charAt(c)];
        }


        if (this.lcount >= Math.pow(16, len)) {
            console.log("Found all possible combinations @: " + i);
            break;
        }
    }
    console.log("Initialization sequence complete: " + this.lcount + " combinations found.");
};

pi = new Pi();

window.onload = function() {

var m = "BOISE, Idaho - A mother is upset after she says she received a nasty note from her fellow diners accusing her 10-month-old son of \"ruining\" their dinner with his yelling.\n\nKatie Leach admits that her son's \"new thing\" is yelling.\n\n\"He will yell when I tell him no, when he's super excited and happy or just for no reason at all,\" Leach wrote on a Facebook post to KTVB-TV. \"I'm doing my best to teach him indoor voice and to not yell back at me when telling him no etc, But he is only 10 (almost 11 months) and LEARNING.\"\n\nLeach says she and her family where dining at Texas Roadhouse in Nampa, Idaho, when her son began to yell off and on.\n\n\"We all tried quieting him down which a majority of the time he did but he also was so excited to be around all the commotion,\" said Leach. \"He was not yelling to be mean or because he was mad, it was purely from excitement and being happy.\"\n\nLeach says about halfway through her dinner two customers, \"Caucasian women in their late 50s or early 60s,\" slammed a disapproving note down on Leach's table. The women then sat back down at their table behind Leach's.\n\n\"Thank you for ruining our dinner with your screaming kid. Sincerely, the table behind you,\" the note read.\n\nLeach says she approached the two women and explained her son is young and that he is still learning. She says the women told her their grandchildren never behave like that. Leach says she could understand their complaints if her son was older and knew better.\n\nLeach says she talked with the manager of Texas Roadhouse, who Leach says apologized for the way her family was treated. Leach says the manager told the two women they could finish their dinner, but then had to leave quietly. She says he explained he had two children himself. The manager, according to Leach, paid for Leach's meal and said her family is welcome to return to Texas Roadhouse anytime.\n\n\"We're in the hospitality business. We want all our guests to have a great experience,\" said Travis Doster, a spokesman for Texas Roadhouse. \"We were voted one of the loudest restaurants by Consumer Reports. We are proud to be loud. If you want to hear clinking wine glasses and clinking forks, then this probably isn't the place for you.\"";
console.log("Message Length: " + m.length);

//    file = bake(m);
//    file = bake(file);
//    document.body.innerHTML = file;
}


var bake = function(msg) {
    var p, c, s, hx, L, data={}, file="", d;
    for (var i = 0; i < msg.length; i++) {
        p = pi.lookup;
        L = 0;
        hx = msg.charCodeAt(i).toString(16);
        if (hx.length==1) { hx = "0" + hx; }

        while ((c = p[hx[0]]) && (s = c[hx[1]])) {
            p = s;
            L+=1;
        }

        if (!data[L + '_' + i]) {
            data[L + '_' + i]=1;
            for (d=i; d<i+(L*2); d++) {
                file += pi.val[d];
            }
            
        }
        i+=(L-1);
    }

    var bitCount = 0, eCount = 0;
    for (d in data) {
        var key=d.split("_"), dataLength = key[0], dataLoc = key[1];
        bitCount += 19;
        eCount++;
    }

    var entrySize = 1;
    while (Math.pow(2,entrySize) < eCount) {
        entrySize++;
    };

    console.log("Header size: " + Math.ceil(bitCount/8) + " -- Entry Count: " + eCount + "\nTotal Size: " + (Math.ceil(bitCount/8) + Math.ceil(eCount*entrySize/8)));
    return file;
}





String.prototype.paddingLeft = function (paddingValue) {
   return String(paddingValue + this).slice(-paddingValue.length);
};

function compress(file, seed) {
    var i, fileBytes = "", seedBytes = "", finalBytes="", dNum=0, stallCount=0;

    for (i = 0; i < file.length; i++) {
        fileBytes += file.charCodeAt(i).toString(2).paddingLeft("0".repeat(8));
    }

    for (i = 0; i < seed.length; i++) {
        seedBytes += seed.charCodeAt(i).toString(2).paddingLeft("0".repeat(8));
    }

    console.log("SEED: " + seedBytes.split('').join("\t"));
    console.log("FILE: " + fileBytes.split('').join("\t"));

    function decrease(fileBytes, seedBytes) {
        var i, result = "", matched=0, seedLoc=0, flipped=0, question=0;

        for (i=0; i < fileBytes.length; i++) {
            if (question==0) {  // S1 == F1 && S2 == F2 
                if (fileBytes.substr(i, 2) == seedBytes.substr(seedLoc, 2)) {
                    result += "1";  //COMPRESSION!
                    i++;
                    seedLoc+=2;
                } else {
                    question++;
                }
            }

            if (question==1) { // S1 == F1?
                if (fileBytes.substr(i,1) == seedBytes.substr(seedLoc, 1)) {
                    result += "01"; //STAY EVEN
                    seedLoc += 2;
                    i++;
                } else {
                    question++;
                }
            }

/*            if (question==2 && seedBytes[seedLoc]==seedBytes[seedLoc+1]) { //S1 == S2
                if (fileBytes[i+1]==fileBytes[i+2]) { // F3 == F2 
                    result += "001";
                } else {
                    result += "000";
            
                }
                i += 2;
                seedLoc+=2;

            } else if (question==2) {
                if (seedBytes[seedLoc+1] !== fileBytes[i+2]) { // F3 == S2
                    result += "001"; 
                } else {
                    result += "000";
                }
                i += 2;
                seedLoc+=2;
            }*/

            if (question==2) {
                //loop until fixed
                var f = 0, f2 = fileBytes[i+1], s2 = seedBytes[seedLoc+1], maxF = fileBytes.length-(i+2);

                if (maxF >= 1) {
                    result += "00";
                    for (f=0; f<=maxF; f++) {
                        if (f2 == s2 && s2 == fileBytes[i+2+f]) {
                            result += "1";
                            seedLoc+=2;
                            i+=f;
                            break;
                        } else {
                            //flip for next round
                            result += "0";
                            s2 = s2 == "1" ? "0" : "1";
                        }
                    }

                    if (f == maxF) { //we hit eof
                        result = result.substr(0, result.length-1) + fileBytes[i+2+f];
                    }
                } else {
                    result += fileBytes.substr(-(fileBytes.length-i));
                    i+=(fileBytes.length-i);
                }
            }
            question=0;
        }

        return result;
    }

    finalBytes = fileBytes;
/*    while (stallCount < 3) {
        var oLength = finalBytes.length;*/
        finalBytes = decrease(finalBytes, seedBytes);
        dNum++;
/*        if (finalBytes.length >= oLength) {
            stallCount++;
        }
    }*/

    console.log("ENC:  " + finalBytes.split('').join("\t"));
    console.log("T  :  " + dNum);
    return finalBytes;
};

function uncompress(file, seed, dNum) {
    dNum = dNum || 1;
    //assuming file is already in byte form
    var i, fileBytes = file, seedBytes = "", finalBytes="", stallCount=0;

    for (i = 0; i < seed.length; i++) {
        seedBytes += seed.charCodeAt(i).toString(2).paddingLeft("0".repeat(8));
    }

    console.log("SEED: " + seedBytes);
    console.log("FILE: " + fileBytes);

    function decrease(fileBytes, seedBytes) {
        var i, result="", seedLoc=0, matched, flipped=0, fileBit, question=0;
        for (i=0; i < fileBytes.length; i++) {
            fileBit = fileBytes[i];

            if (question == 0) {
                if (fileBit == "1") {
                    result += seedBytes.substr(seedLoc, 2);
                    seedLoc+=2;
                    continue;
                } else {
                    question++;
                    continue;
                }
            }

            if (question == 1) {
                if (fileBit == "1") {  // RW scenario
                    var s1 = seedBytes[seedLoc], s2 = seedBytes[seedLoc+1];
                    result += s1 + (s2 == "1" ? "0" : "1");
                    seedLoc+=2;
                    question = 0;
                    continue;
                } else {
                    question++;
                    continue;
                }
            }

            if (question == 2) {
                var s1 = seedBytes[seedLoc], s2 = seedBytes[seedLoc+1];

                if (flipped % 2) {
                    s2 = s2 == "1" ? "0" : "1";
                }

                if (fileBit == "1") {
                    result += s1 == "1" ? "0" : "1";  // Wx scenario
                    //something wtih s2
                } else {
                    flipped++;
                    continue;
                }
            }
        }

        return result;
    }

    finalBytes = fileBytes;
//    for (var j=0; j<dNum; j++) {
        finalBytes = decrease(finalBytes, seedBytes);
//    }

    console.log("DEC :  " + finalBytes);
    return finalBytes;
}

function solve(file, seed) {
    var eString, sString, sLoc = 0, eLoc = 0, result = "", zeroLen;
    
    
    while (sLoc < eString.length) {
        var map = [], c;
        while ((zeroLen = eString.substr(eLoc++).indexOf("1")) > 0) {
            c = sString.substr(sLoc++,2);
            map.push(c);

            result += "?";
        }

        var nextMatch = sString.substr(sLoc++, ((eString.length == eLoc && result.length % 2) ? 1 : 2));
        if ( map.length > 0 ) {
            var last = c.substr(-1) == "0" ? "1" : "0"; 
            result = result.substr(0,result.length-1) + last;
            
            for(x=0; x < Math.pow(2, map.length); x++) {
                var tmp = x.toString(2).paddingLeft("0".repeat(map.length));
                for (i=0; i < map.length; i++) {
                    if (tmp.substr(i,2) == map[i] || tmp.substr(-1) !== last) {
                        break;
                    }
                }

                if (i==map.length) {
                    console.log(tmp);
                }
            }

            console.dir(map);
        }

        result += nextMatch; 
    }
      
    return result;    
}
