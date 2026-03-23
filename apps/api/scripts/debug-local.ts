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
    console.log('✅ Connected to local DB')

    // Get current database and schema
    const [dbResult] = await localPrisma.$queryRaw<{ current_database: string }[]>`
      SELECT current_database() AS current_database
    `
    const [schemaResult] = await localPrisma.$queryRaw<{ current_schema: string }[]>`
      SELECT current_schema() AS current_schema
    `
    console.log(`Current database: ${dbResult.current_database}`)
    console.log(`Current schema: ${schemaResult.current_schema}`)

    // List all schemas
    const schemas = await localPrisma.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name
      FROM information_schema.schemata
    `
    console.log('Available schemas:', schemas.map(s => s.schema_name))

    // List tables in all schemas
    const tablesAll = await localPrisma.$queryRaw<{ schema_name: string; table_name: string }[]>`
      SELECT table_schema AS schema_name, table_name AS table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `
    if (tablesAll.length === 0) {
      console.log('No tables found in any schema.')
    } else {
      console.log('Tables in all schemas:')
      for (const { schema_name, table_name } of tablesAll) {
        console.log(`  ${schema_name}.${table_name}`)
      }
    }

    // Check if the fitsculpt_api_dev database has the tables we expect in the public schema
    const tablesPublic = await localPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `
    console.log(`Tables in public schema: ${tablesPublic.map(t => t.table_name).join(', ') || '(none)'}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await localPrisma.$disconnect()
  }
}

main()
