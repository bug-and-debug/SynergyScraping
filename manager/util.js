const safeToFloat = function(val) {
  let result = 0
  result = parseFloat(val)
  if (isNaN(result))
    result = 0
  return result
}

const safeToInt = function(val) {
  let result = 0
  result = parseInt(val)
  if (isNaN(result))
    result = 0
  return result
}

module.exports = {
  safeToInt,
  safeToFloat
}
