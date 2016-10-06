const assert = require('assert')
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it

describe('ObjectDescriptor', function () {
  const ObjectDescriptor = require('../src/object-descriptor')

  describe('ObjectDescriptor.detectType(value)', function () {
    it('should detect null values', function () {
      assert.equal(ObjectDescriptor.detectType(null), 'null')
      var nullValue = null
      assert.equal(ObjectDescriptor.detectType(nullValue), 'null')
    })

    it('should detect undefined values', function () {
      assert.equal(ObjectDescriptor.detectType(ObjectDescriptor.aRandomUndefinedProperty), 'undefined')
      var undefinedValue
      assert.equal(ObjectDescriptor.detectType(undefinedValue), 'undefined')
      assert.equal(ObjectDescriptor.detectType(Number.NaN), 'undefined')
      assert.equal(ObjectDescriptor.detectType(0 / 0), 'undefined')
    })

    it('should detect boolean values', function () {
      assert.equal(ObjectDescriptor.detectType(true), 'boolean')
      assert.equal(ObjectDescriptor.detectType(false), 'boolean')
    })

    it('should detect integer values', function () {
      assert.equal(ObjectDescriptor.detectType(0), 'integer')
      assert.equal(ObjectDescriptor.detectType(-1), 'integer')
      assert.equal(ObjectDescriptor.detectType(Number.MAX_SAFE_INTEGER), 'integer')
      assert.equal(ObjectDescriptor.detectType(Number.MIN_SAFE_INTEGER), 'integer')
      assert.equal(ObjectDescriptor.detectType(0x11), 'integer')
      assert.equal(ObjectDescriptor.detectType(Number('0b11')), 'integer')
      assert.equal(ObjectDescriptor.detectType(Number('0o11')), 'integer')
      assert.equal(ObjectDescriptor.detectType(123456), 'integer')
    })

    it('should detect float values', function () {
      assert.equal(ObjectDescriptor.detectType(0.1), 'float')
      assert.equal(ObjectDescriptor.detectType(3.5), 'float')
      assert.equal(ObjectDescriptor.detectType(-3.5), 'float')
      assert.equal(ObjectDescriptor.detectType(0.000001), 'float')
    })

    it('should detect array values', function () {
      assert.equal(ObjectDescriptor.detectType([]), 'array')
      assert.equal(ObjectDescriptor.detectType(new Array([])), 'array')
      assert.equal(ObjectDescriptor.detectType(Object.keys(ObjectDescriptor)), 'array')
    })

    it('should detect string values', function () {
      assert.equal(ObjectDescriptor.detectType('a string'), 'string')
      assert.equal(ObjectDescriptor.detectType(''), 'string')
    })

    it('should detect object values', function () {
      assert.equal(ObjectDescriptor.detectType({}), 'object')
      assert.equal(ObjectDescriptor.detectType({ prop: 'some' }), 'object')
      assert.equal(ObjectDescriptor.detectType(new ObjectDescriptor()), 'object')
    })
  })
})
