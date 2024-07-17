/**
 * bypass CORS issues by using node fetch.
 */
'use strict';

const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const multer = require("multer");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(multer().none());

app.post('/search/', async (req, res) => {
  try {
    let query = req.body.query;
    console.log(query);
    let browser = await puppeteer.launch(); //{headless: false}
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(2 * 60 * 1000);

    console.log('!!! starting scrape !!!');

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    // go to the page, and wait until it's done loading in content
    await page.goto(query, {waitUntil: 'networkidle2'});
    await autoScroll(page);
    // let viewmoreBtn = await page.locator('#product-list > div.OneLinkTx.pagination_pagination__EiTAQ > button').click();

    await page.waitForSelector('div.product-tile .product-tile__image-link .image picture img');
    console.log('goto'); 
    let data = await page.evaluate(async () => {
      let element = document.querySelector('#product-list');
      return element ? element.innerHTML : null;
    });
    // console.log(data);
    await browser.close();
    res.send(data);

  } catch (err) {
    console.error(`Error fetching: `, err);
    res.type('text').status(500).send(`error in /search: ${err}`);
  }
});

// Function to scroll to the bottom of the page
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
    
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
    await new Promise((resolve, reject) => {
      let totalHeight = document.body.scrollHeight;
      const distance = 500;
      const timer = setInterval(() => {
        // const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, -distance);
        totalHeight -= distance;
    
        if (totalHeight <= 0) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

app.use(express.static('public'));
const PORT = process.env.PORT || 8000;
app.listen(PORT); 