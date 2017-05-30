var loopback;

loopback = require('loopback');

module.exports = function(QQueue) {
  QQueue.prototype.get = function(id, callback) {
    var QTask, query;
    query = {
      id: id
    };
    if (!this.universal) {
      query.qQueue = this.name;
    }
    QTask = loopback.getModel('QTask');
    return QTask.findOne(query, function(err, data) {
      if (err) {
        return callback(err);
      }
      return callback(null, new QTask(data));
    });
  };
  QQueue.prototype.enqQueue = function(chain, params, options, callback) {
    var QTask, data;
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (!this.universal) {
      options.qQueue = this.name;
    }
    QTask = loopback.getModel('QTask');
    data = new QTask({
      chain: chain,
      params: params,
      qQueue: options.qQueue || this.name,
      attempts: options.attempts,
      timeout: options.timeout,
      delay: options.delay,
      priority: options.priority
    });
    return QTask.create(data, callback);
  };
  return QQueue.prototype.dequeue = function(options, callback) {
    var QTask;
    if (callback === void 0) {
      callback = options;
      options = {};
    }
    if (!this.universal) {
      options.qQueue = this.name;
    }
    QTask = loopback.getModel('QTask');
    return QTask.dequeue(options, callback);
  };
};
