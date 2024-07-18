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
      id('add-url-btn').addEventListener('click', addURL);
    } catch (err) {
      console.error(err);
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

  async function queryData() {
    try {
      id('items').innerHTML = '';
      let headings = qsa('#searchbar h4');
      for (let i = 0; i < headings.length; i++) {
        headings[i].remove();
      }
      // qs('#searchbar svg').classList.remove('hidden');
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
      let comparison = compareResults(html);
      addResultsToPage(comparison);
      let loading = qsa('.loading');
      loading.forEach(section => {section.classList.remove('loading')});
      // qs('#searchbar svg').classList.add('hidden');
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Get the URLS the user entered to compare from the sidebar.
   * @returns {Array} - array of user-entered URLs.
   */
  function getSearches() {
    let searches = [];
    let urls = id('searchbar').querySelectorAll('input:not(:placeholder-shown)');
    for (let i = 0; i < urls.length; i++) {
      searches.push(urls[i].value);
    }
    return searches;
  }

  /**
   * Fetch the contents of the URL from the website. Add parameters for amount
   * of records returned and formatting.
   * @param {String} query - the URL to fetch contents of.
   * @returns {JSON} the formatted contents of the URL
   */
  async function fetchSearchResults(query) {
    try {
      console.log('fetch: ' + query);
      let search = new FormData();
      if (query.includes('search')) {
        search.append('query', `${query}&No=0&Nrpp=1000&format=json`);
      } else {
        search.append('query', `${query}?No=0&Nrpp=1000&format=json`);
      }
      let res = await fetch(`/search`, { method: "POST", body: search});
      await statusCheck(res);
      res = await res.json();
      return res;
    } catch (err) {
      console.error('fetchSearchResults: ', err);
    }
  }

  /**
   * Parses the html from the fetched page from a string format into DOM elements.
   * @param {String} data - the html string from the page to parse
   * @returns {Array} array of objects pulled from the html, representing the
   *          products on the page.
   */
  function parseHTML(data, page) {
    const doc = data['contents'][0]['mainContent'][0]['contents'][0]['records'];
    const products = [];
    doc.forEach(record => {
      let item = record['attributes'];
      
      const name = item['product.displayName'][0];
      const img = item['product.sku.skuImages'][0];
      let prodId = item['product.id'];
      if (!prodId) {
        prodId = item['product.repositoryId'][0];
      } else {
        prodId = item['product.id'][0];
      }
      const url = item['product.pdpURL'][0];

      products.push({ page, prodId, name, img, url });
    });
    return products;
  }

  // takes variable number of arrays with results
  function compareResults(resultsArray) {

    // Convert the first result array to a set of item ids
    const firstSet = new Set(resultsArray[0].map(item => item.prodId));

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

  /**
   * Add the items to page, separated by URL if unique, and under a Common heading
   * otherwise.
   * @param {Object} results - an array of common items, and arrays of unique
   *        items for each URL.
   */
  function addResultsToPage(results) {
    let items = id('items');
    let commonCardHolder = gen('section');
    if (results.commonItems.length === 0) {
      let p = gen('p', {textContent: 'No common items.'})
      commonCardHolder.append(p);
    } else {
      for (let i = 0; i < results.commonItems.length; i ++) {
        commonCardHolder.append(buildItem(results.commonItems[i]));
      }
    }
    let common = gen('h3', {textContent: `Common Items (${results.commonItems.length})`});
    common.addEventListener('click', (e) => {
      collapseCards(e);
    });
    let section = gen('section');
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
      heading.textContent = heading.textContent + ` (${results.uniqueItems[i].length} unique)`;
      heading.addEventListener('click', (e) => {
        collapseCards(e);
      })
    }
  }

  /**
   * Get the page title for each URL to make headings on the sidebar and item
   * lists.
   * @param {Array} urls - Array of URLs to extract page titles from.
   */
  function getPageTitles(urls) {
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