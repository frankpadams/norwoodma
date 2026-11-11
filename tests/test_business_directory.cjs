const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function loadDirectory() {
  const listeners = {};
  const elements = {
    '#businessDirectory': {innerHTML: ''},
    '#businessSearch': {value: '', addEventListener(event, fn) { listeners[event] = fn; }},
    '#businessCount': {textContent: ''}
  };
  const context = {
    window: {addEventListener(event, fn) { listeners[event] = fn; }},
    document: {
      querySelector(selector) { return elements[selector] || null; },
      getElementById() { return null; },
      createElement() { return {}; },
      head: {lastNode: null, appendChild(node) { this.lastNode = node; }}
    },
    location: {hash: ''},
    requestAnimationFrame() {}
  };
  vm.createContext(context);
  for (const file of ['data/businesses-data.js', 'data/restaurants-data.js', 'businesses.js']) {
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
