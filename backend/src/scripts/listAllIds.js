import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function listAllIds() {
  try {
    console.log('🔍 Scanning MongoDB Database for all IDs...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`   Database: ${mongoose.connection.name}\n`);

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`📊 Found ${collections.length} collections\n`);
    console.log('═'.repeat(80));

    let totalDocuments = 0;

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      
      totalDocuments += count;

      console.log(`\n📁 Collection: ${collectionName}`);
      console.log(`   Documents: ${count}`);
      
      if (count > 0 && count <= 50) {
        // Show IDs for collections with reasonable number of documents
        const docs = await collection.find({}, { projection: { _id: 1, email: 1, name: 1, businessName: 1, documentNumber: 1, type: 1 } }).limit(50).toArray();
        
        docs.forEach((doc, index) => {
          let displayInfo = `   ${index + 1}. ID: ${doc._id}`;
          
          // Add identifying information
          if (doc.email) displayInfo += ` | Email: ${doc.email}`;
          if (doc.name) displayInfo += ` | Name: ${doc.name}`;
          if (doc.businessName) displayInfo += ` | Business: ${doc.businessName}`;
          if (doc.documentNumber) displayInfo += ` | Doc#: ${doc.documentNumber}`;
          if (doc.type) displayInfo += ` | Type: ${doc.type}`;
          
          console.log(displayInfo);
        });
      } else if (count > 50) {
        console.log(`   ⚠️  Too many documents (${count}) - showing first 10 IDs only`);
        const docs = await collection.find({}, { projection: { _id: 1 } }).limit(10).toArray();
        docs.forEach((doc, index) => {
          console.log(`   ${index + 1}. ID: ${doc._id}`);
        });
        console.log(`   ... and ${count - 10} more`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📈 Summary:');
    console.log(`   Total Collections: ${collections.length}`);
    console.log(`   Total Documents: ${totalDocuments}`);
    
    // Breakdown by collection type
    console.log('\n📋 Breakdown:');
    for (const collectionInfo of collections) {
      const count = await db.collection(collectionInfo.name).countDocuments();
      if (count > 0) {
        console.log(`   - ${collectionInfo.name}: ${count} document(s)`);
      }
    }

    // Master Admin specific collections
    console.log('\n🔐 Master Admin Panel Collections:');
    const masterAdminCollections = ['masteradmins', 'tenants', 'plans', 'tenantlicenses', 'tenantpayments', 'auditlogs'];
    for (const colName of masterAdminCollections) {
      const count = await db.collection(colName).countDocuments();
      console.log(`   - ${colName}: ${count} document(s)`);
    }

    // Regular app collections
    console.log('\n👥 Regular App Collections:');
    const appCollections = ['users', 'sessions', 'subscriptions', 'businessprofiles', 'documents', 'customers', 'suppliers', 'items'];
    for (const colName of appCollections) {
      try {
        const count = await db.collection(colName).countDocuments();
        if (count > 0) {
          console.log(`   - ${colName}: ${count} document(s)`);
        }
      } catch (e) {
        // Collection doesn't exist
      }
    }

    console.log('\n✅ Scan Complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listAllIds();
