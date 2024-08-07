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
    let data = await requestPage(query);
    res.send(data);
  } catch (err) {
    console.log(err);
  }
});

async function requestPage(query) {
  try {
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
    let redirect = await redirectPage(data);
    if (redirect) {
      await requestPage(redirect);
    } else {
      return data;
    }
  } catch (err) {
    console.error(`Error fetching: `, err);
    // res.type('text').status(500).send(`error in /search: ${err}`);
  }
}

/**
 * Sometimes searches are redirected to browse pages. This function grabs the new
 * URL from the redirect JSON to try again with the new page.
 */
async function redirectPage(contents) {
  try {
    contents = await JSON.parse(contents);
    // console.log(Object.keys(contents));
    // console.log(contents["endeca:redirect"]);
    let page = contents["endeca:redirect"]["link"]["url"];
    if (page) {
      page = page.slice(1);
      page = page.split("?")[0];
      page = `https://shop.lululemon.com${page}?No=0&Nrpp=1000&format=json`;
      console.log(page);
      return page;
    } else {
      return false;
    }
  } catch (err) {
    return false;
  }
}

// tells app to listen to path '/public'
app.use(express.static('public'));
const PORT = process.env.PORT || 8000;
app.listen(PORT); 