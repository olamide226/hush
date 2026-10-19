import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runApi } from '../_lib/vercel.js'

export default function handler(request: VercelRequest, response: VercelResponse) {
  return runApi(request, response, '/api/events')
}
