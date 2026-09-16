import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createBooking, getCatalog } from './data.js'

const app = express()
const port = process.env.PORT || 3002
const currentDir = path.dirname(fileURLToPath(import.meta.url))

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.get('/api/catalog', (_request, response) => {
  response.json(getCatalog())
})

app.post('/api/bookings', (request, response) => {
  const { movieId, cinemaId, showtimeId, seats, customer } = request.body
  if (!movieId || !cinemaId || !showtimeId || !Array.isArray(seats) || seats.length === 0 || !customer?.email || !customer?.card) {
    return response.status(400).json({ error: 'movieId, cinemaId, showtimeId, seats, customer email, and card are required.' })
  }

  const result = createBooking({ movieId, cinemaId, showtimeId, seats, email: customer.email, card: customer.card })
  if (result.error) {
    return response.status(result.status).json({ error: result.error, ...(result.unavailableSeats ? { unavailableSeats: result.unavailableSeats } : {}) })
  }
  return response.status(result.status).json(result.booking)
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(currentDir, '..', 'dist')))
  app.get(/.*/, (_request, response) => response.sendFile(path.join(currentDir, '..', 'dist', 'index.html')))
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  app.listen(port, () => console.log(`CineBook API listening on http://localhost:${port}`))
  process.stdin.resume()
}

export default app
