'use strict';

const paths = {
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  bookmark: '<path d="M6 4h12v17l-6-4-6 4V4Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18"/>',
  game: '<path d="M6 8h12c2 0 4 9 3 11s-4-1-5-3H8c-1 2-4 5-5 3S4 8 6 8Z"/><path d="M7 10v5m-2.5-2.5h5M16 11h.01M18 14h.01"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c6 5 6 13 0 18-6-5-6-13 0-18Z"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M7 3v4m10-4v4"/>',
  refresh: '<path d="M20 8a8.5 8.5 0 1 0 .5 7M20 3v5h-5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
};
const icon = (name, extra = '') => `<svg class="icon ${extra}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeURL = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : '#'; } catch { return '#'; } };
const detail = value => value?.summary || value?.detail || '';
const categories = {
  coding: {label:'Coding', full:'Coding competitions', link:'index.html', icon:'code', title:'Your next build.<br>Your next big win.', description:'Hackathons and coding challenges where your AI tools are welcome. Find a worthwhile problem. Build something that matters.', accent:'BUILD / 01'},
  'game-development': {label:'Game development', full:'Game development events', link:'games.html', icon:'game', title:'Small idea.<br>Playable world.', description:'Game jams and development competitions that welcome AI. Bring your tools, make something playable, and put it out there.', accent:'PLAY / 02'},
  other: {label:'Other competitions', full:'Other competitions', link:'other.html', icon:'spark', title:'Create outside<br>the usual lines.', description:'Film, art, design, and everything beyond code. Competitions that make room for your imagination and your AI tools.', accent:'CREATE / 03'},
};
const category = document.body.dataset.category in categories ? document.body.dataset.category : 'coding';
const page = categories[category];
let dataset = {events:[], sources:[]};
let research = null;
let usable = [];
let shownReviewIds = '';
let state = {query:'', mode:'all', deadline:'all', sort:'deadline', saved:false};
let saved;
try { const stored = JSON.parse(localStorage.getItem('openfield-saved') || '[]'); saved = new Set(Array.isArray(stored) ? stored.filter(x => typeof x === 'string') : []); } catch { saved = new Set(); }
const now = () => Date.now();
const dateTime = value => new Intl.DateTimeFormat('en-IN', {day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date(value)) + ' IST';
const shortDate = value => new Intl.DateTimeFormat('en-IN', {day:'numeric',month:'short',timeZone:'Asia/Kolkata'}).format(new Date(value));
const deadline = event => event.registrationDeadline || event.deadline;
const pendingReview = () => (dataset.underReview||[]).filter(event=>!event.entryClosesAt||Date.parse(event.entryClosesAt)>now());
const dateOnly = event => event.deadlinePrecision === 'date';
const deadlineDisplay = event => dateOnly(event) ? event.deadlineLabel || `${shortDate(event.deadlineDate)}; exact time not published` : dateTime(event.deadline);
const canPublish = event => {
  const verified = Date.parse(event.verifiedAt), close = Date.parse(deadline(event));
  return event.verificationStatus === 'verified' && event.eligibility?.indiaEligible === true && ['allowed','conditional'].includes(event.aiPolicy?.status) && event.cashPrize?.usdAmount > 200 && Number.isFinite(verified) && verified <= now() + 300000 && now() - verified <= 7 * 86400000 && close > now() && [event.aiPolicy?.evidence,event.eligibility?.evidence,event.prizeEvidence].every(e => e?.quote && safeURL(e.url) !== '#');
};
const cash = event => event.cashPrize?.display || new Intl.NumberFormat('en-US',{style:'currency',currency:event.cashPrize?.currency || 'USD',maximumFractionDigits:0}).format(event.cashPrize?.amount || 0);

document.getElementById('app').innerHTML = `
  <header class="site-header"><div class="header-inner">
    <a href="index.html" class="brand" aria-label="Openfield home"><span class="brand-mark"><i></i><i></i></span><span>openfield<span class="brand-dot">.</span></span></a>
    <nav class="main-nav" aria-label="Competition categories">${Object.entries(categories).map(([key,c]) => `<a href="${c.link}" class="${category===key?'active':''}" ${category===key?'aria-current="page"':''}>${c.label}<span data-count="${key}" class="nav-count">–</span></a>`).join('')}</nav>
    <button class="saved-button" id="saved-toggle" aria-pressed="false">${icon('bookmark')}<span>Saved</span><b id="saved-count">${saved.size}</b></button>
  </div></header>
  <main class="page-shell">
    <section class="intro" aria-labelledby="page-title"><div class="intro-copy">
      <div class="eyebrow"><span class="live-dot"></span> A CLEARER FIELD OF OPPORTUNITY <span class="edition">${page.accent}</span></div>
      <h1 id="page-title">${page.title}</h1><p class="intro-description">${page.description}</p>
      <a class="text-link" href="#opportunities">Find your next opportunity <span>↓</span></a>
    </div><aside class="promise-card"><div class="promise-top"><span>LESS SEARCHING. MORE MAKING.</span>${icon('shield')}</div>
      <h2>A fair shot.<br>A real reward.</h2><p>Every event here clears all three checks.</p>
      <ul><li><span class="check-circle">${icon('check')}</span><div><strong>Open to India</strong><small>Geographic eligibility checked</small></div><span class="flag-india" aria-hidden="true"></span></li>
      <li><span class="check-circle">${icon('check')}</span><div><strong>AI tools allowed</strong><small>Permission backed by official rules</small></div>${icon('spark','promise-end')}</li>
      <li><span class="check-circle">${icon('check')}</span><div><strong>Cash pool above $200</strong><small>Credits and swag don’t count</small></div><span class="dollar">$</span></li></ul>
      <button class="how-button" data-open="method">How we verify ${icon('arrow')}</button>
    </aside></section>
    <section class="field-status" aria-label="Feed status"><div><span class="status-dot"></span><strong id="feed-count">Checking the field</strong><span class="status-divider"></span><span>All deadlines in IST</span></div><button id="refresh-status" data-open="sources">${icon('refresh')}<span id="checked-at">Loading source checks…</span>${icon('arrow')}</button></section>
    <div class="availability-note"><p id="availability-copy">Counts show events that are open now. Closed entries leave the board automatically.</p><button class="text-link" data-open="availability">Closed & unconfirmed events ${icon('arrow')}</button></div>
    <section id="opportunities" class="opportunities" aria-labelledby="list-title"><div class="section-heading"><div><span class="eyebrow section-eyebrow">THE OPPORTUNITY BOARD</span><h2 id="list-title">${page.full}<span id="list-count">–</span></h2></div><span class="strict-label">${icon('shield')} Strict filters, always on</span></div>
      <div class="toolbar"><label class="search-field">${icon('search')}<input id="search" type="search" placeholder="Search events, skills, organisers…" aria-label="Search events, skills, organisers" autocomplete="off"><kbd>/</kbd></label>
        <label class="select-field"><span>Location</span><select id="mode" aria-label="Filter by event location"><option value="all">Any location</option><option value="online">Online</option><option value="hybrid">Hybrid</option><option value="in-person">In person</option></select></label>
        <label class="select-field"><span>Deadline</span><select id="deadline" aria-label="Filter by deadline"><option value="all">Any time</option><option value="7">Next 7 days</option><option value="30">Next 30 days</option></select></label>
        <label class="select-field sort-field"><span>Sort by</span><select id="sort" aria-label="Sort events"><option value="deadline">Closing soon</option><option value="prize">Highest verified USD pool</option><option value="recent">Recently verified</option></select></label>
      </div>
      <div class="results-meta"><span id="result-summary" role="status" aria-live="polite">Finding verified opportunities…</span><button id="clear-filters" hidden>Clear filters ${icon('close')}</button></div>
      <div id="event-grid" class="event-grid" aria-busy="true">${[1,2,3].map(()=>'<div class="skeleton-card"><div></div><div></div><div></div></div>').join('')}</div>
      <div class="coverage-note">${icon('info')}<p id="coverage-copy"><strong>Initial, curated coverage.</strong> The board is a verified subset of events we have reviewed. Discovery is ongoing; this is not a complete list of every event online.</p><button data-open="sources">View coverage ${icon('arrow')}</button></div>
      <section id="research-snapshot" class="research-snapshot" aria-labelledby="research-title" hidden></section>
    </section>
    <section class="bottom-banner"><div class="banner-symbol" aria-hidden="true">✳</div><div><span class="eyebrow">TOOLS CHANGE. CURIOSITY DOESN’T.</span><h2>Your next idea deserves a starting line.</h2><p>Explore another field. The same three checks follow you.</p></div><div class="banner-links">${Object.entries(categories).filter(([key])=>key!==category).map(([,c])=>`<a href="${c.link}">${c.label} ${icon('arrow')}</a>`).join('')}</div></section>
  </main>
  <footer class="site-footer"><a class="brand footer-brand" href="index.html"><span class="brand-mark"><i></i><i></i></span><span>openfield.</span></a><p>A little less noise. A little more possibility.</p><div><button data-open="method">Our standard</button><a href="events.json" download="openfield-events.json">Open data ${icon('download')}</a></div></footer>
  <dialog id="detail-dialog" aria-labelledby="dialog-title"><div class="dialog-wrap"><button class="dialog-close" aria-label="Close dialog">${icon('close')}</button><div id="dialog-content"></div></div></dialog>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>`;

function render() {
  usable = dataset.events.filter(canPublish);
  shownReviewIds = pendingReview().map(event=>event.id).join(',');
  Object.keys(categories).forEach(key => { document.querySelector(`[data-count="${key}"]`).textContent = usable.filter(e=>e.category===key).length; });
  const current = usable.filter(e => e.category===category);
  document.getElementById('list-count').textContent = current.length;
  document.getElementById('feed-count').textContent = `${usable.length} verified opportunities across 3 fields`;
  document.getElementById('availability-copy').textContent = `Open now: ${liveCounts()}. Counts fall when entry closes or an evidence review expires.`;
  const latest = dataset.researchUpdatedAt || dataset.refresh?.lastAttemptAt || dataset.updatedAt;
  document.getElementById('checked-at').textContent = latest ? `${dataset.researchUpdatedAt?'Latest review':dataset.refresh?.sourceFailures?'Last scan attempt':'Last checked'} ${dateTime(latest)}` : 'Sources awaiting first check';
  const query = state.query.trim().toLowerCase();
  let events = current.filter(event => (!query || [event.title,event.organizer,event.summary,...(event.tags||[])].join(' ').toLowerCase().includes(query)) && (state.mode==='all'||event.mode===state.mode) && (state.deadline==='all'||Date.parse(deadline(event))-now()<=Number(state.deadline)*86400000) && (!state.saved||saved.has(event.id)));
  events.sort((a,b) => state.sort==='prize' ? b.cashPrize.usdAmount-a.cashPrize.usdAmount : state.sort==='recent' ? Date.parse(b.verifiedAt)-Date.parse(a.verifiedAt) : Date.parse(deadline(a))-Date.parse(deadline(b)));
  document.getElementById('result-summary').textContent = `${events.length} ${state.saved?'saved ':''}${events.length===1?'opportunity':'opportunities'}${query ? ` matching “${state.query.trim()}”` : ' to make your next move'}`;
  document.getElementById('clear-filters').hidden = !(query||state.mode!=='all'||state.deadline!=='all'||state.saved);
  const grid = document.getElementById('event-grid');
  grid.setAttribute('aria-busy','false');
  grid.innerHTML = events.length ? events.map(card).join('') : `<div class="empty-state">${icon(state.saved?'bookmark':'search')}<h3>${state.saved?'Your shortlist starts here.':'Nothing in this field just yet.'}</h3><p>${state.saved?'Save an event using its bookmark. Your shortlist stays in this browser.':'Try a wider search or check another category. We keep unverified and expired events off the board.'}</p><button class="button" id="reset-empty">Reset filters ${icon('refresh')}</button></div>`;
  document.getElementById('saved-count').textContent = saved.size;
  document.getElementById('saved-toggle').setAttribute('aria-pressed',String(state.saved));
  const pending=pendingReview().filter(e=>e.category===category).length;
  document.getElementById('coverage-copy').innerHTML=`<strong>Evidence reviewed before publication.</strong> ${current.length} verified ${current.length===1?'event':'events'} in this field${pending?`, ${pending} under review`:''}. Discovery is ongoing; this is not a complete list of every event online. View coverage to see what’s being checked.`;
  renderResearch();
}

function renderResearch() {
  const panel = document.getElementById('research-snapshot');
  if (!research) { panel.hidden = true; return; }
  panel.hidden = false;
  const pending = pendingReview().filter(event => event.category === category).length;
  const update = research.latestUpdate;
  const updateNote = update ? `<div class="dialog-note"><strong>Latest research · ${shortDate(update.checkedAt)}</strong><p><strong>Open now:</strong> ${escapeHTML(liveCounts())}.</p><p>The review recorded ${escapeHTML(update.qualifiedCount)} qualifying events at that time. Live counts exclude closed entries and expired evidence checks.</p><button class="text-link" data-open="updates">What changed ${icon('arrow')}</button></div>` : '';
  panel.innerHTML = `${updateNote}<div class="research-heading"><div><span class="eyebrow">RESEARCH SNAPSHOT / ${shortDate(research.checkedAt).toUpperCase()}</span><h3 id="research-title">A wider search. The same checks.</h3><p>Searches covered ${escapeHTML(research.domainCount)} requested domains, event directories, and official contest pages. Only qualifying, still-open events appear above.</p></div><span class="research-number">${escapeHTML(research.domainCount)}<small>domains searched</small></span></div><div class="research-actions"><button data-open="research">How we searched ${icon('arrow')}</button><button data-open="sources">${pending} ${pending===1?'lead':'leads'} under review in this field ${icon('arrow')}</button>${research.documentUrl?`<a href="${safeLocalPath(research.documentUrl)}" download>Original research · 26 Oct ${icon('download')}</a>`:''}</div>`;
}

const safeLocalPath = value => typeof value === 'string' && /^(?:(?:docs|research|data)\/)?[a-zA-Z0-9._-]+$/.test(value) && !value.includes('..') ? value : '#';

function card(event) {
  const remaining = Math.ceil((Date.parse(deadline(event))-now())/86400000);
  const urgent = remaining<=7;
  const initial = event.organizer.split(/[\s×&]+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();
  const status = event.startsAt && Date.parse(event.startsAt)>now() ? 'Registration open' : 'Open now';
  return `<article class="event-card"><div class="card-header"><div class="organizer-logo logo-${event.category}" aria-hidden="true">${escapeHTML(event.logoText||initial)}</div><div class="organizer-info"><span>${escapeHTML(event.organizer)}</span><small>${icon('globe')}${escapeHTML(event.mode==='online'?'Online · Join from India':event.location||'India eligible')}</small></div><button class="bookmark-button ${saved.has(event.id)?'is-saved':''}" data-save="${escapeHTML(event.id)}" aria-pressed="${saved.has(event.id)}" aria-label="${saved.has(event.id)?'Unsave':'Save'} ${escapeHTML(event.title)}">${icon('bookmark')}</button></div>
    <div class="card-badges"><span class="open-badge"><i></i>${status}</span>${urgent?'<span class="urgent-badge">Closing soon</span>':''}</div>
    <h3><a href="${safeURL(event.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(event.title)}</a></h3><p class="card-summary">${escapeHTML(event.summary)}</p>
    <div class="tags">${(event.tags||[]).slice(0,3).map(tag=>`<span>${escapeHTML(tag)}</span>`).join('')}</div>
    <div class="card-facts"><div><span class="fact-label">CASH PRIZE POOL</span><strong class="prize-amount ${cash(event).length>15?'prize-long':''}">${escapeHTML(cash(event))}</strong><small>${escapeHTML(event.cashPrize.noteShort||'Cash rewards · before taxes')}</small></div><div class="deadline-fact"><span class="fact-label">${event.registrationDeadline?'REGISTER BY':'SUBMIT BY'}</span><strong>${shortDate(dateOnly(event)?event.deadlineDate:deadline(event))}</strong><small>${dateOnly(event)?'Time not stated':remaining===1?'1 day left':`${remaining} days left`}</small></div></div>
    <div class="verification-strip"><span>${icon('check')} India eligible</span><span>${icon('spark')} ${event.aiPolicy.status==='conditional'?'AI, with conditions':'AI welcome'}</span></div>
    <div class="card-actions"><button data-event="${escapeHTML(event.id)}">View evidence ${icon('shield')}</button><a href="${safeURL(event.url)}" target="_blank" rel="noopener noreferrer">Explore event ${icon('arrow')}</a></div>
  </article>`;
}

function eventDialog(event) {
  const proof = (label,summary,evidence,name) => `<section class="proof-section"><h3>${icon(name)}${label}</h3><p>${escapeHTML(summary)}</p>${evidence.kind==='summary'?`<p class="evidence-summary"><span>Source summary</span>${escapeHTML(evidence.quote)}</p>`:`<blockquote>“${escapeHTML(evidence.quote)}”</blockquote>`}<a class="text-link" href="${safeURL(evidence.url)}" target="_blank" rel="noopener noreferrer">Read official source ${icon('arrow')}</a></section>`;
  return `<span class="eyebrow">THE RECEIPTS / VERIFIED ${shortDate(event.verifiedAt).toUpperCase()}</span><h2 id="dialog-title">${escapeHTML(event.title)}</h2><p class="dialog-intro">${escapeHTML(event.organizer)} · ${escapeHTML(cash(event))} cash pool</p>
    ${proof('Open to Indian participants',detail(event.eligibility),event.eligibility.evidence,'globe')}
    ${proof('AI permission',detail(event.aiPolicy),event.aiPolicy.evidence,'spark')}
    ${proof('Cash, not credits',event.cashPrize.note||'The stated cash pool exceeds US$200. Merchandise, subscriptions, and credits are excluded.',event.prizeEvidence,'shield')}
    ${event.cashPrize.conversionSource?`<p class="conversion-note">USD equivalent uses a rate dated ${shortDate(event.cashPrize.conversionDate)}. <a class="text-link" href="${safeURL(event.cashPrize.conversionSource)}" target="_blank" rel="noopener noreferrer">View conversion source ${icon('arrow')}</a></p>`:''}
    <section class="proof-section"><h3>${icon('calendar')}${dateOnly(event)?'Published closing date':'Your dates, in IST'}</h3>${event.registrationDeadline&&!dateOnly(event)?`<p><strong>Registration:</strong> ${dateTime(event.registrationDeadline)}</p>`:''}<p><strong>Submission:</strong> ${escapeHTML(deadlineDisplay(event))}</p>${dateOnly(event)?'<p class="muted">The organiser has not published an exact closing time or timezone. Submit early and confirm the deadline on the official page.</p>':''}${event.startsAt?`<p><strong>Starts:</strong> ${dateTime(event.startsAt)}</p>`:''}<p class="muted">Checked ${dateTime(event.verifiedAt)}. Geographic eligibility is confirmed; the organiser’s age, team, tool, and payment conditions still apply.</p></section>
    ${event.entryFee||event.teamSize?`<section class="proof-section"><h3>${icon('info')}Entry details</h3>${event.entryFee?`<p><strong>Entry fee:</strong> ${escapeHTML(event.entryFee)}</p>`:''}${event.teamSize?`<p><strong>Team size:</strong> ${escapeHTML(event.teamSize)}</p>`:''}</section>`:''}
    ${(event.conditions||[]).length?`<section class="proof-section"><h3>${icon('info')}Before you enter</h3><ul class="conditions-list">${event.conditions.map(condition=>`<li>${escapeHTML(condition)}</li>`).join('')}</ul></section>`:''}
    ${(event.extraSources||[]).length?`<section class="proof-section"><h3>${icon('globe')}More official sources</h3><div class="extra-source-links">${event.extraSources.map(source=>`<a class="text-link" href="${safeURL(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.label||'Official page')} ${icon('arrow')}</a>`).join('')}</div></section>`:''}
    <div class="dialog-actions">${dateOnly(event)?'':`<button class="button secondary" data-calendar="${escapeHTML(event.id)}">${icon('calendar')} Add deadline</button>`}<a class="button" href="${safeURL(event.url)}" target="_blank" rel="noopener noreferrer">Visit event ${icon('arrow')}</a></div>`;
}

function methodDialog() {
  return `<span class="eyebrow">A HIGHER BAR FOR THE BOARD</span><h2 id="dialog-title">Good opportunities.<br>With the evidence.</h2><p class="dialog-intro">The same standard applies to coding, game development, and every other competition.</p><div class="method-steps">
    <section><span>01</span><div><h3>Indian participants can enter</h3><p>We read geographic eligibility and excluded-country clauses. Worldwide events qualify when India is eligible. Age, occupation, team, and payment restrictions are shown separately.</p></div></section>
    <section><span>02</span><div><h3>AI use is explicitly permitted</h3><p>We look for official permission and show its limits. AI code, generated artwork, and AI in the finished product can have different rules. Silence about AI does not qualify.</p></div></section>
    <section><span>03</span><div><h3>Actual cash exceeds US$200</h3><p>The total cash pool must be strictly above $200. Exactly $200 fails. Credits, swag, grants contingent on future approval, and estimated prize value are excluded. Shared or category pools are labelled.</p></div></section>
    <section><span>04</span><div><h3>Fresh rules, clear sources</h3><p>Each event has a dated evidence review. This site publishes reviewed research updates. Verification expires after seven days, and closed entries disappear automatically. New or changed rules need a reviewed, published update.</p></div></section></div><p class="dialog-note">New candidates require evidence review before publication. This is broad, source-based discovery, with no claim to cover every event on the internet.</p>`;
}

function sourcesDialog() {
  const refresh = dataset.refresh || {};
  const statuses = refresh.sourceStatuses || [];
  const sources = dataset.sources || [];
  const failure = refresh.sourceFailures || 0;
  const pending=pendingReview().filter(event=>event.category===category);
  const discovery=refresh.discovery||{};
  return `<span class="eyebrow">TRANSPARENT BY DEFAULT</span><h2 id="dialog-title">What’s on our radar.</h2><p class="dialog-intro">Official rules first. A source link behind every published opportunity.</p><div class="source-summary"><strong>${usable.length}</strong><span>verified open events<br>across three categories</span></div><p>${dataset.researchUpdatedAt?`Latest research review: ${dateTime(dataset.researchUpdatedAt)}. Each event shows its own evidence date.`:refresh.lastAttemptAt?`Last source scan: ${dateTime(refresh.lastAttemptAt)}.`:`Initial research checked ${dateTime(dataset.updatedAt)}.`} ${failure?`${failure} source checks could not be completed; previous verification dates are preserved.`:''}</p>
    ${research?'<button class="research-dialog-link" data-open="research">Explore the 100-domain research snapshot '+icon('arrow')+'</button>':''}
    <div class="source-list">${sources.map(source => {const s=statuses.find(s=>s.name===source.name||s.id===source.id);const labels={ok:'Checked',error:'Check unavailable',partial_failure:'Partial check',blocked:'Manual review',not_checked:'Not yet checked',manual:'Manually reviewed'};return `<a href="${safeURL(source.url||source.baseUrl)}" target="_blank" rel="noopener noreferrer"><div><strong>${escapeHTML(source.name)}</strong><small>${escapeHTML(source.access||'Official event rules')}</small></div><span>${escapeHTML(labels[s?.status]||source.status||'Curated')}${icon('arrow')}</span></a>`;}).join('')||'<p>Verified organiser pages are linked on every event card.</p>'}</div>
    ${pending.length?`<section class="review-queue"><span class="eyebrow">TRACKED, NOT YET QUALIFIED</span><h3>Still being checked</h3><p>These events are excluded from the verified board until every requirement is confirmed.</p>${pending.map(event=>`<article><a href="${safeURL(event.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(event.title)} ${icon('arrow')}</a><span>Under review</span><p>${escapeHTML(event.reviewReason||'Official eligibility, AI permission or cash evidence is still being checked.')}</p></article>`).join('')}</section>`:''}
    <div class="dialog-note"><strong>How updates work</strong><p>This deployment publishes reviewed research snapshots. Closed or stale entries hide automatically. New discoveries and rule changes need a reviewed, published update; automatic source rescanning is not enabled.</p>${discovery.reviewCandidates?`<p>${escapeHTML(discovery.reviewCandidates)} discovered links are in the review queue across the source feeds. These are leads, not confirmed eligible competitions.</p>`:''}<p>Devpost and other sources that restrict scraping are discovery links, not automated data feeds. Manually checked sources keep their original verification date and expire after seven days unless reviewed again.</p></div>`;
}

function updatesDialog() {
  const update = research?.latestUpdate;
  if (!update) return sourcesDialog();
  return `<span class="eyebrow">LATEST RESEARCH / ${shortDate(update.checkedAt).toUpperCase()}</span><h2 id="dialog-title">What changed.</h2><p class="dialog-intro">Open now: ${escapeHTML(liveCounts())}.</p><p><strong>At the time of this review:</strong> ${escapeHTML(update.summary)}</p><p>Reviewed ${dateTime(update.checkedAt)}. The original 100-domain research and document remain dated 26 October.</p><ul class="research-record-list">${(update.changes||[]).map(item=>`<li><a href="${safeURL(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.title)} ${icon('arrow')}</a><span class="domain-status">${escapeHTML(item.outcome)}</span><p>${escapeHTML(item.reason)}</p></li>`).join('')}</ul><p class="dialog-note">Only events with confirmed Indian eligibility, explicit AI permission, cash above US$200 and open entry dates appear on the board.</p>`;
}

function liveCounts() {
  return `${usable.filter(e=>e.category==='coding').length} coding, ${usable.filter(e=>e.category==='game-development').length} game development, ${usable.filter(e=>e.category==='other').length} other`;
}

function availabilityDialog() {
  const records = new Map((dataset.unlistedEvents||[]).map(item=>[item.id,item]));
  const publishedIds = new Set(dataset.events.filter(canPublish).map(item=>item.id));
  for (const item of research?.latestUpdate?.changes||[]) {
    if (!publishedIds.has(item.id)) records.set(item.id,{...records.get(item.id),...item});
  }
  for (const event of dataset.events.filter(event=>!canPublish(event))) {
    const closed = Date.parse(deadline(event)) <= now();
    const uncertain = closed && event.deadlineIsConservativeCutoff;
    records.set(event.id,{id:event.id,title:event.title,url:event.url,deadline:deadline(event),deadlineIsConservativeCutoff:event.deadlineIsConservativeCutoff,deadlineLabel:event.deadlineLabel,outcome:uncertain?'Exact closing time unconfirmed':closed?'Entry closed':'Needs a fresh check',reason:uncertain?'The conservative date-only cutoff passed. Check the official page; this does not prove entry has closed.':closed?'The entry deadline has passed.':'The last complete evidence review is over seven days old; the event may still be open.'});
  }
  const items=[...records.values()];
  const closed=items.filter(item=>!item.deadlineIsConservativeCutoff&&((Number.isFinite(Date.parse(item.deadline))&&Date.parse(item.deadline)<=now())||/closed/i.test(item.outcome)));
  const other=items.filter(item=>!closed.includes(item));
  const row=item=>`<li><a href="${safeURL(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.title)} ${icon('arrow')}</a><span class="domain-status">${escapeHTML(item.outcome)}</span><p>${escapeHTML(item.reason)}</p>${Number.isFinite(Date.parse(item.deadline))?`<p>Entry cutoff: ${escapeHTML(item.deadlineIsConservativeCutoff?item.deadlineLabel||'Date-only deadline; exact time unconfirmed':dateTime(item.deadline))}</p>`:''}</li>`;
  return `<span class="eyebrow">COUNTS & COVERAGE</span><h2 id="dialog-title">Why a listing is missing.</h2><p class="dialog-intro">Open now: ${escapeHTML(liveCounts())}.</p><p>Counts describe entry availability now, not the number found in an older research snapshot. Closed entries are removed automatically. An expired evidence check needs a fresh review; it does not mean the organizer closed the event.</p><section class="research-coverage"><details open><summary>Closed entries <span>${closed.length}</span></summary><ul class="research-record-list">${closed.sort((a,b)=>Date.parse(b.deadline||0)-Date.parse(a.deadline||0)).map(row).join('')||'<li>No closed entries recorded.</li>'}</ul></details><details open><summary>Unconfirmed or excluded <span>${other.length}</span></summary><p>These are research leads, not qualifying recommendations. Official sources and the reason for exclusion are shown below.</p><ul class="research-record-list">${other.map(row).join('')||'<li>No other exclusions recorded.</li>'}</ul></details></section>`;
}

function researchDialog() {
  if (!research) return sourcesDialog();
  const rows = research.coverage || [];
  const leads = research.reviewLeads || [];
  const excluded = research.excluded || [];
  const resultLabel = status => ({qualified:'Qualifying event found',verified_event:'Qualifying event found',needs_review:'Lead needs review',pending:'Lead needs review',no_concrete_event:'No concrete event found',no_qualifying_event:'No qualifying event found',excluded:'Did not qualify',closed:'Closed',access_limited:'Access limited'}[status] || String(status||'Reviewed').replaceAll('_',' '));
  const record = event => `<li><a href="${safeURL(event.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(event.title)} ${icon('arrow')}</a><span class="domain-status">${escapeHTML(categories[event.category]?.label||'Competition')}</span><p>${escapeHTML(event.reason||event.reviewReason||'Further official evidence is required.')}</p>${event.cash?`<p><strong>Reported prize:</strong> ${escapeHTML(event.cash)}</p>`:''}${event.deadlineLabel?`<p><strong>Reported deadline:</strong> ${escapeHTML(event.deadlineLabel)}</p>`:''}</li>`;
  return `<span class="eyebrow">SEARCH COVERAGE / ${shortDate(research.checkedAt).toUpperCase()}</span><h2 id="dialog-title">How we found the field.</h2><p class="dialog-intro">A focused research pass across your ${escapeHTML(research.domainCount)} domains, plus wider event searches. This is a dated snapshot, not a claim that every online competition has been found.</p>
    <div class="research-stats"><div><strong>${escapeHTML(research.qualifiedCount)}</strong><span>qualified at review</span></div><div><strong>${escapeHTML(research.underReviewCount)}</strong><span>unconfirmed leads</span></div><div><strong>${escapeHTML(research.excludedCount)}</strong><span>closed or excluded</span></div></div>
    <section class="proof-section"><h3>${icon('search')}The extraction method</h3><ol class="research-method">${(research.method||[]).map(step=>`<li>${escapeHTML(step)}</li>`).join('')}</ol><p>Counts here describe the research snapshot. The opportunity board automatically hides entries that have closed or whose verification has expired.</p></section>
    <section class="research-coverage"><h3>Domains searched</h3><p>A search with no concrete match is recorded briefly. It does not prove that a platform has no competitions.</p>${['coding','game-development'].map(key=>{const group=rows.filter(row=>row.category===key);return `<details><summary>${categories[key].label} <span>${group.length} domains</span></summary><ul class="domain-list">${group.map(row=>`<li><a href="${safeURL('https://'+row.domain)}" target="_blank" rel="noopener noreferrer">${escapeHTML(row.domain)} ${icon('arrow')}</a><span class="domain-status">${escapeHTML(resultLabel(row.status))}</span>${row.note?`<p>${escapeHTML(row.note)}</p>`:''}</li>`).join('')}</ul></details>`;}).join('')}</section>
    ${leads.length?`<section class="research-coverage"><details><summary>Unconfirmed leads <span>${leads.length} in snapshot</span></summary><p>These are separate from the qualifying board. One or more of AI permission, Indian eligibility, cash value, or event details still needs confirmation.</p><ul class="research-record-list">${leads.map(record).join('')}</ul></details></section>`:''}
    ${excluded.length?`<section class="research-coverage"><details><summary>Closed or excluded <span>${excluded.length} reviewed</span></summary><ul class="research-record-list">${excluded.map(record).join('')}</ul></details></section>`:''}
    <div class="dialog-actions"><a class="button secondary" href="research-coverage.json" download="openfield-research-coverage.json">${icon('download')} Research data</a>${research.documentUrl?`<a class="button" href="${safeLocalPath(research.documentUrl)}" download>${icon('download')} Full document</a>`:''}</div>`;
}

const dialog = document.getElementById('detail-dialog');
let returnFocus;
function openDialog(content,trigger) { if(!dialog.open)returnFocus=trigger||document.activeElement; document.getElementById('dialog-content').innerHTML=content; if(!dialog.open)dialog.showModal(); dialog.scrollTop=0; document.body.classList.add('dialog-open'); }
function closeDialog() { dialog.close(); document.body.classList.remove('dialog-open'); returnFocus?.focus(); }
dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');returnFocus?.focus();});
dialog.addEventListener('click',event=>{if(event.target===dialog)closeDialog();});
let toastTimer;
function toast(message) {const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2500);}
function reset() {state={query:'',mode:'all',deadline:'all',sort:'deadline',saved:false};['search','mode','deadline','sort'].forEach(id=>document.getElementById(id).value=id==='search'?'':state[id]);render();}
document.getElementById('search').addEventListener('input',event=>{state.query=event.target.value;render();});
['mode','deadline','sort'].forEach(id=>document.getElementById(id).addEventListener('change',event=>{state[id]=event.target.value;render();}));
document.getElementById('saved-toggle').addEventListener('click',()=>{state.saved=!state.saved;render();document.getElementById('opportunities').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
document.getElementById('clear-filters').addEventListener('click',reset);
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.classList.contains('dialog-close'))return closeDialog();
  if(button.id==='reset-empty')return reset();
  if(button.dataset.open)return openDialog(button.dataset.open==='method'?methodDialog():button.dataset.open==='research'?researchDialog():button.dataset.open==='updates'?updatesDialog():button.dataset.open==='availability'?availabilityDialog():sourcesDialog(),button);
  if(button.dataset.event){const e=usable.find(e=>e.id===button.dataset.event);if(e)openDialog(eventDialog(e),button);}
  if(button.dataset.save){const id=button.dataset.save;saved.has(id)?saved.delete(id):saved.add(id);try{localStorage.setItem('openfield-saved',JSON.stringify([...saved]));}catch{toast('Browser storage is unavailable; saved for this visit.');}const focusId=id;render();document.querySelector(`[data-save="${CSS.escape(focusId)}"]`)?.focus();toast(saved.has(id)?'Added to your shortlist':'Removed from your shortlist');}
  if(button.dataset.calendar){const e=usable.find(e=>e.id===button.dataset.calendar);if(e)downloadCalendar(e);}
});
document.addEventListener('keydown',event=>{if(event.key==='/'&&!dialog.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();document.getElementById('search').focus();}});

function downloadCalendar(event) {
  if (dateOnly(event)) return;
  const utc=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const icsEscape=value=>String(value).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
  const close=deadline(event);const end=new Date(Date.parse(close)+30*60000).toISOString();
  const text=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Openfield//Competition Radar//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${event.id}@openfield.local`,`DTSTAMP:${utc(new Date())}`,`DTSTART:${utc(close)}`,`DTEND:${utc(end)}`,`SUMMARY:${icsEscape(event.title+' — '+(event.registrationDeadline?'registration closes':'submission deadline'))}`,`DESCRIPTION:${icsEscape(event.summary+'\nOfficial event: '+event.url+'\nCheck the organiser’s latest rules before entering.')}`,`URL:${safeURL(event.url)}`,'BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY','DESCRIPTION:Competition deadline tomorrow','END:VALARM','END:VEVENT','END:VCALENDAR',''].join('\r\n');
  const blob=new Blob([text],{type:'text/calendar;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`${event.id}.ics`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),1000);toast('Calendar reminder downloaded');
}

async function load() {
  try { const response=await fetch('events.json',{cache:'no-cache'});if(!response.ok)throw Error('HTTP '+response.status);const json=await response.json();if(!Array.isArray(json.events))throw Error('Invalid feed');dataset=json;render(); }
  catch {const grid=document.getElementById('event-grid');grid.setAttribute('aria-busy','false');grid.innerHTML=`<div class="empty-state">${icon('refresh')}<h3>The field couldn’t load.</h3><p>Please check your connection and try again. We won’t substitute unverified events.</p><button class="button" id="retry-feed">Try again ${icon('refresh')}</button></div>`;document.getElementById('retry-feed').addEventListener('click',load);document.getElementById('result-summary').textContent='Event data temporarily unavailable';document.getElementById('checked-at').textContent='Source status unavailable';document.getElementById('feed-count').textContent='Feed unavailable';}
}
load();
fetch('research-coverage.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error('Research snapshot unavailable');return response.json();}).then(json=>{if(!Array.isArray(json.coverage)||!Number.isFinite(Date.parse(json.checkedAt)))throw Error('Invalid research snapshot');research=json;renderResearch();}).catch(()=>{});
// Remove closed or stale entries even when a visitor leaves the page open.
setInterval(()=>{if(dialog.open)return;const before=usable.map(e=>e.id).join(',');const after=dataset.events.filter(canPublish).map(e=>e.id).join(',');if(before!==after||shownReviewIds!==pendingReview().map(e=>e.id).join(',')){const active=document.activeElement;const id=active?.closest('[data-save],[data-event]')?.dataset;render();if(id?.save)document.querySelector(`[data-save="${CSS.escape(id.save)}"]`)?.focus();else if(id?.event)document.querySelector(`[data-event="${CSS.escape(id.event)}"]`)?.focus();}},60000);
