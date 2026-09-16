import { useEffect, useMemo, useState } from 'react'

function App() {
  const [catalog, setCatalog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [step, setStep] = useState(1)
  const [movieId, setMovieId] = useState('')
  const [cinemaId, setCinemaId] = useState('')
  const [dayIndex, setDayIndex] = useState(0)
  const [showtimeId, setShowtimeId] = useState('')
  const [selectedSeats, setSelectedSeats] = useState([])
  const [email, setEmail] = useState('alex@example.com')
  const [card, setCard] = useState('4242 4242 4242 4242')
  const [bookingRef, setBookingRef] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/catalog')
      .then((response) => {
        if (!response.ok) throw new Error('Catalog could not be loaded.')
        return response.json()
      })
      .then((data) => {
        setCatalog(data)
        setMovieId(data.movies[0].id)
        setCinemaId(data.cinemas[0].id)
        setShowtimeId(data.showtimes.find((item) => item.movieId === data.movies[0].id && item.cinemaId === data.cinemas[0].id && item.dayIndex === 0 && item.time === '7:15 PM')?.id || data.showtimes[0].id)
      })
      .catch((error) => setApiError(error.message))
      .finally(() => setLoading(false))
  }, [])

  const movie = catalog?.movies.find((item) => item.id === movieId)
  const cinema = catalog?.cinemas.find((item) => item.id === cinemaId)
  const selectedShowtime = catalog?.showtimes.find((item) => item.id === showtimeId)
  const showtime = selectedShowtime?.time || ''
  const total = selectedSeats.length * 16.5
  const formattedTotal = `$${total.toFixed(2)}`
  const canContinue = step === 1 ? Boolean(movieId) : step === 2 ? Boolean(showtime) : step === 3 ? selectedSeats.length > 0 : email && card.replace(/\s/g, '').length >= 12

  const seatsLabel = useMemo(() => selectedSeats.length === 1 ? '1 ticket' : `${selectedSeats.length} tickets`, [selectedSeats.length])

  async function continueFlow() {
    if (!canContinue) return
    if (step === 4) {
      setSubmitting(true)
      setApiError('')
      try {
        const response = await fetch('/api/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ movieId, cinemaId, showtimeId, seats: selectedSeats, customer: { email, card } }) })
        const result = await response.json()
        if (!response.ok) {
          if (result.unavailableSeats) setSelectedSeats((current) => current.filter((seat) => !result.unavailableSeats.includes(seat)))
          if (response.status === 409) setStep(3)
          throw new Error(result.error || 'Booking could not be completed.')
        }
        setBookingRef(result.reference)
        setStep(5)
      } catch (error) {
        setApiError(error.message)
      } finally {
        setSubmitting(false)
      }
      return
    }
    setStep((current) => current + 1)
  }

  function toggleSeat(seat) {
    if (catalog.bookedSeats[showtimeId]?.includes(seat)) return
    setSelectedSeats((current) => current.includes(seat) ? current.filter((item) => item !== seat) : [...current, seat])
  }

  function startOver() {
    setStep(1)
    setSelectedSeats([])
    setBookingRef('')
    setApiError('')
  }

  function selectMovie(nextMovieId) {
    setMovieId(nextMovieId)
    setSelectedSeats([])
    setShowtimeId(findShowtime(catalog.showtimes, nextMovieId, cinemaId, dayIndex)?.id || '')
  }

  function selectCinema(nextCinemaId) {
    setCinemaId(nextCinemaId)
    setSelectedSeats([])
    setShowtimeId(findShowtime(catalog.showtimes, movieId, nextCinemaId, dayIndex)?.id || '')
  }

  function selectDay(nextDayIndex) {
    setDayIndex(nextDayIndex)
    setSelectedSeats([])
    setShowtimeId(findShowtime(catalog.showtimes, movieId, cinemaId, nextDayIndex)?.id || '')
  }

  function selectShowtime(nextShowtimeId) {
    if (nextShowtimeId !== showtimeId) setSelectedSeats([])
    setShowtimeId(nextShowtimeId)
  }

  if (loading) return <div className="app-shell"><header className="site-header"><span className="brand"><span className="brand-mark">CB</span><span>CineBook</span></span></header><main className="page-content"><p className="eyebrow">CineBook</p><h1>Loading tonight's films.</h1></main></div>
  if (apiError && !catalog) return <div className="app-shell"><header className="site-header"><span className="brand"><span className="brand-mark">CB</span><span>CineBook</span></span></header><main className="page-content"><p className="eyebrow">CineBook</p><h1>We could not load the cinema.</h1><p className="helper-text">{apiError}</p></main></div>

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="CineBook home" onClick={startOver}>
          <span className="brand-mark">CB</span>
          <span>CineBook</span>
        </a>
        <div className="header-tools">
          <span className="location"><span className="pin">+</span> New York, NY</span>
          <button className="account-button" type="button" aria-label="Open account"><span className="account-icon">A</span> Alex</button>
        </div>
      </header>

      <main id="top" className="page-content">
        <div className="intro-row">
          <div>
            <p className="eyebrow">Your night at the movies</p>
            <h1>{step === 5 ? 'You are all set.' : 'Find your next favorite film.'}</h1>
          </div>
          {step < 5 && <div className="order-note"><span className="secure-dot" /> No booking fees. Secure checkout.</div>}
        </div>

        {step < 5 && <nav className="stepper" aria-label="Booking progress">
          {['Movie', 'Cinema & time', 'Seats', 'Payment'].map((label, index) => {
            const number = index + 1
            return <button className={`step-item ${step === number ? 'current' : ''} ${step > number ? 'done' : ''}`} key={label} type="button" onClick={() => step > number && setStep(number)} disabled={step <= number}>
              <span className="step-number">{step > number ? 'OK' : `0${number}`}</span><span>{label}</span>
            </button>
          })}
        </nav>}

        {step === 1 && <MovieStep movies={catalog.movies} movieId={movieId} setMovieId={selectMovie} />}
        {step === 2 && <ShowtimeStep cinemas={catalog.cinemas} days={catalog.days} showtimes={catalog.showtimes} movieId={movieId} cinemaId={cinemaId} setCinemaId={selectCinema} dayIndex={dayIndex} setDayIndex={selectDay} showtimeId={showtimeId} setShowtimeId={selectShowtime} />}
        {step === 3 && <SeatStep rows={catalog.seats.rows} seatsPerRow={catalog.seats.seatsPerRow} bookedSeats={new Set(catalog.bookedSeats[showtimeId] || [])} selectedSeats={selectedSeats} toggleSeat={toggleSeat} />}
        {step === 4 && <PaymentStep email={email} setEmail={setEmail} card={card} setCard={setCard} movie={movie} cinema={cinema} showtime={showtime} seatsLabel={seatsLabel} formattedTotal={formattedTotal} />}
        {step === 5 && <Confirmation movie={movie} cinema={cinema} showtime={showtime} selectedSeats={selectedSeats} bookingRef={bookingRef} startOver={startOver} />}

        {step < 5 && <div className="bottom-bar">
          <div className="selection-summary">
            <div className="summary-art">{movie.art}</div>
            <div><span className="summary-kicker">{step === 1 ? 'Your selection' : movie.title}</span><strong>{step === 1 ? 'Choose a movie to begin' : `${movie.title} · ${seatsLabel}`}</strong></div>
          </div>
          <div className="bottom-action"><span className="price">{step >= 3 ? formattedTotal : 'From $16.50'}</span><button className="primary-button" type="button" disabled={!canContinue || submitting} onClick={continueFlow}>{submitting ? 'Processing...' : step === 4 ? 'Pay & confirm' : 'Continue'} <span>→</span></button></div>
          {apiError && <p className="api-error" role="alert">{apiError}</p>}
        </div>}
      </main>
    </div>
  )
}

function findShowtime(showtimes, movieId, cinemaId, dayIndex) {
  return showtimes.find((item) => item.movieId === movieId && item.cinemaId === cinemaId && Number(item.dayIndex) === Number(dayIndex))
}

function MovieStep({ movies, movieId, setMovieId }) {
  return <section className="step-section">
    <div className="section-heading"><div><span className="section-index">01</span><h2>What are we seeing?</h2></div><span className="helper-text">Showing in New York · Tonight</span></div>
    <div className="movie-grid">{movies.map((movie) => <button key={movie.id} type="button" className={`movie-card ${movieId === movie.id ? 'selected' : ''}`} onClick={() => setMovieId(movie.id)}>
      <div className={`poster ${movie.accent}`}><span className="poster-word">{movie.art}</span><span className="poster-caption">A CineBook original</span><span className="poster-rings" /></div>
      <div className="movie-copy"><div><h3>{movie.title}</h3><span className="movie-meta">{movie.genre} · {movie.duration}</span></div><span className="rating">★ {movie.rating}</span></div>
      <p>{movie.description}</p><span className={`radio ${movieId === movie.id ? 'checked' : ''}`} aria-hidden="true" />
    </button>)}</div>
  </section>
}

function ShowtimeStep({ cinemas, days, showtimes, movieId, cinemaId, setCinemaId, dayIndex, setDayIndex, showtimeId, setShowtimeId }) {
  const availableShowtimes = showtimes.filter((item) => item.movieId === movieId && item.cinemaId === cinemaId && Number(item.dayIndex) === Number(dayIndex))
  return <section className="step-section">
    <div className="section-heading"><div><span className="section-index">02</span><h2>Pick a place and time.</h2></div><span className="helper-text">All times shown in local time</span></div>
    <div className="date-picker">{days.map((item, index) => <button key={item.date} type="button" className={dayIndex === index ? 'active' : ''} onClick={() => setDayIndex(index)}><span>{item.day}</span><strong>{item.date}</strong></button>)}</div>
    <div className="cinema-list">{cinemas.map((cinema) => <button key={cinema.id} type="button" className={`cinema-row ${cinemaId === cinema.id ? 'selected' : ''}`} onClick={() => setCinemaId(cinema.id)}><span className="cinema-icon">CB</span><span className="cinema-details"><strong>{cinema.name}</strong><small>{cinema.area} · {cinema.distance} away</small></span><span className="format-tags">{cinema.formats.map((format) => <em key={format}>{format}</em>)}</span><span className="radio" /></button>)}</div>
    <div className="time-block"><div className="subheading"><h3>Showtimes</h3><span>Tap a time to select</span></div><div className="time-grid">{availableShowtimes.map((item) => <button key={item.id} type="button" className={showtimeId === item.id ? 'active' : ''} onClick={() => setShowtimeId(item.id)}>{item.time}<small>Standard</small></button>)}</div></div>
  </section>
}

function SeatStep({ rows, seatsPerRow, bookedSeats, selectedSeats, toggleSeat }) {
  return <section className="step-section seat-section">
    <div className="section-heading"><div><span className="section-index">03</span><h2>Make it your row.</h2></div><span className="helper-text">Select up to 8 seats</span></div>
    <div className="screen-label"><span /> Screen <span /></div>
    <div className="seat-map" aria-label="Cinema seat map">{rows.map((row) => <div className="seat-row" key={row}><span className="row-label">{row}</span>{Array.from({ length: seatsPerRow }, (_, index) => { const seat = `${row}${index + 1}`; const unavailable = bookedSeats.has(seat); return <button key={seat} type="button" aria-label={`${seat} ${unavailable ? 'booked' : selectedSeats.includes(seat) ? 'selected' : 'available'}`} disabled={unavailable} className={`seat ${unavailable ? 'booked' : ''} ${selectedSeats.includes(seat) ? 'selected' : ''}`} onClick={() => toggleSeat(seat)}>{index + 1}</button> })}<span className="row-label">{row}</span></div>)}</div>
    <div className="seat-legend"><span><i className="available" /> Available</span><span><i className="selected-seat" /> Selected</span><span><i className="booked-seat" /> Booked</span></div>
  </section>
}

function PaymentStep({ email, setEmail, card, setCard, movie, cinema, showtime, seatsLabel, formattedTotal }) {
  return <section className="step-section payment-section">
    <div className="section-heading"><div><span className="section-index">04</span><h2>Almost at the previews.</h2></div><span className="helper-text"><span className="lock">+</span> Encrypted checkout</span></div>
    <div className="payment-layout"><form className="payment-form" onSubmit={(event) => event.preventDefault()}><label>Email for your tickets<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Card details<div className="input-with-icon"><input value={card} onChange={(event) => setCard(event.target.value)} inputMode="numeric" /><span>VISA</span></div></label><div className="form-row"><label>Expiry<input placeholder="MM / YY" /></label><label>CVC<input placeholder="123" /></label></div><label className="check-label"><input type="checkbox" defaultChecked /> <span>Save payment method for next time</span></label></form><aside className="order-card"><span className="summary-kicker">Order summary</span><div className="order-film"><div className={`mini-poster ${movie.accent}`}>{movie.art}</div><div><strong>{movie.title}</strong><span>{cinema.name}</span><span>{showtime} · {seatsLabel}</span></div></div><div className="line-item"><span>Tickets</span><strong>{formattedTotal}</strong></div><div className="line-item"><span>Booking fee</span><strong>$0.00</strong></div><div className="total-line"><span>Total</span><strong>{formattedTotal}</strong></div></aside></div>
  </section>
}

function Confirmation({ movie, cinema, showtime, selectedSeats, bookingRef, startOver }) {
  return <section className="confirmation"><div className="confirmation-mark">OK</div><p className="eyebrow">Booking confirmed</p><h2>Lights down.<br /><em>Enjoy the show.</em></h2><p className="confirmation-copy">Your tickets are on their way to your inbox. We cannot wait to see you there.</p><div className="ticket"><div className={`ticket-poster ${movie.accent}`}>{movie.art}</div><div className="ticket-info"><span className="summary-kicker">Your movie</span><h3>{movie.title}</h3><p>{cinema.name}<br />{showtime} · Seats {selectedSeats.join(', ')}</p><div className="ticket-reference"><span>Booking reference</span><strong>{bookingRef}</strong></div></div><div className="ticket-stub"><span>DATE</span><strong>16<br />SEP</strong></div></div><button type="button" className="text-button" onClick={startOver}>Book another movie <span>→</span></button></section>
}

export default App
