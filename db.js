const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'yournewpassword',   // your password
  database: 'farmdb'
});
conn.connect(err => {
  if (err) throw err;
  console.log("MySQL connected!");
});
module.exports = conn;
