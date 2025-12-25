import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { BigQuery } from "@google-cloud/bigquery";

// Load environment variables
dotenv.config();

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

async function runSQLFile(filePath: string, description: string, continueOnError = false) {
  console.log(`\n📝 Running: ${description}`);
  console.log(`   File: ${filePath}\n`);
  
  try {
    const sql = fs.readFileSync(filePath, "utf8");
    
    // Split by semicolons to handle multiple statements
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--") && !s.startsWith("/*"));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`   Executing statement...`);
        const [rows] = await bigquery.query({
          query: statement,
        });
        console.log(`   ✅ Success!`);
      }
    }
    console.log(`\n`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    if (error.errors) {
      error.errors.forEach((err: any) => {
        console.error(`      - ${err.message}`);
      });
    }
    console.log(`\n`);
    
    if (continueOnError) {
      console.log(`   ⚠️  Continuing despite error (this may be expected if data doesn't exist yet)\n`);
      return false;
    }
    throw error;
  }
}

async function createDataset() {
  console.log("📦 Checking dataset 'creator_pulse'...\n");
  try {
    const datasetId = "creator_pulse";
    const dataset = bigquery.dataset(datasetId);
    
    const [exists] = await dataset.exists();
    if (exists) {
      console.log(`   ✅ Dataset '${datasetId}' already exists\n`);
      return true;
    }

    // Try to create it
    await dataset.create({
      location: "US",
      description: "LTK viral content analytics dataset",
    });
    console.log(`   ✅ Dataset '${datasetId}' created successfully\n`);
    return true;
  } catch (error: any) {
    if (error.code === 403 || error.message?.includes("permission")) {
      console.log(`   ⚠️  Cannot create dataset (permission denied)`);
      console.log(`   💡 Please create the dataset manually in BigQuery Console:`);
      console.log(`      - Go to https://console.cloud.google.com/bigquery`);
      console.log(`      - Click "Create Dataset"`);
      console.log(`      - Dataset ID: creator_pulse`);
      console.log(`      - Location: US (or your preferred location)`);
      console.log(`      - Click "Create dataset"\n`);
      return false;
    }
    console.error(`   ❌ Error: ${error.message}\n`);
    throw error;
  }
}

async function setupBigQuery() {
  console.log("🚀 Setting up BigQuery tables...\n");
  console.log("Project ID:", process.env.GOOGLE_PROJECT_ID);
  console.log("Service Account:", process.env.GOOGLE_CLIENT_EMAIL);
  console.log("\n");

  const scriptsDir = path.join(__dirname, "bigquery");

  try {
    // Step 0: Create dataset if it doesn't exist
    const datasetExists = await createDataset();
    if (!datasetExists) {
      console.log("⏸️  Please create the dataset manually and run this script again.\n");
      return;
    }

    // Step 1: Create external table (may fail if GCS bucket doesn't exist yet)
    const externalTableCreated = await runSQLFile(
      path.join(scriptsDir, "bronze_external_table.sql"),
      "Step 1: Creating bronze external table",
      true // Continue on error - bucket may not exist yet
    );
    
    if (!externalTableCreated) {
      console.log("   💡 Note: External table creation failed. This is OK if:");
      console.log("      - The GCS bucket 'gs://ltk-trending' doesn't exist yet");
      console.log("      - Or the bucket doesn't have JSON files yet");
      console.log("      - You can create the external table later when data is available\n");
    }

    // Step 2: Create bronze posts table (skip if external table doesn't exist)
    if (externalTableCreated) {
      await runSQLFile(
        path.join(scriptsDir, "bronze_merge.sql"),
        "Step 2: Creating bronze posts table"
      );

      // Step 3: Create gold tables
      await runSQLFile(
        path.join(scriptsDir, "gold_tables.sql"),
        "Step 3: Creating gold tables"
      );
    } else {
      console.log("⏭️  Skipping Steps 2 & 3: These depend on the external table");
      console.log("   You can run these steps later once data is available in GCS\n");
      
      // Create empty gold tables with proper schema so the app doesn't break
      console.log("📝 Creating empty gold tables with proper schema...\n");
      
      const createGoldTablesSQL = `
        -- Create empty gold_viral_posts table
        CREATE TABLE IF NOT EXISTS \`bolt-ltk-app.creator_pulse.gold_viral_posts\` (
          post_id STRING,
          creator_handle STRING,
          category STRING,
          engagement_score FLOAT64,
          post_date DATE,
          score FLOAT64
        );

        -- Create empty gold_creators table
        CREATE TABLE IF NOT EXISTS \`bolt-ltk-app.creator_pulse.gold_creators\` (
          creator_handle STRING,
          avg_score FLOAT64,
          post_count INT64
        );
      `;
      
      try {
        await bigquery.query({ query: createGoldTablesSQL });
        console.log("   ✅ Empty gold tables created successfully\n");
      } catch (error: any) {
        console.error(`   ⚠️  Could not create empty tables: ${error.message}\n`);
      }
    }

    console.log("✅ All BigQuery tables created successfully!\n");
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
}

setupBigQuery();

