import {timedFetch} from './http.js';

const storageKey = 'meetsimpler-language';
export const languages = {en: 'English', zh: '简体中文', 'zh-Hant': '繁體中文', ko: '한국어', ja: '日本語'};
export function normalizeLanguage(value) {
  const [code, ...parts] = String(value || '').trim().toLowerCase().split(/[-_]/);
  if (code === 'zh' && parts.some(part => ['hant', 'tw', 'hk', 'mo'].includes(part))) return 'zh-Hant';
  return Object.hasOwn(languages, code) ? code : 'en';
}
const htmlLanguage = code => code === 'zh' ? 'zh-Hans' : code;
let currentLanguage = 'en';
const catalogs = new Map();
let templates;

export function installMessages(messages, locale) {
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  templates ||= Object.keys(messages).filter(source => /\{\d+\}/.test(source)).map(source => {
    const parts = source.trim().split(/(\{\d+\})/);
    const fields = [], seen = new Map();
    const pattern = parts.map(part => {
      if (!/^\{\d+\}$/.test(part)) return escape(part).replace(/\s+/g, '\\s+');
      if (seen.has(part)) return `\\${seen.get(part)}`;
      fields.push(part); seen.set(part, fields.length); return '([\\s\\S]*?)';
    }).join('');
    return {pattern: new RegExp('^' + pattern + '$'), source, fields,
      prefix: parts[0].length,
      specificity: parts.filter(part => !/^\{\d+\}$/.test(part)).join('').length};
  }).sort((a, b) => b.prefix - a.prefix || b.specificity - a.specificity);
  catalogs.set(normalizeLanguage(locale), messages);
}

export function translate(source, locale = currentLanguage) {
  const messages = catalogs.get(normalizeLanguage(locale));
  if (!messages || typeof source !== 'string' || !source) return source;
  const normalized = source.trim().replace(/\s+/g, ' ');
  if (!normalized) return source;
  if (Object.hasOwn(messages, normalized)) return source.replace(source.trim(), messages[normalized]);
  for (const {pattern, source: template, fields} of templates) {
    const match = source.trim().match(pattern);
    if (match) return messages[template].replace(/\{\d+\}/g, field => {
      const value = match[fields.indexOf(field) + 1];
      return translate(value, locale);
    });
  }
  return source;
}

function startTranslation(document, storage, catalogLoader) {
  const originalText = new WeakMap(), originalAttributes = new WeakMap();
  const richText = new WeakMap();
  let requested = 'en';
  const loading = new Map();
  try {requested = normalizeLanguage(storage.getItem(storageKey));} catch (_) { /* Browser storage is optional. */ }
  const panel = document.createElement('div');
  panel.className = 'language-picker'; panel.dataset.i18nIgnore = '';
  panel.setAttribute('role', 'group'); panel.setAttribute('aria-labelledby', 'language-selection-heading');
  const heading = document.createElement('span');
  heading.id = 'language-selection-heading'; heading.className = 'language-heading';
  panel.append(heading);
  const links = new Map();
  for (const [value, name] of Object.entries(languages)) {
    const link = document.createElement('a');
    link.href = '#'; link.textContent = name; link.dataset.language = value;
    link.lang = htmlLanguage(value);
    link.addEventListener('click', event => {event.preventDefault(); void choose(value);});
    links.set(value, link); panel.append(link);
  }
  const status = document.createElement('span');
  status.className = 'language-status'; status.setAttribute('role', 'status'); status.hidden = true;
  panel.append(status);
  document.querySelector('header').after(panel);
  function refreshLinks() {
    for (const [code, link] of links) {
      if (code === currentLanguage) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }
  const excluded = node => node.parentElement?.closest('script, style, code, pre, [data-i18n-ignore], [data-i18n-template]');
  const observer = new MutationObserver(render);
  function render() {
    observer.disconnect();
    heading.textContent = translate('Language selection:');
    // Translate whole sentences while preserving links and emphasized labels.
    for (const element of document.querySelectorAll('[data-i18n-template]')) {
      let record = richText.get(element);
      if (!record) {
        record = {slots: new Map(Array.from(element.querySelectorAll('[data-i18n-slot]'), node =>
          [node.dataset.i18nSlot, {node, source: node.textContent}]))};
        richText.set(element, record);
      }
      if (record.language === currentLanguage) continue;
      const parts = translate(element.dataset.i18nTemplate).split(/(\{\d+\})/);
      element.replaceChildren(...parts.map(part => {
        const slot = part.match(/^\{(\d+)\}$/);
        if (!slot) return document.createTextNode(part);
        const {node, source} = record.slots.get(slot[1]);
        node.textContent = translate(source);
        return node;
      }));
      record.language = currentLanguage;
    }
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (excluded(node)) continue;
      const previous = originalText.get(node);
      const source = previous && node.data === previous.rendered ? previous.source : node.data;
      const rendered = translate(source);
      originalText.set(node, {source, rendered});
      if (node.data !== rendered) node.data = rendered;
    }
    for (const element of document.querySelectorAll('[alt], [title], [placeholder], [aria-label], meta[name="description"]')) {
      if (element.closest('[data-i18n-ignore]')) continue;
      const records = originalAttributes.get(element) || {};
      for (const name of ['alt', 'title', 'placeholder', 'aria-label', 'content']) {
        if (!element.hasAttribute(name)) continue;
        const previous = records[name], value = element.getAttribute(name);
        const source = previous && previous.rendered === value ? previous.source : value;
        const rendered = translate(source); records[name] = {source, rendered};
        if (value !== rendered) element.setAttribute(name, rendered);
      }
      originalAttributes.set(element, records);
    }
    for (const snapshot of document.querySelectorAll('img[data-localized-snapshot]')) {
      const source = snapshot.dataset.localizedSnapshot;
      const path = currentLanguage === 'en' ? source : source.replace(/\.webp$/, `.${currentLanguage}.webp`);
      if (snapshot.getAttribute('src') !== path) snapshot.setAttribute('src', path);
      const link = snapshot.closest('a');
      if (link && link.getAttribute('href') !== path) link.setAttribute('href', path);
    }
    document.documentElement.lang = htmlLanguage(currentLanguage);
    observer.observe(document.documentElement, {subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ['alt', 'title', 'placeholder', 'aria-label', 'content']});
  }
  async function choose(value) {
    requested = normalizeLanguage(value);
    const choice = requested;
    if (choice !== 'en') {
      try {
        if (!loading.has(choice)) loading.set(choice, catalogLoader(choice)
          .then(catalog => installMessages(catalog, choice))
          .catch(error => {loading.delete(choice); throw error;}));
        await loading.get(choice);
      } catch (_) {
        if (requested === choice) {
          status.hidden = false;
          status.textContent = translate('Language unavailable. Try again.');
        }
        return;
      }
    }
    if (requested !== choice) return;
    currentLanguage = choice; refreshLinks(); status.hidden = true; status.textContent = '';
    try {storage.setItem(storageKey, choice);} catch (_) { /* Selection still works for this visit. */ }
    render();
  }
  refreshLinks();
  render();
  void choose(requested);
}

if (typeof document !== 'undefined') {
  let storage;
  try {storage = localStorage;} catch (_) { /* Browser storage is optional. */ }
  startTranslation(document, storage, async locale => {
    const response = await timedFetch(new URL(`./locales/${locale}.json`, import.meta.url));
    if (!response.ok) throw new Error('Language unavailable');
    return response.json();
  });
}
