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
      console.log('done');
      // let searches = [];

      // const query1 = 'sock';
      // const query2 = 'socks';
  
      // const html1 = await fetchSearchResults(query1);
      // const html2 = await fetchSearchResults(query2);
      // // console.log('fetched ', html1);
  
      // const results1 = parseHTML(html1);
      // const results2 = parseHTML(html2);
      // // console.log('parsed');
  
      // const comparison = compareResults(results1, results2);
      // console.log(comparison);

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


  function parseHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const products = [];
    doc.querySelectorAll('.product-tile').forEach(tile => {
      const card = tile.querySelector('a.product-tile__image-link');
      const name = card.dataset.productid;
      const url = card.href;
      products.push({ name, url });
    });
    return products;
  }

  // takes variable number of arrays with results
  function compareResults(...resultsArray) {
    // convert each result array to a set of item names
    const resultSets = resultsArray.map(results => new Set(results.map(item => item.name)));
    console.log('result sets: ', resultSets);
    // get a set of all item names across all result sets
    const allItems = new Set(resultsArray.flatMap(results => results.map(item => item.name)));
    console.log('all items: ', allItems);

    // determine unique items for each result set
    const uniqueItems = resultsArray.map((results, index) => {
      const otherSets = resultSets.filter((_, i) => i !== index);
      return results.filter(item => {
        const isUnique = otherSets.every(set => !set.has(item.name));
        return isUnique;
      });
    });
  
    // Determine common items across all result sets
    const commonItems = resultsArray[0].filter(item => {
      const isInAllSets = resultSets.every(set => set.has(item.name));
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

  function gen(tag) {
    return document.createElement(tag);
  }

})();