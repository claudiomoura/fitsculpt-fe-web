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
    
    // Step 2: Get foreign key relationships to determine insertion order
    const fkRows = await localPrisma.$queryRaw<{ 
      table_name: string, 
      foreign_table_name: string 
    }[]>`
      SELECT 
        tc.table_name, 
        ccu.table_name AS foreign_table_name
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
    
    // Step 3: For each table in sorted order, copy data from local to Neon using Prisma
    let totalRows = 0
    for (const tableName of sortedTables) {
      console.log(`Processing table: ${tableName}`)
      
      // Fetch all rows from local table
      // We use $queryRawUnsafe to get plain objects
      const rows = await localPrisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`)
      
      if (rows.length === 0) {
        console.log(`  No data to copy for ${tableName}`)
        continue
      }
      
      console.log(`  Found ${rows.length} rows to transfer`)
      
      // Try to get the Prisma model for this table
      // The model name is expected to be the same as the table name (PascalCase)
      let model = null
      // Try the tableName as is (it should be in PascalCase from our schema)
      if (typeof neonPrisma[tableName as keyof typeof neonPrisma] === 'object') {
        model = neonPrisma[tableName as keyof typeof neonPrisma]
      } else {
        // Try to find a model that matches the table name ignoring case
        const modelNames = Object.keys(neonPrisma) as (keyof typeof neonPrisma)[]
        const match = modelNames.find(name => 
          String(name).toLowerCase() === tableName.toLowerCase()
        )
        if (match && typeof neonPrisma[match] === 'object') {
          model = neonPrisma[match]
        }
      }
      
      if (!model) {
        console.warn(`  Could not find Prisma model for table ${tableName}, skipping`)
        continue
      }
      
      // Use createMany to insert all rows at once
      // We skip duplicates in case we run the script multiple times
      try {
        const result = await model.createMany({
          data: rows as any,
          skipDuplicates: true,
        })
        console.log(`  Inserted ${result.count} rows (skipped ${rows.length - result.count} duplicates)`)
        totalRows += result.count
      } catch (error) {
        console.error(`  Failed to insert rows for ${tableName}:`, error)
        // If createMany fails, try inserting one by one as a fallback
        let inserted = 0
        for (const row of rows) {
          try {
            await model.create({ data: row as any })
            inserted++
          } catch (e) {
            console.error(`    Failed to insert row:`, e)
          }
        }
        console.log(`  Inserted ${inserted} rows one by one as fallback`)
        totalRows += inserted
      }
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