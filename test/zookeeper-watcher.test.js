/*!
 * zookeeper-watcher - test/zookeeper-watcher.test.js
 * Copyright(c) 2013 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var ZooKeeperWatcher = require('../');
var should = require('should');
var pedding = require('pedding');

describe('zookeeper_watcher.test.js', function () {

  var zk = new ZooKeeperWatcher({
    hosts: ['localhost:2181'],
    sessionTimeout: 5000,
    reconnectTimeout: 500,
    root: '/zkw-test-' + process.version.replace(/\./g, '-'),
    logger: console,
  });

  var version = 0;

  before(function (done) {
    zk.once('connected', function () {
      // ensure parent path exists
      zk.mkdirp('/', function (err, path) {
        should.not.exists(err);
        path.should.equal('/');
        zk.create('/root', function (err) {
          // should.not.exists(err);
          zk.get('/root', function (err, value, zstat) {
            // console.log(arguments)
            should.not.exists(err);
            version = zstat.version;
            zk.set('/root', 'this is root ' + new Date(), version, function (err, zstat) {
              should.not.exists(err);
              version = zstat.version;
              done();
            });

          });
        });
      });

    });
  });

  after(function (done) {
    zk.close(done);
  });

  beforeEach(function () {
    zk.unWatch('/root');
  });

  it('should watch /root and get value', function (done) {
    done = pedding(5, done); // 2 get, 2 change, 1 set
    zk.watch('/root', function (err, value, zstat) {
      // zk.watcher.data['/root'].should.length(1);
      should.not.exists(err);
      value.should.be.instanceof(Buffer);
      value.toString().should.match(/.*root.*/);
      zstat.should.have.property('version');
      zstat.should.have.property('ctime');
      done();
    });

    // watch again should be fine.
    zk.watch('/root', function (err, value, zstat) {
      // zk.watcher.data['/root'].should.length(1);
      should.not.exists(err);
      value.should.be.instanceof(Buffer);
      value.toString().should.match(/.*root.*/);
      zstat.should.have.property('version');
      zstat.should.have.property('ctime');
      // console.log(value.toString(), zstat);
      done();
    });

    // change it
    setTimeout(function () {
      zk.set('/root', 'root value change at ' + new Date(), version, function (err, zstat) {
        should.not.exists(err);
        version = zstat.version;
        done();
      });
    }, 1500);
  });

  it('should restart after expired', function (done) {
    done = pedding(4, done);

    var expired = false;
    zk.watch('/root', function (err, value, zstat) {
      // !expired && zk.onEnsembleExpired();
      !expired && zk.zk.connectionManager.setState(-3); // SESSION_EXPIRED
      expired = true;
      done(err);
    });

    // after started, change it
    zk.once('connected', function () {
      // will auto watch
      zk.set('/root', 'root value change at ' + new Date(), version, function (err, zstat) {
        should.not.exists(err);
        version = zstat.version;
        done();
      });
    });

  });

});
