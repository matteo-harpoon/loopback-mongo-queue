var loopback;

loopback = require('loopback');

module.exports = function(QWorkflow) {
  QWorkflow.prototype.get = function(id, callback) {
    var QTask, query;
    query = {
      id: id
    };
    if (!this.universal) {
      query.QWorkflow = this.name;
    }
    QTask = loopback.getModel('QTask');
    return QTask.findOne(query, function(err, data) {
      if (err) {
        return callback(err);
      }
      return callback(null, new QTask(data));
    });
  };
  QWorkflow.prototype.enqQueue = function(params, options, callback) {
    var QTask, data;
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    }
    QTask = loopback.getModel('QTask');
    data = new QTask({
      chain: this.chain,
      params: params,
      qQueue: options.qQueue || this.qQueue,
      attempts: options.attempts,
      timeout: options.timeout,
      delay: options.delay,
      priority: options.priority
    });
    return QTask.create(data, callback);
  };
  return QWorkflow.prototype.deqQueue = function(options, callback) {
    var QTask;
    if (callback === void 0) {
      callback = options;
      options = {};
    }
    if (!this.universal) {
      options.qQueue = this.qQueue;
    }
    options.chain = this.chain;
    QTask = loopback.getModel('QTask');
    return QTask.deqQueue(options, callback);
  };
};
