const puppeteer = require('puppeteer');

class MonitoScraper {
    constructor(options = {}) {
        this.browser = null;
        this.page = null;
        this.options = {
            headless: options.headless !== false,
            timeout: options.timeout || 30000,
            blockResources: options.blockResources !== false,
            ...options
        };
    }

    async init() {
        const launchOptions = {
            headless: this.options.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-dev-shm-usage',
                '--memory-pressure-off'
            ]
        };

        if (this.options.blockResources) {
            launchOptions.args.push(
                '--disable-images',
                '--disable-plugins',
                '--disable-extensions',
                '--no-first-run',
                '--disable-background-networking'
            );
        }

        this.browser = await puppeteer.launch(launchOptions);
        this.page = await this.browser.newPage();
        
        if (this.options.blockResources) {
            await this.page.setRequestInterception(true);
            this.page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
                    req.abort();
                } else {
                    req.continue();
                }
            });
        }

        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await this.page.setViewport({ width: 1366, height: 768 });
        await this.page.setDefaultNavigationTimeout(this.options.timeout);
        await this.page.setDefaultTimeout(this.options.timeout / 2);
    }

    async scrapeTransferData(params = {}) {
        const {
            fromCountry = 'de',
            toCountry = 'tn',
            fromCurrency = 'eur',
            toCurrency = 'tnd',
            amount = 100
        } = params;

        try {
            const url = `https://www.monito.com/en/compare/transfer/${fromCountry}/${toCountry}/${fromCurrency}/${toCurrency}/${amount}`;
            
            await this.page.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: this.options.timeout 
            });
            
            await this.page.waitForSelector('#cash-tab', { timeout: this.options.timeout / 2 });
            await this.page.waitForSelector('li[data-v-798eb8c7]', { timeout: this.options.timeout / 2 });
            
            await this.page.evaluate(() => {
                const detailButtons = document.querySelectorAll('button[data-v-3a2e731a][title="Details"]');
                detailButtons.forEach(button => {
                    try {
                        button.click();
                    } catch (e) {
                        console.log('Failed to click button:', e.message);
                    }
                });
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            const providers = await this.page.evaluate(() => {
                const extractedData = [];
                const providerElements = document.querySelectorAll('#cash-tab li[data-v-798eb8c7]');

                providerElements.forEach((element, index) => {
                    if (element.querySelector('img[src*="simple-app-mobile"]')) return;

                    const provider = { id: index + 1 };

                    const logoImg = element.querySelector('img[alt]:not([src*="simple-app-mobile"])');
                    if (logoImg) {
                        provider.name = logoImg.alt.trim();
                        provider.logo = logoImg.src;
                    }

                    const bestDeal = element.querySelector('.bg-green-800');
                    provider.bestDeal = !!bestDeal;

                    const scoreElement = element.querySelector('strong[data-v-e3dd9688]');
                    if (scoreElement) {
                        const scoreText = scoreElement.textContent.trim();
                        provider.monitoScore = parseFloat(scoreText) || 0;
                    }

                    const transferTimeEl = element.querySelector('.font-semibold.text-16, .font-semibold.text-18');
                    if (transferTimeEl && !transferTimeEl.textContent.includes('TND') && !transferTimeEl.textContent.includes('EUR')) {
                        provider.transferTime = transferTimeEl.textContent.trim();
                    }

                    const promoFeeEl = element.querySelector('.text-gray-500 strong');
                    if (promoFeeEl && promoFeeEl.textContent.includes('EUR')) {
                        const feeText = promoFeeEl.textContent.trim();
                        provider.promotionalFee = feeText.toUpperCase() === 'FREE' ? 0 : parseFloat(feeText.replace(/[^\d.-]/g, '')) || 0;
                    } else if (element.textContent.includes('FREE') || element.textContent.includes('Free')) {
                        provider.promotionalFee = 0;
                    }

                    const promoRateElements = element.querySelectorAll('.text-gray-700 strong');
                    promoRateElements.forEach(el => {
                        const text = el.textContent.trim();
                        const rate = parseFloat(text);
                        if (rate && rate > 1 && rate < 10) {
                            provider.promotionalExchangeRate = rate;
                        }
                    });

                    const promoRecipientEl = element.querySelector('.font-semibold');
                    if (promoRecipientEl && promoRecipientEl.textContent.includes('TND')) {
                        const amountText = promoRecipientEl.textContent.trim();
                        provider.promotionalRecipientGets = parseFloat(amountText.replace(/[^\d.-]/g, '')) || 0;
                    }

                    const lineThroughElements = element.querySelectorAll('.line-through');
                    lineThroughElements.forEach(el => {
                        const text = el.textContent.trim();
                        if (text.includes('EUR')) {
                            provider.regularFee = parseFloat(text.replace(/[^\d.-]/g, '')) || 0;
                        } else if (text.includes('TND')) {
                            provider.regularRecipientGets = parseFloat(text.replace(/[^\d.-]/g, '')) || 0;
                        } else {
                            const rate = parseFloat(text);
                            if (rate && rate > 1 && rate < 10) {
                                provider.regularExchangeRate = rate;
                            }
                        }
                    });

                    const expandedSection = element.querySelector('.bg-gray-50.rounded-b-6');
                    if (expandedSection) {
                        const feeRows = expandedSection.querySelectorAll('.flex.mt-3');
                        feeRows.forEach(row => {
                            if (row.textContent.toLowerCase().includes('fee')) {
                                const feeValues = row.querySelectorAll('.text-right.font-semibold p');
                                if (feeValues.length >= 1) {
                                    const promoFee = feeValues[0].textContent.trim();
                                    provider.promotionalFee = promoFee.toUpperCase() === 'FREE' ? 0 : parseFloat(promoFee.replace(/[^\d.-]/g, '')) || 0;
                                }
                                if (feeValues.length >= 2) {
                                    const regularFee = feeValues[1].textContent.trim();
                                    provider.regularFee = parseFloat(regularFee.replace(/[^\d.-]/g, '')) || 0;
                                }
                            }
                            if (row.textContent.toLowerCase().includes('exchange rate')) {
                                const rateValues = row.querySelectorAll('.text-right.font-semibold p');
                                if (rateValues.length >= 1) {
                                    provider.promotionalExchangeRate = parseFloat(rateValues[0].textContent.trim()) || 0;
                                }
                                if (rateValues.length >= 2) {
                                    provider.regularExchangeRate = parseFloat(rateValues[1].textContent.trim()) || 0;
                                }
                            }
                        });

                        const recipientSection = expandedSection.querySelector('.border-t-2.border-gray-200');
                        if (recipientSection) {
                            const amounts = recipientSection.querySelectorAll('p');
                            amounts.forEach(p => {
                                const text = p.textContent.trim();
                                if (text.includes('TND') && !p.classList.contains('line-through')) {
                                    provider.promotionalRecipientGets = parseFloat(text.replace(/[^\d.-]/g, '')) || 0;
                                } else if (text.includes('TND') && p.classList.contains('line-through')) {
                                    provider.regularRecipientGets = parseFloat(text.replace(/[^\d.-]/g, '')) || 0;
                                }
                            });
                        }
                    }

                    if (provider.name && provider.name.length > 0) {
                        extractedData.push(provider);
                    }
                });

                return extractedData;
            });

            const cleanedProviders = this.cleanProviderData(providers);

            return {
                success: true,
                transfer: {
                    from: fromCountry.toUpperCase(),
                    to: toCountry.toUpperCase(),
                    fromCurrency: fromCurrency.toUpperCase(),
                    toCurrency: toCurrency.toUpperCase(),
                    amount: amount
                },
                providers: cleanedProviders,
                totalProviders: cleanedProviders.length,
                scrapedAt: new Date().toISOString()
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                transfer: {
                    from: fromCountry.toUpperCase(),
                    to: toCountry.toUpperCase(),
                    fromCurrency: fromCurrency.toUpperCase(),
                    toCurrency: toCurrency.toUpperCase(),
                    amount: amount
                }
            };
        }
    }

    cleanProviderData(providers) {
        return providers.map(provider => {
            const cleaned = {
                id: provider.id,
                name: provider.name || '',
                logo: provider.logo || '',
                monitoScore: provider.monitoScore || 0,
                transferTime: provider.transferTime || '',
                bestDeal: provider.bestDeal || false,
                promotional: {
                    fee: provider.promotionalFee || 0,
                    exchangeRate: provider.promotionalExchangeRate || 0,
                    recipientGets: provider.promotionalRecipientGets || 0
                },
                regular: {
                    fee: provider.regularFee || 0,
                    exchangeRate: provider.regularExchangeRate || 0,
                    recipientGets: provider.regularRecipientGets || 0
                }
            };

            Object.keys(cleaned).forEach(key => {
                if (typeof cleaned[key] === 'string') {
                    cleaned[key] = cleaned[key].replace(/\s+/g, ' ').trim();
                }
            });

            return cleaned;
        }).filter(provider => provider.name.length > 0);
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

async function scrapeMonito(params = {}) {
    const scraper = new MonitoScraper(params.options);
    
    try {
        await scraper.init();
        const result = await scraper.scrapeTransferData(params);
        return result;
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    } finally {
        await scraper.close();
    }
}

module.exports = { MonitoScraper, scrapeMonito };

if (require.main === module) {
    scrapeMonito({
        fromCountry: 'de',
        toCountry: 'tn',
        fromCurrency: 'eur',
        toCurrency: 'tnd',
        amount: 100,
        options: {
            headless: true,
            timeout: 30000,
            blockResources: true
        }
    }).then(result => {
        console.log(JSON.stringify(result, null, 2));
    }).catch(console.error);
}