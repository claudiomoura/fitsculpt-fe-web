import { PrismaClient } from '@prisma/client'

async function main() {
  // Try the connection string from .env
  const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/fitsculpt_api_dev?schema=public"
  console.log('Testing connection to:', LOCAL_DATABASE_URL.replace(/:[^:@]*@/, ':***@')) // hide password
  
  const localPrisma = new PrismaClient({
    datasources: {
      db: {
        url: LOCAL_DATABASE_URL
      }
    }
  })

  try {
    // Test connection
    await localPrisma.$queryRaw`SELECT 1`
    console.log('✅ Connected to local DB')

    // Get list of tables
    const tables = await localPrisma.$queryRaw<{ tablename: string }[]>`
      SELECT table_name AS tablename
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '_%'
    `

    const tableNames = tables.map(t => t.tablename)
    console.log(`Found ${tableNames.length} tables: ${tableNames.join(', ')}`)

    // For each table, count rows
    for (const tableName of tableNames) {
      try {
        const countResult = await localPrisma.$queryRawUnsafe(`SELECT COUNT(*) AS count FROM "${tableName}"`)
        const count = countResult[0].count
        console.log(`  ${tableName}: ${count} rows`)
      } catch (e) {
        console.log(`  ${tableName}: error counting - ${e.message}`)
      }
    }
  } catch (error) {
    console.error('❌ Error connecting to local DB:', error.message)
    console.error('Make sure PostgreSQL is running on localhost:5432 and the database fitsculpt_api_dev exists.')
  } finally {
    await localPrisma.$disconnect()
  }
}

main()
