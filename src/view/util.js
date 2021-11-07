// utils

var getValue = function (obj, key) {
  var type = typeof key

  if (type === 'string' || type === 'number') {
    key = ('' + key).replace(/\[(.*?)\]/, function (m, key) {
      return '.' + key
    }).split('.')
  }

  for (var i = 0, l = key.length, currentkey; i < l; i++) {
    if (obj.hasOwnProperty(key[i])) obj = obj[key[i]]
    else return undefined
  }

  return obj
}
