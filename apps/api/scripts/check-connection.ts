import { PrismaClient } from '@prisma/client'

async function main() {
  const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/fitsculpt_api_dev?schema=public"
  console.log('Local connection string:', LOCAL_DATABASE_URL.replace(/:[^:@]*@/, ':***@'))

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

    // Let's try the query without any filter first
    const tablesRaw = await localPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `
    console.log('Raw query result (all tables in public):', tablesRaw.map(t => t.table_name))

    // Now with the filter we used in the transfer script
    const tablesFiltered = await localPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '_%'
    `
    console.log('Filtered query result (excluding _*):', tablesFiltered.map(t => t.table_name))

    // And the one we used in the debug script (which worked)
    const tablesDebug = await localPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name AS tablename
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '_%'
    `
    console.log('Debug query result:', tablesDebug.map(t => t.tablename))

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await localPrisma.$disconnect()
  }
}

main()
