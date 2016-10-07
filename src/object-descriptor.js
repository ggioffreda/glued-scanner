function ObjectDescriptor () {

}

ObjectDescriptor.detectType = function (value) {
  if (value === null) return 'null'
  if (typeof value === 'undefined' || Number.isNaN(value)) return 'undefined'
  if (value === true || value === false) return 'boolean'
  if (parseInt(value) === value) return 'integer'
  if (typeof value === 'number') return 'float'
  if (Object.prototype.toString.call(value) === '[object Array]') return 'array'
  if (Object.prototype.toString.call(value) === '[object String]') return 'string'
  if (Object.prototype.toString.call(value) === '[object Function]') return 'function'
  return 'object'
}

ObjectDescriptor.decorateDescriptor = function (descriptor) {
  descriptor = descriptor || {}
  if (!descriptor.type) descriptor.type = null
  if (!descriptor.times_seen) descriptor.times_seen = 0
  if (!descriptor.nullable) descriptor.nullable = false
  if (!descriptor.not_defined) descriptor.not_defined = false
  if (!descriptor.detected) descriptor.detected = {}
  return descriptor
}

ObjectDescriptor.describe = function (value, propertyDescriptor) {
  propertyDescriptor = ObjectDescriptor.decorateDescriptor(propertyDescriptor)

  const detected = ObjectDescriptor.detectType(value)

  // if null or undefined is detected end the detection here
  if (detected === 'null') {
    propertyDescriptor.nullable = true
  } else if (detected === 'undefined') {
    propertyDescriptor.not_defined = true
  }

  const detectedTypes = propertyDescriptor.detected
  if (!detectedTypes.hasOwnProperty(detected)) {
    detectedTypes[detected] = { times_seen: 0 }
  }
  detectedTypes[detected].times_seen++
  propertyDescriptor.times_seen++

  // pick the most seen
  var picked = detected
  Object.keys(detectedTypes).forEach(function (detectedType) {
    if (['null', 'undefined'].indexOf(detectedType) >= 0) {
      return
    }

    if (detectedTypes[detectedType].times_seen > detectedTypes[picked].times_seen) {
      picked = detectedType
    }
  })
  propertyDescriptor.type = ['null', 'undefined'].indexOf(picked) >= 0 ? null : picked

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
      details.size = typeof details.size === 'undefined' || details.size < Object.keys(value).length
        ? Object.keys(value).length : details.size
      break
  }
  if (detected === 'array') {
    value.forEach(function (item) {
      details.subtype = ObjectDescriptor.describe(item, details.subtype)
    })
  } else if (detected === 'object') {
    details.properties = details.properties || {}
    Object.keys(value).forEach(function (property) {
      details.properties[property] = ObjectDescriptor.describe(value[property], details.properties[property])
    })
    // reverse detect undefined properties in the object
    Object.keys(details.properties).forEach(function (knownProperty) {
      if (!value.hasOwnProperty(knownProperty)) {
        details.properties[knownProperty].not_defined = true
      }
    })
  }
  propertyDescriptor.detected[detected] = details

  return propertyDescriptor
}

module.exports = ObjectDescriptor
