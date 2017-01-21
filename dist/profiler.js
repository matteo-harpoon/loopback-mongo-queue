var loopback;

loopback = require('loopback');

module.exports = function(Profiler) {
  Profiler.prototype.start = function(name) {
    var Step;
    if (this.log[name]) {
      console.warn('Stage name ', name, ' is already in use');
    }
    Step = loopback.getModel('Step');
    this.log[name] = new Step();
    this.steps.push(name);
    return this.log[name];
  };
  Profiler.prototype.end = function(name) {
    if (!this.log[name]) {
      return console.error('Stage ', name, ' has not started yet');
    }
    this.log[name].end();
    return this.steps.splice(this.steps.indexOf(name), 1);
  };
  Profiler.prototype.endAll = function() {
    return this.steps.forEach((function(_this) {
      return function(step) {
        return _this.end(step);
      };
    })(this));
  };
  return Profiler.prototype.getEvents = function() {
    return Object.keys(this.log).reduce((function(_this) {
      return function(memo, key) {
        memo[key] = _this.log[key].toObject();
        return memo;
      };
    })(this), {});
  };
};
