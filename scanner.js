function Scanner () {
  var objectCount = 0
  const metaDomain = 'glued'
  const metaType = '__meta'

  this.getName = function () {
    return 'scanner'
  }

  this.getState = function () {
    return {
      count: objectCount
    }
  }

  this.requires = function (dependency) {
    return dependency === 'message-bus'
  }

  function detectType (value) {
    if (value === null) return 'null'
    if (typeof value === 'undefined') return 'undefined'
    if (value === true || value === false) return 'boolean'
    if (parseInt(value) === value) return 'integer'
    if (typeof value === 'number') return 'float'
    if (Object.prototype.toString.call(value) === '[object Array]') return 'array'
    if (Object.prototype.toString.call(value) === '[object String]') return 'string'
    return 'object'
  }

  function defaultDescriptor () {
    return { type: null, seen: 0, nullable: false, not_defined: false, detected: {} }
  }

  function describeProperty (value, propertyDescriptor, action) {
    propertyDescriptor = propertyDescriptor || defaultDescriptor()

    const detected = detectType(value)

    // if null or undefined is detected end the detection here
    if (detected === 'null') {
      propertyDescriptor.nullable = true
      return propertyDescriptor
    } else if (detected === 'undefined') {
      propertyDescriptor.not_defined = true
      return propertyDescriptor
    }

    const detectedTypes = propertyDescriptor.detected
    if (!detectedTypes[detected]) {
      detectedTypes[detected] = { seen: 0 }
    }
    detectedTypes[detected].seen++

    // pick the most seen
    var picked = detected
    Object.keys(detectedTypes).forEach(function (detectedType) {
      if (detectedTypes[detectedType].seen > detectedTypes[picked].seen) {
        picked = detectedType
      }
    })
    propertyDescriptor.type = picked
    if (action) {
      propertyDescriptor.seen++
    }

    // update details
    var details = propertyDescriptor.detected[detected]
    switch (detected) {
      case 'integer':
      case 'float':
        details.min = typeof details.min === 'undefined' || details.min > value ? value : details.min
        details.max = typeof details.max === 'undefined' || details.max < value ? value : details.max
        break
      case 'string':
      case 'array':
        details.size = typeof details.size === 'undefined' || details.size < value.length
          ? value.length : details.size
        break
      case 'object':
        if (value !== null) {
          details.size = typeof details.size === 'undefined' || details.size < Object.keys(value).length
            ? Object.keys(value).length : details.size
        }
        break
    }
    if (detected === 'array') {
      value.forEach(function (item) {
        details.subtype = describeProperty(item, details.subtype, action)
      })
    } else if (detected === 'object') {
      details.properties = describeProperty(value, details.properties, action)
    }
    propertyDescriptor.detected[detected] = details

    // reverse detect undefined properties in the object
    if (detected === 'object') {
      Object.keys(details.properties.detected).forEach(function (knownProperty) {
        if (!value.hasOwnProperty(knownProperty)) {
          details.properties.detected[knownProperty].not_defined = true
        }
      })
    }
    return propertyDescriptor
  }

  function describe (object, descriptor, action) {
    return describeProperty(object, descriptor || {}, action)
    // descriptor = descriptor || {}
    //
    // if (object !== null) {
    //   Object.keys(object).forEach(function (property) {
    //     descriptor[property] = describeProperty(object[property], descriptor[property], action)
    //   })
    // }
    //
    // return descriptor
  }

  this.setUp = function (dependencies) {
    const messageBusChannel = dependencies['message-bus']

    function consumer (routingKey, content, rawContent, cb) {
      const routingParts = routingKey.split('.')
      const domain = routingParts[1]
      const type = routingParts[2]
      const id = routingParts[3]
      const action = routingParts[4]

      if (type === metaType && domain === metaDomain) {
        // skip scanning itself
        cb()
        return
      }

      if (['inserted', 'updated'].indexOf(action) < 0) {
        // not tracking other actions
        cb()
        return
      }
      console.log({ method: 'get', domain: domain, type: type, id: id })
      messageBusChannel.getRpc().request(
        'store_rpc',
        { method: 'get', domain: domain, type: type, id: id },
        function (err, documentResponse) {
          if (err) {
            // log the error
            cb()
            return
          }

          if (documentResponse.data) {
            const typeId = ['type', domain, type].join(':')
            messageBusChannel.getRpc().request(
              'store_rpc',
              { method: 'get', domain: metaDomain, type: metaType, id: typeId },
              function (err, descriptorResponse) {
                if (err) {
                  // log the error
                  cb()
                  return
                }

                const descriptor = descriptorResponse.data
                  ? descriptorResponse.data : { id: typeId, type: 'object', properties: {} }
                descriptor.properties = describe(documentResponse.data, descriptor.properties, action)
                messageBusChannel.publish(['scanner', metaDomain, metaType, typeId, 'put', 'store'].join('.'), descriptor)
                cb()
              }
            )
          } else {
            cb()
          }
        }
      )
    }

    messageBusChannel.subscribe('store.*.*.*.*', consumer, 'scanner')
  }
}

module.exports.Scanner = Scanner
