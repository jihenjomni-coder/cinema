import { randomUUID } from 'node:crypto'

const movies = [
  {
    id: 'night-operator',
    title: 'Night Operator',
    genre: 'Mystery / Drama',
    duration: '2h 08m',
    rating: '8.7',
    age: '16+',
    accent: 'navy',
    art: 'NO',
    description: 'A late-night radio host receives a call that makes tomorrow feel dangerously close.',
  },
  {
    id: 'paper-moons',
    title: 'Paper Moons',
    genre: 'Romance / Indie',
    duration: '1h 52m',
    rating: '8.2',
    age: '12+',
    accent: 'coral',
    art: 'PM',
    description: 'Two strangers trade unfinished stories across a city that never quite sleeps.',
  },
  {
    id: 'wild-current',
    title: 'Wild Current',
    genre: 'Adventure / Documentary',
    duration: '1h 46m',
    rating: '9.1',
    age: 'PG',
    accent: 'teal',
    art: 'WC',
    description: 'A beautiful, bracing journey through the last untouched rivers of the north.',
  },
]

const cinemas = [
  { id: 'grand-avenue', name: 'CineBook Grand Avenue', area: 'Downtown', distance: '0.8 mi', formats: ['IMAX', 'Dolby Atmos'] },
  { id: 'riverside', name: 'CineBook Riverside', area: 'River District', distance: '2.1 mi', formats: ['Laser', 'Recliner'] },
  { id: 'north-loop', name: 'CineBook North Loop', area: 'North Loop', distance: '3.7 mi', formats: ['4DX', 'Dolby Atmos'] },
]

const days = [
  { day: 'Today', date: '16 Sep' },
  { day: 'Thu', date: '17 Sep' },
  { day: 'Fri', date: '18 Sep' },
  { day: 'Sat', date: '19 Sep' },
]

const showtimes = days.flatMap((_day, dayIndex) => ['10:20 AM', '1:05 PM', '4:40 PM', '7:15 PM', '9:50 PM'].flatMap((time, timeIndex) =>
  cinemas.flatMap((cinema) => movies.map((movie) => ({
    id: `${movie.id}-${cinema.id}-${dayIndex}-${timeIndex}`,
    movieId: movie.id,
    cinemaId: cinema.id,
    dayIndex,
    time,
  }))),
))

const bookedSeats = new Map()
for (const showtime of showtimes) {
  bookedSeats.set(showtime.id, new Set(showtime.id.includes('-0-3')
    ? ['A4', 'A5', 'B7', 'B8', 'C2', 'C3', 'C4', 'D8', 'E6', 'E7', 'F1', 'F2', 'F3', 'G9']
    : ['A4', 'A5', 'B7', 'B8']))
}

const customers = new Map()
const bookings = new Map()
const validSeats = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G'].flatMap((row) => Array.from({ length: 10 }, (_, index) => `${row}${index + 1}`)))

export function getCatalog() {
  return {
    movies,
    cinemas,
    days,
    showtimes,
    seats: {
      rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      seatsPerRow: 10,
    },
    bookedSeats: Object.fromEntries([...bookedSeats].map(([id, seats]) => [id, [...seats]])),
  }
}

export function createBooking({ movieId, cinemaId, showtimeId, seats, email, card }) {
  const showtime = showtimes.find((item) => item.id === showtimeId)
  const selectedMovie = movies.find((item) => item.id === movieId)
  const selectedCinema = cinemas.find((item) => item.id === cinemaId)
  if (!selectedMovie || !selectedCinema || !showtime || showtime.movieId !== movieId || showtime.cinemaId !== cinemaId) {
    return { error: 'The selected movie, cinema, or showtime is invalid.', status: 400 }
  }

  const normalizedSeats = [...new Set(seats)]
  if (normalizedSeats.length > 8 || normalizedSeats.some((seat) => !validSeats.has(seat))) {
    return { error: 'Select up to 8 valid seats.', status: 400 }
  }
  const unavailable = bookedSeats.get(showtimeId) || new Set()
  const unavailableSeats = normalizedSeats.filter((seat) => unavailable.has(seat))
  if (unavailableSeats.length > 0) {
    return { error: 'One or more selected seats are no longer available.', unavailableSeats, status: 409 }
  }

  normalizedSeats.forEach((seat) => unavailable.add(seat))
  const customerId = email.toLowerCase()
  customers.set(customerId, { id: customerId, email, cardLast4: card.replace(/\D/g, '').slice(-4) })
  const reference = `CB-${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
  const booking = { reference, movieId, cinemaId, showtimeId, seats: normalizedSeats, customerId, total: normalizedSeats.length * 16.5 }
  bookings.set(reference, booking)
  return { booking, status: 201 }
}

export function resetStores() {
  for (const showtime of showtimes) {
    bookedSeats.set(showtime.id, new Set(showtime.id.includes('-0-3')
      ? ['A4', 'A5', 'B7', 'B8', 'C2', 'C3', 'C4', 'D8', 'E6', 'E7', 'F1', 'F2', 'F3', 'G9']
      : ['A4', 'A5', 'B7', 'B8']))
  }
  customers.clear()
  bookings.clear()
}
