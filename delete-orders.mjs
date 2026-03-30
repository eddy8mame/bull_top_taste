import { createClient } from "@sanity/client"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN, // Requires Editor permissions
  apiVersion: "2024-03-29",
})

async function deleteDocuments() {
  // Target only the mock orders to protect your menu and location data
  const query = '*[_type == "order"]'

  console.log(`Preparing to delete documents matching: ${query}`)

  try {
    // client.delete() allows passing a GROQ query directly for bulk operations
    const result = await client.delete({ query })
    console.log("✅ Deletion successful.")
    console.log("Sanity response:", result)
  } catch (error) {
    console.error("❌ Failed to delete documents:", error.message)
  }
}

deleteDocuments()
