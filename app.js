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


// app.get('/search/:q', async (req, res) => {
//   try {
//     const query = req.params.q;
//     console.log(query);
//     let search = `https://shop.lululemon.com/search?Ntt=${query}`;
//     const fetch = (await import('node-fetch')).default;
//     const response = await fetch(search);
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`, {
//         headers: {
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
//         }
//       });
//     } else {
//       console.log(response);
//       const html = await response.text();
//       console.log(html);
//       res.type('text').send(html);
//     }

//   } catch (err) {
//     console.error(`Error fetching: `, err);
//     res.type('text').status(500).send(`error in /search: ${err}`);
//   }
// });

app.post('/search/', async (req, res) => {
  try {
    let query = req.body.query;
    console.log(query);
    let browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(2 * 60 * 1000);

    console.log('!!! starting scrape !!!');

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    await page.goto(query, {waitUntil: 'networkidle2'});
    await autoScroll(page);

    await page.waitForSelector('#product-list > div.product-list_productList__S1b7b > div > div:nth-child(1)');
    console.log('goto'); 
    // let contents = await page.locator('#product-list').cloneNode();
    let data = await page.evaluate(async () => {
      // console.log(document.documentElement.outerHTML);
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
  });
}

app.use(express.static('public'));
const PORT = process.env.PORT || 8000;
app.listen(PORT); 