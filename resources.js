(()=>{
'use strict';
const byId = id => document.getElementById(id);
const container = byId('resourceTopics');
if (!container) return;

const sections = [...container.querySelectorAll('[data-resource-topic]')];
const overview = byId('resource-directory-overview');
const searchPanel = byId('resource-search-results');
if (!searchPanel) {
 sections.forEach(section => {section.hidden = false;});
 return;
}
const searchList = searchPanel.querySelector('.resource-list');
const search = byId('resourceSearch');
const controls = byId('resource-results-controls');
const pageSizeSelect = byId('resource-page-size');
const count = byId('resource-results-count');
const showMore = byId('resource-show-more');
const toggle = byId('resource-category-toggle');
const links = [...byId('resource-category-list').querySelectorAll('a[href^="#"]:not([href="#"])')];
const phoneLayout = window.matchMedia('(max-width: 720px)');
const pageSizes = [20, 50, 100];
let pageSize = pageSizes[0];
let visibleCount = pageSize;
let activeTopic;
let filter;
let visibleRows = [];
let searchIndex;

byId('resource-directory-search').hidden = false;
toggle.hidden = false;
toggle.setAttribute('aria-expanded', 'false');
toggle.addEventListener('click', () => {
 toggle.setAttribute('aria-expanded', String(toggle.getAttribute('aria-expanded') !== 'true'));
});

function paginate(rows, list) {
 visibleRows = rows;
 if (controls.nextElementSibling !== list) list.before(controls);
 if (list.nextElementSibling !== showMore) list.after(showMore);
 controls.hidden = !rows.length;
 showMore.hidden = rows.length <= visibleCount;
 count.textContent = 'Showing ' + Math.min(visibleCount, rows.length) + ' of ' + rows.length;
}

function renderTopic(root) {
 const key = root.dataset.resourceTopic;
 const filterType = key === 'basic-needs' ? 'basic' : 'topic';
 const items = [...root.querySelectorAll('.resource-filter-item')];
 const matches = items.filter(item => filter === 'all' || item.dataset[filterType + 'Kind'] === filter);
 const visible = new Set(matches.slice(0, visibleCount));
 items.forEach(item => {item.hidden = !visible.has(item);});
 root.querySelectorAll('[data-basic-filter], [data-topic-filter]').forEach(button => {
  const selected = (button.dataset.basicFilter || button.dataset.topicFilter) === filter;
  button.classList.toggle('is-active', selected);
  button.setAttribute('aria-pressed', String(selected));
 });
 paginate(matches, root.querySelector('.resource-list'));
}

const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function buildSearchIndex() {
 const unique = new Map();
 for (const root of sections) {
  const topic = root.querySelector('h2').textContent;
  for (const item of root.querySelectorAll('.resource-filter-item')) {
   const title = item.querySelector('.resource-name');
   const name = title?.querySelector('b')?.textContent || title?.textContent || '';
   const key = [name, title?.getAttribute('href') || '', item.textContent].join('\n');
   if (!unique.has(key)) unique.set(key, {item, name: normalize(name), text: normalize(item.textContent), topics: []});
   unique.get(key).topics.push(normalize(topic));
  }
 }
 return [...unique.values()];
}

function renderSearch(query) {
 if (!searchIndex) searchIndex = buildSearchIndex();
 const words = query.split(' ');
 const matches = searchIndex.filter(({name,text,topics}) =>
  words.every(word => name.includes(word) || text.includes(word) || topics.some(topic => topic.includes(word))));
 matches.sort((a,b) => Number(b.name.includes(query)) - Number(a.name.includes(query)) || a.name.localeCompare(b.name));
 const cards = matches.slice(0, visibleCount).map(({item}) => {
  const card = item.cloneNode(true);
  card.hidden = false;
  return card;
 });
 searchList.replaceChildren(...cards);
 byId('resource-search-empty').hidden = !!matches.length;
 paginate(matches, searchList);
}

function render(focusResults = false) {
 const query = normalize(search.value);
 const id = location.hash.slice(1);
 const root = query ? null : sections.find(section => section.dataset.resourceTopic === id);
 sections.forEach(section => {section.hidden = section !== root;});
 for (const link of links) {
  if (root && link.hash === '#' + id) link.setAttribute('aria-current', 'true');
  else link.removeAttribute('aria-current');
 }
 overview.hidden = !!query || !!root;
 byId('community-volunteer-link').hidden = !!query;
 searchPanel.hidden = !query;
 if (query) renderSearch(query);
 else if (root) renderTopic(root);
 else {
  controls.hidden = true;
  showMore.hidden = true;
  visibleRows = [];
 }
 if (focusResults && root && phoneLayout.matches) {
  const heading = root.querySelector('h2');
  heading.tabIndex = -1;
  heading.focus({preventScroll:true});
  root.scrollIntoView({block:'start'});
 }
}

function openTopic(focusResults) {
 search.value = '';
 const id = location.hash.slice(1);
 if (activeTopic !== id) {
  activeTopic = id;
  filter = id === 'basic-needs' ? 'food' : 'all';
 }
 visibleCount = pageSize;
 toggle.setAttribute('aria-expanded', 'false');
 render(focusResults);
}

for (const root of sections) {
 const heading = root.querySelector('h2');
 const category = heading.textContent.trim();
 const link = document.createElement('a');
 link.href = 'contact.html?topic=resource&resource-category=' + encodeURIComponent(category) + '#contact';
 link.textContent = 'Suggest a resource for this category';
 const line = document.createElement('p');
 line.append(link);
 (root.querySelector('.sub') || heading).after(line);
}

container.addEventListener('click', event => {
 const button = event.target.closest('button');
 if (!button) return;
 if (button === showMore) return;
 if (button.classList.contains('resource-back')) location.hash = '';
 if (button.hasAttribute('data-open-mini-pantries')) byId('miniPantriesOpen')?.click();
 const nextFilter = button.dataset.basicFilter || button.dataset.topicFilter;
 if (nextFilter) {
  filter = nextFilter;
  visibleCount = pageSize;
  render();
 }
});

byId('resource-category-list').addEventListener('click', event => {
 const link = event.target.closest('a[href^="#"]:not([href="#"])');
 if (!link || link.hash !== location.hash || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
 event.preventDefault();
 openTopic(true);
});

pageSizeSelect.addEventListener('change', () => {
 const size = Number(pageSizeSelect.value);
 if (!pageSizes.includes(size)) return;
 pageSize = size;
 visibleCount = size;
 render();
});

showMore.addEventListener('click', () => {
 const previousCount = visibleCount;
 visibleCount += pageSize;
 render();
 const hit = visibleRows[previousCount];
 const firstAdded = normalize(search.value) ? searchList.children[previousCount] : hit;
 if (firstAdded) {
  firstAdded.tabIndex = -1;
  firstAdded.focus();
 }
});

search.addEventListener('input', () => {
 visibleCount = pageSize;
 render();
});
window.addEventListener('hashchange', () => openTopic(true));
openTopic(false);
})();
