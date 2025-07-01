const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { scrapeMonito } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});

app.use('/api/', limiter);

const validateScrapeParams = (req, res, next) => {
    const { fromCountry, toCountry, fromCurrency, toCurrency, amount } = req.body;
    
    const errors = [];
    
    if (fromCountry && !/^[a-zA-Z]{2}$/.test(fromCountry)) {
        errors.push('fromCountry must be a 2-letter country code');
    }
    
    if (toCountry && !/^[a-zA-Z]{2}$/.test(toCountry)) {
        errors.push('toCountry must be a 2-letter country code');
    }
    
    if (fromCurrency && !/^[a-zA-Z]{3}$/.test(fromCurrency)) {
        errors.push('fromCurrency must be a 3-letter currency code');
    }
    
    if (toCurrency && !/^[a-zA-Z]{3}$/.test(toCurrency)) {
        errors.push('toCurrency must be a 3-letter currency code');
    }
    
    if (amount && (isNaN(amount) || amount <= 0)) {
        errors.push('amount must be a positive number');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }
    
    next();
};

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'monito-scraper-api'
    });
});

app.get('/api/docs', (req, res) => {
    res.json({
        title: 'Monito Scraper API',
        version: '1.0.0',
        endpoints: {
            'GET /health': 'Health check endpoint',
            'GET /api/docs': 'This documentation',
            'POST /api/scrape': 'Scrape transfer data from Monito',
            'GET /api/scrape/:fromCountry/:toCountry/:fromCurrency/:toCurrency/:amount': 'Scrape with URL parameters'
        },
        parameters: {
            fromCountry: 'Source country (2-letter code, e.g., "de")',
            toCountry: 'Destination country (2-letter code, e.g., "tn")',
            fromCurrency: 'Source currency (3-letter code, e.g., "eur")',
            toCurrency: 'Destination currency (3-letter code, e.g., "tnd")',
            amount: 'Transfer amount (positive number, e.g., 100)'
        },
        options: {
            headless: 'Run browser in headless mode (default: true)',
            timeout: 'Request timeout in milliseconds (default: 30000)',
            blockResources: 'Block images/CSS/fonts for faster scraping (default: true)'
        }
    });
});

app.post('/api/scrape', validateScrapeParams, async (req, res) => {
    try {
        const {
            fromCountry = 'de',
            toCountry = 'tn',
            fromCurrency = 'eur',
            toCurrency = 'tnd',
            amount = 100,
            options = {}
        } = req.body;

        const result = await scrapeMonito({
            fromCountry: fromCountry.toLowerCase(),
            toCountry: toCountry.toLowerCase(),
            fromCurrency: fromCurrency.toLowerCase(),
            toCurrency: toCurrency.toLowerCase(),
            amount: Number(amount),
            options: {
                headless: options.headless !== false,
                timeout: options.timeout || 30000,
                blockResources: options.blockResources !== false
            }
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.get('/api/scrape/:fromCountry/:toCountry/:fromCurrency/:toCurrency/:amount', async (req, res) => {
    try {
        const { fromCountry, toCountry, fromCurrency, toCurrency, amount } = req.params;
        
        if (!/^[a-zA-Z]{2}$/.test(fromCountry) || !/^[a-zA-Z]{2}$/.test(toCountry)) {
            return res.status(400).json({
                success: false,
                error: 'Country codes must be 2 letters'
            });
        }
        
        if (!/^[a-zA-Z]{3}$/.test(fromCurrency) || !/^[a-zA-Z]{3}$/.test(toCurrency)) {
            return res.status(400).json({
                success: false,
                error: 'Currency codes must be 3 letters'
            });
        }
        
        if (isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be a positive number'
            });
        }

        const result = await scrapeMonito({
            fromCountry: fromCountry.toLowerCase(),
            toCountry: toCountry.toLowerCase(),
            fromCurrency: fromCurrency.toLowerCase(),
            toCurrency: toCurrency.toLowerCase(),
            amount: Number(amount)
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});


if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Monito Scraper API running on port ${PORT}`);
        console.log(`API Documentation: http://localhost:${PORT}/api/docs`);
        console.log(`Health Check: http://localhost:${PORT}/health`);
    });
}

module.exports = app;