var AI = AI || {};

AI.SM = function() {
    this.startState = null;
};

AI.SM.prototype.start = function() {
    this.state = this.startState;
};

AI.SM.prototype.step = function(input) {
    var nv = this.getNextValues(this.state, input);
    this.state = nv.state;
    return nv.output;
};

AI.SM.prototype.transduce = function(inputs) {
    var self = this;

    self.start();
    var steps = [];
    inputs.forEach(function(input) {
        steps.push(self.step(input));
    });

    return steps;
};

AI.SM.prototype.getState = function() {
    return this.state;
};

AI.Accumulator = function() {};
AI.Accumulator.prototype = AI.SM.prototype;
AI.Accumulator.prototype.startState = 0;
AI.Accumulator.prototype.getNextValues = function(state, input) {
    state += input;
    return {state: state, output: state};
};

AI.Delay = function(v0) {
    this.startState = v0;
};
AI.Delay.prototype = AI.SM.prototype;
AI.Delay.prototype.getNextValues = function(state, input) {
    return { state: input, output: state };
};

AI.Cascade = function(m1, m2) {
    this.m1 = m1;
    this.m2 = m2;
};
AI.Cascade.prototype = new AI.SM();
AI.Cascade.prototype.constructor=AI.Cascade;
AI.Cascade.prototype.start = function() {
    this.m1.start();
    this.m2.start();
};
AI.Cascade.prototype.step = function(input) {
    var nv = this.m1.step(input);
    return this.m2.step(nv);
};

var ac = new AI.Accumulator();
var stepper = new AI.SM();
stepper.startState = 0;
stepper.getNextValues = function(state, input) {
    if (input == 0) {
        state = (state == 3 ? 0 : state+1);
    } else if (input == 1) {
        state = (state == 0 ? 3 : state-1);
    } else {
        state = 0;
    }

    return { state: state, output: state };
};

var turnstile = new AI.SM();
turnstile.startState = false;
turnstile.getNextValues = function(state, input) {
    if ((!state && input == 'coin') || (state && input == 'turn')) {
        state = !state;
    }

    return { state: state, output: (state ? 'enter' : 'pay') };
};
