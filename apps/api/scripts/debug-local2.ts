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
    await localPrisma.$queryRaw`SELECT 1`
    console.log('✅ Connected to local DB')

    // Query 1: without any filter on table_name
    const allTables = await localPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `
    console.log(`All tables in public schema (${allTables.length}):`, allTables.map(t => t.table_name).join(', '))

    // Query 2: with NOT LIKE '_%' 
    const filteredTables = await localPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '_%'
    `
    console.log(`Tables not starting with '_' (${filteredTables.length}):`, filteredTables.map(t => t.table_name).join(', '))

    // Query 3: with table_name != '_prisma_migrations'
    const notMigrations = await localPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name != '_prisma_migrations'
    `
    console.log(`Tables excluding _prisma_migrations (${notMigrations.length}):`, notMigrations.map(t => t.table_name).join(', '))

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await localPrisma.$disconnect()
  }
}

main()
