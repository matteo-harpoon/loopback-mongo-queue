var loopback;

loopback = require('loopback');

module.exports = function(QProfiler) {
  QProfiler.prototype.start = function(name) {
    var QStep;
    QStep = loopback.getModel('QStep');
    this.qLog[name] = new QStep();
    this.qSteps.push(name);
    return this.qLog[name];
  };
  QProfiler.prototype.end = function(name, callback) {
    if (!this.qLog[name]) {
      return console.error('Stage ', name, ' has not started yet');
    }
    this.qLog[name].end();
    this.qSteps.splice(this.qSteps.indexOf(name), 1);
    return this.qTask.qLog(name, this.qLog[name], callback);
  };
  QProfiler.prototype.endAll = function() {
    return this.qSteps.forEach((function(_this) {
      return function(qStep) {
        return _this.end(qStep);
      };
    })(this));
  };
  QProfiler.prototype.flush = function() {
    return Object.keys(this.qLog).reduce((function(_this) {
      return function(memo, key) {
        memo[key] = _this.qLog[key].toObject();
        return memo;
      };
    })(this), {});
  };
};
