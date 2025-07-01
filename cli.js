const { Command } = require('commander');
const { scrapeMonito } = require('./scraper');

const program = new Command();

program
    .name('monito-scraper')
    .description('CLI tool for scraping money transfer data from Monito')
    .version('1.0.0');

program
    .command('scrape')
    .description('Scrape transfer data from Monito')
    .option('--from-country <country>', 'Source country code (2 letters)', 'de')
    .option('--to-country <country>', 'Destination country code (2 letters)', 'tn')
    .option('--from-currency <currency>', 'Source currency code (3 letters)', 'eur')
    .option('--to-currency <currency>', 'Destination currency code (3 letters)', 'tnd')
    .option('--amount <amount>', 'Transfer amount', '100')
    .option('--timeout <timeout>', 'Request timeout in milliseconds', '30000')
    .option('--no-headless', 'Run browser in non-headless mode')
    .option('--no-block-resources', 'Don\'t block images/CSS/fonts')
    .option('--output <file>', 'Output file (JSON format)')
    .option('--pretty', 'Pretty print JSON output')
    .action(async (options) => {
        try {
            // Validate inputs
            if (!/^[a-zA-Z]{2}$/.test(options.fromCountry)) {
                throw new Error('From country must be a 2-letter code');
            }
            if (!/^[a-zA-Z]{2}$/.test(options.toCountry)) {
                throw new Error('To country must be a 2-letter code');
            }
            if (!/^[a-zA-Z]{3}$/.test(options.fromCurrency)) {
                throw new Error('From currency must be a 3-letter code');
            }
            if (!/^[a-zA-Z]{3}$/.test(options.toCurrency)) {
                throw new Error('To currency must be a 3-letter code');
            }
            if (isNaN(options.amount) || Number(options.amount) <= 0) {
                throw new Error('Amount must be a positive number');
            }

            console.log('Initializing scraper...');
            console.log('Scraping Monito data...');
            
            const result = await scrapeMonito({
                fromCountry: options.fromCountry.toLowerCase(),
                toCountry: options.toCountry.toLowerCase(),
                fromCurrency: options.fromCurrency.toLowerCase(),
                toCurrency: options.toCurrency.toLowerCase(),
                amount: Number(options.amount),
                options: {
                    headless: options.headless,
                    timeout: Number(options.timeout),
                    blockResources: options.blockResources
                }
            });

            if (result.success) {
                console.log('Scraping completed successfully!');
                console.log(`ound ${result.totalProviders} providers`);
                
                if (options.output) {
                    const fs = require('fs');
                    const outputData = options.pretty ? 
                        JSON.stringify(result, null, 2) : 
                        JSON.stringify(result);
                    
                    fs.writeFileSync(options.output, outputData);
                    console.log(`Results saved to ${options.output}`);
                } else {
                    const outputData = options.pretty ? 
                        JSON.stringify(result, null, 2) : 
                        JSON.stringify(result);
                    console.log(outputData);
                }
            } else {
                console.log('Scraping failed:');
                console.log(result.error);
                process.exit(1);
            }
        } catch (error) {
            console.log('Error:', error.message);
            process.exit(1);
        }
    });


program.on('command:*', () => {
    console.log('❌ Unknown command. Use --help for available commands.');
    process.exit(1);
});

if (require.main === module) {
    program.parse();
}

module.exports = program;