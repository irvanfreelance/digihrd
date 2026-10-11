import { neon } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'

// Membaca env jika dijalankan standalone via node
if (!process.env.DATABASE_URL) {
  try {
    const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of envFile.split('\n')) {
      const match = line.match(/^DATABASE_URL=(.*)$/)
      if (match) {
        process.env.DATABASE_URL = match[1].trim()
      }
    }
  } catch (err) {
    // ignore
  }
}

export const sql = neon(process.env.DATABASE_URL!)
