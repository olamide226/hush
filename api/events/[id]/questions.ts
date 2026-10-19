import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runApi, segment } from '../../_lib/vercel.js'

export default function handler(request: VercelRequest, response: VercelResponse) {
  const id = encodeURIComponent(segment(request.query.id))
  return runApi(request, response, `/api/events/${id}/questions`)
}
