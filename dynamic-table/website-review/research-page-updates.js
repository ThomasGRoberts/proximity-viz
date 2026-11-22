/* Keep publication author links in sync with the lab's published People roster. */
(() => {
  const table = document.getElementById('publications-overview');
  if (!table || table.dataset.esplAuthorRosterHook === '1') return;
  table.dataset.esplAuthorRosterHook = '1';
  table.dataset.esplPublicationSource = 'live-sheet';
  const rosterUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vREf4bo6ZknVw_ITND5Rtfe8RJufodwkihs9GZBf5p_7tlE5wwgDPcPd9jFjFa2wF4WJP296jhPuApz/pub?output=csv';
  const normalize = name => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.’']/g, '').replace(/\./g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const escape = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function parseCsv(text) {
    const rows = []; let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
      else if (char === ',' && !quoted) { row.push(field); field = ''; }
      else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
      else field += char;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const headings = (rows.shift() || []).map(value => value.replace(/^\uFEFF/, '').trim());
    return rows.filter(values => values.some(Boolean)).map(values => Object.fromEntries(headings.map((key, i) => [key, (values[i] || '').trim()])));
  }
  const links = new Map([[normalize('Thomas G. Roberts'), 'https://espl.ae.gatech.edu/people/#biography']]);
  const names = value => String(value || '').replace(/\s+and\s+/gi, ', ').split(/[;,]/).map(name => name.trim()).filter(Boolean);
  let scheduled = false;
  function linkify(text) {
    return names(text).map(name => {
      const url = links.get(normalize(name));
      return url ? `<a href="${escape(url)}">${escape(name)}</a>` : escape(name);
    }).join(', ');
  }
  function decorate() {
    scheduled = false;
    for (const row of table.querySelectorAll('.pw-table tbody tr:not(.pw-row-m)')) {
      const cell = row.querySelectorAll('td')[1];
      if (!cell) continue;
      const source = cell.textContent.trim();
      if (!source || cell.dataset.esplRosterSource === source) continue;
      cell.innerHTML = linkify(source);
      cell.dataset.esplRosterSource = source;
    }
    for (const field of table.querySelectorAll('.pw-row-m .pw-m-field')) {
      const label = field.querySelector('.lbl');
      if (label?.textContent.trim() !== 'Authors') continue;
      const source = field.textContent.replace(/^Authors\s*/, '').trim();
      if (!source || field.dataset.esplRosterSource === source) continue;
      field.innerHTML = `<span class="lbl">Authors</span>${linkify(source)}`;
      field.dataset.esplRosterSource = source;
    }
  }
  function schedule() { if (scheduled) return; scheduled = true; requestAnimationFrame(decorate); }
  new MutationObserver(schedule).observe(table, { childList: true, subtree: true });
  fetch(rosterUrl, { cache: 'no-store' }).then(response => { if (!response.ok) throw new Error(`People roster returned ${response.status}`); return response.text(); }).then(csv => {
    for (const member of parseCsv(csv)) {
      const anchor = member['Anchor Name'];
      if (!anchor || !member.Name) continue;
      const url = `https://espl.ae.gatech.edu/people/#${encodeURIComponent(anchor)}`;
      for (const name of [member.Name, ...names(member['Alternate Name(s)'])]) links.set(normalize(name), url);
    }
    table.dataset.esplAuthorRoster = 'live';
    table.querySelectorAll('[data-espl-roster-source]').forEach(cell => delete cell.dataset.esplRosterSource);
    schedule();
  }).catch(error => { table.dataset.esplAuthorRoster = 'unavailable'; console.warn('People author links could not refresh', error); });
})();
