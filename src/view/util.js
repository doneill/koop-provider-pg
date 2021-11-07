/* eslint-disable no-unused-vars */
var getValue = (obj, key) => {
  var type = typeof key

  if (type === 'string' || type === 'number') {
    key = ('' + key).replace(/\[(.*?)\]/, function (m, key) {
      return '.' + key
    }).split('.')
  }

  for (let i = 0; i < key.length; i++) {
    if (Object.prototype.hasOwnProperty.call(obj, key[i])) {
      obj = obj[key[i]]
    } else {
      return undefined
    }
  }

  return obj
}
