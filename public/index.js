/**
 * Compare the product results of two or more searches.
 */
'use strict';

(function () {

  window.addEventListener('load', init);

  /**
   * Initialize program on load. Prepare page interactivity.
   */
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
   * Add URL input box to page for an additional page comparison.
   */
  function addURL() {
    let section = id('urls');
    let length = section.querySelectorAll('input').length;

    // ensure user doesn't compare more than 6 URLs (arbitrary limit for time)
    if (length < 6) {
      let div = gen('div');
      let input = gen('input', {placeholder:"paste URL here", name:`page-${length+1}`});
      div.append(input);
      section.append(div);
    } else {
      let error = id('error');
      error.classList.remove('hidden');
      qs('#error p').textContent = 'Compare a maximum of six URLs.';
      setTimeout(() => {
        error.classList.add('hidden');
      }, 5000);
    }
  }

  /**
   * Fetch the pages to compare, append their titles to interface, compare
   * the products returned, and add those results to the interface.
   */
  async function queryData() {
    try {
      // clear prior contents
      id('items').innerHTML = '';
      let headings = qsa('#searchbar h4');
      for (let i = 0; i < headings.length; i++) {
        headings[i].remove();
      }
      // get the urls and add their titles to the sidebar / content section
      let searches = getSearches();
      getPageTitles(searches);
      let results = [];
      for (let i = 0; i < searches.length; i++) {
        let result = await fetchSearchResults(searches[i]);
        results.push(result);
      }
      let response = [];
      for (let i = 0; i < results.length; i++) {
        let parsed = parseResponse(results[i], i);
        response.push(parsed);
      }
      let comparison = compareResults(response);
      addResultsToPage(comparison);
      let loading = qsa('.loading');
      loading.forEach(section => {section.classList.remove('loading')});
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
   * Parses the JSON response from the fetched page from a string format into
   * usable structured data.
   * @param {String} data - the response from the page to parse
   * @param {Number} page - the URL the data are from. Used to correctly place
   *          items on the page with corresponding page titles.
   * @returns {Array} objects pulled from the data, representing the
   *          products on the page.
   */
  function parseResponse(data, page) {
    // the object within the response that holds the list of items on the page
    const doc = data['contents'][0]['mainContent'][0]['contents'][0]['records'];
    const products = [];
    doc.forEach(record => {
      let item = record['attributes'];
      
      const name = item['product.displayName'][0];
      const img = item['product.sku.skuImages'][0];
      const url = "shop.lululemon.com" + item['product.pdpURL'][0];

      // account for the product.id object sometimes being absent
      let prodId = item['product.id'];
      if (!prodId) {
        prodId = item['product.repositoryId'][0].trim();
      } else {
        prodId = item['product.id'][0].trim();
      }

      products.push({ page, prodId, name, img, url });
    });
    return products;
  }

  /**
   * Compares the results from all pages between the first URL and each of the
   * additional inputs. 
   * @param {Array} resultsArray - array of parsed data returned from each URL
   *          submitted. Index corresponds to order of input.
   * @returns {Object} two arrays. uniqueItems is nested and tracks which items
   *            are particular to a page, and commonItems holds all items that 
   *            are common between the first page and at least one other.
   */
  function compareResults(resultsArray) {

    // convert the first result array to a set of item ids
    const firstSet = new Set(resultsArray[0].map(item => item.prodId));

    // determine items in the first set that aren't in any of the subsequent sets
    const uniqueToFirst = resultsArray[0].filter(item => {
      return resultsArray.slice(1).every(results => {
        return !results.some(resultItem => resultItem.prodId === item.prodId);
      });
    });

    // determine unique items for each subsequent array compared to first
    const uniqueItems = resultsArray.slice(1).map(results => {
      return results.filter(item => {
        return !resultsArray[0].some(firstItem => firstItem.prodId === item.prodId);
      });
    });

    // insert unique items of first array at the start of uniqueItems array
    uniqueItems.unshift(uniqueToFirst);

    // determine common items between the first set and each subsequent set
    const commonItems = resultsArray.slice(1).map(results => {
      return results.filter(item => {
        return resultsArray[0].some(firstItem => firstItem.prodId === item.prodId);
      });
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

    // build the section to hold common items
    let commonCardHolder = gen('section');
    if (results.commonItems[0].length === 0) {
      let p = gen('p', {textContent: 'No common items.'})
      commonCardHolder.append(p);
    } else {
      for (let i = 0; i < results.commonItems[0].length; i ++) {
        commonCardHolder.append(buildItem(results.commonItems[0][i]));
      }
    }
    let common = gen('h3', {textContent: `Common Items (${results.commonItems[0].length})`});
    common.addEventListener('click', (e) => {
      collapseCards(e);
    });
    let section = gen('section');
    section.append(common, commonCardHolder);
    items.append(section);

    // append the unique items to the appropriate page headings
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
        terms = terms.split('%27').join("'");
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
    // add a title to each url input on the sidebar
    let inputs = qsa(`#searchbar input`);
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].value) {
        inputs[i].insertAdjacentElement('afterend', titles[i]);
      }
    }
  }

  /**
   * Build a card element to display unique items from a page, showing an image
   * of the item, its name, and its product ID.
   * @param {JSON} item - the item to build a card to display on the page for
   * @returns {HTMLElement} the newly built card for the item
   */
  function buildItem(item) {
    let card = gen('article', {classList: 'card'});
    let name = gen('h2', {textContent: item.name});
    let idLink = gen('a', {href: item.url, target: "_blank"});
    let id = gen('p', {textContent: item.prodId});
    idLink.append(id);
    let contentDiv = gen('div', {classList: 'cardContents'});
    contentDiv.append(name, idLink);
    let img = gen('img', {src: item.img, alt: item.name});
    let photoDiv = gen('div', {classList: 'photo'});
    photoDiv.append(img);
    card.append(photoDiv, contentDiv);
    return card;
  }

  /**
   * Collapses the cards beneath a section.
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

  /**
   * Check whether a fetch result is in the ok status range.
   * @param {Promise} response - the promise to check the ok range of
   * @returns {Promise}
   */
  async function statusCheck(response) {
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response;
  }

  /**
   * Shorthand for getElementByID
   * @param {String} idName - id to find (exluding '#')
   * @returns {HTMLElement}
   */
  function id(idName) {
    return document.getElementById(idName);
  }

  /**
   * Shorthand for querySelector
   * @param {String} query - the selector to query for
   * @returns {HTMLElement}
   */
  function qs(query) {
    return document.querySelector(query);
  }

  /**
   * Shorthand for querySelector
   * @param {String} query - the selector to query for
   * @returns {HTMLElement}
   */
  function qsa(query) {
    return document.querySelectorAll(query);
  }

  /**
   * Shorthand for createElement; additionally allows addition of attributes
   * in line with element generation.
   * @param {String} tag - type of element to generate
   * @param {Object} attributes - attributes to attach to the element
   * @returns {HTMLElement}
   */
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