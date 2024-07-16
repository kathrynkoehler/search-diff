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
      // qs('#searchbar svg').classList.remove('hidden');
      let searches = getSearches();
      getPageTitles(searches);
      let results = [];
      let html = [];
      for (let i = 0; i < searches.length; i++) {
        let result = await fetchSearchResults(searches[i], i);
        results.push(result);
      }
      for (let i = 0; i < results.length; i++) {
        let parsed = parseHTML(results[i]);
        html.push(parsed);
      }
      let comparison = compareResults(html[0], html[1]);
      // console.log(comparison);
      addResultsToPage(comparison);
      let loading = qsa('.loading');
      loading.forEach(section => {section.classList.remove('loading')});
      // qs('#searchbar svg').classList.add('hidden');
    } catch (err) {
      console.error(err);
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
      img = img.srcset;
      img = img.split(', ');
      img = img[img.length-1].split('?$')[0].split(' ')[0];
      products.push({ page, prodId, name, img, url });
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
    console.log(results);
    let items = id('items');
    let common = gen('h2', {textContent: 'Common Items'});
    common.addEventListener('click', (e) => {
      collapseCards(e);
    });
    let section = gen('section');
    let commonCardHolder = gen('section');
    for (let i = 0; i < results.commonItems.length; i ++) {
      commonCardHolder.append(buildItem(results.commonItems[i]));
    }
    section.append(common, commonCardHolder);
    items.append(section);

    for (let i = 0; i < results.uniqueItems.length; i++) {
      let page = qs(`#items > section.page-${i} section`);
      if (results.uniqueItems[i].length === 0) {
        let p = gen('p', {textContent: 'All products present in first URL'})
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
    let section = e.currentTarget.parent;
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