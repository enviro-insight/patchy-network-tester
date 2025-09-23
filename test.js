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

//count of docs in collection
await collection.insertOne({ test: 'connection' });
const count = await collection.countDocuments();
console.log(`Documents in collection: ${count}`);