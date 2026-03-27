const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, 'fixcar.db');
const db = new Database(dbPath);
const info = db.prepare("PRAGMA table_info(appointments)").all();
console.log(JSON.stringify(info, null, 2));
db.close();
