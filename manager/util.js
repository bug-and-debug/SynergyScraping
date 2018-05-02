const db=require('./../dbconnection')
const config = require('config')

const truncateTable = function(name) {
  return db.query('TRUNCATE TABLE ' + name).then((result, err) => {
    if (err)
      return Promise.reject(err)
    else
      return Promise.resolve('truncated..')
  })
}
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

const convertToDateFormat = function(str) {
   return str.split('/')[2] + '-' + ('0' + str.split('/')[0]).slice(-2) + '-' + ('0' + str.split('/')[1]).slice(-2)
}

const getDiffDate = day => {
  var d = new Date();
  d.setDate(d.getDate() - day);
  return convertToDateFormat(d.toLocaleString('en-US', {
    timeZone: config.get('timezone')
  }).split(',')[0]);
}

module.exports = {
  safeToInt,
  safeToFloat,
  truncateTable,
  convertToDateFormat,
  getDiffDate,
}
