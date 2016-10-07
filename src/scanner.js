function Scanner () {
  var objectCount = 0
  const ObjectDescriptor = require('./object-descriptor')
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

  this.setUp = function (dependencies) {
    const messageBusChannel = dependencies['message-bus']

    function consumer (routingKey, content, rawContent, cb) {
      const routingParts = routingKey.split('.')
      if (routingParts.length < 5) {
        // skip scanning if the routing key (topic) is not valid
        cb()
        return
      }

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
                  ? descriptorResponse.data : { id: typeId, descriptor: {} }
                descriptor.descriptor = ObjectDescriptor.describe(documentResponse.data, descriptor.descriptor)
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

module.exports = Scanner
