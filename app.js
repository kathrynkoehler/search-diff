/**
 * bypass CORS issues by using puppeteer to access webpage results.
 */
'use strict';

const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const multer = require("multer");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(multer().none());

/**
 * Endpoint launches puppeteer and fetches webpage. On load, grab entire page
 * response and send back to client side js.
 */
app.post('/search/', async (req, res) => {
  try {
    let query = req.body.query;
    let browser = await puppeteer.launch(); //{headless: false}
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(2 * 60 * 1000);

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    // go to the page, and wait until it's done loading in content
    await page.goto(query, {waitUntil: 'networkidle0'});

    await page.waitForSelector('pre');
    let data = await page.evaluate(async () => {
      let element = document.querySelector('pre');
      return element ? element.innerHTML : null;
    });
    await browser.close();
    res.send(data);
  } catch (err) {
    res.type('text').status(500).send(`Error fetching page: ${err}`);
  }
});

// tells app to listen to path '/public'
app.use(express.static('public'));
const PORT = process.env.PORT || 8000;
app.listen(PORT); 