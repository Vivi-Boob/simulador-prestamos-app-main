const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

let client;
let db;

async function connectDB() {
  if (db) return db;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('Conectado a MongoDB Atlas');
  return db;
}

module.exports = { connectDB };
