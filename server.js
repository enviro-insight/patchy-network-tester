// Node.js 18/20
import functions from '@google-cloud/functions-framework';
import express from 'express';
import cors from 'cors';
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
app.use(cors());

app.get('/', (req, res) => {
  res.set({
    'Content-Type': 'text/plain',
    'Cache-Control': 'no-store',
  });
  res.send('Hello from Patchy API');
});

app.get('/marco', (req, res) => {
  console.log('received marco ping');
  res.set({
    'Content-Type': 'text/plain',
    'Cache-Control': 'no-store',
  });
  res.send('polo');
});

app.get('/json', (req, res) => {
  res.set({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.json({ message: 'Hello from Patchy API' });
});

// Simple /ping endpoint that returns random binary data between 1000 and 10000 bytes
app.get('/ping', (req, res) => {
  const size = Math.floor(Math.random() * 9000) + 1000; // 1000–10000
  const bytes = new Uint8Array(size);
  webcrypto.getRandomValues(bytes);

  // Make a Buffer that respects byteOffset/byteLength
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', String(buf.length));
  res.end(buf); // use end() for raw binary
});

app.get('/results', async (req, res) => {
  const { limit = 1000, offset = 0 } = req.query;
  const results = await collection.find().skip(Number(offset)).limit(Number(limit)).toArray();
  res.set({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.json(results);
});

app.post('/result', express.json(), async (req, res) => {
  const result = req.body;
  await collection.insertOne(result);
  res.status(200).send('Result received');
});

// Register the Express app as the handler named "api"
functions.http('api', app);
