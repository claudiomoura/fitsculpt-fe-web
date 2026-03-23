import { PrismaClient } from '@prisma/client'

async function main() {
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
    
    // Step 1: Get all tables (excluding _prisma_migrations and tables starting with _)
    const tableRows = await localPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name !~ '^_'
        AND table_name != '_prisma_migrations'
    `
    const allTableNames = tableRows.map(r => r.table_name)
    console.log(`Found ${allTableNames.length} tables: ${allTableNames.join(', ')}`)
    
    // Step 2: Get foreign key relationships
    const fkRows = await localPrisma.$queryRaw<{ 
      table_name: string, 
      column_name: string, 
      foreign_table_name: string, 
      foreign_column_name: string 
    }[]>`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
    `
    
    // Build adjacency list and in-degree count
    const adj: Record<string, string[]> = {}
    const inDegree: Record<string, number> = {}
    
    // Initialize for all tables
    for (const table of allTableNames) {
      adj[table] = []
      inDegree[table] = 0
    }
    
    for (const fk of fkRows) {
      const { table_name, foreign_table_name } = fk
      // table_name depends on foreign_table_name
      // So we need to insert foreign_table_name before table_name
      // Edge: foreign_table_name -> table_name
      if (!adj[foreign_table_name]) {
        adj[foreign_table_name] = []
      }
      if (!adj[table_name]) {
        adj[table_name] = []
      }
      adj[foreign_table_name].push(table_name)
      inDegree[table_name] = (inDegree[table_name] || 0) + 1
      
      // Also ensure foreign_table_name is in the maps (should be, but just in case)
      if (!inDegree[foreign_table_name]) {
        inDegree[foreign_table_name] = 0
      }
    }
    
    // Topological sort (Kahn's algorithm)
    const queue: string[] = []
    for (const table of allTableNames) {
      if (inDegree[table] === 0) {
        queue.push(table)
      }
    }
    
    const sortedTables: string[] = []
    while (queue.length > 0) {
      const table = queue.shift()!
      sortedTables.push(table)
      
      for (const dependent of adj[table]) {
        inDegree[dependent]--
        if (inDegree[dependent] === 0) {
          queue.push(dependent)
        }
      }
    }
    
    if (sortedTables.length !== allTableNames.length) {
      console.warn('Warning: Graph has cycles, some tables may be out of order')
      // Add remaining tables in any order
      for (const table of allTableNames) {
        if (!sortedTables.includes(table)) {
          sortedTables.push(table)
        }
      }
    }
    
    console.log('Determined insertion order:', sortedTables.join(' -> '))
    
    // Step 3: Truncate all tables in reverse order (to avoid foreign key issues during truncate? 
    // Actually, truncate with CASCADE doesn't care about order, but we'll do reverse order just in case)
    console.log('Truncating all tables...')
    for (const table of [...sortedTables].reverse()) {
      try {
        await neonPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`)
      } catch (e) {
        console.warn(`Failed to truncate ${table}: ${e}`)
      }
    }
    console.log('Truncated all tables')
    
    // Step 4: For each table in sorted order, copy data from local to Neon
    let totalRows = 0
    for (const tableName of sortedTables) {
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