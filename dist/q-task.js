/**
 * @Author: Matteo Zambon <Matteo>
 * @Date:   2017-05-29 12:00:02
 * @Last modified by:   Matteo
 * @Last modified time: 2017-05-30 02:35:41
 */

var async, loopback;

loopback = require('loopback');

async = require('async');

module.exports = function(QTask) {
  QTask.QUEUED = 'qQueued';
  QTask.DEQUEUED = 'dequeued';
  QTask.COMPLETE = 'complete';
  QTask.FAILED = 'failed';
  QTask.CANCELLED = 'cancelled';
  QTask.setter.chain = function(chain) {
    if (typeof chain === 'string') {
      chain = [chain];
    }
    return this.$chain = chain;
  };
  QTask.setter.timeout = function(timeout) {
    if (timeout === void 0) {
      return void 0;
    }
    return this.$timeout = parseInt(timeout, 10);
  };
  QTask.dequeue = function(options, callback) {
    var connector, opts, query, sort, update;
    connector = this.getConnector();
    if(!connector.name.match(/mongo/)) {
      return callback(null, null);
    }
    if (callback === void 0) {
      callback = options;
      options = {};
    }
    query = {
      status: QTask.QUEUED,
      delay: {
        $lte: new Date
      }
    };
    if (options.qQueue) {
      query.qQueue = options.qQueue;
    }
    if (options.chain) {
      query.chain = {
        $all: options.chain
      };
    }
    if (options.minPriority !== void 0) {
      query.priority = {
        $gte: options.minPriority
      };
    }
    sort = {
      priority: -1,
      _id: 1
    };
    update = {
      $set: {
        status: QTask.DEQUEUED,
        dequeued: new Date
      }
    };
    opts = {
      "new": true
    };
    return connector.connect(function() {
      var collection;
      collection = connector.collection(QTask.modelName);
      return collection.findAndModify(query, sort, update, opts, function(err, doc) {
        var id, item, qTask;
        if (err || !doc.value) {
          return callback(err);
        }
        item = doc.value;
        id = item._id;
        delete item._id;
        qTask = new QTask(item);
        qTask.setId(id);
        return callback(null, qTask);
      });
    });
  };
  QTask.prototype.update = function(data, callback) {
    var query, update;
    query = {
      id: this.id
    };
    update = {
      $set: data
    };
    if (!data.events) {
      this.setAttributes(data);
    }
    return QTask.update(query, update, callback);
  };
  QTask.prototype.qLog = function(name, qLog, callback) {
    var base, name1, update;
    update = {};
    update['events.' + this.count + '.' + name] = qLog.toObject();
    if (this.events == null) {
      this.events = [];
    }
    if ((base = this.events)[name1 = this.count] == null) {
      base[name1] = {};
    }
    this.events[this.count][name] = qLog;
    return this.update(update, callback);
  };
  QTask.prototype.cancel = function(callback) {
    if (this.status !== QTask.QUEUED) {
      return callback(new Error('Only qQueued qTasks may be cancelled'));
    }
    return this.update({
      status: QTask.CANCELLED,
      ended: new Date
    }, callback);
  };
  QTask.prototype.complete = function(result, callback) {
    return this.update({
      status: QTask.COMPLETE,
      ended: new Date,
      result: result
    }, callback);
  };
  QTask.prototype.errored = function(err, callback) {
    var wait;
    if (this.attempts) {
      this.remaining = this.remaining - 1;
    }
    if (this.attempts !== this.count || this.remaining > 0) {
      wait = 50 * Math.pow(2, this.count);
      this.delay = new Date(new Date().getTime() + wait);
      this.count = this.count + 1;
      return this.reenqQueue(callback);
    } else {
      return this.fail(err, callback);
    }
  };
  QTask.prototype.reenqQueue = function(callback) {
    return this.update({
      status: QTask.QUEUED,
      enqQueued: new Date,
      remaining: this.remaining,
      count: this.count,
      delay: this.delay
    }, callback);
  };
  QTask.prototype.fail = function(err, callback) {
    return this.update({
      status: QTask.FAILED,
      ended: new Date,
      error: err.message,
      stack: err.stack
    }, callback);
  };
  return QTask.prototype.process = function(callbacks, callback) {
    var QProfiler, QWorker, ccallbacks, qProfiler, stop, qTask;
    if (!callback && typeof callbacks === 'function') {
      callback = callbacks;
      ccallbacks = null;
    }
    qTask = this;
    QProfiler = loopback.getModel('QProfiler');
    QWorker = loopback.getModel('QWorker');
    qProfiler = new QProfiler({
      qTask: qTask
    });
    callbacks = callbacks || QWorker.callbacks;
    stop = false;
    async.eachSeries(qTask.chain, function(item, done) {
      var bound, context, finish, func, qLogger;
      if (stop) {
        return done(null, qTask.results);
      }
      func = callbacks[item];
      if (!func) {
        return done(new Error('No callback registered for `' + item + '`'));
      }
      qLogger = qProfiler.start(item);
      finish = function(err, results) {
        if (results) {
          qTask.results = results;
        }
        return qProfiler.end(item, function() {
          return done(err, qTask.results);
        });
      };
      context = {
        done: function(err, results) {
          stop = true;
          return finish(err, results);
        },
        qLog: qLogger
      };
      bound = func.bind(context);
      return bound(qTask, finish);
    }, function(err) {
      return callback(err, qTask.results);
    });
  };
};
