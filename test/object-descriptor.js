const assert = require('assert')
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it

describe('ObjectDescriptor', function () {
  const ObjectDescriptor = require('../src/object-descriptor')
  const defaultDescriptor = function () {
    return {
      type: null,
      times_seen: 0,
      nullable: false,
      not_defined: false,
      detected: {}
    }
  }

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

  describe('ObjectDescriptor.decorateDescriptor(descriptor)', function () {
    it('should return a default one when none is provided', function () {
      assert.deepEqual(ObjectDescriptor.decorateDescriptor(), defaultDescriptor())
      assert.deepEqual(ObjectDescriptor.decorateDescriptor({}), defaultDescriptor())
    })

    it('should not override the type of the given descriptor', function () {
      const modifiedDescriptor = ObjectDescriptor.decorateDescriptor({ type: 'something' })
      assert.deepEqual(modifiedDescriptor.type, 'something')
    })

    it('should not override the number of times seen of the given descriptor', function () {
      const modifiedDescriptor = ObjectDescriptor.decorateDescriptor({ times_seen: 100 })
      assert.deepEqual(modifiedDescriptor.times_seen, 100)
    })

    it('should not override the nullable flag of the given descriptor', function () {
      const modifiedDescriptor = ObjectDescriptor.decorateDescriptor({ nullable: true })
      assert.deepEqual(modifiedDescriptor.nullable, true)
    })

    it('should not override the "not defined" flag of the given descriptor', function () {
      const modifiedDescriptor = ObjectDescriptor.decorateDescriptor({ not_defined: true })
      assert.deepEqual(modifiedDescriptor.not_defined, true)
    })

    it('should not override the detected types of the given descriptor', function () {
      const detectedTypes = [{ type: 'string' }, { type: 'null' }]
      const modifiedDescriptor = ObjectDescriptor.decorateDescriptor({ detected: detectedTypes })
      assert.deepEqual(modifiedDescriptor.detected, detectedTypes)
    })
  })

  describe('ObjectDescriptor.describe(value, propertyDescriptor)', function () {
    const detectedType = function (seen, info) {
      info = info || {}
      if (!info.hasOwnProperty('times_seen')) info.times_seen = seen || 0
      return info
    }

    assert.typesMatch = function (actual, expected, message) {
      assert.equal(actual.times_seen, expected.times_seen, message + ': times seen mismatch')
      if (expected.hasOwnProperty('min')) assert.equal(actual.min, expected.min, message + ': min value mismatch')
      if (expected.hasOwnProperty('max')) assert.equal(actual.max, expected.max, message + ': max value mismatch')
      if (expected.hasOwnProperty('size')) assert.equal(actual.size, expected.size, message + ': size mismatch')
      if (expected.hasOwnProperty('subtype')) assert.descriptorsMatch(actual.subtype, expected.subtype, message + ': subtype mismatch')
      if (expected.hasOwnProperty('properties')) {
        const properties = Object.keys(expected.properties).concat(Object.keys(actual.properties || []))
        properties.forEach(function (property) {
          assert.descriptorsMatch(actual.properties[property], expected.properties[property], message + ': property [' + property + '] mismatch')
        })
      }
    }

    assert.descriptorsMatch = function (actual, expected, message) {
      assert.equal(actual.type, expected.type, message + ': type mismatch')
      assert.equal(actual.times_seen, expected.times_seen, message + ': times seen mismatch')
      assert.equal(actual.nullable, expected.nullable, message + ': nullable flag mismatch')
      assert.equal(actual.not_defined, expected.not_defined, message + ': "not defined" flag mismatch')
      assert.ok(actual.detected, message + ': detected array not defined')
      Object.keys(actual.detected).forEach(function (type) {
        assert.typesMatch(actual.detected[type], expected.detected[type], message + ': detected type [' + type + '] mismatch')
      })
    }

    it('should describe correctly a null value', function () {
      assert.descriptorsMatch(
        ObjectDescriptor.describe(null),
        ObjectDescriptor.decorateDescriptor({ type: null, times_seen: 1, nullable: true, detected: { 'null': detectedType(1) } })
      )
    })

    it('should describe correctly an undefined value', function () {
      var undefinedValue
      assert.descriptorsMatch(
        ObjectDescriptor.describe(undefinedValue),
        ObjectDescriptor.decorateDescriptor({ type: null, times_seen: 1, not_defined: true, detected: { 'undefined': detectedType(1) } })
      )
    })

    it('should describe correctly an boolean value', function () {
      assert.descriptorsMatch(
        ObjectDescriptor.describe(true),
        ObjectDescriptor.decorateDescriptor({ type: 'boolean', times_seen: 1, detected: { 'boolean': detectedType(1) } })
      )

      assert.descriptorsMatch(
        ObjectDescriptor.describe(false),
        ObjectDescriptor.decorateDescriptor({ type: 'boolean', times_seen: 1, detected: { 'boolean': detectedType(1) } })
      )
    })

    it('should describe correctly an integer value', function () {
      assert.descriptorsMatch(
        ObjectDescriptor.describe(1234),
        ObjectDescriptor.decorateDescriptor({ type: 'integer', times_seen: 1, detected: { 'integer': detectedType(1) } })
      )
    })

    it('should describe correctly a float value', function () {
      assert.descriptorsMatch(
        ObjectDescriptor.describe(12.34),
        ObjectDescriptor.decorateDescriptor({ type: 'float', times_seen: 1, detected: { 'float': detectedType(1) } })
      )
    })

    it('should describe correctly an array value', function () {
      const subtype1 = ObjectDescriptor.decorateDescriptor({
        type: 'integer',
        times_seen: 6,
        nullable: true,
        detected: {
          'null': detectedType(1),
          'integer': detectedType(3, { min: 1, max: 3 }),
          'float': detectedType(1, { min: 4.5, max: 4.5 }),
          'string': detectedType(1, { size: 6 })
        }
      })

      assert.descriptorsMatch(
        ObjectDescriptor.describe([null, 1, 2, 3, 4.5, 'string']),
        ObjectDescriptor.decorateDescriptor({ type: 'array', times_seen: 1, detected: { 'array': { times_seen: 1, subtype: subtype1 } } })
      )

      const subtype2 = ObjectDescriptor.decorateDescriptor({
        type: 'string',
        times_seen: 6,
        not_defined: true,
        detected: {
          'undefined': detectedType(1),
          'integer': detectedType(1, { min: 0, max: 0 }),
          'string': detectedType(4, { size: 13 })
        }
      })

      assert.descriptorsMatch(
        ObjectDescriptor.describe(['a', 'b', 'cde', 'longer string', 0, (0 / 0)]),
        ObjectDescriptor.decorateDescriptor({ type: 'array', times_seen: 1, detected: { 'array': { times_seen: 1, subtype: subtype2 } } })
      )
    })

    it('should describe correctly an object value', function () {
      const object = { prop_a: 'value a', prop_b: 2, prop_c: [1, 2, 3], prop_d: { prop_e: 'e', prop_f: 'f' } }

      const arraySubtype = function (iteration) {
        return ObjectDescriptor.decorateDescriptor({
          type: 'integer',
          times_seen: 3 * iteration,
          detected: { 'integer': detectedType(3 * iteration, { min: 1, max: 3 }) }
        })
      }

      const objectProperties = function (iteration) {
        return {
          prop_e: ObjectDescriptor.decorateDescriptor({ type: 'string', times_seen: iteration, detected: { 'string': detectedType(iteration, { size: 1 }) } }),
          prop_f: ObjectDescriptor.decorateDescriptor({ type: 'string', times_seen: iteration, detected: { 'string': detectedType(iteration, { size: 1 }) } })
        }
      }

      const fullDescriptor = function (iteration) {
        iteration = iteration || 1
        return ObjectDescriptor.decorateDescriptor({
          type: 'object',
          times_seen: iteration,
          detected: {
            'object': detectedType(iteration, { properties: {
              prop_a: ObjectDescriptor.decorateDescriptor({ type: 'string', times_seen: iteration, detected: { 'string': detectedType(iteration) } }),
              prop_b: ObjectDescriptor.decorateDescriptor({ type: 'integer', times_seen: iteration, detected: { 'integer': detectedType(iteration, { min: 2, max: 2 }) } }),
              prop_c: ObjectDescriptor.decorateDescriptor({ type: 'array', times_seen: iteration, detected: { 'array': detectedType(iteration, { subtype: arraySubtype(iteration) }) } }),
              prop_d: ObjectDescriptor.decorateDescriptor({ type: 'object', times_seen: iteration, detected: { 'object': detectedType(iteration, { properties: objectProperties(iteration) }) } })
            }})
          }
        })
      }

      var currentDescriptor = {}
      for (var i = 1; i < 5; i++) {
        currentDescriptor = ObjectDescriptor.describe(object, currentDescriptor)
        assert.descriptorsMatch(currentDescriptor, fullDescriptor(i), 'Iteration ' + i)
      }
    })
  })
})
