# Monito Scraper

A Node.js scraper using Puppeteer to fetch and compare money transfer providers via Monito.

---

## Quick Setup

```bash
# Install dependencies and start API
npm install
npm start
```

The API runs on port `3000`.

---

##  Main Endpoints

* `GET /health`
  Check if the service is running.

* `POST /api/scrape`
  Scrape with JSON body parameters.

* `GET /api/scrape/de/tn/eur/tnd/100`
  Scrape using URL parameters.

**Example request:**

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "fromCountry": "de",
    "toCountry": "tn",
    "fromCurrency": "eur",
    "toCurrency": "tnd",
    "amount": 100
  }'
```

---

##  CLI

```bash
node cli.js scrape --from-country de -to-country tn --from-currency eur --to-currency tnd --amount 500

# Save output to file
node cli.js scrape -o results.json --pretty
```

---

##  Docker Deployment

```bash
docker-compose up --build
```

Includes Chrome and handles Puppeteer dependencies.

---

##  Parameters

* `fromCountry`, `toCountry`: 2‑letter country codes (e.g. `us`, `de`, `mx`)
* `fromCurrency`, `toCurrency`: 3‑letter currency codes (e.g. `usd`, `eur`, `mxn`)
* `amount`: number (e.g. `100`, `500`, `1000`)

---

##  Response Format

```json
{
  "success": true,
  "transfer": {
    "from": "DE",
    "to": "TN",
    "fromCurrency": "EUR",
    "toCurrency": "TND",
    "amount": 100
  },
  "providers": [
    {
      "id": 1,
      "name": "Remitly",
      "monitoScore": 9.1,
      "transferTime": "Within minutes",
      "bestDeal": false,
      "promotional": {
        "fee": 0,
        "exchangeRate": 3.45,
        "recipientGets": 345
      },
      "regular": {
        "fee": 2.99,
        "exchangeRate": 3.42,
        "recipientGets": 342
      }
    }
  ],
  "totalProviders": 12,
  "scrapedAt": "2025-07-01T10:30:00.000Z"
}
```

---

##  Notes

* Uses headless Chrome via Puppeteer
* Blocks images/CSS for faster scraping
* Rate limiting: 100 requests per 15 minutes
