/**
 * One-Time Database Seeding Script
 * 
 * Migrates airport data from airports.json to PostgreSQL.
 * 
 * WHY THIS APPROACH?
 * - Batch inserts for performance (1000 records at a time)
 * - ON CONFLICT DO NOTHING prevents duplicates on re-runs
 * - Progress tracking for large datasets
 * - Memory-efficient (streams data in chunks)
 * 
 * USAGE:
 *   node database/seed.js
 *   or
 *   npm run seed
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

// Configuration
const BATCH_SIZE = 1000; // Insert 1000 records at a time
const AIRPORTS_JSON_PATH = path.join(__dirname, '..', 'utils', 'airports.json');

/**
 * Read and parse the airports JSON file
 */
function loadAirportsData() {
  console.log('📂 Reading airports.json...');
  const data = fs.readFileSync(AIRPORTS_JSON_PATH, 'utf8');
  const airports = JSON.parse(data);
  console.log(`✅ Loaded ${airports.length.toLocaleString()} airports from JSON`);
  return airports;
}

/**
 * Insert airports in batches for performance
 */
async function seedAirports(airports) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n🚀 Starting database seeding...\n');
    
    const totalBatches = Math.ceil(airports.length / BATCH_SIZE);
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < airports.length; i += BATCH_SIZE) {
      const batch = airports.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      
      // Build parameterized query for batch insert
      const values = [];
      const placeholders = [];
      
      batch.forEach((airport, idx) => {
        const offset = idx * 19;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19})`
        );
        
        values.push(
          airport.id,
          airport.ident,
          airport.type,
          airport.name,
          airport.latitude_deg,
          airport.longitude_deg,
          airport.elevation_ft,
          airport.continent,
          airport.iso_country,
          airport.iso_region,
          airport.municipality,
          airport.scheduled_service,
          airport.icao_code,
          airport.iata_code,
          airport.gps_code,
          airport.local_code,
          airport.home_link,
          airport.wikipedia_link,
          airport.keywords
        );
      });
      
      const query = `
        INSERT INTO airports (
          id, ident, type, name, latitude_deg, longitude_deg, elevation_ft,
          continent, iso_country, iso_region, municipality, scheduled_service,
          icao_code, iata_code, gps_code, local_code, home_link, wikipedia_link, keywords
        )
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `;
      
      const result = await client.query(query, values);
      insertedCount += result.rowCount;
      skippedCount += (batch.length - result.rowCount);
      
      // Progress indicator
      const progress = Math.round((i + batch.length) / airports.length * 100);
      const progressBar = '█'.repeat(Math.floor(progress / 2)) + '░'.repeat(50 - Math.floor(progress / 2));
      process.stdout.write(`\r[${progressBar}] ${progress}% - Batch ${batchNum}/${totalBatches} - Inserted: ${insertedCount.toLocaleString()}`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n\n✅ Seeding completed successfully!');
    console.log(`   📊 Total records: ${airports.length.toLocaleString()}`);
    console.log(`   ✔️  Inserted: ${insertedCount.toLocaleString()}`);
    console.log(`   ⏭️  Skipped (duplicates): ${skippedCount.toLocaleString()}`);
    
    // Analyze table for query optimization
    console.log('\n📈 Analyzing table for query optimization...');
    await client.query('ANALYZE airports');
    console.log('✅ Table analysis complete\n');
    
    // Show some statistics
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(icao_code) as with_icao,
        COUNT(iata_code) as with_iata,
        COUNT(DISTINCT type) as airport_types,
        COUNT(DISTINCT iso_country) as countries
      FROM airports
    `);
    
    console.log('📊 Database Statistics:');
    console.log(`   Total airports: ${stats.rows[0].total.toLocaleString()}`);
    console.log(`   With ICAO codes: ${stats.rows[0].with_icao.toLocaleString()}`);
    console.log(`   With IATA codes: ${stats.rows[0].with_iata.toLocaleString()}`);
    console.log(`   Airport types: ${stats.rows[0].airport_types}`);
    console.log(`   Countries: ${stats.rows[0].countries}\n`);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seeding failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Main seeding process
 */
async function main() {
  console.log('🌍 Aviation Weather Database Seeder\n');
  console.log('=' .repeat(60));
  
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'airports'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('\n❌ Error: airports table does not exist!');
      console.log('   Please run the schema.sql file first:');
      console.log('   psql -U postgres -d aviation_weather -f database/schema.sql\n');
      process.exit(1);
    }
    
    // Load and seed data
    const airports = loadAirportsData();
    await seedAirports(airports);
    
    console.log('✨ All done! Database is ready for use.\n');
    process.exit(0);
    
  } catch (err) {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
  }
}

// Run the seeder
if (require.main === module) {
  main();
}

module.exports = { seedAirports, loadAirportsData };
