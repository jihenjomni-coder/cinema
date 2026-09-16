import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import app from './index.js'
import { getCatalog, resetStores } from './data.js'

let server
let baseUrl

test.before(async () => {
  server = createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

test.beforeEach(() => resetStores())

test('health and catalog endpoints return the inventory', async () => {
  const health = await fetch(`${baseUrl}/api/health`)
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { status: 'ok' })

  const response = await fetch(`${baseUrl}/api/catalog`)
  const catalog = await response.json()
  assert.equal(response.status, 200)
  assert.equal(catalog.movies.length, 3)
  assert.ok(catalog.showtimes.length > 0)
  assert.deepEqual(catalog.seats.rows, ['A', 'B', 'C', 'D', 'E', 'F', 'G'])
})

test('rejects a duplicate seat for the same showtime', async () => {
  const catalog = getCatalog()
  const showtime = catalog.showtimes[0]
  const payload = {
    movieId: showtime.movieId,
    cinemaId: showtime.cinemaId,
    showtimeId: showtime.id,
    seats: ['A1'],
    customer: { email: 'first@example.com', card: '4242 4242 4242 4242' },
  }

  const first = await fetch(`${baseUrl}/api/bookings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
  const firstBooking = await first.json()
  assert.equal(first.status, 201)
  assert.match(firstBooking.reference, /^CB-[A-Z0-9]{8}$/)

  const second = await fetch(`${baseUrl}/api/bookings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...payload, customer: { email: 'second@example.com', card: '4000 0000 0000 0002' } }) })
  const secondBooking = await second.json()
  assert.equal(second.status, 409)
  assert.equal(secondBooking.error, 'One or more selected seats are no longer available.')
  assert.deepEqual(secondBooking.unavailableSeats, ['A1'])
})

test('returns the selected seats and ticket total for a valid booking', async () => {
  const showtime = getCatalog().showtimes[0]
  const response = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      movieId: showtime.movieId,
      cinemaId: showtime.cinemaId,
      showtimeId: showtime.id,
      seats: ['C1', 'C2'],
      customer: { email: 'tickets@example.com', card: '4242 4242 4242 4242' },
    }),
  })
  const booking = await response.json()
  assert.equal(response.status, 201)
  assert.deepEqual(booking.seats, ['C1', 'C2'])
  assert.equal(booking.total, 33)
})

test('rejects seats outside the catalog seat map', async () => {
  const showtime = getCatalog().showtimes[0]
  const response = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      movieId: showtime.movieId,
      cinemaId: showtime.cinemaId,
      showtimeId: showtime.id,
      seats: ['Z99'],
      customer: { email: 'invalid@example.com', card: '4242 4242 4242 4242' },
    }),
  })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: 'Select up to 8 valid seats.' })
})
