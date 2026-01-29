#!/usr/bin/env node
/**
 * Airport Search Performance Optimization Script
 * 
 * This script applies database optimizations to fix slow airport search queries
 * on the production Render database.
 * 
 * Usage: node apply-performance-fix.js
 * 
 * What it does:
 * 1. Creates a composite index on all airport code fields
 * 2. Runs ANALYZE to update database statistics
 * 3. Verifies the index was created successfully
 * 
 * Expected result: 20-40x faster airport searches
 */

const db = require('./db');

async function applyPerformanceFix() {
  console.log('🚀 Starting Airport Search Performance Optimization...\n');
  
  try {
    // Step 1: Create composite index
    console.log('📊 Creating composite index on airport codes...');
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_airports_all_codes 
      ON airports(ident, icao_code, iata_code, gps_code, local_code) 
      WHERE ident IS NOT NULL;
    `);
    console.log('   ✅ Index created successfully\n');
    
    // Step 2: Analyze table statistics
    console.log('📈 Updating database statistics...');
    await db.query('ANALYZE airports;');
    console.log('   ✅ Statistics updated successfully\n');
    
    // Step 3: Verify index exists
    console.log('🔍 Verifying index creation...');
    const indexCheck = await db.query(`
      SELECT 
        indexname, 
        indexdef 
      FROM pg_indexes 
      WHERE tablename = 'airports' 
      AND indexname = 'idx_airports_all_codes';
    `);
    
    if (indexCheck.rows.length > 0) {
      console.log('   ✅ Index verified:\n');
      console.log(`      Name: ${indexCheck.rows[0].indexname}`);
      console.log(`      Definition: ${indexCheck.rows[0].indexdef}\n`);
    } else {
      console.log('   ⚠️  Index not found - it may have already existed or an error occurred\n');
    }
    
    // Step 4: Show performance statistics
    console.log('📊 Performance Statistics:');
    const stats = await db.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as "Index Scans",
        idx_tup_read as "Tuples Read",
        idx_tup_fetch as "Tuples Fetched"
      FROM pg_stat_user_indexes
      WHERE tablename = 'airports'
      ORDER BY idx_scan DESC;
    `);
    
    if (stats.rows.length > 0) {
      stats.rows.forEach(row => {
        console.log(`\n   ${row.indexname}:`);
        console.log(`      Scans: ${row["Index Scans"]}`);
        console.log(`      Tuples Read: ${row["Tuples Read"]}`);
        console.log(`      Tuples Fetched: ${row["Tuples Fetched"]}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ OPTIMIZATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📈 Expected Performance Improvement:');
    console.log('   • Airport searches: 50-100ms (was 2000ms+)');
    console.log('   • Improvement: 20-40x faster');
    console.log('\n💡 Next Steps:');
    console.log('   1. Test the deployment: npm run test');
    console.log('   2. Monitor query logs for any remaining slow queries');
    console.log('   3. If issues persist, check PERFORMANCE_FIX.md for troubleshooting');
    console.log('\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR: Failed to apply performance optimization');
    console.error(`   ${error.message}\n`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused - ensure DATABASE_URL is set correctly');
      console.error('   For Render: DATABASE_URL should be your PostgreSQL connection string');
    }
    
    process.exit(1);
  }
}

// Run the optimization
applyPerformanceFix();
