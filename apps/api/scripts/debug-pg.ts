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

    // Check search_path
    const [pathResult] = await localPrisma.$queryRaw<{ current_schemas: string }[]>`
      SHOW search_path
    `
    console.log('Search path:', pathResult.current_schemas)

    // Try pg_tables (PostgreSQL specific)
    const pgTables = await localPrisma.$queryRaw<{ tablename: string, schemaname: string }[]>`
      SELECT tablename, schemaname
      FROM pg_tables
      WHERE schemaname = 'public'
    `
    console.log(`Tables from pg_tables in public schema (${pgTables.length}):`, pgTables.map(t => t.tablename).join(', '))

    // Try information_schema.tables again but without any filter on table_name (just to see if we get any rows)
    const infoSchemaAll = await localPrisma.$queryRaw<{ table_name: string, table_schema: string }[]>`
      SELECT table_name, table_schema
      FROM information_schema.tables
    `
    console.log(`Total tables in information_schema.tables (${infoSchemaAll.length}):`)
    // Group by schema
    const bySchema: Record<string, string[]> = {}
    for (const row of infoSchemaAll) {
      if (!bySchema[row.table_schema]) bySchema[row.table_schema] = []
      bySchema[row.table_schema].push(row.table_name)
    }
    for (const [schema, tables] of Object.entries(bySchema)) {
      console.log(`  ${schema}: ${tables.length} tables`)
      if (schema === 'public') {
        console.log(`    First 10: ${tables.slice(0, 10).join(', ')}`)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await localPrisma.$disconnect()
  }
}

main()
