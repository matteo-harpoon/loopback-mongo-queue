/**
 * @Author: Matteo Zambon <Matteo>
 * @Date:   2017-05-29 12:00:02
 * @Last modified by:   Matteo
 * @Last modified time: 2017-09-06 01:55:27
 */

var EventEmitter, loopback;

loopback = require('loopback');

EventEmitter = require('events').EventEmitter;

module.exports = function(QWorker) {
  QWorker.mixin(EventEmitter);
  QWorker.callbacks = {};
  QWorker.remove = function(id) {
    var handler;
    handler = this.callbacks[id];
    if (!handler) {
      return null;
    }
    delete this.callbacks[id];
    return handler;
  };
  QWorker.find = function(id) {
    return this.callbacks[id] || null;
  };
  QWorker.findOrAdd = function(id, handler) {
    handler = this.find(id);
    if (handler) {
      return handler;
    }
    return this.callbacks[id] = handler;
  };
  QWorker.getHandlerNames = function() {
    return Object.keys(this.callbacks);
  };
  QWorker.create = function(handlers) {
    return Object.keys(handlers).forEach((function(_this) {
      return function(handlerName) {
        if (_this.callbacks[handlerName]) {
          return new Error(handlerName + ' already registered');
        }
        return _this.callbacks[handlerName] = handlers[handlerName];
      };
    })(this));
  };
  QWorker.afterInitialize = function() {
    var QQueue;
    this.callbacks = QWorker.callbacks;
    QQueue = loopback.getModel('QQueue');
    if (!this.queues) {
      this.universal = true;
      this.queues = [
        new QQueue({
          name: '*',
          universal: true
        })
      ];
      return;
    }
    if (!Array.isArray(this.queues)) {
      this.queues = [this.queues];
    }
    return this.queues = this.queues.map(function(name) {
      var queue;
      if (name instanceof QQueue) {
        queue = name;
      } else if (typeof name === 'string') {
        queue = new QQueue({
          name: name
        });
      }
      return queue;
    });
  };
  QWorker.prototype.register = function(callbacks) {
    var name, results1;
    results1 = [];
    for (name in callbacks) {
      results1.push(this.callbacks[name] = callbacks[name]);
    }
    return results1;
  };
  QWorker.prototype.start = function() {
    if (this.queues.length === 0) {
      return setTimeout(this.start.bind(this), this.interval);
    }
    this.working = true;
    return this.poll();
  };
  QWorker.prototype.stop = function(callback) {
    if (callback == null) {
      callback = function() {};
    }
    if (!this.working) {
      callback();
    }
    this.working = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
      return callback();
    }
    return this.once('stopped', callback);
  };
  QWorker.prototype.addQueue = function(queue) {
    if (!this.universal) {
      return this.queues.push(queue);
    }
  };
  QWorker.prototype._poll = function(err, qTask) {
    if (err) {
      return this.emit('error', err);
    }
    if (qTask) {
      this.empty = 0;
      this.emit('dequeued', qTask);
      this.work(qTask);
      return;
    }
    this.emit('empty');
    if (this.empty < this.queues.length) {
      this.empty++;
    }
    if (this.empty === this.queues.length) {
      return this.pollTimeout = setTimeout((function(_this) {
        return function() {
          _this.pollTimeout = null;
          return _this.poll();
        };
      })(this), this.interval);
    } else {
      return this.poll();
    }
  };
  QWorker.prototype.poll = function() {
    if (!this.working) {
      return this.emit('stopped');
    }
    return this.dequeue(this._poll.bind(this));
  };
  QWorker.prototype.dequeue = function(callback) {
    var data, queue;
    queue = this.queues.shift();
    this.queues.push(queue);
    data = {
      minPriority: this.minPriority,
      callbacks: this.callbacks
    };
    return queue.dequeue(data, callback);
  };
  QWorker.prototype.done = function(qTask, timer, err, result) {
    var finish;
    clearTimeout(timer);
    this.emit('done', qTask);
    finish = function(type, err) {
      if (err) {
        return this.emit('error', err);
      }
      this.emit(type, qTask);
      return this.poll();
    };
    console.error(err);
    if (err) {
      return qTask.errored(err, finish.bind(this, 'failed'));
    } else {
      result = (result != null ? typeof result.toObject === "function" ? result.toObject() : void 0 : void 0) || result;
      return qTask.complete(result, finish.bind(this, 'complete'));
    }
  };
  QWorker.prototype.work = function(qTask) {
    var done, finished, timer;
    finished = false;
    done = (function(_this) {
      return function(err, results) {
        if (finished) {
          return;
        }
        finished = true;
        return _this.done(qTask, timer, err, results);
      };
    })(this);
    if (qTask.timeout) {
      timer = setTimeout(function() {
        return done(new Error('timeout'));
      }, qTask.timeout);
    }
    return qTask.process(this.callbacks, done);
  };
  // process.nextTick(function() {
  //   var qWorker;
  //   qWorker = new QWorker();
  //   return qWorker.start();
  // });
};
