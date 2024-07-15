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
      let comparison = compareResults(html);
      console.log(comparison);
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

  function getSearches() {
    let searches = [];
    let urls = id('searchbar').querySelectorAll('input');
    for (let i = 0; i < urls.length; i++) {
      searches.push(urls[i].value);
    }
    return searches;
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

  function compareResults(resultsArray) {
    const resultSets = resultsArray.map(results => new Set(results.map(item => item.name)));
    const allItems = new Set(resultsArray.flatMap(results => results.map(item => item.name)));
    
    const uniqueItems = resultsArray.map((results, index) => {
      const otherSets = resultSets.filter((_, i) => i !== index);
      return results.filter(item => otherSets.every(set => !set.has(item.name)));
    });
  
    const commonItems = [...allItems].filter(item =>
      resultSets.every(set => set.has(item))
    );
  
    return { uniqueItems, commonItems };

    // const resultSet1 = new Set(results1.map(item => item.name));
    // const resultSet2 = new Set(results2.map(item => item.name));

    // const onlyInFirst = results1.filter(item => !resultSet2.has(item.name));
    // const onlyInSecond = results2.filter(item => !resultSet1.has(item.name));
    // const inBoth = results1.filter(item => resultSet2.has(item.name));

    // return { onlyInFirst, onlyInSecond, inBoth };
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