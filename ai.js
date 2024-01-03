var AI = AI || {};

//All Inputs
AI.input = function() {};
AI.input.prototype.test = function(t) { console.log("t: " + t); };

//Text Input
AI.text = function() {}; 
AI.text.prototype = AI.input.prototype;

//All requests for information
AI.request = function() {};

//Dictionary Requst
AI.dictionary = function() {};
AI.dictionary.prototype = AI.request.prototype;

AI.dictionary.prototype.query = function(word) {
   $.ajax({
        url: 'https://wordsapiv1.p.mashape.com/words/' + word,
        dataType: 'json',
        headers: {
            "X-Mashape-Key": "tKk8Yh3ILYmshjmyPXqnEL2xn4XIp1lC4qrjsnzx4Iu5IYz3h4",
            "Accept": "application/json"
        },
        success: function(data, status, xhr) {
            console.dir(data);
        }
    }); 
};
