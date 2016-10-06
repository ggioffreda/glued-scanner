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
  return 'object'
}

ObjectDescriptor.defaultDescriptor = function (descriptor) {
  descriptor = descriptor || {}
  if (!descriptor.type) descriptor.type = null
  if (!descriptor.seen) descriptor.seen = 0
  if (!descriptor.nullable) descriptor.nullable = false
  if (!descriptor.not_defined) descriptor.not_defined = false
  if (!descriptor.detected) descriptor.detected = {}
  return descriptor
}

ObjectDescriptor.describe = function (value, propertyDescriptor, seen) {
  propertyDescriptor = ObjectDescriptor.defaultDescriptor(propertyDescriptor)

  const detected = ObjectDescriptor.detectType(value)

  // if null or undefined is detected end the detection here
  if (detected === 'null') {
    propertyDescriptor.nullable = true
    return propertyDescriptor
  } else if (detected === 'undefined') {
    propertyDescriptor.not_defined = true
    return propertyDescriptor
  }

  const detectedTypes = propertyDescriptor.detected
  if (!detectedTypes.hasOwnProperty(detected)) {
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
  if (seen) {
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
      details.size = typeof details.size === 'undefined' || details.size < Object.keys(value).length
        ? Object.keys(value).length : details.size
      break
  }
  if (detected === 'array') {
    value.forEach(function (item) {
      details.subtype = ObjectDescriptor.describeProperty(item, details.subtype, seen)
    })
  } else if (detected === 'object') {
    details.properties = details.properties || {}
    Object.keys(value).forEach(function (property) {
      details.properties[property] = ObjectDescriptor.describeProperty(value[property], {}, seen)
    })
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

module.exports = ObjectDescriptor
