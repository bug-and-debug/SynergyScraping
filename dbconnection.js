var mysql = require('promise-mysql');
var connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password:'',
    database: 'synergy',
    port: 3306
});

module.exports = connection;
