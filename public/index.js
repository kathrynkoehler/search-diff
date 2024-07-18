/**
 * Compare the results of two or more searches.
 */
'use strict';

(function () {

  window.addEventListener('load', init);

  // // holds current jwt
  // let jwt;

  // // api constants
  // const API_URL = 'https://lululemon-dev.c.lucidworks.cloud';
  // const APPID = '/api/apps/LLM_us/query/LLM_us_browse?';

  // holds extracted product information from cleaned json files
  let allProducts = {};

  async function init() {
    try {
      qs('#error img').addEventListener('click', () => {
        id('error').classList.add('hidden');
      });
      id('run-diff-btn').addEventListener('click', async () => {
        await queryData();
        await loadPage();
      });
      id('add-url-btn').addEventListener('click', addURL);
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Shows an informative error message to user when JWT authentication or
   * API query fails.
   * @param {String} message - en explanation of where the error occurred
   * @param {String} err - the error returned by the server
   */
  function handleError(message, err) {
    id('items').innerHTML = '';
    id('items').classList.add('hidden');
    let display = qs('#error p');
    display.textContent = message + err;
    id('error').classList.remove('hidden');
  }

  /**
   * when user submits their username and password, request to authenticate
   * new JWT token is sent to server.
   */
  async function authenticateJWT() {
    try {
      let user = qs('#auth form')['username'].value;
      let password = qs('#auth form')['password'].value;
      await refreshJwt(API_URL, user, password);
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * refreshes current jwt, obtaining new from fusion rest api and schedules
   * method to run again before jwt expires
   * @param {String} apiUrl - the url to query
   * @param {String} user - the username to authenticate
   * @param {String} password - the password to authenticate
   */
  async function refreshJwt(apiUrl, user, password) {
    const loginUrl = `${apiUrl}/oauth2/token`;
    const auth = btoa(`${user}:${password}`);
    const authHeader = `Basic ${auth}`;

    // execute fetch to get jwt
    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Authorization': authHeader }
      });
      await statusCheck(response);
      const responseJSON = await response.json();
      jwt = responseJSON['access_token'];
      const secondsUntilExpiration = parseInt(responseJSON['expires_in']);

      qs('#auth form').classList.toggle('hidden');
      qs('#error').classList.add('hidden');

      // reschedule before jwt expires
      const graceSeconds = secondsUntilExpiration > 15 ? 10 : 2;
      const secondsUntilRefresh = secondsUntilExpiration - graceSeconds;
      setTimeout(async () => {
        await refreshJwt(apiUrl, user, password);
      }, secondsUntilRefresh * 1000);
    } catch (err) {
      console.error('Attempt to retrieve JWT token failed due to exception. Exiting...', err);
      handleError('Error authenticating JWT: ', err);
    }
  }

  /**
   * Add new URL input box to page for additional comparison.
   */
  function addURL() {
    let section = id('urls');
    let length = section.querySelectorAll('input').length;
    if (length < 6) {
      let div = gen('div');
      let input = gen('input', {placeholder:"paste URL here", name:`page-${length+1}`});
      div.append(input);
      section.append(div);
    }
    // TODO: else give user a warning that it's too many to compare
  }

  /**
   * retrieves cleaned product data to build interface and handle interactivity. 
   * @param {Event} e - the event triggering load (submit user/password)
   */
  async function loadPage(e) {
    try {
      // loading animations
      let items = id('items');
      items.innerHTML = '';

      // let circle = qs('#options svg');
      // let circle2 = id('load-circle');
      // circle.classList.remove('hidden');
      // circle2.classList.remove('hidden');

      // query data from api, then display on page
      await queryData(e);
      // await displayData();
      
      // when all data is displayed, remove loading icons
      // circle.classList.add('hidden');
      // circle2.classList.add('hidden');
      // qs('#items .load-items').remove();
    } catch (err) {
      console.error('Error in loadPage:', err);
    }
  }

  /**
   * queries data directly from api.
   * @param {Event} e - the event triggering the query (user/password submit)
   */
  async function queryData(e) {
    // e.preventDefault();
    try {
      // authenticate current jwt by adding it in auth header
      id('items').innerHTML = '';
      // const headers = {
      //   'Authorization': `Bearer ${jwt}`
      // };

      let searches = getSearches();
      getPageTitles(searches);
      let results = [];
      // let products = [];
      for (let i = 0; i < searches.length; i++) {
        const queryURL = `${searches[i]}?format=json`;
        let res = await fetch(queryURL);
        await statusCheck(res);
        res = await res.text();
        id('error').classList.add('hidden');
        results.push(res);
      }
      console.log(results);
      // for (let i = 0; i < results.length; i++) {
      //   allProducts[i] = {};
      //   setData(results[i], i);
      //   // products.push(parsed);
      // }
      // console.log(allProducts);

      // let comparison = compareResults();
      // console.log(comparison);
      // addResultsToPage(comparison);
      let loading = qsa('.loading');
      loading.forEach(section => {section.classList.remove('loading')});

    } catch (err) {
      console.error('Error in queryData: ' + err);
      handleError('Error querying API: ', err);
      qs('#signin').classList.add('active');
      setTimeout(() => {
        qs('#signin').classList.remove('active');
      }, 5000);
    }
  }

  function getSearches() {
    let searches = [];
    let urls = id('searchbar').querySelectorAll('input:not(:placeholder-shown)');
    for (let i = 0; i < urls.length; i++) {
      searches.push(urls[i].value);
    }
    return searches;
  }

  /*
    ************** decompose response from api **************
  */

  function setData(data, page) {
    let docs = data["response"]["docs"];
    
    // for each product, find details list
    let item;
    for (item of docs) {
      // if (item['sku_available'] === "true") {  }
      allProducts[page][item['product_id']] = {
        'prodId': item['product_id'],
        'displayName': item["product_displayName"],
        'img': item["sku_skuImages"][0],
        'url': item['product_pdpURL'],
        'skuId': item['sku_id']
      };
    }
  }


  async function OLDqueryData() {
    try {
      
      let searches = getSearches();
      getPageTitles(searches);
      let results = [];
      let html = [];
      for (let i = 0; i < searches.length; i++) {
        let result = await fetchSearchResults(searches[i]);
        results.push(result);
      }
      for (let i = 0; i < results.length; i++) {
        let parsed = parseHTML(results[i], i);
        html.push(parsed);
      }
      console.log(html);
      let comparison = compareResults(html);
      console.log(comparison);
      addResultsToPage(comparison);
      let loading = qsa('.loading');
      loading.forEach(section => {section.classList.remove('loading')});

    } catch (err) {
      console.error(err);
    }
  }

  

  async function fetchSearchResults(query) {
    try {
      console.log('fetch: ' + query);
      let search = new FormData();
      search.append('query', query);
      let res = await fetch(`/search`, { method: "POST", body: search});
      await statusCheck(res);
      res = await res.text();
      return res;
    } catch (err) {
      console.error('fetchSearchResults: ', err);
    }
  }

  /**
   * Parses the html from the fetched page from a string format into DOM elements.
   * @param {String} html - the html string from the page to parse
   * @returns {Array} array of objects pulled from the html, representing the
   *          products on the page.
   */
  function parseHTML(html, page) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const products = [];
    doc.querySelectorAll('.product-tile').forEach(tile => {
      const name = tile.querySelector('div.product-tile__product-attributes > div.product-tile__product-attributes__title-and-price > h3 > a').textContent;
      const photo = tile.querySelector('a.product-tile__image-link');
      const prodId = photo.dataset.productid;
      const url = photo.href;

      let img = tile.querySelector('.image-container .image span img');
      console.log(name, img);
      if (img) {
        img = img.srcset;
        img = img.split(', ');
        img = img[img.length-1].split('?$')[0].split(' ')[0];
        // products.push({ page, prodId, name, img, url });
      }
      products.push({ page, prodId, name, img, url });
    });
    return products;
  }

  // takes variable number of arrays with results
  function compareResults() {

    // Convert the JSON object values to an array of arrays of items
    const resultsArray = Object.values(allProducts).map(set => Object.values(set));

    // Convert the first result array to a set of item ids
    const firstSet = new Set(resultsArray[0].map(item => item.prodId));
    console.log('first set: ', firstSet);

    // Determine items in the first set that aren't in any of the subsequent sets
    const uniqueToFirst = resultsArray[0].filter(item => {
      return resultsArray.slice(1).every(results => {
        const resultSet = new Set(results.map(item => item.prodId));
        return !resultSet.has(item.prodId);
      });
    });

    // Determine unique items for each of the subsequent arrays
    const uniqueItems = resultsArray.slice(1).map(results => {
      return results.filter(item => {
        return !firstSet.has(item.prodId);
      });
    });

    // Insert the unique items of the first array at the start of the uniqueItems array
    uniqueItems.unshift(uniqueToFirst);

    // Determine common items in the first array and all other arrays
    const commonItems = resultsArray[0].filter(item => {
      // Check if item is in all other sets
      const isInAllSets = resultsArray.slice(1).every(results => {
        const resultSet = new Set(results.map(item => item.prodId));
        return resultSet.has(item.prodId);
      });
      return isInAllSets;
    });
  
    return { uniqueItems, commonItems };
  }

  function addResultsToPage(results) {
    let items = id('items');
    let common = gen('h3', {textContent: 'Common Items'});
    common.addEventListener('click', (e) => {
      collapseCards(e);
    });
    let section = gen('section');
    let commonCardHolder = gen('section');
    if (results.commonItems.length === 0) {
      let p = gen('p', {textContent: 'No common items.'})
      commonCardHolder.append(p);
    } else {
      for (let i = 0; i < results.commonItems.length; i ++) {
        commonCardHolder.append(buildItem(results.commonItems[i]));
      }
    }
    section.append(common, commonCardHolder);
    items.append(section);

    for (let i = 0; i < results.uniqueItems.length; i++) {
      let page = qs(`#items > section.page-${i} section`);
      if (results.uniqueItems[i].length === 0) {
        let p = gen('p', {textContent: 'All products present in first URL.'})
        page.append(p);
      } else {
        for (let k = 0; k < results.uniqueItems[i].length; k++) {
          page.append(buildItem(results.uniqueItems[i][k]));
        }
      }
      let heading = qs(`#items > section.page-${i} h3`);
      console.log(heading);
      heading.textContent = heading.textContent + ` (${results.uniqueItems[i].length} unique)`;
      heading.addEventListener('click', (e) => {
        collapseCards(e);
      })
    }
  }

  function getPageTitles(urls) {
    console.log(urls);
    let prefix;
    let terms;
    let titles = [];
    for (let i = 0; i < urls.length; i++) {
      let section = gen('section', {classList: `page-${i}`});
      id('items').append(section);
      if (urls[i].includes('search')) {
        prefix = 'Search: ';
        terms = urls[i].split('search?Ntt=')[1];
        terms = terms.split('%20').join(' ');
      } else {
        prefix = 'Browse: ';
        terms = urls[i].split('c/')[1].split('/')[0];
      }
      let heading = gen('h3', {classList: `page-${i}`, textContent: `${prefix} ${terms}`});
      let cardHolder = gen('section');
      cardHolder.classList.add('cardHolder', 'loading');
      section.append(heading, cardHolder);
      titles.push(gen('h4', {classList: `page-${i}`, textContent: `${prefix} ${terms}`}));
    }
    // add a title to each url input
    let inputs = qsa(`#searchbar input`);
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].value) {
        inputs[i].insertAdjacentElement('afterend', titles[i]);
      }
    }
  }

  /**
   * Build a card element to display unique items from a page.
   * @param {JSON} item - the item to build a card to display on the page for
   * @returns {HTMLElement} the newly built card for the item
   */
  function buildItem(item) {
    let card = gen('article', {classList: 'card'});
    let name = gen('h2', {textContent: item.name});
    let id = gen('p', {textContent: item.prodId});
    let img = gen('img', {src: item.img, alt: item.name});
    let contentDiv = gen('div', {classList: 'cardContents'});
    contentDiv.append(name, id);
    let photoDiv = gen('div', {classList: 'photo'});
    photoDiv.append(img);
    card.append(photoDiv, contentDiv);
    return card;
  }

  /**
   * Collapses the hards beneath a section
   * @param {Event} e - click event on section heading
   */
  function collapseCards(e) {
    let cards = e.currentTarget.nextSibling;
    let section = e.currentTarget.parentElement;
    cards.classList.toggle('collapsed');
    section.classList.toggle('collapsed');
  }

  /**
   * ----------------- Helpers -----------------
   */

  // statuscheck for fetch
  async function statusCheck(response) {
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response;
  }

  function id(idName) {
    return document.getElementById(idName);
  }

  function qs(query) {
    return document.querySelector(query);
  }

  function qsa(query) {
    return document.querySelectorAll(query);
  }

  function gen(tag, attributes = {}) {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'classList') {
        element.classList.add(value);
      } else {
        element[key] = value;
      }
    }
    return element;
  }

})();