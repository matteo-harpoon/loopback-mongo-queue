var loopback,
  slice = [].slice;

loopback = require('loopback');

module.exports = function(QStep) {
  var QLog;
  QLog = loopback.getModel('QLog');
  QStep.prototype.end = function() {
    return this.ended = Date.now();
  };
  QStep.prototype.info = function() {
    var args;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    this.qLogs.push(new QLog({
      type: 'info',
      args: args
    }));
    return this;
  };
  QStep.prototype.debug = function() {
    var args;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    this.qLogs.push(new QLog({
      type: 'debug',
      args: args
    }));
    return this;
  };
  return QStep.prototype.error = function(error) {
    if (error == null) {
      error = {};
    }
    if (!error instanceof Error) {
      return console.error(error, 'is not instance of error');
    }
    this.qLogs.push(new QLog({
      type: 'error',
      args: [error.message, error.stack]
    }));
    return this;
  };
};
