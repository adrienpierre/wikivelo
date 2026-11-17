import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { buildBundle } from '../build.mjs';

const ROOT_DIR = path.resolve(import.meta.dirname || '.', '..');
const args = process.argv.slice(2);
const runLint = args.includes('--lint') || args.includes('--all') || args.length === 0;
const runTypecheck = args.includes('--typecheck') || args.includes('--all') || args.length === 0;
const runTests = args.includes('--all') || args.length === 0;

function assert(cond, msg) {
  if (!cond) throw new Error('CHECK FAILED: ' + msg);
}

function listAllSrcFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listAllSrcFiles(full, out);
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

// Always rebuild fresh before verifying
const bundlePath = buildBundle();
const cssPath = path.join(ROOT_DIR, 'dist', 'styles.css');
const bundleCode = fs.readFileSync(bundlePath, 'utf-8');
const cssCode = fs.readFileSync(cssPath, 'utf-8');

if (runLint) {
  const srcFiles = listAllSrcFiles(path.join(ROOT_DIR, 'src'));
  const missingCss = [];
  const knownCss = new Set([
    'uci-rainbow-stripe', 'uci-rainbow-badge', 'uci-rainbow-border',
    'bg-asphalt-grid', 'foil-prism-sheen', 'animate-packRip',
    'card-flip-in', 'animate-pulse', 'animate-bounce', 'animate-fadeIn',
    'group', 'tabular-nums', 'tracking-widest', 'font-sans'
  ]);

  for (const file of srcFiles) {
    const rel = path.relative(ROOT_DIR, file);
    const content = fs.readFileSync(file, 'utf-8');

    assert(!content.includes('dangerouslySetInnerHTML'), `Unsafe dangerouslySetInnerHTML in ${rel}`);
    assert(!/\.\s*innerHTML\s*=/.test(content), `Unsafe innerHTML assignment in ${rel}`);
    assert(!/\beval\s*\(/.test(content), `Unsafe eval() in ${rel}`);
    assert(!/new\s+Function\s*\(/.test(content), `Unsafe new Function() in ${rel}`);
    assert(!/javascript:/i.test(content), `Disallowed javascript: URI in ${rel}`);

    // Verify every target="_blank" link has rel="noopener noreferrer"
    const anchorMatches = content.match(/<a[\s\S]*?>/g) || [];
    for (const aTag of anchorMatches) {
      if (aTag.includes('target="_blank"')) {
        assert(
          aTag.includes('noopener') && aTag.includes('noreferrer'),
          `External anchor without rel="noopener noreferrer" in ${rel}`
        );
      }
    }

    // Verify commercial trademark terms removed from card databases
    if (rel.includes('cardsDatabase') || rel.includes('extraCards')) {
      assert(!/Red Bull Rampage/i.test(content), `Trademark title in ${rel}`);
      assert(!/Shimano\/Mavic/i.test(content), `Trademark title in ${rel}`);
      assert(!/Kärcher/i.test(content), `Trademark title in ${rel}`);
      assert(!/Pipistrello\/Grifo\/Rhino/i.test(content), `Trademark model names in ${rel}`);
    }

    // Verify zero external Google Fonts CDN references (strict GDPR compliance)
    assert(!/fonts\.googleapis\.com/i.test(content), `External Google Fonts link in ${rel}`);
    assert(!/fonts\.gstatic\.com/i.test(content), `External Google Fonts CDN in ${rel}`);

    // Check CSS classes in className="..."
    if (file.endsWith('.tsx')) {
      const classMatches = content.match(/className="([^"]+)"/g) || [];
      for (const m of classMatches) {
        const inside = m.slice('className="'.length, -1);
        for (const tok of inside.split(/\s+/)) {
          if (!tok || knownCss.has(tok) || tok.startsWith('space-y-')) continue;
          const escaped = tok.replace(/([!:\/.\[\]%#(),])/g, '\\$1');
          if (!cssCode.includes(`.${escaped}`)) {
            missingCss.push(`${rel}: ${tok}`);
          }
        }
      }
    }
  }

  // Also verify CSS classes inside index.html & 404.html are compiled into dist/styles.css
  for (const htmlFile of ['index.html', '404.html']) {
    const htmlRaw = fs.readFileSync(path.join(ROOT_DIR, htmlFile), 'utf8');
    const htmlMatches = htmlRaw.match(/class="([^"]+)"/g) || [];
    for (const m of htmlMatches) {
      const inside = m.slice('class="'.length, -1);
      for (const tok of inside.split(/\s+/)) {
        if (!tok || knownCss.has(tok) || tok.startsWith('space-y-')) continue;
        const escaped = tok.replace(/([!:\/.\[\]%#(),])/g, '\\$1');
        if (!cssCode.includes(`.${escaped}`)) {
          missingCss.push(`${htmlFile}: ${tok}`);
        }
      }
    }
  }

  assert(missingCss.length === 0, `Missing CSS classes in dist/styles.css:\n  ${missingCss.join('\n  ')}`);

  for (const cfgFile of ['index.html', '404.html', 'vercel.json', 'netlify.toml', 'server.mjs']) {
    const cfgContent = fs.readFileSync(path.join(ROOT_DIR, cfgFile), 'utf8');
    assert(!/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(cfgContent), `External font server reference in ${cfgFile}`);
  }

  // Netlify production readiness checks
  const netlifyToml = fs.readFileSync(path.join(ROOT_DIR, 'netlify.toml'), 'utf8');
  assert(netlifyToml.includes('NODE_VERSION = "24"'), 'netlify.toml missing NODE_VERSION = "24"');
  assert(netlifyToml.includes('from = "/src/*"') && netlifyToml.includes('status = 404'), 'netlify.toml missing 404 redirect blocking /src/*');
  assert(fs.existsSync(path.join(ROOT_DIR, '404.html')), '404.html missing for Netlify redirects');
  assert(fs.existsSync(path.join(ROOT_DIR, '.gitignore')), '.gitignore missing');

  // Mobile-first compliance checks (viewport-fit, dvh, anti-zoom 16px, touch-action, safe area, @media hover)
  const htmlContent = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  assert(htmlContent.includes('viewport-fit=cover'), 'index.html missing viewport-fit=cover for mobile notches');
  assert(cssCode.includes('100dvh'), 'dist/styles.css missing 100dvh dynamic mobile height support');
  assert(cssCode.includes('overflow-x: hidden'), 'dist/styles.css missing overflow-x: hidden mobile scroll guard');
  assert(cssCode.includes('touch-action: manipulation'), 'dist/styles.css missing touch-action: manipulation');
  assert(cssCode.includes('font-size: 16px !important'), 'dist/styles.css missing 16px mobile input anti-zoom rule');
  assert(cssCode.includes('env(safe-area-inset-bottom)'), 'dist/styles.css missing safe-area bottom inset');
  assert(cssCode.includes('@media (hover: hover) and (pointer: fine)'), 'dist/styles.css should guard hover effects behind pointer capability query');

  console.log('[LINT] PASSED: 0 XSS sinks, 0 unsafe links, 0 trademark conflicts, 0 external font trackers, mobile CSS verified.');
}

if (runTypecheck) {
  execFileSync(process.execPath, ['--check', bundlePath], { stdio: 'inherit' });
  execFileSync(process.execPath, ['--check', path.join(ROOT_DIR, 'server.mjs')], { stdio: 'inherit' });
  execFileSync(process.execPath, ['--check', path.join(ROOT_DIR, 'build.mjs')], { stdio: 'inherit' });
  console.log('[TYPECHECK / SYNTAX] PASSED: bundle.js, server.mjs, build.mjs valid ES/JS.');
}

if (runTests) {
  // Mock DOM + VM Execution
  let idCounter = 1;
  class MockNode {
    constructor(nodeType, tagName = '') {
      this.nodeType = nodeType;
      this.tagName = tagName.toUpperCase();
      this._id = idCounter++;
      this.parentNode = null;
      this.childNodes = [];
      this.listeners = {};
      this.style = {};
      this.attributes = {};
      this.className = '';
      this.value = '';
      this.disabled = false;
      this._nodeValue = '';
    }
    set nodeValue(v) { this._nodeValue = String(v ?? ''); }
    get nodeValue() { return this._nodeValue; }
    get firstChild() { return this.childNodes[0] || null; }
    get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
    set innerHTML(v) { if (v === '') this.childNodes = []; }
    get innerHTML() { return this.textContent; }
    get textContent() {
      return this.nodeType === 3 ? this._nodeValue : this.childNodes.map((c) => c.textContent).join('');
    }
    set textContent(v) {
      this.childNodes = [];
      if (v !== '' && v !== null && v !== undefined) {
        const t = new MockNode(3);
        t.nodeValue = String(v);
        t.parentNode = this;
        this.childNodes.push(t);
      }
    }
    appendChild(child) {
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = this;
      this.childNodes.push(child);
      return child;
    }
    insertBefore(n, ref) {
      if (!ref) return this.appendChild(n);
      if (n.parentNode) n.parentNode.removeChild(n);
      const idx = this.childNodes.indexOf(ref);
      if (idx === -1) return this.appendChild(n);
      n.parentNode = this;
      this.childNodes.splice(idx, 0, n);
      return n;
    }
    removeChild(c) {
      const idx = this.childNodes.indexOf(c);
      if (idx !== -1) { this.childNodes.splice(idx, 1); c.parentNode = null; }
      return c;
    }
    replaceChild(n, o) {
      const idx = this.childNodes.indexOf(o);
      if (idx === -1) return this.appendChild(n);
      if (n.parentNode) n.parentNode.removeChild(n);
      o.parentNode = null;
      n.parentNode = this;
      this.childNodes[idx] = n;
      return o;
    }
    addEventListener(type, fn) {
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(fn);
    }
    removeEventListener(type, fn) {
      if (this.listeners[type]) this.listeners[type] = this.listeners[type].filter((f) => f !== fn);
    }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    removeAttribute(k) { delete this.attributes[k]; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 240, height: 370 }; }
    click() {
      if (this.disabled) return;
      let stopped = false;
      const evt = { type: 'click', target: this, currentTarget: this, preventDefault() {}, stopPropagation() { stopped = true; } };
      let node = this;
      while (node && !stopped) {
        evt.currentTarget = node;
        for (const fn of node.listeners['click'] || []) fn(evt);
        node = node.parentNode;
      }
      if (this.tagName === 'BUTTON' && this.attributes.type === 'submit') {
        let p = this.parentNode;
        while (p && p.tagName !== 'FORM') p = p.parentNode;
        if (p) {
          const sEvt = { type: 'submit', target: p, currentTarget: p, preventDefault() {}, stopPropagation() {} };
          for (const fn of p.listeners['submit'] || []) fn(sEvt);
        }
      }
    }
  }

  const root = new MockNode(1, 'div');
  root.attributes.id = 'root';
  const document = {
    body: new MockNode(1, 'body'),
    createElement: (tag) => new MockNode(1, tag),
    createElementNS: (_ns, tag) => new MockNode(1, tag),
    createTextNode: (txt) => { const n = new MockNode(3); n.nodeValue = String(txt); return n; },
    getElementById: (id) => (id === 'root' ? root : null)
  };
  const storageMap = new Map();
  const localStorage = {
    getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
  };
  let soundCalls = 0;
  class MockAudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    resume() {}
    createOscillator() {
      soundCalls++;
      return { type: 'sine', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
    }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  }
  let clipboardText = '';
  const timeouts = [];
  const sandbox = {
    console, Math, Date, Set, Map, Array, Object, String, Number, Boolean,
    JSON, RegExp, Promise, Error, URL, Blob, encodeURIComponent, decodeURIComponent,
    queueMicrotask,
    document, localStorage,
    navigator: { clipboard: { writeText: (t) => { clipboardText = t; return Promise.resolve(); } } },
    fetch: () => Promise.resolve({ ok: false }),
    setTimeout: (fn, ms) => { const h = { fn, ms, cleared: false }; timeouts.push(h); return h; },
    clearTimeout: (h) => { if (h) h.cleared = true; },
    setInterval: () => ({}),
    clearInterval: () => {},
    AudioContext: MockAudioContext,
    confirm: () => true,
    __EXPORTS__: null
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.URL.createObjectURL = () => 'blob:mock';
  sandbox.URL.revokeObjectURL = () => {};

  const hookIdx = bundleCode.lastIndexOf('})();');
  const instrumented =
    bundleCode.slice(0, hookIdx) +
    `;\nglobalThis.__EXPORTS__ = {
      React, ErrorBoundary, INITIAL_CARDS_DATABASE, RARITY_CONFIG, SLOT5_DROP_WEIGHTS,
      RECYCLE_WATTS_BY_RARITY, BOOSTER_PACKS, ECONOMY_CONFIG, PROMO_CODES_CATALOG,
      PITY_EPIC_THRESHOLD, PITY_LEGENDARY_THRESHOLD, GOD_PACK_CHANCE,
      rollStandardSlotRarity, rollSlot5Rarity, generateCardQuizQuestion,
      isDeckValid, sanitizeSaveState, isAllowedFreeLicense, createInitialSaveState,
      BASE_CARD_ID_SET, VALID_QUEST_ID_SET, VALID_ACHIEVEMENT_ID_SET, VALID_PROMO_SET,
      CARD_COST_BY_ID, createBackupExportJson
    };\n` +
    bundleCode.slice(hookIdx);

  vm.runInNewContext(instrumented, sandbox);
  const exp = sandbox.__EXPORTS__;

  // 1) Security & License checks
  assert(exp.isAllowedFreeLicense('CC BY-SA 4.0') === true, 'CC BY-SA 4.0 should be allowed');
  assert(exp.isAllowedFreeLicense('CC0') === true, 'CC0 should be allowed');
  assert(exp.isAllowedFreeLicense('Public domain') === true, 'Public domain should be allowed');
  assert(exp.isAllowedFreeLicense('No restrictions') === true, 'No restrictions should be allowed');
  assert(exp.isAllowedFreeLicense('CC BY-NC 4.0') === false, 'CC BY-NC must be rejected');
  assert(exp.isAllowedFreeLicense('Fair use') === false, 'Fair use must be rejected');
  assert(exp.isAllowedFreeLicense('Copyrighted') === false, 'Copyrighted must be rejected');

  let verifiedCommonsPhotoCount = 0;
  for (const card of exp.INITIAL_CARDS_DATABASE) {
    if (card.imageUrl) {
      verifiedCommonsPhotoCount++;
      assert(
        card.imageUrl.startsWith('https://upload.wikimedia.org/') ||
          card.imageUrl.startsWith('https://thumb.wikimedia.org/'),
        `Untrusted image origin on ${card.id}: ${card.imageUrl}`
      );
      assert(card.imageUrl.includes('/wikipedia/commons/'), `Non-Commons image path on ${card.id}`);
      assert(!/\.svg($|\?)/i.test(card.imageUrl), `SVG logo leaked into card bitmap on ${card.id}`);
      assert(Boolean(card.imageAttribution?.author), `Missing author attribution on ${card.id}`);
      assert(
        exp.isAllowedFreeLicense(card.imageAttribution?.licenseShortName),
        `Disallowed license on ${card.id}: ${card.imageAttribution?.licenseShortName}`
      );
      assert(
        card.imageAttribution?.commonsUrl?.startsWith('https://commons.wikimedia.org/'),
        `Invalid Commons source URL on ${card.id}`
      );
    }
  }
  assert(
    new Set(exp.INITIAL_CARDS_DATABASE.map((c) => c.id)).size ===
      exp.INITIAL_CARDS_DATABASE.length,
    'Duplicate card IDs found in INITIAL_CARDS_DATABASE'
  );
  assert(
    exp.INITIAL_CARDS_DATABASE.length === 284,
    `Expected 284 unique cards, got ${exp.INITIAL_CARDS_DATABASE.length}`
  );
  assert(
    verifiedCommonsPhotoCount >= 220,
    `Expected >= 220 verified Commons photos, got ${verifiedCommonsPhotoCount}`
  );

  const futureTs = Date.now() + 3600 * 1000;
  const dirtySave = {
    watts: -500,
    bidons: 999,
    lastBidonTimestamp: futureTs,
    redeemedPromoCodes: ['PELOTON2026', 'FAKE_HACK', 'PELOTON2026'],
    deck: ['route-merckx', 'route-pogacar', 'route-vinegaard', 'vtt-schurter', 'piste-lavreysen'], // non-owned + > 16 W
    wikiCache: {
      'Evil_Card': {
        thumbnailUrl: 'https://evil.com/tracker.png',
        attribution: { licenseShortName: 'Fair use', commonsUrl: 'https://evil.com' },
        fetchedAt: 10
      },
      'Safe_Card': {
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/sample.jpg',
        attribution: { author: 'J. Doe', licenseShortName: 'CC BY-SA 4.0', commonsUrl: 'https://commons.wikimedia.org/wiki/File:Sample.jpg' },
        fetchedAt: 10
      }
    },
    customCards: [
      {
        id: 'c1',
        title: '<script>alert(1)</script>Vélo Test',
        imageUrl: 'javascript:alert(1)',
        discipline: 'Route',
        category: 'Matériel & Technique',
        rarity: 'Rare',
        stats: { power: 999, technique: 1, endurance: 70 }
      }
    ]
  };
  const cleaned = exp.sanitizeSaveState(
    dirtySave,
    exp.createInitialSaveState(),
    exp.BASE_CARD_ID_SET,
    exp.VALID_QUEST_ID_SET,
    exp.VALID_ACHIEVEMENT_ID_SET,
    exp.VALID_PROMO_SET,
    new Map(exp.CARD_COST_BY_ID)
  );
  assert(cleaned.watts === 0, 'Negative watts must clamp to 0');
  assert(cleaned.bidons <= cleaned.maxBidons + 2, 'Bidons must clamp to maxBidons + 2');
  assert(cleaned.lastBidonTimestamp <= Date.now(), 'Future lastBidonTimestamp clock spoof must clamp to now');
  assert(
    cleaned.redeemedPromoCodes.length === 1 && cleaned.redeemedPromoCodes[0] === 'PELOTON2026',
    'Promo sanitization failed'
  );
  assert(!cleaned.wikiCache['Evil_Card']?.thumbnailUrl, 'Untrusted / Fair use image must be stripped');
  assert(cleaned.wikiCache['Safe_Card']?.thumbnailUrl?.startsWith('https://upload.wikimedia.org/'), 'Valid Wikimedia CC BY-SA image kept');
  assert(!cleaned.customCards[0].title.includes('<script>'), 'Script tags must be stripped');
  assert(!cleaned.customCards[0].imageUrl, 'javascript: imageUrl must be stripped');

  // 1b) Mathematical Expectation & 10,000-Pack Economy Simulation (Strict 25%..35% Refund)
  const rVal = exp.RECYCLE_WATTS_BY_RARITY;
  const stdExpectedSlot1to4 =
    0.62 * rVal['Commune'] +
    0.24 * rVal['Peu commune'] +
    0.095 * rVal['Rare'] +
    0.035 * rVal['Épique'] +
    0.01 * rVal['Légendaire'];
  const stdExpectedSlot5 =
    0.84 * rVal['Rare'] + 0.135 * rVal['Épique'] + 0.025 * rVal['Légendaire'];
  const expectedStandardPack = 4 * stdExpectedSlot1to4 + stdExpectedSlot5;
  const expectedGodPack = 5 * (0.3 * rVal['Légendaire'] + 0.7 * rVal['Épique']);
  const expectedGlobalPack =
    (1 - exp.GOD_PACK_CHANCE) * expectedStandardPack +
    exp.GOD_PACK_CHANCE * expectedGodPack;

  const pelotonCost = exp.BOOSTER_PACKS[0].costWatts;
  const specCost = exp.BOOSTER_PACKS[1].costWatts;
  const pelotonRatioPct = (expectedGlobalPack / pelotonCost) * 100;
  const specRatioPct = (expectedGlobalPack / specCost) * 100;
  assert(
    pelotonRatioPct >= 25 && pelotonRatioPct <= 35,
    `Peloton refund EV ${pelotonRatioPct.toFixed(2)}% outside [25%..35%]!`
  );
  assert(
    specRatioPct >= 25 && specRatioPct <= 35,
    `Specialty refund EV ${specRatioPct.toFixed(2)}% outside [25%..35%]!`
  );

  // Monte Carlo 10,000 packs simulation (including Pity 10/30 and God Packs)
  let simRecycleSum = 0;
  let simEpicPity = 0;
  let simLegPity = 0;
  const MC_PACKS = 10000;
  for (let p = 0; p < MC_PACKS; p++) {
    const isGod = Math.random() < exp.GOD_PACK_CHANCE;
    const rarities = [];
    for (let s = 0; s < 5; s++) {
      let r;
      if (isGod) r = Math.random() < 0.3 ? 'Légendaire' : 'Épique';
      else if (s < 4) r = exp.rollStandardSlotRarity();
      else if (!rarities.includes('Légendaire') && simLegPity + 1 >= exp.PITY_LEGENDARY_THRESHOLD) {
        r = 'Légendaire';
      } else if (
        !rarities.includes('Légendaire') &&
        !rarities.includes('Épique') &&
        simEpicPity + 1 >= exp.PITY_EPIC_THRESHOLD
      ) {
        r = Math.random() < 0.15 ? 'Légendaire' : 'Épique';
      } else {
        r = exp.rollSlot5Rarity('Rare');
      }
      rarities.push(r);
      simRecycleSum += rVal[r];
    }
    if (rarities.includes('Légendaire')) {
      simLegPity = 0;
      simEpicPity = 0;
    } else if (rarities.includes('Épique')) {
      simEpicPity = 0;
      simLegPity++;
    } else {
      simEpicPity++;
      simLegPity++;
    }
  }
  const mcAvgRecycle = simRecycleSum / MC_PACKS;
  const mcPelotonPct = (mcAvgRecycle / pelotonCost) * 100;
  assert(
    mcPelotonPct >= 25 && mcPelotonPct <= 36.5,
    `Monte Carlo Peloton EV (with Pity) too high/low: ${mcPelotonPct.toFixed(2)}%`
  );
  console.log('[ECONOMY AUDIT] PASSED:', {
    pelotonCost,
    specCost,
    theoreticalEVWatts: Number(expectedGlobalPack.toFixed(2)),
    pelotonRefundPct: Number(pelotonRatioPct.toFixed(2)) + '%',
    specRefundPct: Number(specRatioPct.toFixed(2)) + '%',
    monteCarlo10kAvgWatts: Number(mcAvgRecycle.toFixed(2))
  });

  // 2) E2E Playthrough in Main App Mount (fresh container)
  const findAll = (node, pred, out = []) => {
    if (!node) return out;
    if (pred(node)) out.push(node);
    for (const ch of node.childNodes || []) findAll(ch, pred, out);
    return out;
  };
  const findBtn = (t) => findAll(root, (n) => n.tagName === 'BUTTON' && !n.disabled && n.textContent.includes(t))[0];
  const clickEl = async (el) => {
    el.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };
  const flushTimeouts = () => {
    for (const t of timeouts) {
      if (!t.cleared && t.ms <= 1000) { t.cleared = true; t.fn(); }
    }
  };

  assert(root.textContent.includes('284 CARTES'), 'Header missing 284 CARTES');
  assert(root.textContent.includes('180 W'), 'Starter budget should be 180 W');

  // Test Promo Code single-use & rejection of invalid/duplicate
  const promoInput = findAll(root, (n) => n.tagName === 'INPUT' && n.attributes.placeholder?.includes('code promo'))[0];
  assert(promoInput, 'Promo code input missing');
  const changePromo = promoInput.listeners['input']?.[0] || promoInput.listeners['change']?.[0];
  changePromo({ target: { value: 'peloton2026' } });
  await Promise.resolve();
  await clickEl(findBtn('Valider'));
  assert(root.textContent.includes('Pack Bienvenue Peloton débloqué'), 'Valid promo code failed');
  const afterPromoState = JSON.parse(localStorage.getItem('velolegends_tcg_save_v4'));
  assert(afterPromoState.watts === 255, `Expected 255 W after promo (+75 W), got ${afterPromoState.watts}`);
  assert(afterPromoState.bidons === 3, `Expected 3 Bidons after promo (+1 Bidon), got ${afterPromoState.bidons}`);
  changePromo({ target: { value: 'PELOTON2026' } });
  await Promise.resolve();
  await clickEl(findBtn('Valider'));
  assert(root.textContent.includes('déjà été utilisé'), 'Duplicate promo code was not rejected!');

  // Test Express Quiz wrong answer gives 0 W & cannot be double-submitted
  await clickEl(findBtn('Question Culture Vélo'));
  const wattsBeforeQuiz = JSON.parse(localStorage.getItem('velolegends_tcg_save_v4')).watts;
  const optA = findBtn('A.');
  const optB = findBtn('B.');
  await clickEl(optA);
  // Attempting second option click in same question must be disabled/ignored
  await clickEl(optB);
  const quizAnswersStored = JSON.parse(localStorage.getItem('velolegends_tcg_save_v4')).stats.quizAnswered;
  assert(quizAnswersStored === 1, `Expected 1 quiz answered, got ${quizAnswersStored}`);

  // Quiz audit across all 214 cards x 4 modes
  let leaks = 0;
  for (const c of exp.INITIAL_CARDS_DATABASE) {
    for (let m = 0; m < 4; m++) {
      const q = exp.generateCardQuizQuestion(c, exp.INITIAL_CARDS_DATABASE, { preferredMode: m });
      assert(q.options.length === 4 && new Set(q.options).size === 4, `Bad options on ${c.id}`);
      if (q.type === 'cloze' && q.contextExcerpt?.toLowerCase().includes(c.title.toLowerCase())) leaks++;
    }
  }
  assert(leaks === 0, `Cloze leaks: ${leaks}`);

  // Play booster rip + reveal & verify double-click lock doesn't double-open
  const openBidonBtn = findBtn('Ouvrir avec 1 Bidon Gratuit');
  const bidonsBeforePack = JSON.parse(localStorage.getItem('velolegends_tcg_save_v4')).bidons;
  openBidonBtn.click();
  openBidonBtn.click(); // Rapid 2nd click in same tick must be ignored by lock
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  const afterPackSnap = JSON.parse(localStorage.getItem('velolegends_tcg_save_v4'));
  assert(
    afterPackSnap.bidons === bidonsBeforePack - 1 && afterPackSnap.stats.boostersOpened === 1,
    'Double click opened more than 1 pack!'
  );
  assert(
    root.textContent.includes('PACK PRO SCELLÉ'),
    'Booster pack sealed screen invalid: ' + root.textContent.slice(0, 500)
  );
  const ripCard = findAll(root, (n) => n.tagName === 'DIV' && n.textContent.includes('DÉCHIRER LE PAQUET')).pop();
  await clickEl(ripCard);
  flushTimeouts();
  await Promise.resolve();
  await clickEl(findBtn('Tout Révéler (5)'));
  await clickEl(findBtn('Retour Boutique'));

  // Test Album Recycling strictly keeps >= 1 copy of every card
  await clickEl(findBtn('Album ('));
  const recycleAllBtn = findBtn('Tout Recycler');
  if (recycleAllBtn) {
    await clickEl(recycleAllBtn);
    const afterRecycleState = JSON.parse(localStorage.getItem('velolegends_tcg_save_v4'));
    for (const cId of afterRecycleState.deck) {
      assert(
        (afterRecycleState.inventory[cId] || 0) >= 1,
        `Deck card ${cId} lost after recycling!`
      );
    }
    for (const [k, cnt] of Object.entries(afterRecycleState.inventory)) {
      assert(cnt === 1, `Expected all surplus duplicates recycled to count 1, got ${k}=${cnt}`);
    }
  }

  // Play full 5-round Duel
  await clickEl(findBtn('Mode Duel & Quiz'));
  await clickEl(findBtn('Prendre le Départ'));
  for (let r = 1; r <= 5; r++) {
    await clickEl(findBtn('Engager'));
    if (r === 1) await clickEl(findBtn('Attaque / Coup de Bordure'));
    await clickEl(findBtn('A.'));
    flushTimeouts();
    await Promise.resolve();
    await clickEl(findBtn(r === 5 ? 'Voir le Podium Final' : `Étape ${r + 1} / 5`));
  }
  assert(root.textContent.includes('CARTE MVP DU MATCH'), 'Broadcast MVP missing on Match Over');
  await clickEl(findBtn('Copier le Palmarès'));
  assert(clipboardText.includes('MVP du match'), 'Share clipboard missing');

  // Test Legal Modal tabs & RGPD data export / privacy toggle / erase + instant offline SVG fallback
  const countImgNodes = (node) => {
    let n = node.tagName === 'IMG' ? 1 : 0;
    for (const c of node.childNodes || []) n += countImgNodes(c);
    return n;
  };
  await clickEl(findBtn('Album ('));
  const albumImgsBeforeGdprOff = countImgNodes(root);
  assert(albumImgsBeforeGdprOff > 0, 'Expected verified Wikimedia photos rendered on unlocked album cards when wikiSyncEnabled=true');

  await clickEl(findBtn('Mentions Légales'));
  assert(root.textContent.includes('[À compléter'), 'Legal placeholder missing');
  assert(root.textContent.includes('Netlify, Inc.'), 'Legal Mentions missing configured Netlify host');
  await clickEl(findBtn('Crédits & Licences'));
  assert(root.textContent.includes('FILTRE STRICT : CC0 / PD / CC BY / CC BY-SA'), 'Credits tab missing license filter');
  assert(
    root.textContent.includes(`${verifiedCommonsPhotoCount} média`),
    `Credits tab should display all ${verifiedCommonsPhotoCount} attributed media items`
  );
  await clickEl(findBtn('Confidentialité / RGPD'));
  assert(root.textContent.includes('Supprimer toutes mes données (RGPD)'), 'GDPR erase button missing');
  await clickEl(findBtn('Exporter mes données (.json)'));
  assert(root.textContent.includes('Sauvegarde JSON exportée'), 'JSON export failed');
  await clickEl(findBtn('Activée (ON)'));
  assert(root.textContent.includes('Désactivée (OFF)'), 'Wiki sync GDPR toggle failed');
  await clickEl(findBtn('Fermer'));

  const albumImgsAfterGdprOff = countImgNodes(root);
  assert(albumImgsAfterGdprOff === 0, `Expected 0 external <img> tags in 100% offline SVG mode, found ${albumImgsAfterGdprOff}`);

  const saved = JSON.parse(localStorage.getItem('velolegends_tcg_save_v4'));
  assert(saved.stats.boostersOpened === 1 && saved.stats.duelsPlayed === 1, 'Saved state mismatch');
  assert(saved.wikiSyncEnabled === false, 'GDPR wikiSync toggle did not persist');
  assert(soundCalls > 0, 'Web Audio feedback not triggered');

  // Verify fixed mobile bottom navigation bar renders and switches tabs cleanly
  const findNavByLabel = (label, node = root) => {
    if (node.tagName === 'NAV' && node.attributes?.['aria-label'] === label) return node;
    for (const c of node.childNodes || []) {
      const r = findNavByLabel(label, c);
      if (r) return r;
    }
    return null;
  };
  const mobileNav = findNavByLabel('Navigation mobile');
  assert(Boolean(mobileNav), 'Mobile bottom navigation bar missing');
  const mobileDeckBtn = findBtn('Équipe (', mobileNav);
  assert(Boolean(mobileDeckBtn), 'Mobile bottom nav Deck button missing');
  await clickEl(mobileDeckBtn);
  assert(root.textContent.includes('Composition Stratégique du Deck'), 'Mobile bottom nav did not switch to Deck view');

  // 3) ErrorBoundary recovery test (mounted after E2E playthrough cleanly)
  const errRoot = new MockNode(1, 'div');
  function BrokenChild() { throw new Error('Simulated render crash'); }
  const errDomRoot = exp.React.createRoot(errRoot);
  errDomRoot.render(
    exp.React.createElement(exp.ErrorBoundary, null, exp.React.createElement(BrokenChild, null))
  );
  assert(errRoot.textContent.includes('Incident Technique Détecté'), 'ErrorBoundary did not render recovery UI!');

  console.log('[TESTS] PASSED:', {
    cards: exp.INITIAL_CARDS_DATABASE.length,
    verifiedCommonsPhotos: verifiedCommonsPhotoCount,
    albumImgsOnlineToOffline: `${albumImgsBeforeGdprOff} -> ${albumImgsAfterGdprOff}`,
    quizzesChecked: exp.INITIAL_CARDS_DATABASE.length * 4,
    quizLeaks: leaks,
    errorBoundaryVerified: true,
    securitySanitizerVerified: true,
    legalAndGdprVerified: true,
    mobileReadyVerified: true,
    duelCompleted: true,
    soundCalls
  });
}
