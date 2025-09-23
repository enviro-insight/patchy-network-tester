// Node.js 18/20
import functions from '@google-cloud/functions-framework';
import express from 'express';
import { webcrypto } from 'node:crypto'; // use Web Crypto in Node
import { MongoClient, ServerApiVersion } from 'mongodb';
import 'dotenv/config'

const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PWD}@vppro.97gt5c5.mongodb.net/?retryWrites=true&w=majority&appName=vppro`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const mongo = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
await mongo.connect();
const db = mongo.db('vppro');
const collection = db.collection('patchy');

const app = express();

app.get('/marco', (req, res) => {
  console.log('received marco ping');
  res.set({
    'Content-Type': 'text/plain',
    'Cache-Control': 'no-store',
  });
  res.send('polo');
});

app.get('/healthz', (req, res) => {
  const size = Math.floor(Math.random() * 9000) + 1000; // 1000–10000 bytes
  const payload = new Uint8Array(size);
  webcrypto.getRandomValues(payload);

  res.set({
    'Content-Type': 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  // Ensure raw bytes are sent (not JSON)
  res.send(Buffer.from(payload));
});

app.post('/result', express.json(), async (req, res) => {
  const result = req.body;
  await collection.insertOne(result);
  res.status(200).send('Result received');
});

// Register the Express app as the handler named "api"
functions.http('api', app);
