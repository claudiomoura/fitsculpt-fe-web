import { PrismaClient } from '@prisma/client'

async function main() {
  console.log('=== Starting data migration from local to Neon ===')
  
  // Local database connection
  const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/fitsculpt_api_dev?schema=public"
  
  // Create Prisma clients
  const localPrisma = new PrismaClient({
    datasources: {
      db: {
        url: LOCAL_DATABASE_URL
      }
    }
  })
  
  const neonPrisma = new PrismaClient() // Uses DATABASE_URL from .env (Neon)
  
  try {
    console.log('✅ Connected to both databases')
    
    // Get all table names from Prisma schema (we'll use the model names)
    // We know the models from the schema.prisma file
    const modelNames = [
      'User',
      'Exercise',
      'Gym',
      'UserProfile',
      'UserFood',
      'Workout',
      'WorkoutExercise',
      'WorkoutSession',
      'WorkoutSessionEntry',
      'NutritionPlan',
      'NutritionDay',
      'NutritionMeal',
      'NutritionIngredient',
      'TrainingPlan',
      'TrainingDay',
      'TrainingExercise',
      'Recipe',
      'RecipeIngredient',
      'AuthProvider',
      'EmailVerificationToken',
      'SignupAttempt',
      'OAuthState',
      'StripeWebhookEvent',
      'FeedPost',
      'AiPromptCache',
      'AiUsage',
      'AiUsageLog',
      'AiContent',
      'GymMembership'
    ]
    
    // Filter to only models that exist in both databases
    // We'll check by trying to count
    const existingModels: string[] = []
    
    for (const modelName of modelNames) {
      try {
        // Check if model exists in local DB
        await localPrisma[modelName as keyof typeof localPrisma].count()
        // Check if model exists in Neon DB
        await neonPrisma[modelName as keyof typeof neonPrisma].count()
        existingModels.push(modelName)
        console.log(`✅ Model ${modelName} exists in both databases`)
      } catch (error) {
        console.log(`⚠️  Model ${modelName} not found in one of the databases, skipping`)
      }
    }
    
    console.log(`\n📊 Found ${existingModels.length} models to migrate:`)
    console.log(existingModels.join(', '))
    
    // Process each model in dependency order (parents first)
    // Order based on foreign key relationships
    const migrationOrder = [
      // Independent tables (no incoming FKs or only to themselves)
      'User',
      'Exercise',
      'Gym',
      
      // Tables that depend on User
      'UserProfile',
      'UserFood',
      'AuthProvider',
      'EmailVerificationToken',
      'SignupAttempt',
      'OAuthState',
      
      // Tables that depend on User and/or Exercise
      'Workout',
      
      // Tables that depend on Workout and Exercise
      'WorkoutExercise',
      
      // Tables that depend on Workout and User
      'WorkoutSession',
      
      // Tables that depend on WorkoutSession
      'WorkoutSessionEntry',
      
      // Tables that depend on User
      'NutritionPlan',
      
      // Tables that depend on NutritionPlan
      'NutritionDay',
      
      // Tables that depend on NutritionDay
      'NutritionMeal',
      
      // Tables that depend on NutritionMeal
      'NutritionIngredient',
      
      // Tables that depend on User
      'TrainingPlan',
      
      // Tables that depend on TrainingPlan
      'TrainingDay',
      
      // Tables that depend on TrainingDay
      'TrainingExercise',
      
      // Tables that depend on User (optional)
      'Recipe',
      
      // Tables that depend on Recipe
      'RecipeIngredient',
      
      // Tables that depend on User and Recipe (optional)
      'FeedPost',
      
      // AI-related tables
      'AiPromptCache',
      'AiUsage',
      'AiUsageLog',
      'AiContent',
      
      // Stripe and webhook
      'StripeWebhookEvent',
      
      // Gym memberships (depends on Gym and User)
      'GymMembership',
      
      // Tables that depend on User (nullable)
      // Note: Some of these might need to come earlier depending on actual FKs
    ]
    
    // Filter migrationOrder to only include existing models
    const orderedModels = migrationOrder.filter(model => existingModels.includes(model))
    
    // Add any missing models at the end
    for (const model of existingModels) {
      if (!orderedModels.includes(model)) {
        orderedModels.push(model)
      }
    }
    
    console.log(`\n🔄 Migration order: ${orderedModels.join(' -> ')}`)
    
    // Migrate each model
    let totalMigrated = 0
    
    for (const modelName of orderedModels) {
      console.log(`\n📦 Migrating model: ${modelName}`)
      
      try {
        // Get data from local database
        const localData = await localPrisma[modelName as keyof typeof localPrisma].findMany()
        
        if (localData.length === 0) {
          console.log(`   ⏭️  No data to migrate for ${modelName}`)
          continue
        }
        
        console.log(`   📥 Read ${localData.length} records from local database`)
        
        // Clear existing data in Neon (optional - comment out if you want to append)
        try {
          await neonPrisma[modelName as keyof typeof neonPrisma].deleteMany()
          console.log(`   🗑️  Cleared existing data in Neon`)
        } catch (clearError) {
          console.log(`   ⚠️  Could not clear existing data (might be empty): ${clearError.message}`)
        }
        
        // Insert data into Neon database
        // We'll insert in batches to avoid memory issues
        const batchSize = 50
        let insertedCount = 0
        
        for (let i = 0; i < localData.length; i += batchSize) {
          const batch = localData.slice(i, i + batchSize)
          
          try {
            await neonPrisma[modelName as keyof typeof neonPrisma].createMany({
              data: batch,
              skipDuplicates: true, // Skip if unique constraint violation
            })
            insertedCount += batch.length
          } catch (batchError) {
            // If createMany fails, try inserting one by one
            console.log(`   ⚠️  Batch insert failed, trying one-by-one: ${batchError.message}`)
            
            for (const item of batch) {
              try {
                await neonPrisma[modelName as keyof typeof neonPrisma].create({
                  data: item
                })
                insertedCount++
              } catch (itemError) {
                console.log(`      ❌ Failed to insert item: ${itemError.message}`)
                // Continue with other items
              }
            }
          }
        }
        
        console.log(`   ✅ Successfully migrated ${insertedCount}/${localData.length} records`)
        totalMigrated += insertedCount
        
      } catch (modelError) {
        console.log(`   ❌ Failed to migrate model ${modelName}: ${modelError.message}`)
        // Continue with other models
      }
    }
    
    console.log(`\n🎉 Migration completed!`)
    console.log(`   Total records migrated: ${totalMigrated}`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await localPrisma.$disconnect()
    await neonPrisma.$disconnect()
    console.log('🔌 Disconnected from databases')
  }
}

main()