import 'dotenv/config'
import { handleLookupRequest } from '../lib/lookup.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const result = await handleLookupRequest(req.body)
  res.status(result.status).json(result.body)
}
