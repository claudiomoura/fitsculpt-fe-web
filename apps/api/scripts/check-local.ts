import { PrismaClient } from '@prisma/client'

async function main() {
  const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/fitsculpt_api_dev?schema=public"
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
    console.log('Connected to local DB')

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
        const count = await localPrisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "${tableName}"`)
        console.log(`  ${tableName}: ${count[0].count} rows`)
      } catch (e) {
        console.log(`  ${tableName}: error counting - ${e}`)
      }
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await localPrisma.$disconnect()
  }
}

main()
