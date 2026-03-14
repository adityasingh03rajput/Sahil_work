import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import { MasterAdmin } from '../models/MasterAdmin.js';
import { Subscriber as Tenant } from '../models/Subscriber.js';
import { Plan } from '../models/Plan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifySetup() {
  try {
    console.log('🔍 Verifying Master Admin Panel Setup...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`   Database: ${mongoose.connection.name}\n`);

    // Check Master Admin
    const masterAdmins = await MasterAdmin.find();
    console.log('👤 Master Admins:');
    if (masterAdmins.length === 0) {
      console.log('   ❌ No master admins found!');
    } else {
      masterAdmins.forEach(admin => {
        console.log(`   ✅ ${admin.email}`);
        console.log(`      - Name: ${admin.name}`);
        console.log(`      - Role: ${admin.role}`);
        console.log(`      - Status: ${admin.status}`);
        console.log(`      - ID: ${admin._id}`);
      });
    }

    // Check Plans
    console.log('\n📋 Plans:');
    const plans = await Plan.find();
    if (plans.length === 0) {
      console.log('   ❌ No plans found!');
    } else {
      plans.forEach(plan => {
        console.log(`   ✅ ${plan.displayName} (${plan.name})`);
        console.log(`      - Durations: ${plan.durations.length} options`);
        console.log(`      - Seat Price: ₹${plan.seatPrice}`);
      });
    }

    // Check Tenants
    console.log('\n🏢 Tenants:');
    const tenants = await Tenant.find();
    if (tenants.length === 0) {
      console.log('   ℹ️  No tenants yet (this is normal for new setup)');
    } else {
      console.log(`   Found ${tenants.length} tenant(s)`);
      tenants.forEach(tenant => {
        console.log(`   - ${tenant.name} (${tenant.status})`);
      });
    }

    // Check Collections
    console.log('\n📊 Database Collections:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const relevantCollections = collections.filter(c => 
      ['masteradmins', 'tenants', 'plans', 'tenantlicenses', 'tenantpayments', 'auditlogs'].includes(c.name)
    );
    
    if (relevantCollections.length === 0) {
      console.log('   ⚠️  No master admin collections found!');
    } else {
      for (const col of relevantCollections) {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();
        console.log(`   ✅ ${col.name}: ${count} document(s)`);
      }
    }

    console.log('\n✅ Verification Complete!');
    console.log('\n🎯 Summary:');
    console.log(`   - Master Admins: ${masterAdmins.length}`);
    console.log(`   - Plans: ${plans.length}`);
    console.log(`   - Tenants: ${tenants.length}`);
    console.log(`   - Collections: ${relevantCollections.length}/6`);

    if (masterAdmins.length > 0 && plans.length > 0) {
      console.log('\n🎉 Master Admin Panel is properly configured!');
      console.log('   You can now login at: http://localhost:5173/master-admin/login');
    } else {
      console.log('\n⚠️  Setup incomplete. Run:');
      if (masterAdmins.length === 0) console.log('   - npm run create-master-admin');
      if (plans.length === 0) console.log('   - npm run seed-plans');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifySetup();
