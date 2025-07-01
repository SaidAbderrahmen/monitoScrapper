WEB
bash# Install and start
npm install
npm start
The API runs on port 3000. Main endpoints:

GET /health - check if it's running
POST /api/scrape - scrape with JSON in the body
GET /api/scrape/de/tn/eur/tnd/100 - scrape with URL parameters

Example request:
bashcurl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "fromCountry": "de",
    "toCountry": "tn",
    "fromCurrency": "eur", 
    "toCurrency": "tnd",
    "amount": 100
  }'
CLI
bash# 

node cli.js scrape -f de -t tn -fc eur -tc tnd -a 500

# Save to file
node cli.js scrape -o results.json --pretty
Docker deployment
bashdocker-compose up --build
That's it. The Docker setup includes Chrome and handles all the Puppeteer dependencies.
Parameters

fromCountry/toCountry: 2-letter country codes (us, de, mx, etc.)
fromCurrency/toCurrency: 3-letter currency codes (usd, eur, mxn, etc.)
amount: number (100, 500, 1000, etc.)

Response format
json{
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
Notes

Uses headless Chrome via Puppeteer
Blocks images/CSS for faster scraping
Has rate limiting (100 requests per 15 minutes)

