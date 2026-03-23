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

    // Test different patterns to exclude tables starting with _
    const pattern1 = await localPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '_%' ESCAPE ''
    `
    console.log(`NOT LIKE '_%' ESCAPE '' (should exclude _prisma_migrations):`, pattern1.map(t => t.table_name))

    const pattern2 = await localPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name !~ '^_'
    `
    console.log(`!~ '^_' (regex not start with _):`, pattern2.map(t => t.table_name))

    const pattern3 = await localPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND LEFT(table_name, 1) <> '_'
    `
    console.log(`LEFT(table_name, 1) <> '_':`, pattern3.map(t => t.table_name))

    const pattern4 = await localPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '_%' ESCAPE '\'
    `
    console.log(`NOT LIKE '_%' ESCAPE '\':`, pattern4.map(t => t.table_name))

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await localPrisma.$disconnect()
  }
}

main()
