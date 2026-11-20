const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function loadDirectory(extraRestaurants = []) {
  const listeners = {};
  const elements = {
    '#businessDirectory': {innerHTML: '', querySelectorAll() { return []; }},
    '#businessSearch': {value: '', addEventListener(event, fn) { listeners[event] = fn; }},
    '#businessCount': {textContent: ''},
    '#business-page-size': {addEventListener(event, fn) { listeners.pageSize = fn; }, focus() {}},
    '#business-show-more': {addEventListener(event, fn) { listeners.showMore = fn; }}
  };
  const context = {
    window: {addEventListener(event, fn) { listeners[event] = fn; }},
    document: {
      querySelector(selector) { return elements[selector] || null; },
      getElementById() { return null; },
      createElement() { return {}; },
      head: {lastNode: null, appendChild(node) { this.lastNode = node; }}
    },
    location: {hash: '', search: ''},
    URLSearchParams,
    requestAnimationFrame() {}
  };
  vm.createContext(context);
  for (const file of ['data/businesses-data.js', 'data/restaurants-data.js', 'businesses.js']) {
    if (file === 'businesses.js') context.window.NORWOOD_RESTAURANTS.push(...extraRestaurants);
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  return {context, elements, listeners};
}

test('Walpole Street remains in Norwood while neighboring towns retain their locality', () => {
  const {context} = loadDirectory();
  const businesses = context.window.NORWOOD_BUSINESSES;
  const onWalpoleStreet = businesses.filter(b => /Walpole Street/i.test(b.address));
  assert.ok(onWalpoleStreet.length > 40);
  for (const business of onWalpoleStreet) {
    assert.equal(business.town, 'Norwood', business.name);
    assert.match(business.address, /Norwood, MA 02062$/, business.name);
  }
  assert.equal(businesses.find(b => b.name === 'ALDI - East Walpole').town, 'East Walpole');
  assert.equal(businesses.find(b => b.name === 'Wegmans - Westwood').town, 'Westwood');
  assert.match(businesses.find(b => b.name.startsWith('Brigham and Women')).address, /Norwood, MA 02062$/);
});

test('every maintained business is reachable through a browsing category', () => {
  const {context} = loadDirectory();
  for (const business of context.window.NORWOOD_BUSINESSES) {
    assert.ok(context.window.NORWOOD_BUSINESS_TAXONOMY[business.name.toLowerCase()].length, business.name);
  }
});

test('the normal search input finds verified additions and maintained restaurant records', () => {
  const {elements, listeners} = loadDirectory();
  elements['#businessSearch'].value = 'CVS';
  listeners.input();
  assert.match(elements['#businessDirectory'].innerHTML, /CVS Pharmacy/);
  elements['#businessSearch'].value = 'pizza';
  listeners.input();
  assert.match(elements['#businessDirectory'].innerHTML, /1A Pizza/);
  assert.equal((elements['#businessDirectory'].innerHTML.match(/<b>1A Pizza<\/b>/g) || []).length, 1);
});

test('food category points to the map food layer and renders the full food catalog', () => {
  const {context, elements, listeners} = loadDirectory();
  context.location.hash = '#food';
  listeners.hashchange();
  assert.match(elements['#businessDirectory'].innerHTML, /map\.html\?category=food/);
  assert.match(elements['#businessDirectory'].innerHTML, /1A Pizza/);
});


test('structured search data identifies Walpole Street businesses as Norwood', () => {
  const {context, elements, listeners} = loadDirectory();
  listeners.pageSize({target: {value: '100'}});
  elements['#businessSearch'].value = 'walpole street';
  listeners.input();
  const schema = JSON.parse(context.document.head.lastNode.textContent);
  assert.ok(schema['@graph'].length > 40);
  const onWalpoleStreet = schema['@graph'].filter(item => /Walpole Street/i.test(item.address.streetAddress));
  assert.ok(onWalpoleStreet.length > 40);
  for (const item of onWalpoleStreet) {
    assert.equal(item.address.addressLocality, 'Norwood', item.name);
  }
});


test('separate restaurant branches remain visible and category navigation clears search', () => {
  const {context, elements, listeners} = loadDirectory([
    {id: 'test-east', name: 'Branch Cafe', address: '1 Test Street'},
    {id: 'test-west', name: 'Branch Cafe', address: '2 Test Street'}
  ]);
  elements['#businessSearch'].value = 'branch cafe';
  listeners.input();
  assert.equal((elements['#businessDirectory'].innerHTML.match(/<b>Branch Cafe<\/b>/g) || []).length, 2);
  context.location.hash = '#home';
  listeners.hashchange();
  assert.equal(elements['#businessSearch'].value, '');
  assert.match(elements['#businessDirectory'].innerHTML, /Home Services &amp; Contractors/);
});

test('listing size, Show more and category-specific suggestions work', () => {
  const {context, elements, listeners} = loadDirectory();
  const result = () => elements['#businessDirectory'].innerHTML;
  const cards = () => (result().match(/class="resource-item business-item"/g) || []).length;
  assert.equal(cards(), 20);
  elements['#businessSearch'].value = 'norwood';
  listeners.input();
  assert.equal(cards(), 20);
  listeners.pageSize({target: {value: '50'}});
  assert.equal(cards(), 50);
  listeners.showMore();
  assert.equal(cards(), 100);
  listeners.pageSize({target: {value: '100'}});
  assert.equal(cards(), 100);
  listeners.pageSize({target: {value: '20'}});
  listeners.showMore();
  assert.equal(cards(), 40);
  context.location.hash = '#home';
  listeners.hashchange();
  assert.equal(cards(), 20);
  context.location.hash = '#home/plumbing';
  listeners.hashchange();
  assert.match(result(), /<h2>Plumbing<\/h2>/);
  assert.match(result(), /contact\.html\?topic=resource&amp;business-category=Plumbing#contact/);
  assert.doesNotMatch(result(), /id="business-show-more"/);
});

test('contact form selects the existing topic and prefills an editable suggestion', () => {
  const contact = fs.readFileSync(path.join(root, 'contact.html'), 'utf8');
  const inline = [...contact.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(([, code]) => code.includes("params.get('business-category')"))[1];
  const select = {value: '', options: [{value: 'resource'}, {value: 'job-listings'}]};
  const message = {value: ''};
  const document = {
    querySelector(s) { return s === '#contactTopic' ? select : message; },
    querySelectorAll() { return []; }
  };
  const location = {search: '?topic=resource&business-category=HVAC%20%26%20Heating'};
  vm.runInNewContext(inline, {URLSearchParams, location, document});
  assert.equal(select.value, 'resource');
  assert.match(message.value, /I recommend this business for the HVAC & Heating category\.\n\nBusiness name:/);
  message.value = 'Already typed';
  location.search = '?topic=job-listings';
  vm.runInNewContext(inline, {URLSearchParams, location, document});
  assert.equal(select.value, 'job-listings');
  assert.equal(message.value, 'Already typed');
});
