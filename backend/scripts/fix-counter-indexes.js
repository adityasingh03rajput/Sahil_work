import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const collection = db.collection('counters');

  console.log('Fetching indexes...');
  const indexes = await collection.indexes();
  console.log('Current indexes:', JSON.stringify(indexes, null, 2));

  // Find the old unique index on userId and docType
  const oldIndex = indexes.find(idx => 
    idx.key.userId === 1 && 
    idx.key.docType === 1 && 
    Object.keys(idx.key).length === 2 &&
    idx.unique
  );

  if (oldIndex) {
    console.log(`Dropping old unique index: ${oldIndex.name}`);
    await collection.dropIndex(oldIndex.name);
    console.log('Successfully dropped old index');
  } else {
    // Also try dropping by common name if not found by keys exactly
    try {
      await collection.dropIndex('userId_1_docType_1');
      console.log('Successfully dropped userId_1_docType_1 index');
    } catch (e) {
      console.log('userId_1_docType_1 index not found or already dropped');
    }
  }

  console.log('Ensuring new index exists...');
  await collection.createIndex(
    { userId: 1, profileId: 1, docType: 1, fiscalYear: 1 },
    { unique: true, name: 'counters_multitenant_fiscal_unique' }
  );

  console.log('Migration complete. You can now create documents in any profile/fiscal year.');
  await mongoose.disconnect();
}

run().catch(console.error);
