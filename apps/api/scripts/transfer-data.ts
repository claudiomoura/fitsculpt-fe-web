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
    
    // Get list of tables from the local database (or Neon, they should match)
    // Exclude tables that start with '_' (like Prisma metadata) as they may not exist in Neon yet or are managed by Prisma
    const tables = await localPrisma.$queryRaw<{ tablename: string }[]>`
      SELECT table_name AS tablename
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '_%'
    `
    
    const tableNames = tables.map(t => t.tablename)
    console.log(`Found ${tableNames.length} tables: ${tableNames.join(', ')}`)
    
    // Truncate all tables in Neon (in reverse order to avoid FK constraints? we'll use CASCADE)
    console.log('Truncating tables in Neon...')
    for (const tableName of tableNames) {
      // Use double quotes for table names that might be case-sensitive or need escaping
      await neonPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`)
    }
    console.log('Truncated all tables')
    
    // For each table, copy data from local to Neon
    for (const tableName of tableNames) {
      console.log(`Copying data for table: ${tableName}`)
      
      // Fetch all rows from local table
      const rows = await localPrisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`)
      
      if (rows.length === 0) {
        console.log(`  No data to copy for ${tableName}`)
        continue
      }
      
      // Get the columns for the table
      const columns = await localPrisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
        ORDER BY ordinal_position
      `
      
      const columnNames = columns.map(c => c.column_name)
      
      // Prepare values for INSERT
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
      
      console.log(`  Copied ${rows.length} rows`)
    }
    
    console.log('Data transfer completed successfully!')
  } catch (error) {
    console.error('Error during data transfer:', error)
  } finally {
    await localPrisma.$disconnect()
    await neonPrisma.$disconnect()
  }
}

main()
