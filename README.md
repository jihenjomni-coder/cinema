# CineBook

CineBook is a responsive cinema ticket-booking app built with React, Vite, and a small Express API. It includes movie discovery, cinema and showtime selection, interactive seat selection, payment details, and booking confirmation.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The development command starts both the Vite client and API server; Vite proxies `/api` requests to port 3002.

Create a production build and serve it with the API:

```bash
npm run build
# PowerShell
$env:NODE_ENV="production"; npm start

# Command Prompt
set NODE_ENV=production&& npm start
```

The API runs on port 3002 and exposes `GET /api/health`, `GET /api/catalog`, and `POST /api/bookings`. Bookings are intentionally stored in memory for this prototype. A duplicate seat for the same showtime returns HTTP 409 with an `unavailableSeats` list.

Run the focused backend tests with:

```bash
npm test
```
