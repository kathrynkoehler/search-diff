/**
 * Compare the results of two or more searches.
 */
'use strict';

(function () {

  window.addEventListener('load', init);

  async function init() {
    try {
      id('run-diff-btn').addEventListener('click', async () => {
        await queryData();
      });
    } catch (err) {
      console.error(err);
    }
  }

  function getSearches() {
    let searches = [];
    let urls = id('searchbar').querySelectorAll('input');
    for (let i = 0; i < urls.length; i++) {
      searches.push(urls[i].value);
    }
    return searches;
  }

  async function queryData() {
    try {
      let searches = getSearches();
      let results = [];
      let html = [];
      for (let i = 0; i < searches.length; i++) {
        let result = await fetchSearchResults(searches[i]);
        results.push(result);
      }
      for (let i = 0; i < results.length; i++) {
        let parsed = parseHTML(results[i]);
        html.push(parsed);
      }
      let comparison = compareResults(html[0], html[1]);
      // console.log(comparison);
      addResultsToPage(comparison);
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
  function parseHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const products = [];
    doc.querySelectorAll('.product-tile').forEach(tile => {
      const name = tile.querySelector('div.product-tile__product-attributes > div.product-tile__product-attributes__title-and-price > h3 > a').textContent;
      const photo = tile.querySelector('a.product-tile__image-link');
      const prodId = photo.dataset.productid;
      const url = photo.href;
      // console.log(tile.querySelector('source').srcset);
      let img = tile.querySelector('source').srcset;
      img = img.split(', ');
      img = img[0].split('?$'[0]);
      // console.log(img[0]);
      products.push({ prodId, name, img, url });
    });
    return products;
  }

  // takes variable number of arrays with results
  function compareResults(...resultsArray) {
    // convert each result array to a set of item ids
    const resultSets = resultsArray.map(results => new Set(results.map(item => item.prodId)));
    console.log('result sets: ', resultSets);
    // get a set of all item ids across all result sets
    const allItems = new Set(resultsArray.flatMap(results => results.map(item => item.prodId)));
    console.log('all items: ', allItems);

    // determine unique items for each result set
    const uniqueItems = resultsArray.map((results, index) => {
      const otherSets = resultSets.filter((_, i) => i !== index);
      return results.filter(item => {
        const isUnique = otherSets.every(set => !set.has(item.prodId));
        return isUnique;
      });
    });
  
    // Determine common items across all result sets
    const commonItems = resultsArray[0].filter(item => {
      const isInAllSets = resultSets.every(set => set.has(item.prodId));
      return isInAllSets;
    });
  
    return { uniqueItems, commonItems };
  }

  function addResultsToPage(results) {
    let items = id('items');
    let common = gen('h3');
    common.textContent = 'Common Items';
    let unique = gen('h3');
    unique.textContent = 'Unique Items';
    items.append(common);
    for (let i = 0; i < results.commonItems.length; i ++) {
      let p = gen('p');
      p.textContent = results.commonItems[i].name;
      items.append(p);
    }
    items.append(unique);
    for (let i = 0; i < results.uniqueItems.length; i ++) {
      for (let k = 0; k < results.uniqueItems[i].length; k++) {
        let p = gen('p');
        p.textContent = results.uniqueItems[i][k].name;
        items.append(p);
      }
    }
    // for now, add all items to page under two lists
  }

  /**
   * Build a card element to display unique items from a page.
   * @param {*} item 
   * @returns 
   */
  function buildItem(item) {
    let card = gen('article');
    let name = gen('h2', {textContent: item.name});
    let id = gen('p', {textContent: item.prodId});
    let img = gen ('img', {src: item.img, alt: item.name});
    card.append(img, name, id);
    return card;
  }

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
        element.classList.add(...value);
      } else {
        element[key] = value;
      }
    }
    return element;
  }

})();