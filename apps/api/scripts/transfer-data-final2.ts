import { PrismaClient } from '@prisma/client'

async function main() {
  // Local database connection string
  const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/fitsculpt_api_dev?schema=public"
  
  // Create Prisma clients
  const localPrisma = new PrismaClient({
    datasources: {
      db: {
        url: LOCAL_DATABASE_URL
      }
    }
  })
  
  const neonPrisma = new PrismaClient() // uses process.env.DATABASE_URL
  
  try {
    console.log('Connected to local and Neon databases')
    
    // Get list of tables from the local database (exclude _prisma_migrations and tables starting with _)
    // Using PostgreSQL regex: !~ '^_' means does not start with underscore
    const tables = await localPrisma.$queryRaw<{ tablename: string }[]>`
      SELECT table_name AS tablename
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name !~ '^_'
    `
    
    const tableNames = tables.map(t => t.tablename)
    console.log(`Found ${tableNames.length} tables to transfer: ${tableNames.join(', ')}`)
    
    // Truncate all tables in Neon (use CASCADE to handle foreign key constraints)
    console.log('Truncating tables in Neon...')
    for (const tableName of tableNames) {
      await neonPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`)
    }
    console.log('Truncated all tables')
    
    // Disable foreign key checks for the entire transfer by setting session_replication_role to replica
    console.log('Disabling foreign key checks in Neon...')
    try {
      await neonPrisma.$executeRawUnsafe(`SET session_replication_role = replica;`)
    } catch (err) {
      console.warn(`Could not set session_replication_role: ${err}`)
      // If we cannot set the role, we'll try to truncate with CASCADE and hope the insert order works
    }
    
    // For each table, copy data from local to Neon
    let totalRows = 0
    for (const tableName of tableNames) {
      console.log(`Processing table: ${tableName}`)
      
      // Fetch all rows from local table
      const rows = await localPrisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`)
      
      if (rows.length === 0) {
        console.log(`  No data to copy for ${tableName}`)
        continue
      }
      
      console.log(`  Found ${rows.length} rows to transfer`)
      
      // Get the columns for the table
      const columns = await localPrisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
        ORDER BY ordinal_position
      `
      
      const columnNames = columns.map(c => c.column_name)
      
      // Prepare values for INSERT in batches to avoid too many parameters
      const batchSize = 100
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize)
        
        // Build VALUES clause: ($1, $2, ...), ($1, $2, ...), ...
        const placeholders = batch.map((_, rowIndex) => {
          const startIndex = rowIndex * columnNames.length
          return `(${columnNames.map((_, colIndex) => `$${startIndex + colIndex + 1}`).join(', ')})`
        }).join(', ')
        
        // Flatten the values array
        const values = []
        for (const row of batch) {
          for (const colName of columnNames) {
            values.push((row as any)[colName])
          }
        }
        
        const query = `
          INSERT INTO "${tableName}" (${columnNames.map(name => `"${name}"`).join(', ')})
          VALUES ${placeholders}
        `
        
        await neonPrisma.$executeRawUnsafe(query, ...values)
      }
      
      console.log(`  Transferred ${rows.length} rows for ${tableName}`)
      totalRows += rows.length
    }
    
    // Re-enable foreign key checks
    console.log('Re-enabling foreign key checks in Neon...')
    try {
      await neonPrisma.$executeRawUnsafe(`SET session_replication_role = DEFAULT;`)
    } catch (err) {
      console.warn(`Could not reset session_replication_role: ${err}`)
    }
    
    console.log(`\n✅ Data transfer completed successfully!`)
    console.log(`   Total rows transferred: ${totalRows}`)
  } catch (error) {
    console.error('❌ Error during data transfer:', error)
    process.exit(1)
  } finally {
    await localPrisma.$disconnect()
    await neonPrisma.$disconnect()
  }
}

main()