var mysql = require('promise-mysql');
const config = require('config')
var connection = mysql.createPool(config.get('db'));

module.exports = connection;
