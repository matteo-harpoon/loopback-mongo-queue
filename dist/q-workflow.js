/**
 * @Author: Matteo Zambon <Matteo>
 * @Date:   2017-05-29 12:00:02
 * @Last modified by:   Matteo
 * @Last modified time: 2017-09-13 04:29:44
 */

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
  QWorkflow.prototype.enqueue = function(params, options, callback) {
    var QTask, data;
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    }
    QTask = loopback.getModel('QTask');
    data = new QTask({
      chain: this.chain,
      params: params,
      queue: options.queue || this.queue,
      attempts: options.attempts,
      remaining: options.attempts,
      timeout: options.timeout,
      delay: options.delay,
      priority: options.priority
    });
    return QTask.create(data, callback);
  };
  return QWorkflow.prototype.dequeue = function(options, callback) {
    var QTask;
    if (callback === void 0) {
      callback = options;
      options = {};
    }
    if (!this.universal) {
      options.queue = this.queue;
    }
    options.chain = this.chain;
    QTask = loopback.getModel('QTask');
    return QTask.dequeue(options, callback);
  };
};
