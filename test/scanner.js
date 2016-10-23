const assert = require('assert')
const mocha = require('mocha')
const sinon = require('sinon')
const describe = mocha.describe
const it = mocha.it
const before = mocha.before

describe('Scanner', function () {
  const Scanner = require('../src/scanner')
  const scanner = new Scanner()

  describe('Scanner.getName()', function () {
    it('should return "scanner"', function () {
      assert.equal(scanner.getName(), 'scanner')
    })
  })

  describe('Scanner.getState()', function () {
    it('should return the state', function () {
      assert.deepEqual(scanner.getState(), { count: 0 })
    })
  })

  describe('Scanner.requires(dependency)', function () {
    it('should not require the data layer', function () {
      assert.equal(scanner.requires('data-layer'), false)
    })

    it('should require the message bus', function () {
      assert.equal(scanner.requires('message-bus'), true)
    })
  })

  describe('Scanner.setUp(dependencies)', function () {
    var consumer
    const object = { prop_a: 'a', prop_b: 17 }
    const rpcRequest = sinon.stub()
    rpcRequest.onFirstCall().callsArgWith(2, null, { data: object })
    rpcRequest.onSecondCall().callsArgWith(2, null, {})
    rpcRequest.onThirdCall().callsArgWith(2, null, {})
    const rpc = { request: rpcRequest }
    const messageBusChannel = { subscribe: sinon.stub(), getRpc: sinon.stub().returns(rpc), publish: sinon.spy() }

    before(function () {
      scanner.setUp({ 'message-bus': messageBusChannel })
    })

    it('should subscribe to messages from the store', function () {
      assert.ok(messageBusChannel.subscribe.calledOnce)
    })

    it('should pass the consumer to the subscriber', function () {
      consumer = messageBusChannel.subscribe.lastCall.args[1]
      assert.ok(consumer)
      assert.ok(Object.prototype.toString.call(consumer), '[object Function]')
    })

    it('should fetch the object and the descriptor through RPC and try and save the descriptor', function (done) {
      const ObjectDescriiptor = require('../src/object-descriptor')
      const expectedDescriptor = { descriptor: ObjectDescriiptor.describe(object), id: 'type:test:test' }
      consumer(['test', 'test', 'test', '1', 'inserted'].join('.'), {}, {}, function (err) {
        assert.equal(err, null)
        assert.ok(rpcRequest.calledThrice)
        assert.equal(rpcRequest.lastCall.args[1].id, 'type:test:test')
        assert.deepEqual(rpcRequest.lastCall.args[1].object, expectedDescriptor)
        done(err)
      })
    })
  })
})
