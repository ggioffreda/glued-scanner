function Scanner () {
  var objectCount = 0
  const ObjectDescriptor = require('./object-descriptor')
  const metaDomain = process.env.GLUED_SCANNER_DOMAIN || 'glued'
  const metaType = process.env.GLUED_SCANNER_TYPE || '__meta'

  this.getName = function () {
    return 'scanner'
  }

  this.getState = function () {
    return {
      domain: metaDomain,
      type: metaType,
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

      const async = require('async')

      async.waterfall([
        function (callback) {
          messageBusChannel.getRpc().request(
            'store_rpc',
            { method: 'get', domain: domain, type: type, id: id },
            function (err, documentResponse) {
              if (err) {
                // log the error
                callback(new Error('Error fetching the document'))
                return
              }

              if (documentResponse.data) {
                const typeId = ['type', domain, type].join(':')
                callback(null, typeId, documentResponse.data)
              } else {
                callback(new Error('No document returned'))
              }
            }
          )
        },
        function (typeId, document, callback) {
          messageBusChannel.getRpc().request(
            'store_rpc',
            { method: 'get', domain: metaDomain, type: metaType, id: typeId },
            function (err, descriptorResponse) {
              if (err) {
                callback(new Error('Error fetching the descriptor'))
                return
              }

              const descriptor = descriptorResponse.data ? descriptorResponse.data : { id: typeId, descriptor: {} }
              descriptor.descriptor = ObjectDescriptor.describe(document, descriptor.descriptor)
              callback(null, typeId, descriptor)
            }
          )
        },
        function (typeId, descriptor, callback) {
          objectCount++;
          messageBusChannel.getRpc().request(
            'store_rpc',
            { method: 'put', domain: metaDomain, type: metaType, id: typeId, object: descriptor },
            function (err) {
              callback(err)
            }
          )
        }
      ], cb)
    }

    messageBusChannel.subscribe('store.*.*.*.*', consumer, 'scanner')
  }
}

module.exports = Scanner
