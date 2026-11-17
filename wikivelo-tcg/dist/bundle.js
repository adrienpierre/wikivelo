(function() {
"use strict";

const React = (() => {
  const Fragment = Symbol('Fragment');
  let rootInstance = null;
  let rootContainer = null;
  const instances = new Map();
  let visitedKeys = new Set();
  let currentInstance = null;
  let pendingEffects = [];
  let isRenderScheduled = false;

  function createElement(type, props, ...children) {
    const flatChildren = [];
    function pushChild(c) {
      if (Array.isArray(c)) {
        for (let i = 0; i < c.length; i++) pushChild(c[i]);
      } else if (c === null || c === undefined || c === false || c === true) {
        flatChildren.push(null);
      } else {
        flatChildren.push(c);
      }
    }
    pushChild(children);
    return {
      type,
      props: { ...(props || {}), children: flatChildren }
    };
  }

  function scheduleRerender() {
    if (isRenderScheduled) return;
    isRenderScheduled = true;
    queueMicrotask(() => {
      isRenderScheduled = false;
      renderRoot();
    });
  }

  function useState(initialValue) {
    const inst = currentInstance;
    const idx = inst.cursor++;
    if (inst.hooks.length <= idx) {
      const init = typeof initialValue === 'function' ? initialValue() : initialValue;
      inst.hooks[idx] = { type: 'state', value: init };
    }
    const hookRecord = inst.hooks[idx];
    const setState = (updater) => {
      const curr = hookRecord.value;
      const next = typeof updater === 'function' ? updater(curr) : updater;
      if (!Object.is(curr, next)) {
        hookRecord.value = next;
        scheduleRerender();
      }
    };
    return [hookRecord.value, setState];
  }

  function useMemo(factory, deps) {
    const inst = currentInstance;
    const idx = inst.cursor++;
    const prev = inst.hooks[idx];
    if (!prev || !deps || !prev.deps || deps.some((d, i) => !Object.is(d, prev.deps[i]))) {
      const value = factory();
      inst.hooks[idx] = { type: 'memo', value, deps };
      return value;
    }
    return prev.value;
  }

  function useCallback(fn, deps) {
    return useMemo(() => fn, deps);
  }

  function useRef(initialValue) {
    const inst = currentInstance;
    const idx = inst.cursor++;
    if (inst.hooks.length <= idx) {
      inst.hooks[idx] = { type: 'ref', value: { current: initialValue } };
    }
    return inst.hooks[idx].value;
  }

  function useEffect(effectFn, deps) {
    const inst = currentInstance;
    const idx = inst.cursor++;
    const prev = inst.hooks[idx];
    const hasChanged =
      !prev ||
      !deps ||
      !prev.deps ||
      deps.length !== prev.deps.length ||
      deps.some((d, i) => !Object.is(d, prev.deps[i]));

    if (hasChanged) {
      const hookRecord = {
        type: 'effect',
        deps,
        cleanup: prev ? prev.cleanup : null
      };
      inst.hooks[idx] = hookRecord;
      pendingEffects.push(() => {
        if (typeof hookRecord.cleanup === 'function') {
          try { hookRecord.cleanup(); } catch {}
        }
        const cleanup = effectFn();
        hookRecord.cleanup = cleanup;
      });
    }
  }

  const SVG_TAGS = new Set([
    'svg', 'defs', 'radialGradient', 'linearGradient', 'stop',
    'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    'path', 'g', 'text', 'tspan'
  ]);

  class Component {
    constructor(props) {
      this.props = props || {};
      this.state = {};
    }
    setState(updater) {
      const next =
        typeof updater === 'function'
          ? updater(this.state, this.props)
          : updater;
      this.state = { ...(this.state || {}), ...(next || {}) };
      if (this._inst) this._inst.classState = this.state;
      scheduleRerender();
    }
    render() {
      return null;
    }
  }
  Component.prototype.isReactComponent = true;

  function expandVNode(vnode, pathKey) {
    if (vnode === null || vnode === undefined || typeof vnode === 'boolean') {
      return null;
    }
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return { type: '#text', text: String(vnode) };
    }
    if (Array.isArray(vnode)) {
      return {
        type: Fragment,
        props: {
          children: vnode
            .map((c, idx) => {
              const childKey =
                c && typeof c === 'object' && c.props && c.props.key != null
                  ? 'k_' + String(c.props.key)
                  : String(idx);
              return expandVNode(c, pathKey + '.' + childKey);
            })
            .filter(Boolean)
        }
      };
    }
    if (typeof vnode.type === 'function') {
      const compName = vnode.type.name || 'Anon';
      const explicitKey = vnode.props && vnode.props.key != null ? String(vnode.props.key) : '';
      const instKey = pathKey + ':' + compName + (explicitKey ? '#' + explicitKey : '');
      visitedKeys.add(instKey);

      let inst = instances.get(instKey);
      if (!inst) {
        inst = { hooks: [], cursor: 0, classComp: null, classState: null };
        instances.set(instKey, inst);
      }

      const isClass = Boolean(
        vnode.type.prototype && vnode.type.prototype.isReactComponent
      );
      if (isClass) {
        if (!inst.classComp) {
          inst.classComp = new vnode.type(vnode.props || {});
          inst.classComp._inst = inst;
          inst.classState = inst.classComp.state;
        } else {
          inst.classComp.props = vnode.props || {};
          inst.classComp.state = inst.classState || inst.classComp.state;
        }
        try {
          const rendered = inst.classComp.render();
          return expandVNode(rendered, instKey);
        } catch (err) {
          if (typeof vnode.type.getDerivedStateFromError === 'function') {
            const errState = vnode.type.getDerivedStateFromError(err);
            inst.classComp.state = {
              ...(inst.classComp.state || {}),
              ...(errState || {})
            };
            inst.classState = inst.classComp.state;
            if (typeof inst.classComp.componentDidCatch === 'function') {
              try {
                inst.classComp.componentDidCatch(err);
              } catch {}
            }
            const fallbackTree = inst.classComp.render();
            return expandVNode(fallbackTree, instKey);
          }
          throw err;
        }
      }

      inst.cursor = 0;
      const prevInstance = currentInstance;
      currentInstance = inst;
      let rendered;
      try {
        rendered = vnode.type(vnode.props || {});
      } finally {
        currentInstance = prevInstance;
      }
      return expandVNode(rendered, instKey);
    }
    const expandedChildren = [];
    const rawChildren = (vnode.props && vnode.props.children) || [];
    for (let i = 0; i < rawChildren.length; i++) {
      const exp = expandVNode(rawChildren[i], pathKey + '.' + i);
      if (exp !== null) {
        if (exp.type === Fragment && exp.props && Array.isArray(exp.props.children)) {
          expandedChildren.push(...exp.props.children);
        } else {
          expandedChildren.push(exp);
        }
      }
    }
    return {
      type: vnode.type,
      props: { ...(vnode.props || {}), children: expandedChildren }
    };
  }


  function applyProps(dom, newProps, oldProps, isSvg) {
    oldProps = oldProps || {};
    newProps = newProps || {};

    for (const k of Object.keys(oldProps)) {
      if (k === 'children' || k === 'key') continue;
      if (k.startsWith('on') && typeof oldProps[k] === 'function') {
        const evt = k.slice(2).toLowerCase();
        dom.removeEventListener(evt, oldProps[k]);
        if (evt === 'change' && (dom.tagName === 'INPUT' || dom.tagName === 'TEXTAREA')) {
          dom.removeEventListener('input', oldProps[k]);
        }
      } else if (!(k in newProps)) {
        if (k === 'className') dom.removeAttribute('class');
        else if (k === 'style') dom.style.cssText = '';
        else dom.removeAttribute(k);
      }
    }

    for (const [k, v] of Object.entries(newProps)) {
      if (k === 'children' || k === 'key') continue;
      if (k.startsWith('on') && typeof v === 'function') {
        const evt = k.slice(2).toLowerCase();
        dom.addEventListener(evt, v);
        if (evt === 'change' && (dom.tagName === 'INPUT' || dom.tagName === 'TEXTAREA')) {
          dom.addEventListener('input', v);
        }
      } else if (k === 'className') {
        if (isSvg) dom.setAttribute('class', v || '');
        else dom.className = v || '';
      } else if (k === 'style' && v && typeof v === 'object') {
        dom.style.cssText = '';
        for (const [sk, sv] of Object.entries(v)) {
          if (sv !== undefined && sv !== null) {
            dom.style[sk] = sv;
          }
        }
      } else if (k === 'value' && (dom.tagName === 'INPUT' || dom.tagName === 'SELECT' || dom.tagName === 'TEXTAREA')) {
        if (dom.value !== String(v ?? '')) {
          dom.value = String(v ?? '');
        }
      } else if (k === 'disabled' || k === 'checked' || k === 'selected') {
        dom[k] = Boolean(v);
        if (v) dom.setAttribute(k, '');
        else dom.removeAttribute(k);
      } else if (v !== undefined && v !== null && v !== false) {
        const attrKey = k === 'referrerPolicy' ? 'referrerpolicy' : k === 'htmlFor' ? 'for' : k;
        dom.setAttribute(attrKey, String(v));
      } else {
        const attrKey = k === 'referrerPolicy' ? 'referrerpolicy' : k === 'htmlFor' ? 'for' : k;
        dom.removeAttribute(attrKey);
      }
    }
  }

  function createDomNode(vnode, isSvgContext) {
    if (vnode.type === '#text') {
      return document.createTextNode(vnode.text);
    }
    const isSvg = isSvgContext || SVG_TAGS.has(vnode.type);
    const dom = isSvg
      ? document.createElementNS('http://www.w3.org/2000/svg', vnode.type)
      : document.createElement(vnode.type);

    const children = (vnode.props && vnode.props.children) || [];
    for (let i = 0; i < children.length; i++) {
      const childDom = createDomNode(children[i], isSvg);
      if (childDom) dom.appendChild(childDom);
    }
    // Appliquer les props après l'ajout des enfants (important pour <select value=...>)
    applyProps(dom, vnode.props, {}, isSvg);
    vnode._dom = dom;
    vnode._isSvg = isSvg;
    return dom;
  }

  function reconcile(parentDom, oldVNode, newVNode, index, isSvgContext) {
    const existingDom = parentDom.childNodes[index];

    if (!oldVNode && newVNode) {
      const newDom = createDomNode(newVNode, isSvgContext);
      if (existingDom) parentDom.insertBefore(newDom, existingDom);
      else parentDom.appendChild(newDom);
      return;
    }

    if (oldVNode && !newVNode) {
      if (existingDom) parentDom.removeChild(existingDom);
      return;
    }

    if (!oldVNode && !newVNode) return;

    if (oldVNode.type !== newVNode.type) {
      const newDom = createDomNode(newVNode, isSvgContext);
      if (existingDom) parentDom.replaceChild(newDom, existingDom);
      else parentDom.appendChild(newDom);
      return;
    }

    if (newVNode.type === '#text') {
      if (existingDom && existingDom.nodeValue !== newVNode.text) {
        existingDom.nodeValue = newVNode.text;
      }
      newVNode._dom = existingDom;
      return;
    }

    const dom = existingDom || createDomNode(newVNode, isSvgContext);
    const isSvg = isSvgContext || SVG_TAGS.has(newVNode.type);

    const oldChildren = (oldVNode.props && oldVNode.props.children) || [];
    const newChildren = (newVNode.props && newVNode.props.children) || [];
    const maxLen = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLen; i++) {
      reconcile(
        dom,
        oldChildren[i] || null,
        newChildren[i] || null,
        Math.min(i, dom.childNodes.length),
        isSvg
      );
    }
    while (dom.childNodes.length > newChildren.length) {
      dom.removeChild(dom.lastChild);
    }
    applyProps(dom, newVNode.props, oldVNode.props, isSvg);
    newVNode._dom = dom;
  }

  let prevTree = null;

  function renderRoot() {
    if (!rootContainer || !rootInstance) return;
    visitedKeys = new Set();
    pendingEffects = [];

    const rawTree = expandVNode(rootInstance, 'root');
    const nextTree =
      rawTree && rawTree.type === Fragment
        ? { type: 'div', props: { children: rawTree.props.children } }
        : rawTree;

    // Nettoyage des instances démontées
    for (const [k, inst] of instances.entries()) {
      if (!visitedKeys.has(k)) {
        for (const h of inst.hooks) {
          if (h && typeof h.cleanup === 'function') {
            try { h.cleanup(); } catch {}
          }
        }
        instances.delete(k);
      }
    }

    reconcile(rootContainer, prevTree, nextTree, 0, false);
    prevTree = nextTree;

    const effectsToRun = [...pendingEffects];
    pendingEffects = [];
    for (const ef of effectsToRun) {
      try { ef(); } catch (e) { console.error(e); }
    }
  }

  function createRoot(container) {
    return {
      render(vnode) {
        rootContainer = container;
        rootInstance = vnode;
        container.innerHTML = '';
        prevTree = null;
        renderRoot();
      }
    };
  }

  return {
    Fragment,
    Component,
    createElement,
    useState,
    useMemo,
    useCallback,
    useRef,
    useEffect,
    createRoot
  };
})();
const { useState, useMemo, useCallback, useRef, useEffect, createRoot } = React;


// === FILE: src/types/game.ts ===
                                                                       

                                                       

                          
                       
                        
                       
                           

                    
             
                 
          
            
                 

                         
                     
             
                  
              
               

                            
                                                                        
                                                                      
                                                                        
                                                                            
                                                                                                  
                                                                      
                                                                                           
                                                        
                                                        
                               // +X pts si la carte précédente était d'une autre discipline

                            
                                                                         
                                                                          
                                                                        
                                               
 

                                   
                 
                           
                      
                     
                       
 

                           
             
                     
                
                   
                                                                                             
                         
                                      
                         
                 
                                                   
                   
                       
                             
                      
                            
                  
                    
                                      
                      
                      
                  
                  
                       
                    
                           
 

                                 
             
                
                   
                  
                         
                                      
                         
                 
                      
                
                    
                    
                       
                             
                      
                            
                  
                      
                      
                  
                  
                       
                    
 

                              
             
               
                   
                      
                    
                          
                                       
                    
                      
                              
 

                             
                      
                          
                        
                      
                        
                     
                      

                               
             
               
                   
                                    
                      
                  
                    
                
                  
                      
                      
    
                          
                        
                       
                                
                        
 

                               
             
                                                   
                       
                          
                    
                       
                      
                        
                           
                                
 

                                             

                             
             
               
                
                                                       
                    
                      
                         
                          
                          
                    
                         
 

                                                        
                                                        

                                
                       
                          
                     
                     
                                   
                      
    
  

                            
              
                 
                   
                   
                
                 
                       
                    
                    

                                  
             
                
                      
                         
                 
                      
                        
 

                                     
                           
                                          
                              
 

                                        
             
               
                
                      
                      
                                                                      
 

                              
                         
                         
                      
                   
                       
                      
                            
                        
                        
                           
                            
 

                                      
               
                
                      
                       
 

                                  
                
                 
                    
                             
                          
                               
                            
                        
                           
                          
                          
                 
                          
                             
                                 
                               
                     
                              
 


// === FILE: src/utils/saveSecurity.ts ===

const VALID_CORE_DISCIPLINES                   = [
  'Route',
  'VTT',
  'Piste',
  'Cyclo-cross'
];
const VALID_DISCIPLINES               = [...VALID_CORE_DISCIPLINES, 'Polyvalent'];
const VALID_CATEGORIES                 = [
  'Athlète / Légende',
  'Épreuve / Monument',
  'Terrain / Secteur',
  'Matériel & Technique'
];
const VALID_RARITIES           = [
  'Commune',
  'Peu commune',
  'Rare',
  'Épique',
  'Légendaire'
];
const VALID_KEYWORDS                = [
  'À la révélation',
  'Continu',
  'Sprint final',
  'Échappée',
  'Synergie'
];
const VALID_EFFECT_CODES                   = [
  'REVEAL_TERRAIN_BOOST',
  'REVEAL_NEXT_ALLY',
  'REVEAL_DEBUFF_FOE',
  'REVEAL_PER_DISCIPLINE',
  'ONGOING_DISC_AURA',
  'ONGOING_WEATHER_SHIELD',
  'ONGOING_GEAR_SCALING',
  'SPRINT_FINAL_SURGE',
  'BREAKAWAY_EARLY_SURGE',
  'SYNERGY_MULTI_DISC'
];
function stripHtmlTags(raw        )         {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
function sanitizeText(val         , maxLen = 160, fallback = '')         {
  if (typeof val !== 'string') return fallback;
  const cleaned = val
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.slice(0, maxLen) : fallback;
}
function clampInt(val         , min        , max        , fallback        )         {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}
function sanitizeHttpsUrl(
  raw         ,
  allowedHostSuffixes          
)                     {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'https:') return undefined;
    const host = parsed.hostname.toLowerCase();
    const ok = allowedHostSuffixes.some(
      (suffix) => host === suffix || host.endsWith('.' + suffix)
    );
    return ok ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}
function isAllowedFreeLicense(licenseShortName        )          {
  if (!licenseShortName || typeof licenseShortName !== 'string') return false;
  const norm = licenseShortName.trim().toLowerCase();
  if (
    norm.includes('non-free') ||
    norm.includes('fair use') ||
    norm.includes('copyright') ||
    norm.includes('reserved') ||
    norm.includes('-nc') ||
    norm.includes(' nc') ||
    norm.includes('-nd') ||
    norm.includes(' nd') ||
    norm.includes('permission')
  ) {
    return false;
  }
  return (
    norm.includes('cc0') ||
    norm.includes('cc-zero') ||
    norm.includes('public domain') ||
    norm === 'pd' ||
    norm.startsWith('pd-') ||
    norm.includes('pdm') ||
    norm === 'no restrictions' ||
    /^cc[\s-]by([\s-]sa)?([\s-]\d\.\d)?/.test(norm)
  );
}
function sanitizeAttribution(raw         )                               {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw                           ;
  const licenseShortName = sanitizeText(obj.licenseShortName, 48);
  if (!isAllowedFreeLicense(licenseShortName)) return undefined;
  const commonsUrl = sanitizeHttpsUrl(obj.commonsUrl, [
    'commons.wikimedia.org',
    'wikipedia.org'
  ]);
  if (!commonsUrl) return undefined;

  return {
    author: sanitizeText(obj.author, 100, 'Contributeur Wikimedia Commons'),
    licenseShortName,
    licenseUrl: sanitizeHttpsUrl(obj.licenseUrl, [
      'creativecommons.org',
      'wikimedia.org',
      'wikipedia.org'
    ]),
    commonsUrl,
    sourceTitle: sanitizeText(obj.sourceTitle, 140) || undefined
  };
}

function sanitizeCustomCard(raw         )                  {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw                           ;
  const id = sanitizeText(obj.id, 64);
  const title = sanitizeText(obj.title, 80);
  if (!id || !title || id === '__proto__' || id === 'constructor') return null;

  const discipline = VALID_DISCIPLINES.includes(obj.discipline              )
    ? (obj.discipline              )
    : 'Route';
  const rawLinked = Array.isArray(obj.linkedDisciplines)
    ? obj.linkedDisciplines.filter((d)                      =>
        VALID_CORE_DISCIPLINES.includes(d                  )
      )
    : [];
  const linkedDisciplines                   =
    rawLinked.length > 0
      ? rawLinked
      : discipline === 'Polyvalent'
      ? ['Route', 'VTT', 'Piste', 'Cyclo-cross']
      : [discipline                  ];

  const category = VALID_CATEGORIES.includes(obj.category                )
    ? (obj.category                )
    : 'Matériel & Technique';
  const rarity = VALID_RARITIES.includes(obj.rarity          )
    ? (obj.rarity          )
    : 'Rare';
  const keyword = VALID_KEYWORDS.includes(obj.keyword               )
    ? (obj.keyword               )
    : 'À la révélation';
  const effectCode = VALID_EFFECT_CODES.includes(
    obj.effectCode                  
  )
    ? (obj.effectCode                  )
    : 'REVEAL_TERRAIN_BOOST';

  const rawStats =
    obj.stats && typeof obj.stats === 'object'
      ? (obj.stats                           )
      : {};
  const power = clampInt(rawStats.power, 30, 99, 75);
  const technique = clampInt(rawStats.technique, 30, 99, 75);
  const endurance = clampInt(rawStats.endurance, 30, 99, 75);
  const overall = Math.round((power + technique + endurance) / 3);

  const imageAttribution = sanitizeAttribution(obj.imageAttribution);
  const imageUrl = imageAttribution
    ? sanitizeHttpsUrl(obj.imageUrl, ['upload.wikimedia.org', 'thumb.wikimedia.org'])
    : undefined;

  return {
    id,
    cardNumber: clampInt(obj.cardNumber, 1, 9999, 999),
    title,
    subtitle: sanitizeText(obj.subtitle, 100, 'Création Sur Mesure'),
    roleTag: sanitizeText(obj.roleTag, 36, 'Forge TCG'),
    discipline,
    linkedDisciplines,
    category,
    rarity,
    energyCost: clampInt(obj.energyCost, 1, 5, 3),
    stats: { power, technique, endurance, overall },
    keyword,
    effectCode,
    effectValue: clampInt(obj.effectValue, 1, 30, 10),
    effectDescription: sanitizeText(obj.effectDescription, 140, 'Bonus tactique.'),
    summary: sanitizeText(obj.summary, 320, 'Carte TCG sur mesure.'),
    imageUrl,
    imageAttribution: imageUrl ? imageAttribution : undefined,
    nationality: sanitizeText(obj.nationality, 48, 'Création TCG'),
    countryCode: sanitizeText(obj.countryCode, 8, 'TCG'),
    keyYear: sanitizeText(obj.keyYear, 24, 'TCG'),
    keyFact: sanitizeText(obj.keyFact, 260, 'Carte tactique VeloLegends TCG.'),
    specialTrait: sanitizeText(obj.specialTrait, 64, 'Atout Tactique'),
    wikiSlug: sanitizeText(obj.wikiSlug, 100) || undefined,
    isCustomForged: true
  };
}
function sanitizeSaveState(
  raw         ,
  fallback                 ,
  baseCardIds             ,
  validQuestIds             ,
  validAchievementIds             ,
  validPromoCodes              = new Set(),
  cardCostById                      = new Map()
)                  {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return fallback;
  }
  const parsed = raw                           ;

  // Custom cards sanitisation
  const rawCustom = Array.isArray(parsed.customCards)
    ? parsed.customCards.slice(0, 40)
    : [];
  const customCards             = [];
  const allValidIds = new Set(baseCardIds);
  for (const item of rawCustom) {
    const clean = sanitizeCustomCard(item);
    if (clean && !allValidIds.has(clean.id)) {
      customCards.push(clean);
      allValidIds.add(clean.id);
      cardCostById.set(clean.id, clean.energyCost);
    }
  }

  // Inventory map sanitisation
  const inventory                           = {};
  if (parsed.inventory && typeof parsed.inventory === 'object' && !Array.isArray(parsed.inventory)) {
    for (const [k, v] of Object.entries(parsed.inventory                           )) {
      if (Object.prototype.hasOwnProperty.call(parsed.inventory, k) && allValidIds.has(k)) {
        const count = clampInt(v, 0, 999, 0);
        if (count > 0) inventory[k] = count;
      }
    }
  }
  const hasAnyOwned = Object.keys(inventory).length > 0;
  const safeInventory = hasAnyOwned ? inventory : fallback.inventory;

  // Card stars sanitisation
  const cardStars                           = {};
  if (parsed.cardStars && typeof parsed.cardStars === 'object' && !Array.isArray(parsed.cardStars)) {
    for (const [k, v] of Object.entries(parsed.cardStars                           )) {
      if (allValidIds.has(k)) {
        const st = clampInt(v, 0, 3, 0);
        if (st > 0) cardStars[k] = st;
      }
    }
  }

  // Deck sanitisation (owned cards only, unique, <= 5 cards, <= 16 W budget)
  const rawDeck = Array.isArray(parsed.deck) ? parsed.deck : [];
  const cleanDeck           = [];
  let deckEnergy = 0;
  for (const id of rawDeck) {
    if (
      typeof id === 'string' &&
      allValidIds.has(id) &&
      (safeInventory[id] || 0) > 0 &&
      !cleanDeck.includes(id) &&
      cleanDeck.length < 5
    ) {
      const cardCost = cardCostById.get(id) ?? 3;
      if (cardCostById.size === 0 || deckEnergy + cardCost <= 16) {
        cleanDeck.push(id);
        deckEnergy += cardCost;
      }
    }
  }

  // Quests sanitisation
  const rawQuests =
    parsed.quests && typeof parsed.quests === 'object'
      ? (parsed.quests                           )
      : {};
  const activeQuestIds = Array.isArray(rawQuests.activeQuestIds)
    ? rawQuests.activeQuestIds
        .filter((id)               => typeof id === 'string' && validQuestIds.has(id))
        .slice(0, 3)
    : [];
  const questProgress                           = {};
  if (rawQuests.progress && typeof rawQuests.progress === 'object') {
    for (const [k, v] of Object.entries(rawQuests.progress                           )) {
      if (validQuestIds.has(k)) {
        questProgress[k] = clampInt(v, 0, 1000, 0);
      }
    }
  }
  const completedQuestIds = Array.isArray(rawQuests.completedQuestIds)
    ? rawQuests.completedQuestIds
        .filter((id)               => typeof id === 'string' && validQuestIds.has(id))
        .slice(0, 100)
    : [];

  // Wiki cache sanitisation (strictly verified Wikimedia Commons only)
  const wikiCache                   = {};
  if (parsed.wikiCache && typeof parsed.wikiCache === 'object' && !Array.isArray(parsed.wikiCache)) {
    let entries = 0;
    for (const [slug, entry] of Object.entries(parsed.wikiCache                           )) {
      if (entries >= 120) break;
      const cleanSlug = sanitizeText(slug, 100);
      if (!cleanSlug || !entry || typeof entry !== 'object') continue;
      const eObj = entry                           ;
      const attribution = sanitizeAttribution(eObj.attribution);
      const thumbnailUrl = attribution
        ? sanitizeHttpsUrl(eObj.thumbnailUrl, ['upload.wikimedia.org', 'thumb.wikimedia.org'])
        : undefined;
      const pageUrl = sanitizeHttpsUrl(eObj.pageUrl, ['wikipedia.org', 'wikimedia.org']);
      const extract = sanitizeText(eObj.extract, 600) || undefined;
      if (extract || thumbnailUrl || pageUrl) {
        wikiCache[cleanSlug] = {
          thumbnailUrl,
          extract,
          pageUrl,
          attribution: thumbnailUrl ? attribution : undefined,
          fetchedAt: clampInt(eObj.fetchedAt, 0, Date.now() + 86400000, Date.now())
        };
        entries++;
      }
    }
  }

  const rawStats =
    parsed.stats && typeof parsed.stats === 'object'
      ? (parsed.stats                           )
      : {};

  const now = Date.now();
  const maxBidons = clampInt(parsed.maxBidons, 1, 3, fallback.maxBidons);

  const redeemedPromoCodes           = [];
  if (Array.isArray(parsed.redeemedPromoCodes)) {
    for (const c of parsed.redeemedPromoCodes) {
      if (typeof c === 'string') {
        const up = sanitizeText(c, 24).toUpperCase();
        if (
          up &&
          (validPromoCodes.size === 0 || validPromoCodes.has(up)) &&
          !redeemedPromoCodes.includes(up)
        ) {
          redeemedPromoCodes.push(up);
        }
      }
    }
  }

  return {
    watts: clampInt(parsed.watts, 0, 9999999, fallback.watts),
    bidons: clampInt(parsed.bidons, 0, maxBidons + 2, fallback.bidons),
    maxBidons,
    lastBidonTimestamp: clampInt(
      parsed.lastBidonTimestamp,
      0,
      now,
      fallback.lastBidonTimestamp
    ),
    pityEpicCounter: clampInt(parsed.pityEpicCounter, 0, 15, 0),
    pityLegendaryCounter: clampInt(parsed.pityLegendaryCounter, 0, 35, 0),
    expressQuizStreak: clampInt(parsed.expressQuizStreak, 0, 500, 0),
    soundEnabled:
      typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
    wikiSyncEnabled:
      typeof parsed.wikiSyncEnabled === 'boolean'
        ? parsed.wikiSyncEnabled
        : true,
    inventory: safeInventory,
    cardStars,
    deck: cleanDeck.length > 0 ? cleanDeck : fallback.deck,
    customCards,
    quests: {
      activeQuestIds:
        activeQuestIds.length > 0
          ? activeQuestIds
          : fallback.quests.activeQuestIds,
      progress: questProgress,
      completedQuestIds
    },
    unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
      ? parsed.unlockedAchievements
          .filter(
            (id)               =>
              typeof id === 'string' && validAchievementIds.has(id)
          )
          .slice(0, 50)
      : [],
    redeemedPromoCodes,
    stats: {
      boostersOpened: clampInt(rawStats.boostersOpened, 0, 999999, 0),
      godPacksOpened: clampInt(rawStats.godPacksOpened, 0, 99999, 0),
      duelsPlayed: clampInt(rawStats.duelsPlayed, 0, 999999, 0),
      duelsWon: clampInt(rawStats.duelsWon, 0, 999999, 0),
      quizAnswered: clampInt(rawStats.quizAnswered, 0, 999999, 0),
      quizCorrect: clampInt(rawStats.quizCorrect, 0, 999999, 0),
      attackQuizSuccess: clampInt(rawStats.attackQuizSuccess, 0, 999999, 0),
      cardsRecycled: clampInt(rawStats.cardsRecycled, 0, 999999, 0),
      cardsUpgraded: clampInt(rawStats.cardsUpgraded, 0, 999999, 0),
      wattsEarnedTotal: clampInt(rawStats.wattsEarnedTotal, 0, 99999999, fallback.watts),
      legendariesPulled: clampInt(rawStats.legendariesPulled, 0, 99999, 0)
    },
    wikiCache
  };
}
function createBackupExportJson(state                 )         {
  return JSON.stringify(
    {
      app: 'VeloLegends-TCG',
      schemaVersion: 4,
      exportedAt: new Date().toISOString(),
      data: state
    },
    null,
    2
  );
}


// === FILE: src/data/extraCards.ts ===

/**
 * Extension majeure du catalogue : +80 cartes uniques couvrant les stars actuelles H/F,
 * les équipiers modèles, les jeunes espoirs, les classiques régionales, le matériel réel et les tactiques.
 */
const EXTRA_TCG_SEEDS                   = [
  // ============================================================================
  // ROUTE SUPPLÉMENTAIRE (22 cartes)
  // ============================================================================
  {
    id: 'route-philipsen',
    title: 'Jasper Philipsen',
    subtitle: 'Jasper Disaster • Maillot Vert & Milan-San Remo 2024',
    roleTag: 'Sprinteur Pur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 94,
    technique: 88,
    endurance: 66,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étape 4 ou 5 (emballage massif).',
    summary: 'Sprinteur belge ultra-rapide et audacieux, vainqueur de Milan-San Remo 2024 et collectionneur d’étapes sur le Tour de France grâce à un placement féroce.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '2024',
    keyFact: 'A remporté Milan-San Remo 2024 avec un lancer de vélo décisif devant Michael Matthews sur la Via Roma.',
    specialTrait: 'Placement au Millimètre dans le Train',
    wikiSlug: 'Jasper_Philipsen'
  },
  {
    id: 'route-wiebes',
    title: 'Lorena Wiebes',
    subtitle: 'Reine du Sprint Féminin • Championne d’Europe & Gravel',
    roleTag: 'Sprinteuse Pure',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 93,
    technique: 87,
    endurance: 65,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étape 4 ou 5 (sprint final).',
    summary: 'Référence mondiale du sprint sur route féminin avec près de 100 victoires professionnelles dès ses 25 ans.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: '90+ Victoires',
    keyFact: 'A franchi les 100 km/h en pointe relative de domination sur les arrivées plates du WorldTour féminin.',
    specialTrait: 'Accélération Fulgurante à 150 m',
    wikiSlug: 'Lorena_Wiebes'
  },
  {
    id: 'route-girmay',
    title: 'Biniam Girmay',
    subtitle: 'Maillot Vert du Tour 2024 • Pionnier Érythréen',
    roleTag: 'Sprinteur-Puncheur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 90,
    technique: 86,
    endurance: 74,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 11,
    effectDescription: '+11 pts immédiats sur terrain Route.',
    summary: 'Premier coureur d’Afrique noire à remporter une classique flandrienne (Gand-Wevelgem), une étape sur un Grand Tour et le Maillot Vert du Tour de France.',
    nationality: 'Érythrée',
    countryCode: 'ERI',
    keyYear: 'Tour 2024',
    keyFact: 'A décroché trois victoires d’étapes et le Maillot Vert sur le Tour de France 2024.',
    specialTrait: 'Sprint en Faux-Plat Montant',
    wikiSlug: 'Biniam_Girmay'
  },
  {
    id: 'route-niewiadoma',
    title: 'Kasia Niewiadoma',
    subtitle: 'Vainqueure du Tour de France Femmes 2024 & Flèche Wallonne',
    roleTag: 'Grimpeuse-Puncheuse',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 85,
    technique: 86,
    endurance: 91,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étape 4 ou 5 (duel à l’Alpe d’Huez).',
    summary: 'Attaquante polonaise infatigable, championne du monde de Gravel et lauréate du Tour de France Femmes 2024 pour 4 secondes au sommet de l’Alpe d’Huez.',
    nationality: 'Pologne',
    countryCode: 'POL',
    keyYear: '4 Secondes',
    keyFact: 'A remporté le Tour de France Femmes 2024 avec le plus petit écart de l’histoire : 4 secondes devant Demi Vollering.',
    specialTrait: 'Résistance Héroïque à l’Alpe',
    wikiSlug: 'Kasia_Niewiadoma'
  },
  {
    id: 'route-pedersen',
    title: 'Mads Pedersen',
    subtitle: 'Champion du Monde Yorkshire 2019 • Colosse Flandrien',
    roleTag: 'Flandrien',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 91,
    technique: 87,
    endurance: 84,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 10,
    effectDescription: 'Adore le froid et la pluie : annule malus & +10 pts.',
    summary: 'Sacré champion du monde sous le déluge du Yorkshire en 2019, redoutable sur les pavés de Gand-Wevelgem et Paris-Roubaix.',
    nationality: 'Danemark',
    countryCode: 'DEN',
    keyYear: 'Harrogate 2019',
    keyFact: 'Plus la course dépasse les 250 km sous la pluie glaciale, plus son sprint final reste puissant.',
    specialTrait: 'Moteur du Déluge Danois',
    wikiSlug: 'Mads_Pedersen'
  },
  {
    id: 'route-poulidor',
    title: 'Raymond Poulidor',
    subtitle: 'Poupou • L’Éternel Second & Duel du Puy de Dôme 1964',
    roleTag: 'Grimpeur-Complexe',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 84,
    technique: 85,
    endurance: 93,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte Route jouée dans le match.',
    summary: 'Héros populaire du cyclisme français aux huit podiums sur le Tour de France sans jamais avoir endossé le Maillot Jaune.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1964',
    keyFact: 'Grand-père maternel de Mathieu van der Poel et vainqueur de Milan-San Remo, la Flèche wallonne et la Vuelta.',
    specialTrait: 'Ferveur Populaire Inépuisable',
    wikiSlug: 'Raymond_Poulidor'
  },
  {
    id: 'route-bardet',
    title: 'Romain Bardet',
    subtitle: 'Maillot Jaune 2024 à Rimini & Maillot à Pois 2019',
    roleTag: 'Grimpeur-Descendeur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 77,
    technique: 84,
    endurance: 88,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 10,
    effectDescription: '+10 pts en Étape 1 ou 2 (coup d’éclat à Rimini).',
    summary: 'Deux fois sur le podium du Tour de France, premier Maillot Jaune du Tour 2024 à Rimini après un duo mémorable avec son équipier Frank van den Broek.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Rimini 2024',
    keyFact: 'A décroché son tout premier Maillot Jaune à 33 ans lors de la 1re étape du Tour 2024 en Italie.',
    specialTrait: 'Descente Engagée & Panache',
    wikiSlug: 'Romain_Bardet'
  },
  {
    id: 'route-martinez',
    title: 'Lenny Martinez',
    subtitle: 'Jeune Espoir Français • Plus Jeune Leader de la Vuelta',
    roleTag: 'Espoir Grimpeur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 74,
    technique: 77,
    endurance: 86,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 9,
    effectDescription: 'Relais en montagne : +9 pts à votre prochaine carte.',
    summary: 'Grimpeur français de 52 kg issu d’une lignée de cyclistes (père Miguel champion olympique VTT), vainqueur de la Classic Grand Besançon et du Trofeo Laigueglia.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '20 ans',
    keyFact: 'Est devenu en 2023 le plus jeune leader de l’histoire du Tour d’Espagne à 20 ans et 51 jours.',
    specialTrait: 'Poids Plume 52 kg',
    wikiSlug: 'Lenny_Martinez'
  },
  {
    id: 'route-seixas',
    title: 'Paul Seixas',
    subtitle: 'Champion du Monde Junior CLM 2024 • Pépite Française',
    roleTag: 'Jeune Espoir',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 80,
    technique: 81,
    endurance: 78,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 9,
    effectDescription: '+9 pts en Étape 1 ou 2.',
    summary: 'Jeune talent lyonnais sacré champion du monde junior du contre-la-montre à Zurich 2024 après avoir brillé en cyclo-cross et en montagne.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Zurich 2024',
    keyFact: 'Champion du monde junior du chrono à Zurich en 2024 et vainqueur de Liège-Bastogne-Liège juniors.',
    specialTrait: 'Éclosion Précoce',
    wikiSlug: 'Paul_Seixas'
  },
  {
    id: 'route-equipier-plaine',
    title: 'Le Capitaine de Route (Équipier Modèle)',
    subtitle: 'Relais Face au Vent pendant 150 Kilomètres',
    roleTag: 'Équipier',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Commune',
    energyCost: 1,
    power: 72,
    technique: 74,
    endurance: 78,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 9,
    effectDescription: 'Protège son leader : +9 pts à votre prochaine carte.',
    summary: 'Rouleur fidèle qui avale les kilomètres face au vent dès le kilomètre zéro pour contrôler l’échappée et placer son leader avant le final.',
    nationality: 'Peloton Pro',
    countryCode: 'INT',
    keyYear: '150 km',
    keyFact: 'Un capitaine de route expérimenté lit la météo, dirige le placement dans les rond-points et porte les bidons.',
    specialTrait: 'Bouclier Face au Vent'
  },
  {
    id: 'route-lanterne-rouge',
    title: 'La Lanterne Rouge (Dernier du Général)',
    subtitle: 'Survivant des Délais dans la Haute Montagne',
    roleTag: 'Baroudeur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Commune',
    energyCost: 1,
    power: 68,
    technique: 70,
    endurance: 79,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 9,
    effectDescription: '+9 pts en Étapes 4 ou 5 (jusqu’aux Champs-Élysées).',
    summary: 'Loin des caméras de tête, il lutte chaque jour dans le gruppetto contre la barrière des délais pour rallier Paris au bout de trois semaines.',
    nationality: 'Peloton Pro',
    countryCode: 'INT',
    keyYear: 'Gruppetto',
    keyFact: 'Le terme vient de la lampe rouge accrochée à l’arrière des anciens trains pour signaler la queue du convoi.',
    specialTrait: 'Courage du Gruppetto'
  },
  {
    id: 'route-milansanremo',
    title: 'Milan-San Remo (La Classicissima)',
    subtitle: 'Monument de 298 km • Cipressa & Poggio',
    roleTag: 'Monument',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Épreuve / Monument',
    rarity: 'Épique',
    energyCost: 4,
    power: 91,
    technique: 90,
    endurance: 94,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 15,
    effectDescription: '+15 pts en Étape 4 ou 5 (sommet & descente du Poggio).',
    summary: 'Le Monument le plus long de la saison (près de 300 km) et souvent le plus indécis, entre attaque de puncheur dans le Poggio et sprint sur la Via Roma.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: '1907',
    keyFact: 'Eddy Merckx y détient le record absolu avec 7 victoires sur la Riviera ligure.',
    specialTrait: 'Final du Poggio di San Remo',
    wikiSlug: 'Milan-San_Remo'
  },
  {
    id: 'route-lombardie',
    title: 'Tour de Lombardie (Classique des Feuilles Mortes)',
    subtitle: 'Monument d’Automne • Ghisallo & Civiglio',
    roleTag: 'Monument',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 84,
    technique: 85,
    endurance: 92,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts en Étapes 4 ou 5.',
    summary: 'Dernier des cinq Monuments, disputé en octobre autour du lac de Côme devant la chapelle de la Madonna del Ghisallo, patronne des cyclistes.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: '1905',
    keyFact: 'Fausto Coppi a remporté 5 fois le Tour de Lombardie, Tadej Pogačar l’a égalé ou poursuivi en séries consécutives.',
    specialTrait: 'Sanctuaire du Ghisallo',
    wikiSlug: 'Tour_de_Lombardie'
  },
  {
    id: 'route-trobroleon',
    title: 'Tro Bro Leon (Les Ribinoù du Finistère)',
    subtitle: 'Semi-Classique Bretonne • Chemins de Terre & Porcelet',
    roleTag: 'Classique Terre',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Cyclo-cross'],
    category: 'Épreuve / Monument',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 79,
    technique: 84,
    endurance: 78,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 8,
    effectDescription: 'Maîtrise la poussière bretonne : annule malus & +8 pts.',
    summary: 'Le « Paris-Roubaix breton » disputé à Lannilis sur près de 30 secteurs de chemins empierrés et boueux (« ribinoù »).',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1984',
    keyFact: 'Le meilleur Breton classé à l’arrivée reçoit traditionnellement un petit cochon vivant en guise de prix spécial.',
    specialTrait: 'Poussière des Ribinoù',
    wikiSlug: 'Tro_Bro_Leon'
  },
  {
    id: 'route-gpdenain',
    title: 'Grand Prix de Denain',
    subtitle: 'Classique Nordiste • Avant-Goût des Pavés d’Arenberg',
    roleTag: 'Semi-Classique',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Épreuve / Monument',
    rarity: 'Commune',
    energyCost: 1,
    power: 73,
    technique: 74,
    endurance: 72,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 8,
    effectDescription: '+8 pts en Étape 1 ou 2.',
    summary: 'Course historique du Hainaut empruntant plusieurs secteurs pavés de Paris-Roubaix en guise de répétition générale printanière.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1959',
    keyFact: 'Disputée depuis 1959 dans les rues minières autour de Denain et de Valenciennes.',
    specialTrait: 'Répétition des Pavés du Hainaut',
    wikiSlug: 'Grand_Prix_de_Denain'
  },
  {
    id: 'route-kuurne',
    title: 'Kuurne-Bruxelles-Kuurne',
    subtitle: 'Week-End d’Ouverture Belge • Revanche des Sprinteurs',
    roleTag: 'Semi-Classique',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Épreuve / Monument',
    rarity: 'Commune',
    energyCost: 1,
    power: 76,
    technique: 72,
    endurance: 71,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 8,
    effectDescription: '+8 pts en Étapes 4 ou 5 (boulevard de Kuurne).',
    summary: 'Disputée le dimanche au lendemain de l’Omloop Het Nieuwsblad, elle sourit souvent aux sprinteurs flandriens après le Mont Saint-Laurent.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '1945',
    keyFact: 'Tom Boonen y détient le record de victoires avec 3 succès en 2007, 2009 et 2014.',
    specialTrait: 'Boulevard des Sprinteurs',
    wikiSlug: 'Kuurne-Bruxelles-Kuurne'
  },
  {
    id: 'route-mur-huy',
    title: 'Le Mur de Huy (Chemin des Chapelles)',
    subtitle: 'Secteur Flèche Wallonne • 1 300 m avec Passage à 26%',
    roleTag: 'Secteur Mur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 86,
    technique: 79,
    endurance: 76,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 11,
    effectDescription: '+11 pts en Étapes 4 ou 5 (rampe finale à 26%).',
    summary: 'Rampe finale impitoyable de la Flèche wallonne où l’effort explosif des 300 derniers mètres ne pardonne aucun démarrage trop hâtif.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '26% max',
    keyFact: 'Le virage Claude Criquielion affiche une pente intérieure atteignant 26%.',
    specialTrait: 'Virage Criquielion à 26%',
    wikiSlug: 'Mur_de_Huy'
  },
  {
    id: 'route-stelvio',
    title: 'Passo dello Stelvio (2 758 m)',
    subtitle: '48 Lacets Vertigineux • Cima Coppi des Alpes Italiennes',
    roleTag: 'Col Mythique',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 81,
    technique: 84,
    endurance: 94,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte Route jouée dans le match.',
    summary: 'Deuxième plus haut col routier goudronné des Alpes, célèbre pour sa muraille de 48 virages en épingle côté Prato allo Stelvio.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: '2 758 m',
    keyFact: 'Ses murs de neige dépassent fréquemment les trois mètres de hauteur en mai lors du passage du Giro.',
    specialTrait: '48 Épingles dans la Neige',
    wikiSlug: 'Col_du_Stelvio'
  },
  {
    id: 'route-criterium-urbain',
    title: 'Critérium Nocturne en Ville (Boucle 1,8 km)',
    subtitle: 'Circuit Urbain • 50 Relances & Virages à Angle Droit',
    roleTag: 'Terrain Urbain',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Terrain / Secteur',
    rarity: 'Commune',
    energyCost: 1,
    power: 75,
    technique: 76,
    endurance: 66,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 8,
    effectDescription: 'Relance vive : +8 pts à votre prochaine carte.',
    summary: 'Course nerveuse sur circuit fermé en centre-ville où chaque virage à 90° oblige à remettre 700 Watts en sortie de courbe.',
    nationality: 'Circuit Régional',
    countryCode: 'INT',
    keyYear: '1,8 km/tour',
    keyFact: 'Dans un critérium, un coureur victime d’une crevaison bénéficie généralement d’un tour neutre pour réintégrer le peloton.',
    specialTrait: 'Relance en Sortie de Courbe'
  },
  {
    id: 'route-aspi-peloton',
    title: 'Abri au Cœur du Peloton (Économie -35%)',
    subtitle: 'Tactique Route Fondamentale • Frotter sans Prendre le Vent',
    roleTag: 'Tactique Base',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 66,
    technique: 75,
    endurance: 78,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 7,
    effectDescription: 'Protégé dans les roues : annule malus & +7 pts.',
    summary: 'Savoir se glisser en 20ᵉ position du peloton pour rouler à 45 km/h en ne produisant que 160 Watts au lieu de 380 en tête.',
    nationality: 'Tactique Route',
    countryCode: 'TCG',
    keyYear: '-35% Watts',
    keyFact: 'Au milieu d’un peloton compact de 150 coureurs, la traînée aérodynamique peut chuter de plus de 50%.',
    specialTrait: 'Aspiration au Cœur du Paquet'
  },
  {
    id: 'route-frein-patins',
    title: 'Vélo Alu Patins & Transmission 10 Vitesses',
    subtitle: 'Matériel Standard • Fiable, Simple et Facile à Réparer',
    roleTag: 'Matériel Base',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 68,
    technique: 70,
    endurance: 74,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 5,
    effectDescription: '+5 pts par carte Matériel & Technique jouée.',
    summary: 'Le fidèle compagnon d’entraînement hivernal ou des courses régionales : câbles externes, étriers à patins et roues aluminium robustes.',
    nationality: 'Matériel Club',
    countryCode: 'TCG',
    keyYear: '8,4 kg',
    keyFact: 'Un vélo alu à patins reste léger sur le sec et permet de changer une roue en moins de 5 secondes sans axe traversant.',
    specialTrait: 'Mécanique Indestructible'
  },
  {
    id: 'route-changement-roue',
    title: 'Dépannage Voiture Neutre Assistance',
    subtitle: 'Action Tactique • Sauver la Course après Crevaison',
    roleTag: 'Action Course',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 69,
    technique: 74,
    endurance: 75,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 8,
    effectDescription: 'Dépannage express : +8 pts à votre prochaine carte.',
    summary: 'Bras levé sur le bas-côté : le mécanicien neutre jaunit de sa voiture ou moto jaune et change l’axe traversant en 10 secondes chrono.',
    nationality: 'Assistance',
    countryCode: 'INT',
    keyYear: '10 s Chrono',
    keyFact: 'Les véhicules d’assistance neutre embarquent des vélos complets en plusieurs tailles et des roues compatibles disques 12 vitesses.',
    specialTrait: 'Retour dans la File des Voitures'
  },

  // ============================================================================
  // VTT SUPPLÉMENTAIRE (20 cartes)
  // ============================================================================
  {
    id: 'vtt-goldstone',
    title: 'Jackson Goldstone',
    subtitle: 'Prodige Canadien DH • Vainqueur à Mont-Sainte-Anne & Val di Sole',
    roleTag: 'Descendeur DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 88,
    technique: 94,
    endurance: 70,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étapes 1 ou 2 (style fluide ultra-rapide).',
    summary: 'Sensation de la descente mondiale dès son passage en élite, capable de gagner à Val di Sole et à domicile à Mont-Sainte-Anne avec un style félin.',
    nationality: 'Canada',
    countryCode: 'CAN',
    keyYear: '2023',
    keyFact: 'Connu dès l’âge de 6 ans pour une vidéo virale à vélo draisienne, devenu vainqueur en Coupe du monde Élite DH à 19 ans.',
    specialTrait: 'Style Félin de Squamish',
    wikiSlug: 'Jackson_Goldstone'
  },
  {
    id: 'vtt-holl',
    title: 'Vali Höll',
    subtitle: 'Triple Championne du Monde DH • Domination Autrichienne',
    roleTag: 'Descendeuse DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 89,
    technique: 93,
    endurance: 72,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 12,
    effectDescription: '+12 pts immédiats sur terrain VTT.',
    summary: 'Championne du monde élite de descente à trois reprises (2022, 2023, 2024) et lauréate du général de la Coupe du monde par sa puissance physique.',
    nationality: 'Autriche',
    countryCode: 'AUT',
    keyYear: '3x Mondial DH',
    keyFact: 'A enchaîné trois titres mondiaux consécutifs en DH élite (Les Gets 2022, Fort William 2023, Pal Arinsal 2024).',
    specialTrait: 'Puissance Autrichienne en Pente',
    wikiSlug: 'Valentina_Höll'
  },
  {
    id: 'vtt-hatherly',
    title: 'Alan Hatherly',
    subtitle: 'Champion du Monde XCO 2024 & Bronze Olympique Paris',
    roleTag: 'Pilote XCO',
    discipline: 'VTT',
    linkedDisciplines: ['VTT', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 88,
    technique: 87,
    endurance: 89,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts en Étape 4 ou 5 (dernier tour XCO).',
    summary: 'Sud-Africain médaillé de bronze aux Jeux de Paris 2024 puis sacré champion du monde élite XCO en Andorre devant Victor Koretzky.',
    nationality: 'Afrique du Sud',
    countryCode: 'RSA',
    keyYear: 'Andorre 2024',
    keyFact: 'A remporté en 2024 le classement général de la Coupe du monde XCO et le maillot arc-en-ciel à Pal Arinsal.',
    specialTrait: 'Attaque d’Altitude en Andorre',
    wikiSlug: 'Alan_Hatherly'
  },
  {
    id: 'vtt-sarrou',
    title: 'Jordan Sarrou',
    subtitle: 'Champion du Monde XCO 2020 à Leogang',
    roleTag: 'Pilote XCO',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 81,
    technique: 85,
    endurance: 84,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 9,
    effectDescription: 'Brille dans la boue de Leogang : annule malus & +9 pts.',
    summary: 'Vététiste français sacré champion du monde XCO dans les bourbiers autrichiens de Leogang en 2020 et multi-médaillé mondial en relais.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Leogang 2020',
    keyFact: 'A décroché le titre mondial élite en 2020 dans des conditions dantesques où la technique de pilotage a tout décidé.',
    specialTrait: 'Maîtrise de la Glaise Autrichienne',
    wikiSlug: 'Jordan_Sarrou'
  },
  {
    id: 'vtt-richards',
    title: 'Evie Richards',
    subtitle: 'Championne du Monde XCO 2021 & Short-Track 2024',
    roleTag: 'Pilote XCO/XCC',
    discipline: 'VTT',
    linkedDisciplines: ['VTT', 'Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 83,
    technique: 84,
    endurance: 81,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 10,
    effectDescription: '+10 pts en Étapes 1 ou 2 (départ explosif XCC).',
    summary: 'Britannique pétillante et explosive, championne du monde XCO à Val di Sole 2021 et championne du monde Short-Track 2024.',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: '2021 & 2024',
    keyFact: 'A commencé le vélo par le hockey sur gazon avant de devenir double championne du monde VTT.',
    specialTrait: 'Explosivité Short-Track',
    wikiSlug: 'Evie_Richards'
  },
  {
    id: 'vtt-hart',
    title: 'Danny Hart',
    subtitle: 'Champéry 2011 • Le Run Sous le Déluge Légendaire',
    roleTag: 'Descendeur DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 81,
    technique: 90,
    endurance: 68,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 9,
    effectDescription: 'Whip dans la tempête : -9 pts à l’adversaire !',
    summary: 'Auteur en 2011 sur la piste verticale et détrempée de Champéry du run considéré comme le plus fou de l’histoire de la descente (11,6 s d’avance !).',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: 'Champéry 2011',
    keyFact: 'A collé 11,69 secondes au second sous une pluie torrentielle à Champéry en claquant un whip sur le dernier saut.',
    specialTrait: 'Whip de Champéry sous le Déluge',
    wikiSlug: 'Danny_Hart'
  },
  {
    id: 'vtt-marotte',
    title: 'Maxime Marotte',
    subtitle: 'Vice-Champion du Monde & Pilier de l’Équipe de France XCO',
    roleTag: 'Pilote XCO',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 79,
    technique: 83,
    endurance: 84,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte VTT jouée dans le match.',
    summary: 'Alsacien ultra-régulier pendant 15 ans dans le top 10 mondial XCO, 4ᵉ des JO de Rio et multiple vainqueur du classement général du Roc d’Azur.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Top 5 Mondial',
    keyFact: 'A formé avec Julien Absalon et Stéphane Tempier le trio historique français de Rio 2016.',
    specialTrait: 'Régularité d’Horloger en XCO',
    wikiSlug: 'Maxime_Marotte'
  },
  {
    id: 'vtt-jeune-enduro',
    title: 'Pilote de Club Enduro Régional',
    subtitle: 'Liaison Pédalée & 4 Spéciales Chronométrées',
    roleTag: 'Pilote Club',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Commune',
    energyCost: 1,
    power: 69,
    technique: 77,
    endurance: 74,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 8,
    effectDescription: '+8 pts immédiats sur terrain VTT.',
    summary: 'Engagé chaque dimanche sur les enduros régionaux avec sa banane dorsale, ses genouillères et sa passion des sentiers naturels.',
    nationality: 'Club VTT',
    countryCode: 'TCG',
    keyYear: '4 Spéciales',
    keyFact: 'En Enduro, le chronomètre ne tourne que dans les spéciales descendantes mais il faut pointer à l’heure après chaque liaison.',
    specialTrait: 'Esprit Singletrack du Dimanche'
  },
  {
    id: 'vtt-roc-azur',
    title: 'Roc d\'Azur (Fréjus • Massif des Maures)',
    subtitle: 'Plus Grand Rassemblement VTT au Monde (20 000 Participants)',
    roleTag: 'Épreuve Mythique',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Épreuve / Monument',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 80,
    technique: 81,
    endurance: 84,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 10,
    effectDescription: '+10 pts si précédée par une autre discipline.',
    summary: 'Fête automnale mythique créée en 1984 : traversée du Fournel, descente du Bougnon et arrivée sur la base nature de Fréjus.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1984',
    keyFact: 'La première édition en 1984 ne comptait que 7 participants contre plus de 20 000 vététistes aujourd’hui.',
    specialTrait: 'Traversée du Fournel & Bougnon',
    wikiSlug: 'Roc_d\'Azur'
  },
  {
    id: 'vtt-cape-epic',
    title: 'Absa Cape Epic (Afrique du Sud)',
    subtitle: 'Le « Tour de France du VTT Marathon » en Binôme (8 Jours)',
    roleTag: 'Marathon Stage',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 83,
    technique: 84,
    endurance: 94,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte VTT jouée dans la partie.',
    summary: 'Course par étapes de 650 km en duo inséparable à travers la chaleur, la poussière et les sentiers caillouteux du Cap-Occidental.',
    nationality: 'Afrique du Sud',
    countryCode: 'RSA',
    keyYear: '650 km Duo',
    keyFact: 'Les deux équipiers n’ont pas le droit d’être séparés de plus de deux minutes à aucun moment de la course.',
    specialTrait: 'Binôme Indissociable XCM',
    wikiSlug: 'Cape_Epic'
  },
  {
    id: 'vtt-rando-forest',
    title: 'Randonnée Chrono des Sapins (35 km)',
    subtitle: 'Épreuve Locale • Racines Humides & Ravitaillement Chaleureux',
    roleTag: 'Course Locale',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Épreuve / Monument',
    rarity: 'Commune',
    energyCost: 1,
    power: 68,
    technique: 74,
    endurance: 76,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 8,
    effectDescription: '+8 pts en Étape 1 ou 2.',
    summary: 'Classique dominicale de forêt où l’on retrouve sous-bois glissants, coups de cul à 18% et mécanique de débrouillardise.',
    nationality: 'Régional',
    countryCode: 'TCG',
    keyYear: '35 km / 900 D+',
    keyFact: 'Les ravitaillements de randonnées VTT locales sont célèbres pour leurs quartiers d’orange, pain d’épices et convivialité.',
    specialTrait: 'Coup de Cul Forestier'
  },
  {
    id: 'vtt-champery-wall',
    title: 'Piste Noire Verticale de Champéry (Suisse)',
    subtitle: 'Secteur DH Mythique • Dévers Extrême à 45° dans les Sapins',
    roleTag: 'Secteur DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 82,
    technique: 95,
    endurance: 74,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 10,
    effectDescription: 'Pente vertigineuse : -10 pts au score adverse !',
    summary: 'Mur de terre noire suisse si raide que certains passages doivent être abordés quasiment en glissade contrôlée des deux roues.',
    nationality: 'Suisse',
    countryCode: 'SUI',
    keyYear: 'Pente 45°',
    keyFact: 'À Champéry, on descend de près de 600 mètres de dénivelé en à peine 1,6 kilomètre de longueur.',
    specialTrait: 'Verticale des Dents du Midi'
  },
  {
    id: 'vtt-nove-mesto',
    title: 'Circuit XCO de Nové Město na Moravě',
    subtitle: 'Temple Tchèque du Cross-Country • Pierriers & Foule Record',
    roleTag: 'Circuit XCO',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 82,
    technique: 85,
    endurance: 83,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 10,
    effectDescription: '+10 pts immédiats sur terrain VTT.',
    summary: 'L’arène tchèque où plus de 30 000 fans hurlent le long des rock gardens « BMX » et « Mitas Choice » dans la forêt de Vysočina.',
    nationality: 'Tchéquie',
    countryCode: 'CZE',
    keyYear: 'Vysočina',
    keyFact: 'Mathieu van der Poel, Nino Schurter et Julien Absalon s’y sont livré certains des duels les plus serrés de la Coupe du monde.',
    specialTrait: 'Rock Garden Mitas Choice'
  },
  {
    id: 'vtt-semi-rigide',
    title: 'VTT Semi-Rigide Carbone XCO (8,9 kg)',
    subtitle: 'Matériel Cross-Country • Rendement Pur en Montée',
    roleTag: 'Matériel XCO',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 75,
    technique: 74,
    endurance: 78,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 5,
    effectDescription: '+5 pts par carte Matériel & Technique jouée.',
    summary: 'Cadre rigide ultra-nerveux à l’arrière couplé à une fourche avant de 100 mm blocable au guidon pour transformer chaque relance en fusée.',
    nationality: 'Matériel VTT',
    countryCode: 'TCG',
    keyYear: '8,9 kg',
    keyFact: 'Sur les circuits roulants ou les longues montées lisses, le semi-rigide gagne près d’un kilo face au tout-suspendu.',
    specialTrait: 'Blocage Fourche au Guidon'
  },
  {
    id: 'vtt-mousse-insert',
    title: 'Insert Mousse Anti-Pincement & Pneus Renforcés',
    subtitle: 'Matériel Enduro/DH • Rouler à Plat jusqu’à l’Arrivée',
    roleTag: 'Matériel DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 68,
    technique: 78,
    endurance: 76,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 7,
    effectDescription: 'Protège la jante sur rochers : annule malus & +7 pts.',
    summary: 'Boudin en mousse haute densité logé à l’intérieur du pneu tubeless pour protéger la jante carbone des impacts violents sur les arêtes rocheuses.',
    nationality: 'Matériel VTT',
    countryCode: 'TCG',
    keyYear: 'Run-Flat',
    keyFact: 'Avec un insert mousse, un pilote DH peut parfois terminer la fin d’un run même après avoir crevé sur un pierrier.',
    specialTrait: 'Protection Jante Anti-Choc'
  },
  {
    id: 'vtt-nose-bonk',
    title: 'Équilibre en Surplace & Nose-Turn en Épingle',
    subtitle: 'Technique Pilotage • Pivot 180° sur la Roue Avant',
    roleTag: 'Technique VTT',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 75,
    technique: 90,
    endurance: 72,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 9,
    effectDescription: 'Passe une épingle impossible : -9 pts au score adverse.',
    summary: 'Bloquer brièvement le frein avant, basculer le bassin et faire tourner l’arrière du vélo dans les airs pour négocier un virage fermé en falaise.',
    nationality: 'Technique VTT',
    countryCode: 'TCG',
    keyYear: 'Endo-Turn',
    keyFact: 'En Enduro naturel alpin, le Nose-Turn permet de garder les deux pieds sur les pédales là où il est impossible de tourner normalement.',
    specialTrait: 'Pivot 180° Roue Avant'
  },
  {
    id: 'vtt-kit-co2',
    title: 'Mèche Tubeless & Cartouche CO2 Express',
    subtitle: 'Action Mécanique • Réparation en 20 Secondes en Spéciale',
    roleTag: 'Action Méca',
    discipline: 'VTT',
    linkedDisciplines: ['VTT', 'Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 67,
    technique: 76,
    endurance: 74,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 8,
    effectDescription: 'Repart sans perdre de temps : +8 pts à la prochaine carte.',
    summary: 'Enfoncer une mèche caoutchoutée dans l’entaille du pneu et percuter une cartouche de CO2 à 16 g pour regonfler instantanément.',
    nationality: 'Mécanique',
    countryCode: 'TCG',
    keyYear: 'CO2 16g',
    keyFact: 'Les pilotes fixent souvent l’outil à mèche directement à l’intérieur de l’extrémité du cintre pour gagner de précieuses secondes.',
    specialTrait: 'Réparation Éclair sans Démonter'
  },
  {
    id: 'vtt-pedales-plates',
    title: 'Pédales Plates à Picots & Semelles Gomme Tendre',
    subtitle: 'Matériel Freeride/DH • Libération Instantanée du Pied',
    roleTag: 'Matériel Gravity',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 71,
    technique: 79,
    endurance: 68,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 8,
    effectDescription: '+8 pts immédiats sur terrain VTT.',
    summary: 'Plateforme large hérissée de picots acier mordant dans la semelle souple pour sortir le pied à la volée dans les virages poussiéreux ou en Dirt.',
    nationality: 'Matériel Gravity',
    countryCode: 'TCG',
    keyYear: 'Flat Pedals',
    keyFact: 'Sam Hill a remporté les Championnats du monde DH et plusieurs manches Enduro World Series exclusivement en pédales plates.',
    specialTrait: 'Pied Sorti en Glisse Contrôlée'
  },
  {
    id: 'vtt-check-ligne',
    title: 'Reconnaissance à Pied (Track Walk)',
    subtitle: 'Tactique VTT DH • Mémoriser Chaque Racine et Ornière',
    roleTag: 'Tactique DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 66,
    technique: 80,
    endurance: 71,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 9,
    effectDescription: 'Lecture parfaite de la piste : +9 pts à votre prochaine carte.',
    summary: 'Remonter ou descendre la piste de DH à pied avant les essais pour repérer les lignes hautes secrètes que personne n’emprunte.',
    nationality: 'Tactique VTT',
    countryCode: 'TCG',
    keyYear: 'Track Walk',
    keyFact: 'Lors du Track Walk, les descendeurs prennent parfois des repères visuels sur les écorces d’arbres pour anticiper les sauts à l’aveugle.',
    specialTrait: 'Ligne Haute Secrète Repérée'
  },
  {
    id: 'vtt-transmission-t-type',
    title: 'Transmission Électronique Direct-Mount',
    subtitle: 'Matériel Pro XCO/Enduro • Changement sous Pleine Charge',
    roleTag: 'Matériel Pro',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 81,
    technique: 83,
    endurance: 77,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 6,
    effectDescription: '+6 pts par carte Matériel & Technique jouée.',
    summary: 'Dérailleur fixé directement autour de l’axe arrière sans patte fusible, permettant de changer de vitesse même debout sur les pédales à 900 Watts.',
    nationality: 'Matériel Pro',
    countryCode: 'TCG',
    keyYear: '12 Vitesses',
    keyFact: 'Supprimer la patte de dérailleur traditionnelle élimine la principale source de dérèglement en cas de choc contre une pierre.',
    specialTrait: 'Passage sous Pleine Charge'
  },

  // ============================================================================
  // CYCLISME SUR PISTE SUPPLÉMENTAIRE (18 cartes)
  // ============================================================================
  {
    id: 'piste-andrews',
    title: 'Ellesse Andrews',
    subtitle: 'Double Or Olympique Paris 2024 • Vitesse & Keirin',
    roleTag: 'Pistarde Sprint',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 93,
    technique: 88,
    endurance: 69,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étape 4 ou 5 (emballage Keirin/Vitesse).',
    summary: 'Néo-Zélandaise phénoménale sacrée double championne olympique du keirin et de la vitesse individuelle au vélodrome de Saint-Quentin-en-Yvelines.',
    nationality: 'Nouvelle-Zélande',
    countryCode: 'NZL',
    keyYear: 'Paris 2024',
    keyFact: 'A également décroché l’argent en vitesse par équipes à Paris 2024 pour repartir avec trois médailles olympiques.',
    specialTrait: 'Accélération Kiwi à SQY',
    wikiSlug: 'Ellesse_Andrews'
  },
  {
    id: 'piste-richardson',
    title: 'Matthew Richardson',
    subtitle: 'Fusée Australo-Britannique • Premier Homme sous les 9 s au 200 m',
    roleTag: 'Pistard Sprint',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 95,
    technique: 87,
    endurance: 64,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étape 1 ou 2 (200 m lancé record).',
    summary: 'Grand rival d’Harrie Lavreysen, double médaillé d’argent olympique à Paris 2024 en vitesse et keirin.',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: 'Sub-9s 200m',
    keyFact: 'A franchi le mur mythique des 9 secondes sur le 200 mètres lancé (moyenne supérieure à 80 km/h).',
    specialTrait: 'Mur des 80 km/h Franchis',
    wikiSlug: 'Matthew_Richardson_(cyclisme)'
  },
  {
    id: 'piste-vigier',
    title: 'Sébastien Vigier',
    subtitle: 'Double Médaillé Olympique & Champion d’Europe Vitesse',
    roleTag: 'Pistard Sprint',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 86,
    technique: 83,
    endurance: 66,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 10,
    effectDescription: '+10 pts immédiats sur terrain Piste.',
    summary: 'Sprinter français médaillé de bronze olympique à Tokyo 2020 en vitesse par équipes et double champion d’Europe.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Tokyo 2020',
    keyFact: 'A remporté l’argent et le bronze aux Championnats du monde de vitesse et de keirin à domicile.',
    specialTrait: 'Relayeur N°2 Explosif',
    wikiSlug: 'Sébastien_Vigier'
  },
  {
    id: 'piste-copponi',
    title: 'Clara Copponi',
    subtitle: 'Vice-Championne du Monde Américaine & Spécialiste Omnium',
    roleTag: 'Pistarde Endurance',
    discipline: 'Piste',
    linkedDisciplines: ['Piste', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 80,
    technique: 85,
    endurance: 82,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 10,
    effectDescription: '+10 pts si précédée par une autre discipline.',
    summary: 'Coureuse française brillante sur piste (Omnium, Madison, Poursuite par équipes) et sprinteuse-puncheuse sur route.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Madison',
    keyFact: 'A formé avec Marion Borras puis Victoire Berteau un duo tricolore redoutable à la course à l’américaine.',
    specialTrait: 'Précision de Relais Madison',
    wikiSlug: 'Clara_Copponi'
  },
  {
    id: 'piste-stagiaire-club',
    title: 'Pistard Amateur sur Anneau Découvert',
    subtitle: 'École de Piste • Apprendre le Pignon Fixe et le Relais',
    roleTag: 'Pistard Club',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Commune',
    energyCost: 1,
    power: 72,
    technique: 74,
    endurance: 70,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 8,
    effectDescription: '+8 pts immédiats sur terrain Piste.',
    summary: 'Découvrir les sensations uniques du pignon fixe, rouler au coude à coude à la corde et s’habituer à ne jamais cesser de pédaler.',
    nationality: 'Club Piste',
    countryCode: 'TCG',
    keyYear: '48x15',
    keyFact: 'La règle d’or du débutant sur piste est de ne jamais arrêter les jambes brusquement sous peine d’être projeté hors de la selle.',
    specialTrait: 'Apprentissage du Pignon Fixe'
  },
  {
    id: 'piste-omnium-epreuve',
    title: 'L\'Omnium Olympique (4 Épreuves en 1 Jour)',
    subtitle: 'Le Décathlon de la Piste • Scratch, Tempo, Élimination & Points',
    roleTag: 'Épreuve Olympique',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 84,
    technique: 89,
    endurance: 88,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 6,
    effectDescription: '+6 pts par carte Piste jouée dans le match.',
    summary: 'Disputé sur une seule soirée : trois courses préparatoires classantes avant la course aux points finale qui peut tout bouleverser.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: '4 Manches',
    keyFact: 'Le dernier sprint de la course aux points finale attribue le double de points (10, 6, 4, 2).',
    specialTrait: 'Sprints Doublés du Final',
    wikiSlug: 'Omnium'
  },
  {
    id: 'piste-scratch',
    title: 'Course Scratch (15 km • Premier sur la Ligne)',
    subtitle: 'Épreuve Piste • La Course la Plus Lisible de l’Anneau',
    roleTag: 'Épreuve Piste',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Épreuve / Monument',
    rarity: 'Commune',
    energyCost: 1,
    power: 75,
    technique: 74,
    endurance: 76,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 8,
    effectDescription: '+8 pts en Étapes 4 ou 5 (dernier tour de 250 m).',
    summary: 'Soixante tours de vélodrome à 53 km/h où seul l’ordre de passage sur la ligne finale compte, à moins qu’un attaquant ne prenne un tour d’avance.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: '60 Tours',
    keyFact: 'Le Scratch est l’équivalent exact sur piste d’une course en ligne sur route : le premier arrivé gagne.',
    specialTrait: 'Dernier Tour à Bloc',
    wikiSlug: 'Course_scratch'
  },
  {
    id: 'piste-poursuite-eq',
    title: 'Poursuite par Équipes (4 Coureurs • 4 000 m)',
    subtitle: 'Épreuve Olympique • Train Aérodynamique à 64 km/h',
    roleTag: 'Épreuve Olympique',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 89,
    technique: 90,
    endurance: 86,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 12,
    effectDescription: 'Relais en ligne parfaite : +12 pts à la prochaine carte !',
    summary: 'Quatre poursuiveurs soudés roue dans roue à 5 centimètres d’écart, se relayant tous les demi-tours pour boucler 4 km en 3 min 40 s.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: '3 min 40 s',
    keyFact: 'Le temps officiel de l’équipe est pris sur la roue avant du TROISIÈME coureur sur la ligne (un équipier peut se sacrifier).',
    specialTrait: 'Chrono sur le 3ᵉ Homme',
    wikiSlug: 'Poursuite_par_équipes'
  },
  {
    id: 'piste-kilometre',
    title: 'Le Kilomètre Départ Arrêté (L’Épreuve Lactique)',
    subtitle: '4 Tours d’Anneau à Fond • Brûlure Musculaire Absolue',
    roleTag: 'Épreuve Piste',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Épreuve / Monument',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 88,
    technique: 78,
    endurance: 74,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 11,
    effectDescription: '+11 pts en Étape 1 ou 2 (effort solitaire de 58 s).',
    summary: 'Une minute de souffrance extrême : démarrer en force sur un braquet géant et tenir la vitesse maximale jusqu’à ce que les jambes s’étouffent d’acide lactique.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: '1 000 m',
    keyFact: 'Surnommée « la minute de vérité », le kilomètre demande à la fois un démarrage de sprinteur et une tolérance lactique féroce.',
    specialTrait: 'Dernier 250m au Mental'
  },
  {
    id: 'piste-vigorelli',
    title: 'Vélodrome Vigorelli de Milan',
    subtitle: 'Cathédrale Historique en Pin • Records de Coppi & Anquetil',
    roleTag: 'Vélodrome Mythique',
    discipline: 'Piste',
    linkedDisciplines: ['Piste', 'Route'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 81,
    technique: 82,
    endurance: 84,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte Piste jouée dans le match.',
    summary: 'Piste de 397,7 mètres en bois de sapin de l’Ohio inaugurée en 1935 où Fausto Coppi, Jacques Anquetil, Baldini et Rivière écrivirent les plus belles pages du Record de l’Heure.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: '1935',
    keyFact: 'Le Vigorelli est resté durant trois décennies le vélodrome le plus rapide du monde pour le Record de l’Heure.',
    specialTrait: 'Patine d’Or de Milan',
    wikiSlug: 'Vélodrome_Maspes-Vigorelli'
  },
  {
    id: 'piste-manchester',
    title: 'Vélodrome National de Manchester (« Medal Factory »)',
    subtitle: 'Anneau Britannique 250 m • Quartier Général de Sir Chris Hoy',
    roleTag: 'Vélodrome Pro',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 84,
    technique: 83,
    endurance: 78,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 10,
    effectDescription: '+10 pts immédiats sur terrain Piste.',
    summary: 'Inauguré en 1994, cet anneau couvert a forgé la domination britannique aux Jeux olympiques de Pékin, Londres et Rio.',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: '1994',
    keyFact: 'Chris Boardman y a établi son record de l’heure de 56,375 km en 1996 en position « Superman ».',
    specialTrait: 'Usine à Médailles d’Or',
    wikiSlug: 'Vélodrome_de_Manchester'
  },
  {
    id: 'piste-piste-ciment',
    title: 'Anneau Municipal Extérieur en Ciment (333 m)',
    subtitle: 'Vélodrome de Quartier • Lignes Peintes & Vent Frais',
    roleTag: 'Terrain Club',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Terrain / Secteur',
    rarity: 'Commune',
    energyCost: 1,
    power: 72,
    technique: 72,
    endurance: 74,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 7,
    effectDescription: 'Ciment rugueux : annule malus & +7 pts.',
    summary: 'Piste découverte de 333 mètres aux virages peu relevés où les jeunes pistards font leurs armes lors des soirées estivales.',
    nationality: 'Piste Locale',
    countryCode: 'TCG',
    keyYear: '333 m',
    keyFact: 'Les anciennes pistes de 333,33 m (3 tours = 1 km) puis 400 m étaient la norme avant la standardisation olympique à 250 m.',
    specialTrait: 'Soirée d’Été sur Béton'
  },
  {
    id: 'piste-200m-lance',
    title: 'Qualification du 200 m Lancé (Plongée du Virage)',
    subtitle: 'Technique Sprint Piste • Lâcher les Chevaux de la Côte d’Azur',
    roleTag: 'Technique Sprint',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 87,
    technique: 83,
    endurance: 64,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 11,
    effectDescription: '+11 pts en Étapes 1 ou 2 (vitesse de pointe).',
    summary: 'Prendre 2,5 tours d’élan tout en haut du virage près de la balustrade, puis plonger plein gaz dans l’avant-dernier virage pour franchir la ligne des 200 m à 80 km/h.',
    nationality: 'Technique Piste',
    countryCode: 'TCG',
    keyYear: '200 m Lancé',
    keyFact: 'La ligne bleu clair en haut du virage s’appelle familièrement la « Côte d’Azur » ; descendre de là procure une accélération gratuite par gravité.',
    specialTrait: 'Plongée de la Côte d’Azur'
  },
  {
    id: 'piste-roue-batons',
    title: 'Roue Avant 5 Bâtons & Roue Arrière Lenticulaire',
    subtitle: 'Matériel Piste Pro • Zéro Turbulence & Rigidité Latérale',
    roleTag: 'Matériel Pro',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 83,
    technique: 80,
    endurance: 74,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 6,
    effectDescription: '+6 pts par carte Matériel & Technique jouée.',
    summary: 'Combo iconique des vélodromes : roue à 5 bâtons carbone profilés devant pour fendre l’air sans guidonner, et lenticulaire pleine à l’arrière.',
    nationality: 'Matériel Piste',
    countryCode: 'TCG',
    keyYear: 'Carbone 5B',
    keyFact: 'Les boyaux de piste en salle sont gonflés entre 10 et 13 bars pour minimiser la déformation sur le bois lisse.',
    specialTrait: 'Boyaux Gonflés à 12 Bars'
  },
  {
    id: 'piste-sangles-pieds',
    title: 'Doubles Sangles Cuir & Pédales Piste',
    subtitle: 'Matériel Sprint • Empêcher le Pied de Déclipper à 2 400 W',
    roleTag: 'Matériel Sprint',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 78,
    technique: 72,
    endurance: 64,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 8,
    effectDescription: 'Pied verrouillé au démarrage : +8 pts à la prochaine carte.',
    summary: 'En plus des pédales automatiques, les sprinteurs serrent deux sangles en cuir par-dessus leurs chaussures pour éviter tout déchaussage fatal au portillon.',
    nationality: 'Matériel Piste',
    countryCode: 'TCG',
    keyYear: 'Double Sangle',
    keyFact: 'À plus de 2 000 Watts d’arraché en traction, une cale automatique seule risquerait de céder sans sangle de maintien.',
    specialTrait: 'Verrouillage Total du Pied'
  },
  {
    id: 'piste-prise-tour',
    title: 'Attaque pour Prendre Un Tour (+20 Points)',
    subtitle: 'Tactique Course aux Points • Effort Solitaire au Sein de l’Anneau',
    roleTag: 'Tactique Piste',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 81,
    technique: 83,
    endurance: 84,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 10,
    effectDescription: '+10 pts si précédée par une autre discipline.',
    summary: 'Partir seul entre deux sprints intermédiaires pour avaler les 250 mètres d’écart, recoller à l’arrière du peloton et empocher 20 points bonus au tableau.',
    nationality: 'Tactique Piste',
    countryCode: 'TCG',
    keyYear: '+20 Points',
    keyFact: 'À l’inverse, un coureur qui se fait prendre un tour par le peloton se voit retirer 20 points.',
    specialTrait: 'Tour d’Avance Empoché'
  },
  {
    id: 'piste-cintres-poursuite',
    title: 'Cintre Monocoque Imprimé 3D Sur Mesure',
    subtitle: 'Matériel Olympique • Prolongateurs Moulés aux Avant-Bras',
    roleTag: 'Matériel Pro',
    discipline: 'Piste',
    linkedDisciplines: ['Piste', 'Route'],
    category: 'Matériel & Technique',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 84,
    endurance: 82,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 7,
    effectDescription: '+7 pts par carte Matériel & Technique jouée.',
    summary: 'Poste de pilotage en titane ou carbone moulé directement d’après le scan 3D des avant-bras de l’athlète pour supprimer toute fuite d’air.',
    nationality: 'Ingénierie',
    countryCode: 'INT',
    keyYear: 'Scan 3D',
    keyFact: 'Les règlements UCI limitent les écarts d’angle et de hauteur des prolongateurs selon la taille du coureur.',
    specialTrait: 'Ergonomie Titane 3D'
  },
  {
    id: 'piste-eponge-resine',
    title: 'Nettoyage Pneus au Vinaigre & Colophane',
    subtitle: 'Geste Mécanique • Grip Maximum sur Bois Ciré',
    roleTag: 'Mécanique Base',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 67,
    technique: 77,
    endurance: 70,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 7,
    effectDescription: 'Adhérence parfaite sur bois : annule malus & +7 pts.',
    summary: 'Essuyer la bande de roulement des boyaux avant de monter en piste pour retirer toute trace de poussière ou de gras et coller au bois.',
    nationality: 'Méca Piste',
    countryCode: 'TCG',
    keyYear: 'Grip Bois',
    keyFact: 'Sur certaines pistes humides ou neuves, la moindre poussière fait glisser la roue arrière lors du surplace en haut de virage.',
    specialTrait: 'Bande de Roulement Collante'
  },

  // ============================================================================
  // CYCLO-CROSS SUPPLÉMENTAIRE (18 cartes)
  // ============================================================================
  {
    id: 'cx-thibau-nys',
    title: 'Thibau Nys',
    subtitle: 'Champion d’Europe CX 2024 & Vainqueur du Koppenbergcross',
    roleTag: 'Cyclo-crossman',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 88,
    technique: 92,
    endurance: 81,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étapes 4 ou 5 (accélération foudroyante).',
    summary: 'Fils du légendaire Sven Nys, champion d’Europe élite 2024, vainqueur au Koppenbergcross et déjà vainqueur d’étapes WorldTour sur route.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: 'Pontevedra 2024',
    keyFact: 'A remporté en 2024 à la fois des étapes de montagne/puncheurs sur route et le titre européen de cyclo-cross.',
    specialTrait: 'Explosivité Héritée de Baal',
    wikiSlug: 'Thibau_Nys'
  },
  {
    id: 'cx-alvarado',
    title: 'Ceylin del Carmen Alvarado',
    subtitle: 'Championne du Monde 2020 & Lauréate Coupe du Monde',
    roleTag: 'Cyclo-crosswoman',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 91,
    endurance: 86,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 11,
    effectDescription: '+11 pts immédiats sur terrain Cyclo-cross.',
    summary: 'Néerlandaise originaire de République dominicaine, championne du monde élite 2020 et lauréate du classement général de la Coupe du monde UCI 2024.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: 'Dübendorf 2020',
    keyFact: 'A remporté la Coupe du monde, le Superprestige et le Trofee au sommet de sa régularité hivernale.',
    specialTrait: 'Agilité dans les Virages Serrés',
    wikiSlug: 'Ceylin_del_Carmen_Alvarado'
  },
  {
    id: 'cx-vanthourenhout',
    title: 'Michael Vanthourenhout',
    subtitle: 'Double Champion d’Europe CX (Namur 2022 & Pontchâteau 2023)',
    roleTag: 'Cyclo-crossman',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 82,
    technique: 87,
    endurance: 84,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 9,
    effectDescription: 'Roi de la boue de Namur : annule malus & +9 pts.',
    summary: 'Spécialiste belge des parcours très techniques et boueux, double champion d’Europe consécutif sur la Citadelle de Namur puis à Pontchâteau.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '2022-2023',
    keyFact: 'Affectionne particulièrement les circuits lourds exigeant à la fois portage et équilibre en dévers.',
    specialTrait: 'Spécialiste des Remparts Boueux',
    wikiSlug: 'Michael_Vanthourenhout'
  },
  {
    id: 'cx-sweeck',
    title: 'Laurens Sweeck',
    subtitle: 'Le Roi du Sable • Vainqueur Coupe du Monde 2023',
    roleTag: 'Spécialiste Sable',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 83,
    technique: 87,
    endurance: 81,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 10,
    effectDescription: '+10 pts immédiats sur terrain Cyclo-cross.',
    summary: 'Virtuose des traces sableuses de Coxyde, Zonhoven et Mol, lauréat du général de la Coupe du monde 2022-2023.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: 'Coupe du Monde 23',
    keyFact: 'Semble flotter au-dessus des dunes de sable sec en conservant un pédalage rond là où ses rivaux s’enfoncent.',
    specialTrait: 'Glisse Parfaite sur Sable Sec',
    wikiSlug: 'Laurens_Sweeck'
  },
  {
    id: 'cx-vananrooij',
    title: 'Shirin van Anrooij',
    subtitle: 'Championne du Monde Espoirs & Vainqueure à Zonhoven',
    roleTag: 'Jeune Star CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 80,
    technique: 85,
    endurance: 83,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 10,
    effectDescription: '+10 pts si précédée par une autre discipline.',
    summary: 'Double championne du monde espoirs de cyclo-cross et vainqueure du Trofeo Alfredo Binda sur route.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: 'Hoogerheide 23',
    keyFact: 'Capable de dompter la fosse de sable De Kuil à Zonhoven devant les spécialistes élites.',
    specialTrait: 'Polyvalence Hiver-Printemps',
    wikiSlug: 'Shirin_van_Anrooij'
  },
  {
    id: 'cx-ronhaar',
    title: 'Pim Ronhaar',
    subtitle: 'Jeune Attaquant Néerlandais • Vainqueur à Termonde & Dublin',
    roleTag: 'Jeune Espoir CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 82,
    technique: 83,
    endurance: 82,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 10,
    effectDescription: '+10 pts en Étapes 1 ou 2.',
    summary: 'Coureur offensif brillant dans les bourbiers lourds de Termonde et les circuits rapides de Coupe du monde.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: 'Termonde',
    keyFact: 'A décroché sa première manche de Coupe du monde élite à Termonde dans une boue extrême.',
    specialTrait: 'Offensif dès le 2ᵉ Tour',
    wikiSlug: 'Pim_Ronhaar'
  },
  {
    id: 'cx-crossman-dep',
    title: 'Coureur de Cyclo-cross Départemental',
    subtitle: 'Parc Municipal, Rubalise & Douche au Jet d’Eau Froide',
    roleTag: 'Pilote Club',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Commune',
    energyCost: 1,
    power: 70,
    technique: 76,
    endurance: 74,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 8,
    effectDescription: '+8 pts immédiats sur terrain Cyclo-cross.',
    summary: 'Tous les dimanches de novembre à janvier, il accroche son dossard dans le froid et enchaîne 50 minutes à bloc entre les arbres du parc.',
    nationality: 'Club CX',
    countryCode: 'TCG',
    keyYear: '50 Minutes',
    keyFact: 'Les courses amateurs de cyclo-cross durent généralement 40 à 50 minutes selon les catégories, contre 60 chez les élites.',
    specialTrait: 'Départ en Grille Fond de Peloton'
  },
  {
    id: 'cx-pontchateau',
    title: 'Circuit de Coët-Roz (Pontchâteau)',
    subtitle: 'Temple Français du Cyclo-cross • Mondiaux & Europe',
    roleTag: 'Circuit CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 85,
    technique: 88,
    endurance: 86,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte Cyclo-cross jouée dans le match.',
    summary: 'Haut lieu breton du cyclo-cross ayant accueilli deux Championnats du monde (1989 et 2004) et les Championnats d’Europe 2016 et 2023.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1989 & 2004',
    keyFact: 'Le public breton de Pontchâteau fait vibrer la longue butte d’arrivée et les dévers de Coët-Roz.',
    specialTrait: 'Clameur de Coët-Roz',
    wikiSlug: 'Pontchâteau'
  },
  {
    id: 'cx-besancon-malcombe',
    title: 'Circuit de La Malcombe (Besançon)',
    subtitle: 'Manche Française Coupe du Monde UCI • Talus & Boue Jurassienne',
    roleTag: 'Circuit CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 80,
    technique: 84,
    endurance: 82,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 10,
    effectDescription: '+10 pts immédiats sur terrain Cyclo-cross.',
    summary: 'Circuit spectaculaire en amphithéâtre au pied des collines bisontines avec double talus en devers et longue ligne droite de relance.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Coupe du Monde',
    keyFact: 'Mathieu van der Poel et Puck Pieterse y ont notamment signé des victoires mémorables en Coupe du monde.',
    specialTrait: 'Amphithéâtre de la Malcombe'
  },
  {
    id: 'cx-ostende-pont',
    title: 'Le Pont d’Ostende & La Plage (Mer du Nord)',
    subtitle: 'Secteur Unique CX • Rampe à 21% puis Sable Mou Marin',
    roleTag: 'Secteur CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 83,
    technique: 84,
    endurance: 81,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 10,
    effectDescription: '+10 pts en Étape 4 ou 5.',
    summary: 'Passerelle géante construite au-dessus de la digue reliant l’hippodrome vert directement à la plage de sable lourd de la mer du Nord.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: 'Mondiaux 2021',
    keyFact: 'A accueilli les Championnats du monde 2021 où Lucinda Brand et Mathieu van der Poel ont été sacrés.',
    specialTrait: 'Rampe à 21% sur la Digue'
  },
  {
    id: 'cx-hoogerheide',
    title: 'GP Adrie van der Poel (Hoogerheide)',
    subtitle: 'Classique Finale Avant les Mondiaux • Escalier Géant',
    roleTag: 'Épreuve CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 87,
    technique: 86,
    endurance: 85,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts en Étapes 4 ou 5 (longue montée d’arrivée).',
    summary: 'Disputée sur les terres familiales des Van der Poel au Brabant-Septentrional, juge de paix final en janvier sur une montée goudronnée interminable.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: 'Mondiaux 2023',
    keyFact: 'Le duel Van der Poel - Van Aert aux Mondiaux de Hoogerheide 2023 s’est joué au sprint pur dans les derniers 200 mètres.',
    specialTrait: 'Sprint en Montée de Hoogerheide'
  },
  {
    id: 'cx-superprestige-ruddervoorde',
    title: 'Superprestige de Ruddervoorde',
    subtitle: 'Ouverture Traditionnelle du Superprestige • Banc de Sable',
    roleTag: 'Épreuve CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Épreuve / Monument',
    rarity: 'Commune',
    energyCost: 1,
    power: 74,
    technique: 76,
    endurance: 74,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 8,
    effectDescription: '+8 pts en Étapes 1 ou 2 (ouverture de saison).',
    summary: 'Circuit rapide flamand alternant prairies plates, virages à angle droit autour des piquets et un long passage de sable mou.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: 'Octobre',
    keyFact: 'Ruddervoorde marque traditionnellement le coup d’envoi du classement Superprestige en octobre.',
    specialTrait: 'Rythme Rapide d’Octobre'
  },
  {
    id: 'cx-tourniquet-glisse',
    title: 'Pivot du Pied Intérieur en Courbe Grasse',
    subtitle: 'Technique Cyclo-cross • Décliper le Pied Intérieur pour Tourner',
    roleTag: 'Technique CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 68,
    technique: 80,
    endurance: 71,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 8,
    effectDescription: '+8 pts immédiats sur terrain Cyclo-cross.',
    summary: 'Sortir le pied côté virage pour s’appuyer légèrement au sol en cas de perte d’adhérence de la roue avant et garder la corde.',
    nationality: 'Technique CX',
    countryCode: 'TCG',
    keyYear: 'Appui Sol',
    keyFact: 'Permet de corriger instantanément une glissade de la roue avant sur herbe mouillée sans poser les deux pieds.',
    specialTrait: 'Rattrapage d’Épingle Grasse'
  },
  {
    id: 'cx-monoplateau-40t',
    title: 'Monoplateau 40 Dents Anti-Déraillement',
    subtitle: 'Matériel Cyclo-cross • Profil Narrow-Wide Anti-Boue',
    roleTag: 'Matériel CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross', 'VTT'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 72,
    technique: 77,
    endurance: 74,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 5,
    effectDescription: '+5 pts par carte Matériel & Technique jouée.',
    summary: 'Supprimer le dérailleur avant et alterner dents larges et étroites évite les bourrages de boue et les déraillements après le saut de planches.',
    nationality: 'Matériel CX',
    countryCode: 'TCG',
    keyYear: '1x12 CX',
    keyFact: 'Les crossmen choisissent généralement un plateau unique de 38, 40 ou 42 dents selon la vitesse du circuit.',
    specialTrait: 'Transmission 1x Anti-Bourrage'
  },
  {
    id: 'cx-pression-manometre',
    title: 'Ajustement au Manomètre à 0,05 Bar près',
    subtitle: 'Tactique Matériel CX • Tester le Circuit Avant le Départ',
    roleTag: 'Tactique CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 73,
    technique: 88,
    endurance: 76,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 10,
    effectDescription: 'Grip calibré sur mesure : +10 pts à la prochaine carte !',
    summary: 'Pendant la reconnaissance de midi, les mécaniciens ajustent la pression des boyaux entre 1,25 et 1,65 bar au centième de bar près selon la consistance du sol.',
    nationality: 'Staff CX',
    countryCode: 'TCG',
    keyYear: '0,05 bar',
    keyFact: 'Seulement 0,1 bar d’écart change totalement le comportement d’un boyau de 33 mm entre rebond sur racines et adhérence en dévers.',
    specialTrait: 'Calibration Millimétrée de Pression'
  },
  {
    id: 'cx-grille-depart',
    title: 'Sprint de Départ en Première Ligne (8 Joueurs)',
    subtitle: 'Action Tactique CX • Se Placer dans le Top 5 au Goulet',
    roleTag: 'Tactique CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 78,
    technique: 74,
    endurance: 68,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 9,
    effectDescription: '+9 pts en Étape 1 ou 2 (départ en boulet de canon).',
    summary: 'Les 200 premiers mètres sur bitume se font en sprint pur pour entrer dans les cinq premiers avant le premier rétrécissement en rubalise.',
    nationality: 'Tactique CX',
    countryCode: 'TCG',
    keyYear: 'Top 5 Virage 1',
    keyFact: 'L’ordre sur la grille de départ (8 coureurs par ligne) est déterminé par le classement UCI de la saison.',
    specialTrait: 'Appel sur la Ligne 1'
  },
  {
    id: 'cx-douche-hiver',
    title: 'Échauffement Home-Trainer sous Barnum (15 min)',
    subtitle: 'Protocole Départ CX • Partir Chaud à -2°C',
    roleTag: 'Préparation CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross', 'Piste'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 74,
    technique: 71,
    endurance: 74,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 8,
    effectDescription: '+8 pts en Étape 1 ou 2 (jambes déjà à 170 bpm).',
    summary: 'Comme le départ d’un cyclo-cross se fait à 100% dès la première seconde, 20 minutes de home-trainer avec deux sprints courts sont indispensables.',
    nationality: 'Prépa CX',
    countryCode: 'TCG',
    keyYear: '170 BPM',
    keyFact: 'Sans échauffement sur rouleaux, les bronches brûlent au premier kilomètre dans l’air glacial d’hiver.',
    specialTrait: 'Mise en Température Immédiate'
  },
  {
    id: 'cx-paliers-esca',
    title: 'Escalier Double en Béton (28 Marches)',
    subtitle: 'Secteur Physique CX • Monter Deux par Deux Vélo à l’Épaule',
    roleTag: 'Secteur CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Terrain / Secteur',
    rarity: 'Commune',
    energyCost: 1,
    power: 73,
    technique: 75,
    endurance: 77,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 4,
    effectDescription: '+4 pts par carte Cyclo-cross jouée.',
    summary: 'Obstacle classique brisant le rythme cardiaque : descendre avant la première marche, charger le vélo et avaler les marches deux par deux.',
    nationality: 'Secteur CX',
    countryCode: 'TCG',
    keyYear: '28 Marches',
    keyFact: 'Courir deux marches par deux marches demande moins de fréquence de pas et préserve le rythme de poussée des quadriceps.',
    specialTrait: 'Foulée Double en Portage'
  },

  // ============================================================================
  // POLYVALENT SUPPLÉMENTAIRE (4 cartes pour 180+ total)
  // ============================================================================
  {
    id: 'poly-gravel-mondial',
    title: 'Championnats du Monde de Gravel UCI',
    subtitle: 'Épreuve Passerelle • Routeux, Vététistes & Crossmen Réunis',
    roleTag: 'Mondial Gravel',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'VTT', 'Cyclo-cross'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 85,
    technique: 87,
    endurance: 90,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_PER_DISCIPLINE',
    effectValue: 5,
    effectDescription: '+5 pts par discipline distincte jouée dans le match.',
    summary: 'Discipline en plein essor où se retrouvent sur des chemins de terre blancs les cadors du WorldTour, du VTT marathon et du cyclo-cross.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: 'Louvain 2024',
    keyFact: 'En 2024 à Louvain, Mathieu van der Poel et Marianne Vos ont tous deux décroché l’arc-en-ciel de Gravel.',
    specialTrait: 'Carrefour des Disciplines',
    wikiSlug: 'Championnats_du_monde_de_gravel'
  },
  {
    id: 'poly-pneu-gravel-42',
    title: 'Pneus Gravel Tubeless 42 mm Mixtes',
    subtitle: 'Matériel Hybride • Rendement Bitume & Crampons Latéraux',
    roleTag: 'Matériel Gravel',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'VTT', 'Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 71,
    technique: 77,
    endurance: 76,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 5,
    effectDescription: '+5 pts par carte Matériel & Technique jouée.',
    summary: 'Bande centrale quasi-lisse pour filer à 40 km/h sur l’asphalte et crampons latéraux mordants dès qu’on s’incline sur les chemins blancs.',
    nationality: 'Matériel Gravel',
    countryCode: 'TCG',
    keyYear: '42 mm / 2,4 bar',
    keyFact: 'À 2,4 bars en 42 mm, la gomme absorbe les vibrations du gravier tout en préservant un rendement remarquable sur route.',
    specialTrait: 'Bande Centrale Rapide'
  },
  {
    id: 'poly-cadence-mentale',
    title: 'Gestion Tactique au Cardiofréquencemètre',
    subtitle: 'Technique Endurance • Rester sous le Seuil jusqu’au Dernier KM',
    roleTag: 'Tactique Base',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'VTT', 'Piste', 'Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 68,
    technique: 74,
    endurance: 80,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 9,
    effectDescription: '+9 pts en Étape 4 ou 5 (réserves préservées).',
    summary: 'Ne pas répondre aux accélérations inutiles en début de course pour conserver assez de fraîcheur mentale et cardiaque dans le dernier tour.',
    nationality: 'Prépa Mentale',
    countryCode: 'TCG',
    keyYear: 'Zone 4 Seuil',
    keyFact: 'Gérer son effort en « negative split » (finir plus vite qu’on a commencé) maximise la performance sur longue durée.',
    specialTrait: 'Sang-Froid au Seuil'
  },
  {
    id: 'poly-entrainement-stage',
    title: 'Stage en Altitude (Sierra Nevada / Teide)',
    subtitle: 'Préparation Pro • Stimulation Naturelle des Globules Rouges',
    roleTag: 'Préparation Pro',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'VTT', 'Piste', 'Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 77,
    technique: 75,
    endurance: 87,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 10,
    effectDescription: 'Hématocrite optimisé : +10 pts à votre prochaine carte !',
    summary: 'Passer trois semaines à dormir à 2 300 m sur le volcan Teide à Tenerife ou en Sierra Nevada pour augmenter la capacité de transport d’oxygène.',
    nationality: 'Prépa Altitude',
    countryCode: 'TCG',
    keyYear: '2 320 m',
    keyFact: 'Le principe « Live High, Train Low » permet d’assimiler l’adaptation à l’altitude tout en conservant des séances de haute intensité.',
    specialTrait: 'Pic de Forme à 2 300 m'
  },
  {
    id: 'route-laporte',
    title: 'Christophe Laporte',
    subtitle: 'Champion d’Europe 2023 & Médaillé Olympique Paris 2024',
    roleTag: 'Flandrien / Poisson-Pilote',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 88,
    technique: 89,
    endurance: 83,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 12,
    effectDescription: 'Poisson-pilote d’élite : +12 pts à votre prochaine carte !',
    summary: 'Vainqueur de Gand-Wevelgem, d’À travers la Flandre, champion d’Europe au Col du VAM et médaillé de bronze aux Jeux olympiques de Paris 2024.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Paris 2024',
    keyFact: 'A remporté une étape du Tour de France à Cahors en 2022 puis Paris-Tours 2024 sous la pluie.',
    specialTrait: 'Poisson-Pilote & Flandrien',
    wikiSlug: 'Christophe_Laporte'
  },
  {
    id: 'route-madouas',
    title: 'Valentin Madouas',
    subtitle: 'Vice-Champion Olympique Paris 2024 & Champion de France',
    roleTag: 'Puncheur-Flandrien',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 85,
    endurance: 88,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 10,
    effectDescription: 'Infatigable après 240 km : annule malus & +10 pts.',
    summary: 'Coureur breton infatigable sur les courses d’un jour de plus de 250 km : podium au Tour des Flandres, 2ᵉ des Strade Bianche et argent olympique à Paris.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '273 km JO',
    keyFact: 'A décroché la médaille d’argent olympique sur la butte Montmartre lors des Jeux de Paris 2024.',
    specialTrait: 'Endurance des 270 Kilomètres',
    wikiSlug: 'Valentin_Madouas'
  },
  {
    id: 'route-grace-brown',
    title: 'Grace Brown',
    subtitle: 'Double Championne Olympique & Mondiale CLM 2024 + Liège',
    roleTag: 'Rouleuse CLM',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 91,
    technique: 83,
    endurance: 89,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étapes 1 ou 2 (effort chrono parfait).',
    summary: 'Australienne impériale en 2024 : victorieuse de Liège-Bastogne-Liège puis championne olympique à Paris et championne du monde du contre-la-montre à Zurich.',
    nationality: 'Australie',
    countryCode: 'AUS',
    keyYear: '2024',
    keyFact: 'A réalisé en 2024 le doublé Or Olympique + Titre Mondial du contre-la-montre avant de prendre sa retraite.',
    specialTrait: 'Doublé JO-Mondial Chrono',
    wikiSlug: 'Grace_Brown'
  },
  {
    id: 'vtt-lecomte',
    title: 'Loana Lecomte',
    subtitle: 'Championne d’Europe XCO & Multiple Vainqueure Coupe du Monde',
    roleTag: 'Pilote XCO',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 88,
    endurance: 89,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étapes 1 ou 2 (part seule dès le start-loop).',
    summary: 'Grimpeuse véloce des circuits XCO, dominatrice de la Coupe du monde 2021 avec quatre victoires consécutives dès le premier tour.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '9 Coupes Monde',
    keyFact: 'A remporté dès le start-loop ses manches de Coupe du monde à Albstadt, Nové Město, Leogang et Les Gets.',
    specialTrait: 'Envole dès le Start-Loop',
    wikiSlug: 'Loana_Lecomte'
  },
  {
    id: 'vtt-vergier',
    title: 'Loris Vergier',
    subtitle: 'Champion du Monde VTT Descente 2024 à Pal Arinsal',
    roleTag: 'Descendeur DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 89,
    technique: 94,
    endurance: 70,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étape 4 ou 5 (run arc-en-ciel).',
    summary: 'Pilote azuréen ultra-précis, multiple vainqueur en Coupe du monde de descente et sacré champion du monde élite DH en Andorre en 2024.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Andorre 2024',
    keyFact: 'A conquis son premier titre mondial élite à Pal Arinsal en 2024 pour 0,148 seconde devant Benoît Coulanges.',
    specialTrait: 'Précision de Pal Arinsal',
    wikiSlug: 'Loris_Vergier'
  },
  {
    id: 'route-muzic',
    title: 'Évita Muzic',
    subtitle: 'Vainqueure d’Étape au Giro & 4ᵉ du Tour de France Femmes',
    roleTag: 'Grimpeuse',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 77,
    technique: 79,
    endurance: 86,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 10,
    effectDescription: '+10 pts en Étapes 4 ou 5 (sommet montagneux).',
    summary: 'Grimpeuse française complète, vainqueure d’étape sur la Vuelta Femenina devant Demi Vollering et 4ᵉ du Tour de France Femmes 2024 à l’Alpe d’Huez.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Top 5 Tour',
    keyFact: 'A battu Demi Vollering au sommet de la Laguna Negra lors de la Vuelta Femenina 2024.',
    specialTrait: 'Final de la Laguna Negra',
    wikiSlug: 'Évita_Muzic'
  }
];


// === FILE: src/data/expansionCards.ts ===

/**
 * Série 2 : Panthéon Historique & Nouvelles Disciplines (+70 cartes)
 * Comble les grands classiques manquants (Vuelta, Indurain, Bartali, Boonen, Cancellara,
 * Chausson, Enduro, BMX, Paracyclisme, Ultra-distance, Vogel, Tournant, Dufraisse, Cant...).
 */
const EXPANSION_SERIES2_SEEDS                   = [
  // ============================================================================
  // ROUTE — LÉGENDES, MONUMENTS, COLS & MÉTIERS (+24 cartes)
  // ============================================================================
  {
    id: 'route-indurain',
    title: 'Miguel Indurain',
    subtitle: 'El Rey de Navarra • 5 Tours de France Consécutifs (1991–1995)',
    roleTag: 'Patron Grand Tour / CLM',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 96,
    technique: 89,
    endurance: 97,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 6,
    effectDescription: '+6 pts par carte Route jouée pendant le match.',
    summary: 'Géant navarrais au calme olympien, premier coureur de l’histoire à remporter cinq Tours de France d’affilée, doublés de deux Giro, de l’or olympique et d’un Record de l’Heure.',
    nationality: 'Espagne',
    countryCode: 'ESP',
    keyYear: '1991–1995',
    keyFact: 'Possédait un cœur battant à seulement 28 pulsations par minute au repos et écrasait ses rivaux sur les longs contre-la-montre.',
    specialTrait: 'Métronome Navarrais à 500 Watts',
    wikiSlug: 'Miguel_Indurain'
  },
  {
    id: 'route-bartali',
    title: 'Gino Bartali',
    subtitle: 'Il Pio • 3 Giro & 2 Tours à Dix Ans d’Écart',
    roleTag: 'Grimpeur Légendaire',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 88,
    technique: 87,
    endurance: 96,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 16,
    effectDescription: '+16 pts en Étapes 1 ou 2 (endurance des cimes).',
    summary: 'Immense rival de Fausto Coppi, triple vainqueur du Giro et double lauréat de la Grande Boucle en 1938 puis 1948, héros humanitaire reconnu Juste parmi les Nations.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: '1938 & 1948',
    keyFact: 'Cachait de faux papiers d’identité dans les tubes du cadre de son vélo pendant la Seconde Guerre mondiale pour sauver des centaines de personnes.',
    specialTrait: 'Tenacité des Deux Époques',
    wikiSlug: 'Gino_Bartali'
  },
  {
    id: 'route-bobet',
    title: 'Louison Bobet',
    subtitle: 'Premier Triplé Historique du Tour (1953–1955)',
    roleTag: 'Complet Monuments',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 88,
    technique: 88,
    endurance: 92,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 15,
    effectDescription: '+15 pts en Étape 4 ou 5 (raid de l’Izoard).',
    summary: 'Champion breton élégant, premier à réaliser la passe de trois sur la Grande Boucle, champion du monde 1954 et vainqueur de quatre Monuments différents.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1953–1955',
    keyFact: 'A remporté Milan-San Remo, le Tour de Lombardie, le Tour des Flandres et Paris-Roubaix au cours de sa carrière.',
    specialTrait: 'Attaque Solitaire de la Casse Déserte',
    wikiSlug: 'Louison_Bobet'
  },
  {
    id: 'route-lemond',
    title: 'Greg LeMond',
    subtitle: 'Triple Vainqueur du Tour (8 Secondes d’Écart en 1989)',
    roleTag: 'Leader Polyvalent / CLM',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 91,
    technique: 88,
    endurance: 91,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 16,
    effectDescription: '+16 pts en Étape 4 ou 5 (chrono final des Champs-Élysées).',
    summary: 'Premier non-Européen vainqueur de la Grande Boucle et double champion du monde, revenu miraculeusement après un accident de chasse pour renverser la course sur un chrono final historique.',
    nationality: 'États-Unis',
    countryCode: 'USA',
    keyYear: '8 sec (1989)',
    keyFact: 'A imposé le guidon de triathlète aérodynamique et le casque profilé en 1989 pour devancer Laurent Fignon de huit secondes.',
    specialTrait: 'Prolongateur des Champs-Élysées',
    wikiSlug: 'Greg_LeMond'
  },
  {
    id: 'route-kelly',
    title: 'Sean Kelly',
    subtitle: 'King Kelly • 9 Monuments, 7 Paris-Nice & Vuelta 1988',
    roleTag: 'Classiqueur-Sprinteur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 92,
    technique: 91,
    endurance: 91,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 9,
    effectDescription: 'Annule les malus de terrain & +9 pts par temps difficile.',
    summary: 'Coureur irlandais indestructible, numéro un mondial pendant des années grâce à sa régularité hivernale, son sprint redoutable et sa science de la course par mauvais temps.',
    nationality: 'Irlande',
    countryCode: 'IRL',
    keyYear: '1982–1992',
    keyFact: 'A gagné Paris-Nice sept fois de suite et enlevé quatre Maillots Verts du Tour de France.',
    specialTrait: 'Roi de la Course au Soleil',
    wikiSlug: 'Sean_Kelly_(cyclisme)'
  },
  {
    id: 'route-boonen',
    title: 'Tom Boonen',
    subtitle: 'Tornado Tom • 4 Paris-Roubaix & 3 Tours des Flandres',
    roleTag: 'Maître des Pavés',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 94,
    technique: 92,
    endurance: 87,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 16,
    effectDescription: '+16 pts immédiats sur terrain Route.',
    summary: 'Icône flamande des classiques printanières et champion du monde 2005 à Madrid, codétenteur du record historique de victoires sur l’Enfer du Nord.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '2005–2012',
    keyFact: 'En 2012, a réalisé le quadruplé inédit E3, Gand-Wevelgem, Tour des Flandres et Paris-Roubaix la même saison.',
    specialTrait: 'Raid de 52 km sur le Carrefour',
    wikiSlug: 'Tom_Boonen'
  },
  {
    id: 'route-cancellara',
    title: 'Fabian Cancellara',
    subtitle: 'Spartacus • 4× Mondial CLM, 2× Or Olympique & 6 Monuments',
    roleTag: 'Rouleur-Flandrien',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Piste'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 95,
    technique: 89,
    endurance: 90,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 16,
    effectDescription: '+16 pts en Étapes 1 ou 2 (démarrage assis).',
    summary: 'Machine à rouler suisse dotée d’une puissance brute hors norme, triple lauréat du Tour des Flandres et de Paris-Roubaix tout en écrasant l’effort solitaire mondial.',
    nationality: 'Suisse',
    countryCode: 'SUI',
    keyYear: '2006–2016',
    keyFact: 'A remporté ses deux titres olympiques du contre-la-montre à huit ans d’intervalle, entre Pékin 2008 et Rio 2016.',
    specialTrait: 'Relance de Mule sur le Grammont',
    wikiSlug: 'Fabian_Cancellara'
  },
  {
    id: 'route-gilbert',
    title: 'Philippe Gilbert',
    subtitle: '4 Monuments sur 5 • Triplé Ardennais 2011 & Mondial 2012',
    roleTag: 'Puncheur Historique',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 88,
    technique: 87,
    endurance: 84,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étapes 4 ou 5 (bosse finale).',
    summary: 'Puncheur wallon offensif ayant conquis quatre des cinq Monuments (Flandres, Roubaix, Liège, Lombardie) et conquis le maillot arc-en-ciel au Cauberg.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '2011–2019',
    keyFact: 'En avril 2011, a réalisé le grand chelem Flèche brabançonne, Amstel Gold Race, Flèche wallonne et Liège-Bastogne-Liège en dix jours.',
    specialTrait: 'Démarrage Tranchant du Cauberg',
    wikiSlug: 'Philippe_Gilbert'
  },
  {
    id: 'route-valverde',
    title: 'Alejandro Valverde',
    subtitle: 'El Imbatido • 5 Flèches, 4 LBL & Champion du Monde 2018',
    roleTag: 'Puncheur-Complet',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 90,
    technique: 89,
    endurance: 92,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 15,
    effectDescription: '+15 pts en Étape 4 ou 5 (arrivée en côte).',
    summary: 'Longévité exceptionnelle au plus haut niveau avec 133 victoires professionnelles, recordman du Mur de Huy et sacré champion du monde élite à 38 ans à Innsbruck.',
    nationality: 'Espagne',
    countryCode: 'ESP',
    keyYear: 'Innsbruck 2018',
    keyFact: 'Est monté sept fois sur le podium des Championnats du monde sur route avant de décrocher enfin l’or en 2018.',
    specialTrait: 'Sprint en Montée de la Dernière Cible',
    wikiSlug: 'Alejandro_Valverde'
  },
  {
    id: 'route-contador',
    title: 'Alberto Contador',
    subtitle: 'El Pistolero • Vainqueur des Trois Grands Tours',
    roleTag: 'Grimpeur Aérien',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 88,
    technique: 89,
    endurance: 94,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 13,
    effectDescription: '-13 pts à la carte adverse par attaques répétées en danseuse.',
    summary: 'Grimpeur espagnol à la gestuelle incomparable en danseuse, membre du cercle fermé des coureurs vainqueurs du Tour de France, du Giro et de la Vuelta.',
    nationality: 'Espagne',
    countryCode: 'ESP',
    keyYear: '2007–2017',
    keyFact: 'A remporté ses sept Grands Tours majeurs en attaquant sans relâche, signant sa dernière grande victoire pro à l’Angliru en 2017.',
    specialTrait: 'Danseuse Électrique de l’Angliru',
    wikiSlug: 'Alberto_Contador'
  },
  {
    id: 'route-froome',
    title: 'Chris Froome',
    subtitle: '4 Tours de France, 2 Vueltas & Raid du Finestre 2018',
    roleTag: 'Grimpeur-Rouleur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 89,
    technique: 85,
    endurance: 95,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte Route jouée (moulinette constante).',
    summary: 'Leader britannique à la cadence élevée en haute altitude, quadruple vainqueur de la Grande Boucle et détenteur des trois maillots de leader consécutifs en 2017-2018.',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: '2013–2018',
    keyFact: 'Lors du Giro 2018, a lancé un raid solitaire de 80 kilomètres dans le Colle delle Finestre pour renverser le classement général.',
    specialTrait: 'Moulinette à 110 Tours-Minute',
    wikiSlug: 'Chris_Froome'
  },
  {
    id: 'route-roglic',
    title: 'Primož Roglič',
    subtitle: '4 Vueltas, 1 Giro & Or Olympique CLM • L’Ex-Sauteur à Ski',
    roleTag: 'Leader Grands Tours / Puncheur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 91,
    technique: 86,
    endurance: 92,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 15,
    effectDescription: '+15 pts en Étape 4 ou 5 (bonifications à la ligne).',
    summary: 'Ancien champion du monde junior de saut à ski reconverti tardivement dans le cyclisme, devenu codétenteur du record de victoires finales sur le Tour d’Espagne.',
    nationality: 'Slovénie',
    countryCode: 'SLO',
    keyYear: '4× Vuelta',
    keyFact: 'A débuté le cyclisme de compétition à 22 ans après une grave chute de saut à ski à Planica.',
    specialTrait: 'Kick Puncher des Derniers 300 m',
    wikiSlug: 'Primož_Roglič'
  },
  {
    id: 'route-vuelta',
    title: 'Tour d’Espagne (La Vuelta)',
    subtitle: 'Le Troisième Grand Tour • La Roja & Pentes Extrêmes',
    roleTag: 'Grand Tour / Épreuve',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Épreuve / Monument',
    rarity: 'Épique',
    energyCost: 4,
    power: 86,
    technique: 87,
    endurance: 95,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte Route jouée dans l’épreuve.',
    summary: 'Créé en 1935, le troisième Grand Tour de la saison est réputé pour ses arrivées au sommet explosives à plus de 20 % et ses duels sous la chaleur ibérique.',
    nationality: 'Espagne',
    countryCode: 'ESP',
    keyYear: 'Depuis 1935',
    keyFact: 'Le leader du classement général porte le maillot rouge (Maillot Rojo), institué sous cette couleur en 2010.',
    specialTrait: 'Murs Ibériques au-dessus de 20%',
    wikiSlug: 'Tour_d\'Espagne'
  },
  {
    id: 'route-tdf-femmes',
    title: 'Tour de France Femmes',
    subtitle: 'Grande Boucle Féminine • L’Épreuve Phare de Juillet-Août',
    roleTag: 'Grand Tour Féminin',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 84,
    technique: 84,
    endurance: 89,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts en Étapes 4 ou 5 (super-sommet décisif).',
    summary: 'Relancée en 2022 avec une arrivée mémorable à la Super Planche des Belles Filles, l’épreuve conclut désormais ses huit jours sur des cols alpins ou pyrénéens mythiques.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Depuis 2022',
    keyFact: 'En 2024, l’édition s’est jouée pour quatre secondes entre Kasia Niewiadoma et Demi Vollering en haut de l’Alpe d’Huez.',
    specialTrait: 'Dénouement à Quatre Secondes',
    wikiSlug: 'Tour_de_France_Femmes'
  },
  {
    id: 'route-mondiaux',
    title: 'Mondiaux sur Route UCI',
    subtitle: 'Conquête du Maillot Arc-en-Ciel d’Un Jour',
    roleTag: 'Épreuve Mondiale',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Épreuve / Monument',
    rarity: 'Épique',
    energyCost: 4,
    power: 88,
    technique: 90,
    endurance: 91,
    keyword: 'Synergie',
    effectCode: 'REVEAL_PER_DISCIPLINE',
    effectValue: 5,
    effectDescription: '+5 pts par discipline différente engagée.',
    summary: 'Disputés chaque année par sélections nationales sur un circuit exigeant de 260 km, ces championnats sacrent pour douze mois le détenteur de la tunique irisée.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: 'Depuis 1927',
    keyFact: 'Aucune oreillette radio n’est autorisée entre directeurs sportifs et coureurs lors des épreuves élites des championnats mondiaux.',
    specialTrait: 'Course au Instinct sans Oreillette',
    wikiSlug: 'Championnats_du_monde_de_cyclisme_sur_route'
  },
  {
    id: 'route-amstel',
    title: 'Amstel Gold Race (Cauberg)',
    subtitle: 'Ouverture des Classiques Ardennaises au Limbourg',
    roleTag: 'Classique WorldTour',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 85,
    technique: 88,
    endurance: 84,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 11,
    effectDescription: '+11 pts sur terrain Route (30+ côtes nerveuses).',
    summary: 'Course néerlandaise nerveuse tracée sur des routes étroites et sinueuses du Limbourg, marquée par plus de trente ascensions courtes dont l’emblématique Cauberg.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: 'Depuis 1966',
    keyFact: 'Jan Raas détient le record de cinq victoires sur cette épreuve, dont quatre consécutives entre 1977 et 1980.',
    specialTrait: 'Virages Serrés du Limbourg',
    wikiSlug: 'Amstel_Gold_Race'
  },
  {
    id: 'route-gent-wevelgem',
    title: 'Gand-Wevelgem (Kemmelberg)',
    subtitle: 'In Flanders Fields • Pavés à 20% & Vent des Moëres',
    roleTag: 'Classique Flandrienne',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 87,
    technique: 85,
    endurance: 85,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 8,
    effectDescription: 'Annule les malus météo & +8 pts dans les rafales.',
    summary: 'Semi-classique flandrienne redoutée mêlant sections de bordures exposées le long des canaux et triple passage sur les pavés vertigineux du Mont Kemmel.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: 'Depuis 1934',
    keyFact: 'Son parcours rend hommage aux champs de bataille du Westhoek et traverse les célèbres chemins de terre des Plugstreets.',
    specialTrait: 'Rafales des Moëres & Plugstreets',
    wikiSlug: 'Gand-Wevelgem'
  },
  {
    id: 'route-dauphine',
    title: 'Critérium du Dauphiné',
    subtitle: 'La Grande Répétition Alpine Avant Juillet',
    roleTag: 'Course par Étapes',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 84,
    technique: 83,
    endurance: 89,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 10,
    effectDescription: '+10 pts transmis à votre prochain leader engagé.',
    summary: 'Épreuve historique créée en 1947 dans les Alpes françaises, véritable baromètre de forme des prétendants au Maillot Jaune un mois avant le Grand Départ.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Depuis 1947',
    keyFact: 'Presque tous les vainqueurs multiples du Tour (Anquetil, Merckx, Hinault, Indurain, Froome, Vingegaard) ont d’abord brillé sur les routes dauphinoises.',
    specialTrait: 'Rampe de Lancement pour Juillet',
    wikiSlug: 'Critérium_du_Dauphiné'
  },
  {
    id: 'route-angliru',
    title: 'Alto de l’Angliru (Asturies)',
    subtitle: 'Cueña les Cabres à 23,5% dans la Brume Asturienne',
    roleTag: 'Col Extrême',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 82,
    technique: 84,
    endurance: 92,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 10,
    effectDescription: '-10 pts à l’adversaire sur les pentes à plus de 20%.',
    summary: 'Ascension mythique des Asturies découverte en 1999, considérée comme l’un des cols les plus brutaux des Grands Tours avec sa terrible rampe de la Cueña les Cabres.',
    nationality: 'Espagne',
    countryCode: 'ESP',
    keyYear: '1 573 m • 23,5%',
    keyFact: 'Oblige les coureurs pros à monter des cassettes inhabituelles de 32 ou 34 dents pour ne pas décoller la roue avant.',
    specialTrait: 'Muraille de la Cueña les Cabres',
    wikiSlug: 'Alto_de_l\'Angliru'
  },
  {
    id: 'route-mortirolo',
    title: 'Passo del Mortirolo',
    subtitle: '12,4 km à 10,5% de Moyenne • Monument du Giro',
    roleTag: 'Col Brutal',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 82,
    technique: 83,
    endurance: 91,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts en Étapes 1 ou 2 (sélection précoce).',
    summary: 'Col étroit de Lombardie révélé au monde en 1994 lors de l’exploit de Marco Pantani, dont le pourcentage continu sans aucun replat use les organismes.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: '1 852 m • 18% max',
    keyFact: 'Au kilomètre 8 du versant de Mazzo di Valtellina se dresse une stèle sculptée en hommage au Pirate italien.',
    specialTrait: 'Pentes Sans Aucun Replat',
    wikiSlug: 'Col_du_Mortirolo'
  },
  {
    id: 'route-koppenberg-route',
    title: 'Vieux Quaremont & Paterberg',
    subtitle: 'Le Dyptique Final Décisif du Tour des Flandres',
    roleTag: 'Monts Pavés',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Cyclo-cross'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 88,
    endurance: 84,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étapes 4 ou 5 (enchaînement final).',
    summary: 'Deux monts pavés iconiques des Ardennes flamandes : 2 200 mètres usants d’abord, suivis d’un mur court et abrupt culminant à 20 % à seulement 13 km de l’arrivée.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '20% max',
    keyFact: 'Le second mont a été pavé artificiellement en 1986 par un fermier local uniquement pour faire passer la course devant sa ferme.',
    specialTrait: 'Enchaînement Fatal à 13 km du But',
    wikiSlug: 'Vieux_Quaremont'
  },
  {
    id: 'route-poggio',
    title: 'La Cipressa & Le Poggio',
    subtitle: 'Les Deux Côtes Finales de Milan-San Remo',
    roleTag: 'Secteur Décisif',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 80,
    technique: 85,
    endurance: 78,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 11,
    effectDescription: '+11 pts en Étapes 4 ou 5 (descente technique).',
    summary: 'Après 270 kilomètres de plaine le long de la Méditerranée, cette double ascension courte suivie d’une descente sinueuse vers Sanremo lance l’explication finale.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: '5,5 km avant ligne',
    keyFact: 'Bien que sa pente moyenne n’atteigne que 3,7 %, l’intensité accumulée après près de sept heures de selle y déclenche des écarts décisifs.',
    specialTrait: 'Épingles de la Descente vers Via Roma',
    wikiSlug: 'Poggio_di_Sanremo'
  },
  {
    id: 'route-directeur-sportif',
    title: 'Directeur Sportif en Voiture',
    subtitle: 'Stratégie Radio, Ravitaillement & Consignes de Peloton',
    roleTag: 'Encadrement Course',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 70,
    technique: 79,
    endurance: 72,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 7,
    effectDescription: '+7 pts à votre prochain titulaire déployé.',
    summary: 'Au volant de la voiture n°1 de l’équipe dans la file des suiveurs, le technicien coordonne les relais, annonce les secteurs dangereux et gère les écarts chronométriques.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: 'Caravane Pro',
    keyFact: 'Le rang des voitures suiveuses derrière le peloton est déterminé au tirage au sort ou au classement du leader de l’équipe.',
    specialTrait: 'Consignes Stratégiques dans l’Oreillette',
    wikiSlug: 'Directeur_sportif_(cyclisme)'
  },
  {
    id: 'route-voiture-balai',
    title: 'La Voiture-Balai (Hors-Délais)',
    subtitle: 'Le Véhicule Officiel Fermant la Marche de l’Étape',
    roleTag: 'Folklore Route',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 68,
    technique: 74,
    endurance: 78,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 3,
    effectDescription: '+3 pts par carte Matériel & Technique posée.',
    summary: 'Instituée en 1910 par Henri Desgrange sur la Grande Boucle pour recueillir les coureurs exténués ou victimes de pannes irréparables, reconnaissable à son balai symbolique sur le toit.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Depuis 1910',
    keyFact: 'Un coureur dépassé par ce véhicule est officiellement mis hors-course, sauf si les commissaires élargissent les délais dans les étapes de haute montagne.',
    specialTrait: 'Lutte Héroïque Contre les Délais',
    wikiSlug: 'Voiture-balai'
  },

  // ============================================================================
  // VTT — PIONNIERS, ENDURO, TRIAL & BMX RACE (+14 cartes)
  // ============================================================================
  {
    id: 'vtt-chausson',
    title: 'Anne-Caroline Chausson',
    subtitle: '19 Titres Mondiaux VTT & Or Olympique BMX Pékin 2008',
    roleTag: 'Reine Absolue Gravité',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 94,
    technique: 98,
    endurance: 91,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 6,
    effectDescription: '+6 pts par carte VTT posée pendant la manche.',
    summary: 'Athlète française au palmarès vertigineux ayant dominé la descente mondiale durant plus d’une décennie avant d’inaugurer le palmarès olympique du BMX à Pékin.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '19× Mondiale + Or 2008',
    keyFact: 'Est invaincue en Championnats du monde élite de descente entre 1996 et 2005 (hors forfaits) puis championne du monde d’Enduro en 2014.',
    specialTrait: 'Suprématie Totale DH, 4X & BMX',
    wikiSlug: 'Anne-Caroline_Chausson'
  },
  {
    id: 'vtt-dahle',
    title: 'Gunn-Rita Dahle Flesjå',
    subtitle: 'Or Olympique 2004 • 10 Titres Mondiaux XCO & Marathon',
    roleTag: 'Légende Cross-Country',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 88,
    technique: 90,
    endurance: 95,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 15,
    effectDescription: '+15 pts en Étapes 1 ou 2 (rythme XCO d’entrée).',
    summary: 'Pionnière norvégienne de l’endurance tout-terrain ayant cumulé trente succès en Coupe du monde élites entre ses débuts et ses 45 ans.',
    nationality: 'Norvège',
    countryCode: 'NOR',
    keyYear: '30 Coupes Monde',
    keyFact: 'A remporté sa trentième manche de Coupe du monde élite à Vallnord à l’âge record de 45 ans en 2018.',
    specialTrait: 'Longévité Norvégienne de Légende',
    wikiSlug: 'Gunn-Rita_Dahle_Flesjå'
  },
  {
    id: 'vtt-tomac',
    title: 'John Tomac',
    subtitle: 'The Johnny T • Champion du Monde XCO & Podium DH 1991',
    roleTag: 'Pionnier Années 90',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 89,
    technique: 92,
    endurance: 88,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 5,
    effectDescription: '+5 pts par carte Matériel & Technique jouée.',
    summary: 'Légende américaine des débuts du tout-terrain professionnel, capable d’enchaîner cross-country, dual slalom et descente internationale sur un vélo équipé d’un cintre de course courbé.',
    nationality: 'États-Unis',
    countryCode: 'USA',
    keyYear: 'Mondial 1991',
    keyFact: 'A disputé les Coupes du monde de descente 1991 en roue arrière lenticulaire pleine et cintre de route.',
    specialTrait: 'Cintre Course & Roue Lenticulaire DH',
    wikiSlug: 'John_Tomac'
  },
  {
    id: 'vtt-hill',
    title: 'Sam Hill',
    subtitle: '5 Titres Mondiaux DH & Triple Champion du Monde Enduro',
    roleTag: 'Roi des Pédales Plates',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 89,
    technique: 96,
    endurance: 87,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 9,
    effectDescription: 'Annule les malus de terrain & +9 pts sous la pluie.',
    summary: 'Pilote australien au style flamboyant qui a prouvé qu’on pouvait dominer la descente puis l’Enduro mondial uniquement chaussé de pédales plates sans cales.',
    nationality: 'Australie',
    countryCode: 'AUS',
    keyYear: 'DH + 3× Enduro',
    keyFact: 'Son passage héroïque à Val di Sole 2008 sous l’orage reste l’un des runs de référence de l’histoire du sport.',
    specialTrait: 'Maîtrise Extrême sur Pédales Plates',
    wikiSlug: 'Sam_Hill_(cycliste)'
  },
  {
    id: 'vtt-rude',
    title: 'Richie Rude',
    subtitle: 'Triple Champion du Monde d’Enduro (EWS / EDR)',
    roleTag: 'Pilote Enduro Élite',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 89,
    technique: 89,
    endurance: 87,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 12,
    effectDescription: '+12 pts sur terrain VTT (puissance en relance Enduro).',
    summary: 'Pilote américain surpuissant au pédalage comme en cassant technique, triple vainqueur du classement général de la Coupe du monde d’Enduro.',
    nationality: 'États-Unis',
    countryCode: 'USA',
    keyYear: '3× Monde Enduro',
    keyFact: 'Formé sur les pistes de BMX et de descente avant de régner sur l’Enduro mondial grâce à ses watts en transition.',
    specialTrait: 'Relance Brute Entre Spéciales',
    wikiSlug: 'Richie_Rude'
  },
  {
    id: 'vtt-clementz',
    title: 'Jérôme Clementz',
    subtitle: 'Premier Champion du Monde Enduro World Series (2013)',
    roleTag: 'Pionnier Enduro',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 79,
    technique: 86,
    endurance: 82,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 10,
    effectDescription: '+10 pts en Étapes 1 ou 2 (ouverture de spéciale).',
    summary: 'Pilote alsacien qui a contribué à structurer l’Enduro moderne et remporté la toute première couronne mondiale EWS dès l’inauguration du circuit.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Champion EWS 2013',
    keyFact: 'A remporté à douze reprises la Mégavalanche et les grandes courses marathon enduro sur les terrains alpins et méditerranéens.',
    specialTrait: 'Fluidité sur Pierriers Méditerranéens',
    wikiSlug: 'Jérôme_Clementz'
  },
  {
    id: 'vtt-courdurier',
    title: 'Isabeau Courdurier',
    subtitle: 'Triple Championne Générale Mondiale Enduro',
    roleTag: 'Pilote Enduro Féminine',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 83,
    technique: 91,
    endurance: 86,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte VTT alignée.',
    summary: 'Référence féminine de l’Enduro mondial, capable de remporter l’intégralité des manches d’une saison grâce à son calme et sa lecture des lignes.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Saison Parfaite 2019',
    keyFact: 'En 2019, a réalisé un grand chelem historique en remportant toutes les manches EWS auxquelles elle a pris le départ.',
    specialTrait: 'Régularité Sans Faute sur Spéciales',
    wikiSlug: 'Isabeau_Courdurier'
  },
  {
    id: 'vtt-semenuk',
    title: 'Brandon Semenuk',
    subtitle: 'Quintupple Vainqueur Freeride Desert & Triple Or Joyride',
    roleTag: 'Freerider & Slopestyle',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 87,
    technique: 96,
    endurance: 80,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 15,
    effectDescription: '+15 pts immédiats en créativité aérienne VTT.',
    summary: 'Prodige canadien du freeride et du slopestyle ayant révolutionné les figures sur les crêtes désertiques de l’Utah comme sur les modules de Colombie-Britannique.',
    nationality: 'Canada',
    countryCode: 'CAN',
    keyYear: '5× Utah Freeride',
    keyFact: 'Est le pilote le plus titré de l’histoire du grand rassemblement freeride annuel de l’Utah avec cinq sacres.',
    specialTrait: 'Tailwhip sur Crête Vertigineuse',
    wikiSlug: 'Brandon_Semenuk'
  },
  {
    id: 'vtt-macaskill',
    title: 'Danny MacAskill',
    subtitle: 'Maître Écossais du VTT Trial Street & Équilibre Absolu',
    roleTag: 'Trialiste Virtuose',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 80,
    technique: 97,
    endurance: 74,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 11,
    effectDescription: '-11 pts à l’adversaire par trajectoire impossible.',
    summary: 'Trialiste originaire de l’île de Skye dont les démonstrations sur les crêtes de Cuillin et les parapets urbains ont inspiré des millions de pratiquants dans le monde.',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: 'Île de Skye',
    keyFact: 'Ancien mécanicien cycle à Édimbourg, il effectue ses franchissements millimétrés sans selle ni dérailleur arrière multi-pignons.',
    specialTrait: 'Équilibre Millimétré sur Arête Rocheuse',
    wikiSlug: 'Danny_MacAskill'
  },
  {
    id: 'vtt-pajon',
    title: 'Mariana Pajón',
    subtitle: 'La Reina del BMX • Double Championne Olympique Racing',
    roleTag: 'Star BMX Race',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 93,
    technique: 92,
    endurance: 78,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 16,
    effectDescription: '+16 pts en Étapes 1 ou 2 (holeshot dès la grille).',
    summary: 'Héroïne nationale colombienne et triple médaillée olympique en BMX Racing, imbattable sur la première ligne droite grâce à son explosivité dès l’abaissement de la grille.',
    nationality: 'Colombie',
    countryCode: 'COL',
    keyYear: 'Or 2012 & 2016',
    keyFact: 'A remporté l’or olympique à Londres 2012 puis conservé son titre à Rio 2016 avant d’ajouter l’argent à Tokyo 2020.',
    specialTrait: 'Holeshot Éclair sur Butte de 8 m',
    wikiSlug: 'Mariana_Pajón'
  },
  {
    id: 'vtt-daudet',
    title: 'Joris Daudet',
    subtitle: 'Champion Olympique BMX Racing Paris 2024 & 3× Mondial',
    roleTag: 'Champion Olympique BMX',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 95,
    technique: 91,
    endurance: 78,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 16,
    effectDescription: '+16 pts en Étapes 1 ou 2 (premier virage en tête).',
    summary: 'Pilote charentais à la carrière exemplaire, triple champion du monde élite de BMX Racing et couronné de l’or olympique devant le public français en 2024.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Paris 2024',
    keyFact: 'À Saint-Quentin-en-Yvelines, a mené un triplé historique français olympique en finale avec Sylvain André et Romain Mahieu.',
    specialTrait: 'Triplé Historique de Saint-Quentin',
    wikiSlug: 'Joris_Daudet'
  },
  {
    id: 'vtt-finale-ligure',
    title: 'Spéciales de Finale Ligure',
    subtitle: 'Mecque Mondiale de l’Enduro face à la Mer Ligure',
    roleTag: 'Territoire Enduro',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 81,
    technique: 91,
    endurance: 84,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 11,
    effectDescription: '+11 pts sur terrain VTT (marches calcaires & racines).',
    summary: 'Réseau légendaire de sentiers surplombant la Méditerranée en Italie, terre d’accueil traditionnelle des finales mondiales d’Enduro et des pilotes tout-terrain toute l’année.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: 'Mecque Enduro',
    keyFact: 'Ses spéciales emblématiques comme Roller Coaster ou Base Nato mêlent rochers calcaires maritimes et sous-bois rapides.',
    specialTrait: 'Calcaire Ligure & Plongée sur Mer',
    wikiSlug: 'Finale_Ligure'
  },
  {
    id: 'vtt-leogang',
    title: 'Piste Speedster de Leogang',
    subtitle: 'Sauts Géants & Racines Autrichiennes de Coupe du Monde',
    roleTag: 'Piste Coupe du Monde',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 80,
    technique: 83,
    endurance: 75,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 10,
    effectDescription: '+10 pts en Étapes 4 ou 5 (sprints vers l’aire d’arrivée).',
    summary: 'Station alpine autrichienne célèbre pour ses longs secteurs rapides d’alpage suivis d’une forêt extrêmement raide et boueuse théâtre de plusieurs championnats mondiaux.',
    nationality: 'Autriche',
    countryCode: 'AUT',
    keyYear: 'Mondiaux 2012/2020',
    keyFact: 'En 2020 sous des torrents de pluie glacée, Aaron Gwin en 2012 sans chaîne et Loïc Bruni s’y sont forgé des récits de légende.',
    specialTrait: 'Racines Humides & Vitesse d’Alpage',
    wikiSlug: 'Leogang'
  },
  {
    id: 'vtt-bmx-butte',
    title: 'Butte de Départ BMX 8 Mètres',
    subtitle: 'Grille Pneumatique & Enroulement des Doubles Bosses',
    roleTag: 'Discipline Olympique',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 87,
    technique: 82,
    endurance: 64,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 11,
    effectDescription: '+11 pts en Étapes 1 ou 2 (départ explosif à 60 km/h).',
    summary: 'Huit pilotes alignés côte à côte sur des vélos 20 pouces à pignon unique : dès le signal vocal, une rampe inclinée propulse le peloton à plus de 60 km/h en trois secondes.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: 'Olympique 2008+',
    keyFact: 'Les pilotes enchaînent parfois deux ou trois bosses d’un seul saut ("manuel" ou "double-triple") sans que les roues ne touchent les sommets.',
    specialTrait: 'Accélération de 0 à 60 km/h en 3 s',
    wikiSlug: 'BMX'
  },

  // ============================================================================
  // PISTE — LÉGENDES FÉMININES, SPRINT & VÉLODROMES (+12 cartes)
  // ============================================================================
  {
    id: 'piste-vogel',
    title: 'Kristina Vogel',
    subtitle: '11 Titres Mondiaux & 2× Or Olympique • La Foudre Allemande',
    roleTag: 'Sprinteuse Légendaire',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 97,
    technique: 93,
    endurance: 84,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 18,
    effectDescription: '+18 pts en Étapes 4 ou 5 (vitesse pure sans selle à Rio).',
    summary: 'Codétentrice du record absolu de titres mondiaux féminins sur piste avec 11 couronnes, immortalisée à Rio 2016 lorsqu’elle décrocha l’or olympique malgré une selle cassée.',
    nationality: 'Allemagne',
    countryCode: 'GER',
    keyYear: '11× Mondiale',
    keyFact: 'En finale olympique de vitesse 2016 à Rio, a cassé et perdu sa selle à l’entame de la dernière ligne droite tout en gagnant en danseuse.',
    specialTrait: 'Sprint Olympique Sans Selle de Rio',
    wikiSlug: 'Kristina_Vogel'
  },
  {
    id: 'piste-morelon',
    title: 'Daniel Morelon',
    subtitle: '3× Or Olympique & 8 Titres Mondiaux de Vitesse',
    roleTag: 'Patriarche Piste Française',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 92,
    technique: 93,
    endurance: 82,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 13,
    effectDescription: '+13 pts transmis à votre prochain sprinteur ou pistard.',
    summary: 'Double champion olympique en vitesse individuelle et monstre de tactique avant de former comme entraîneur national une génération dorée de champions français.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1966–1975',
    keyFact: 'Sous sa direction technique à Hyères puis à l’INSEP, l’école française du sprint a dominé les Jeux olympiques de 1996 à 2000.',
    specialTrait: 'Science Tactique & Surplace Maîtrisé',
    wikiSlug: 'Daniel_Morelon'
  },
  {
    id: 'piste-tournant',
    title: 'Arnaud Tournant',
    subtitle: '14 Titres Mondiaux Piste & Premier Homme Sous la Minute au KM',
    roleTag: 'Légende Vitesse & KM',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 96,
    technique: 89,
    endurance: 84,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 16,
    effectDescription: '+16 pts en Étapes 1 ou 2 (départ sous la minute).',
    summary: 'Sprinteur tricolore aux 14 maillots arc-en-ciel, auteur à La Paz en 2001 de l’exploit historique de briser la barrière mythique de la minute sur le kilomètre départ arrêté.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '58 s 875 au KM',
    keyFact: 'Son chrono de 58 s 875 en altitude bolivienne en 2001 resta un jalon mythique de la physiologie du sprint long.',
    specialTrait: 'Barrière Historique des 60 Secondes',
    wikiSlug: 'Arnaud_Tournant'
  },
  {
    id: 'piste-meares',
    title: 'Anna Meares',
    subtitle: '11 Titres Mondiaux & 2× Or Olympique • Icône Australienne',
    roleTag: 'Sprinteuse Universelle',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 95,
    technique: 91,
    endurance: 83,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 15,
    effectDescription: '+15 pts en Étape 4 ou 5 (duel final tendu).',
    summary: 'Légende du cyclisme australien, seule sprinteuse à détenir au moins un titre mondial dans chacune des quatre spécialités du sprint (500 m, vitesse, keirin, par équipes).',
    nationality: 'Australie',
    countryCode: 'AUS',
    keyYear: '6 Médailles JO',
    keyFact: 'A décroché sa première médaille d’or olympique sur 500 m à Athènes 2004 puis battu sa grande rivale britannique chez elle à Londres 2012.',
    specialTrait: 'Quadruple Spécialiste du Sprint',
    wikiSlug: 'Anna_Meares'
  },
  {
    id: 'piste-wiggins',
    title: 'Sir Bradley Wiggins',
    subtitle: '5× Or Olympique (Poursuite + Route) & Record de l’Heure 54,526 km',
    roleTag: 'Poursuiveur & CLM',
    discipline: 'Piste',
    linkedDisciplines: ['Piste', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 92,
    technique: 87,
    endurance: 94,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 5,
    effectDescription: '+5 pts par carte Matériel & Technique jouée.',
    summary: 'Premier Britannique à gagner la Grande Boucle en 2012, issu de l’école de la poursuite sur piste où il accumula quatre titres olympiques de 2004 à 2016 et battit le Record de l’Heure.',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: '54,526 km (2015)',
    keyFact: 'Ses huit médailles olympiques en poursuite et contre-la-montre se sont étendues sur cinq olympiades de Sydney 2000 à Rio 2016.',
    specialTrait: 'Position Chronométrée à 54,5 km/h',
    wikiSlug: 'Bradley_Wiggins'
  },
  {
    id: 'piste-pendleton',
    title: 'Victoria Pendleton',
    subtitle: '9 Titres Mondiaux Piste & 2× Or Olympique (Pékin / Londres)',
    roleTag: 'Sprinteuse Britannique',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 91,
    technique: 89,
    endurance: 74,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étapes 4 ou 5 (Keirin olympique).',
    summary: 'Figure majeure de l’âge d’or de la piste britannique, six fois championne du monde de vitesse individuelle et couronnée d’or en Keirin devant le public de Londres 2012.',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: '2007–2012',
    keyFact: 'A régné sur la vitesse féminine avec six titres mondiaux remportés entre 2005 et 2012 avant de devenir jockey après sa carrière.',
    specialTrait: 'Accélération de Finale Keirin',
    wikiSlug: 'Victoria_Pendleton'
  },
  {
    id: 'piste-wild',
    title: 'Kirsten Wild',
    subtitle: '9 Titres Mondiaux Piste • Reine de l’Omnium, Scratch & Madison',
    roleTag: 'Endurance Piste',
    discipline: 'Piste',
    linkedDisciplines: ['Piste', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 88,
    technique: 89,
    endurance: 87,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 12,
    effectDescription: '+12 pts sur terrain Piste (toutes épreuves peloton).',
    summary: 'Sprinteuse et stratège néerlandaise hors pair des courses en peloton sur anneau de bois, victorieuse sur Omnium, Course aux Points, Scratch et Madison.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: '9× Mondiale',
    keyFact: 'A remporté au moins trois fois chacun des titres mondiaux d’endurance sur piste (Scratch et Course aux points) jusqu’à Tokyo 2020.',
    specialTrait: 'Finesse dans les Sprints d’Omnium',
    wikiSlug: 'Kirsten_Wild'
  },
  {
    id: 'piste-viviani',
    title: 'Elia Viviani',
    subtitle: 'Or Olympique Omnium Rio 2016 • Double Champion du Monde Élimination',
    roleTag: 'Pistard-Sprinteur',
    discipline: 'Piste',
    linkedDisciplines: ['Piste', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 90,
    technique: 88,
    endurance: 84,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 11,
    effectDescription: '+11 pts si précédé d’une carte d’une autre discipline.',
    summary: 'Sprinteur vénitien élégant combinant victoires d’étapes sur les trois Grands Tours routiers et maestria tactique dans l’Omnium et la course par élimination.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: 'Or Rio 2016',
    keyFact: 'Est tombé en milieu de course aux points finale de l’Omnium à Rio en 2016 avant de se relever et d’arracher la médaille d’or.',
    specialTrait: 'Remontée Héroïque après Chute à Rio',
    wikiSlug: 'Elia_Viviani'
  },
  {
    id: 'piste-kuipke',
    title: 'Vélodrome « ’t Kuipke » (Gand)',
    subtitle: 'Anneau Mythique de 166,6 m aux Virages Vertigineux',
    roleTag: 'Temple Six Jours',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 84,
    technique: 92,
    endurance: 82,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 12,
    effectDescription: '+12 pts sur terrain Piste (anneau ultra-court à 50°).',
    summary: 'Salle mythique belge inaugurée au Parc de la Citadelle de Gand, célèbre pour son bois serré de 166 mètres de circonférence et la ferveur électrique de ses Six Jours hivernaux.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '166 m • 50° d’inclinaison',
    keyFact: 'Ses virages relevés à plus de 50 % imposent un pilotage ultra-fin lors des relais lancés de Madison à grande vitesse.',
    specialTrait: 'Chaudron Flamand de 166 Mètres',
    wikiSlug: 'Kuipke'
  },
  {
    id: 'piste-sqy-national',
    title: 'Vélodrome National de SQY',
    subtitle: 'Théâtre des Épreuves Piste de Paris 2024 (250 m Pin de Sibérie)',
    roleTag: 'Vélodrome Olympique',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Terrain / Secteur',
    rarity: 'Épique',
    energyCost: 4,
    power: 88,
    technique: 90,
    endurance: 86,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte Piste alignée sur le bois.',
    summary: 'Écrin olympique de Saint-Quentin-en-Yvelines doté d’une largeur record de 8 mètres et d’une piste ultra-rapide où tombèrent de nombreux records du monde en août 2024.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Olympique 2024',
    keyFact: 'Plusieurs records du monde en vitesse par équipes et poursuite par équipes y ont été pulvérisés dès l’ouverture des épreuves olympiques 2024.',
    specialTrait: 'Pluie de Records du Monde 2024',
    wikiSlug: 'Vélodrome_national_de_Saint-Quentin-en-Yvelines'
  },
  {
    id: 'piste-tandem-para',
    title: 'Tandem Piste Paracyclisme',
    subtitle: 'Pilote Voyant & Stoker Non-Voyant à Plus de 70 km/h',
    roleTag: 'Catégorie B Tandem',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 86,
    technique: 83,
    endurance: 78,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 10,
    effectDescription: '+10 pts grâce à la synchronisation parfaite du duo.',
    summary: 'Machine double ultra-rigide atteignant des vitesses supérieures au solo sur le kilomètre ou la poursuite grâce aux deux moteurs humains parfaitement synchronisés à l’aveugle.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: 'Classe B Paralympique',
    keyFact: 'Les deux athlètes partent et sprintent en symbiose totale sans jamais quitter leur ligne grâce aux automatismes travaillés sur les virages.',
    specialTrait: 'Synchronisation Double à 70 km/h',
    wikiSlug: 'Paracyclisme'
  },
  {
    id: 'piste-course-points',
    title: 'Course aux Points (Sprints)',
    subtitle: '160 Tours avec Classements Tous les 10 Tours & Tours d’Avance',
    roleTag: 'Épreuve Endurance Piste',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Épreuve / Monument',
    rarity: 'Commune',
    energyCost: 1,
    power: 72,
    technique: 78,
    endurance: 84,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 3,
    effectDescription: '+3 pts par carte Piste alignée (cumul de points).',
    summary: 'Épreuve reine de lecture tactique sur vélodrome : 5, 3, 2 et 1 point sont attribués tous les 2,5 km, doublés au sprint final, avec bonus de 20 points pour un tour pris au peloton.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: '40 km Hommes / 25 km F',
    keyFact: 'Un coureur perd également 20 points s’il se fait doubler et concède un tour entier au peloton.',
    specialTrait: 'Chasse au Tour d’Avance (+20 pts)',
    wikiSlug: 'Course_aux_points'
  },

  // ============================================================================
  // CYCLO-CROSS — PIONNIERS, REINES & CLASSIQUES MANQUANTES (+10 cartes)
  // ============================================================================
  {
    id: 'cx-dufraisse',
    title: 'André Dufraisse',
    subtitle: '5 Titres de Champion du Monde Consécutifs (1954–1958)',
    roleTag: 'Pionnier Limousin',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 88,
    technique: 92,
    endurance: 91,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 16,
    effectDescription: '+16 pts en Étapes 1 ou 2 (hégémonie hivernale).',
    summary: 'Légende limousine surnommée « le Roi de la Boue », auteur d’un règne sans partage dans les années 1950 avec sept titres de champion de France et cinq sacres mondiaux d’affilée.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1954–1958',
    keyFact: 'A devancé ses compatriotes dans les labourés d’Italie, d’Allemagne, de Suisse et de France pour offrir son âge d’or à l’école tricolore.',
    specialTrait: 'Quintette Mondial des Labourés',
    wikiSlug: 'André_Dufraisse'
  },
  {
    id: 'cx-cant',
    title: 'Sanne Cant',
    subtitle: '3× Championne du Monde CX & 15 Titres de Belgique de Suite',
    roleTag: 'Icône Féminine CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 88,
    technique: 92,
    endurance: 89,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 15,
    effectDescription: '+15 pts en Étapes 4 ou 5 (duel final de Bieles).',
    summary: 'Pilier absolu du cyclo-cross féminin moderne, triple championne du monde consécutive (2017, 2018, 2019) et détentrice d’une série unique de quinze maillots nationaux d’affilée.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '15 Titres Nationaux',
    keyFact: 'A remporté quinze Championnats de Belgique élites sans interruption entre 2010 et 2024 avant sa retraite glorieuse.',
    specialTrait: 'Série Record de 15 Maillots Belges',
    wikiSlug: 'Sanne_Cant'
  },
  {
    id: 'cx-liboton',
    title: 'Roland Liboton',
    subtitle: '4 Titres de Champion du Monde Pro (1980–1984)',
    roleTag: 'Maître Technique Belge',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 85,
    technique: 90,
    endurance: 86,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 12,
    effectDescription: '+12 pts sur terrain Cyclo-cross.',
    summary: 'Prodige brabançon des sous-bois des années 1980, sacré quatre fois champion du monde élite professionnel grâce à son explosivité dans les dévers glissants.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '1980–1984',
    keyFact: 'A conquis dix titres nationaux belges professionnels consécutifs, régnant notamment sur les circuits boueux autour de Tollembeek et Lanarvily.',
    specialTrait: 'Danseur dans les Dévers Brabançons',
    wikiSlug: 'Roland_Liboton'
  },
  {
    id: 'cx-kupfernagel',
    title: 'Hanka Kupfernagel',
    subtitle: 'Première Championne du Monde CX Féminine (2000) & 4× Sacrée',
    roleTag: 'Pionnière CX & CLM',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 87,
    endurance: 89,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 11,
    effectDescription: '+11 pts si précédée d’une autre discipline (Route/Piste).',
    summary: 'Coureuse allemande polyvalente entrée dans l’histoire à Sint-Michielsgestel en devenant la première championne du monde féminine de la discipline, avant trois autres titres mondiaux CX et un mondial CLM.',
    nationality: 'Allemagne',
    countryCode: 'GER',
    keyYear: 'Première 2000',
    keyFact: 'A cumulé des médailles mondiales et olympiques aussi bien dans les sous-bois qu’en contre-la-montre sur route.',
    specialTrait: 'Pionnière du Maillot Arc-en-Ciel 2000',
    wikiSlug: 'Hanka_Kupfernagel'
  },
  {
    id: 'cx-groenendaal',
    title: 'Richard Groenendaal',
    subtitle: 'Champion du Monde 2000 & Triple Lauréat Coupe du Monde',
    roleTag: 'Champion Néerlandais CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 82,
    technique: 84,
    endurance: 84,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 10,
    effectDescription: '+10 pts en Étapes 1 ou 2 (départ canon devant chez lui).',
    summary: 'Premier Néerlandais champion du monde élite de cyclo-cross devant son public à Sint-Michielsgestel, pilier du peloton hivernal à la charnière des années 2000.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: 'Mondial 2000',
    keyFact: 'A disputé plus de deux décennies chez les professionnels et remporté trois classements généraux de la Coupe du monde UCI.',
    specialTrait: 'Fermeté Batave dans les Labours',
    wikiSlug: 'Richard_Groenendaal'
  },
  {
    id: 'cx-benidorm',
    title: 'Coupe du Monde de Benidorm',
    subtitle: 'Le Cross Rapide au Soleil d’Hiver sur la Costa Blanca',
    roleTag: 'Manche Hivernale Rapide',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 89,
    technique: 84,
    endurance: 81,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts en Étapes 4 ou 5 (vitesse moyenne record à 28 km/h).',
    summary: 'Épreuve espagnole spectaculaire tracée entre deux parcs urbains méditerranéens fin janvier, réunissant des dizaines de milliers de spectateurs sous 18°C à travers sable jaune et planches.',
    nationality: 'Espagne',
    countryCode: 'ESP',
    keyYear: 'Depuis 2023',
    keyFact: 'Marque un contraste saisissant avec la boue belge : ses moyennes approchent 28 km/h sur terre sèche et bitume rapide.',
    specialTrait: 'Sprint à 28 km/h sur Terre Sèche',
    wikiSlug: 'Cyclo-cross_de_Benidorm'
  },
  {
    id: 'cx-overijse',
    title: 'Druivencross d’Overijse',
    subtitle: '« La Mère de Tous les Cross » sur Talus du Brabant',
    roleTag: 'Classique Historique',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 84,
    technique: 90,
    endurance: 87,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 12,
    effectDescription: '+12 pts sur terrain Cyclo-cross (montées brabançonnes).',
    summary: 'Créé en 1960 dans la commune viticole brabançonne, ce parcours très escarpé enchaîne murs glissants, descentes en dévers de forêt et pavés raides du centre-bourg.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: 'Depuis 1960',
    keyFact: 'Son célèbre talus de Tenotsberg dans la boue reste l’un des passages les plus sélectifs du calendrier mondial.',
    specialTrait: 'Talus Boueux du Tenotsberg',
    wikiSlug: 'Druivencross'
  },
  {
    id: 'cx-loenhout',
    title: 'Azencross de Loenhout',
    subtitle: 'Le Grand Rendez-Vous des Fêtes & Planches en Série',
    roleTag: 'Classique de Noël',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Épreuve / Monument',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 80,
    technique: 83,
    endurance: 78,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 9,
    effectDescription: '+9 pts transmis à votre prochain coureur hivernal.',
    summary: 'Disputé entre Noël et le Nouvel An en province d’Anvers, célèbre pour son enchaînement de bosses artificielles à haute vitesse et son ambiance populaire de fin d’année.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: 'Période de Noël',
    keyFact: 'Célèbre par sa série rythmée de bosses courtes façon vagues (« wasbord ») où la technique de saut fait la différence.',
    specialTrait: 'Série Rythmée du Wasbord Anversois',
    wikiSlug: 'Azencross'
  },
  {
    id: 'cx-nommay',
    title: 'Circuit de Nommay (Doubs)',
    subtitle: 'Terre Française Majeure de Coupe du Monde Jurassienne',
    roleTag: 'Circuit Français Coupe Monde',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 78,
    technique: 83,
    endurance: 81,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 10,
    effectDescription: '+10 pts sur terrain Cyclo-cross (dévers jurassien).',
    summary: 'Base de loisirs franc-comtoise accueillant régulièrement manches de Coupe du monde et Championnats de France entre étang gelé, grands escaliers et coteau herbeux glissant.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Coupe du Monde',
    keyFact: 'A été le théâtre d’une dizaine de manches de Coupe du monde UCI depuis les années 1990.',
    specialTrait: 'Coteau Glissant du Jura',
    wikiSlug: 'Cyclo-cross_de_Nommay'
  },
  {
    id: 'cx-pelouse-gel',
    title: 'Ornières Gelées & Verglas',
    subtitle: 'Trajectoires Piègeuses dans la Glace Matinale (-3°C)',
    roleTag: 'Condition Extrême',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Terrain / Secteur',
    rarity: 'Commune',
    energyCost: 1,
    power: 68,
    technique: 82,
    endurance: 74,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 7,
    effectDescription: '-7 pts à la carte adverse par dérobade sur rail gelé.',
    summary: 'Quand le froid saisit la boue creusée lors des reconnaissances matinales, les sillons durcissent comme du béton et sanctionnent la moindre sortie de trace.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: 'Conditions Hiver',
    keyFact: 'Les mécaniciens montent alors des boyaux à crampons courts moins gonflés pour conserver du grip sur les zones lustrées.',
    specialTrait: 'Rails Durcis Comme Béton',
    wikiSlug: 'Cyclo-cross'
  },

  // ============================================================================
  // POLYVALENT — PARACYCLISME, BMX FREESTYLE, GRAVEL ULTRA & PELOTON (+10 cartes)
  // ============================================================================
  {
    id: 'poly-storey',
    title: 'Dame Sarah Storey',
    subtitle: '19 Médailles d’Or Paralympiques (Piste & Route C5)',
    roleTag: 'Légende Paralympique Absolue',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Piste', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 93,
    technique: 92,
    endurance: 98,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 12,
    effectDescription: 'Annule tout malus de terrain & +12 pts sans faille.',
    summary: 'Athlète britannique au palmarès colossal, passée de la natation au paracyclisme en 2005 pour conquérir un record absolu de couronnes mondiales et paralympiques sur vélodrome comme en contre-la-montre sur route.',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: '19× Or Paralympique',
    keyFact: 'A remporté de nouvelles médailles d’or paralympiques sur route à Paris 2024, trente-deux ans après ses premiers Jeux à Barcelone en 1992.',
    specialTrait: 'Longévité sur 9 Paralympiades',
    wikiSlug: 'Sarah_Storey'
  },
  {
    id: 'poly-leaute',
    title: 'Alexandre Léauté',
    subtitle: 'Multiple Champion Paralympique & du Monde Piste & Route C2',
    roleTag: 'Champion Paracyclisme',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Piste', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 91,
    technique: 89,
    endurance: 91,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_PER_DISCIPLINE',
    effectValue: 5,
    effectDescription: '+5 pts par discipline différente engagée (Piste & Route).',
    summary: 'Coureur breton infatigable au coup de pédale unijambiste impressionnant de puissance, multi-médaillé d’or à Tokyo et Paris en poursuite sur piste comme en contre-la-montre routier.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Tokyo 2020 & Paris 2024',
    keyFact: 'A décroché deux médailles d’or à Paris 2024 dès les épreuves de poursuite sur piste puis en contre-la-montre route à Clichy-sous-Bois.',
    specialTrait: 'Couple Monstre sur Piste & Chrono',
    wikiSlug: 'Alexandre_Léauté'
  },
  {
    id: 'poly-jeanjean',
    title: 'Anthony Jeanjean',
    subtitle: 'Médaillé Olympique BMX Freestyle Park Paris 2024 & 3× Europe',
    roleTag: 'BMX Freestyle Park',
    discipline: 'Polyvalent',
    linkedDisciplines: ['VTT', 'Piste'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 94,
    endurance: 74,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 12,
    effectDescription: '+12 pts pour enchaînement aérien sur deux runs.',
    summary: 'Leader héraultais du BMX Freestyle Park mondial, triple champion d’Europe et premier médaillé olympique français de la discipline sur l’esplanade de la Concorde.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Concorde 2024',
    keyFact: 'A posé un backflip triple tailwhip et enchaîné des doubles rotations spectaculaires Place de la Concorde lors des Jeux 2024.',
    specialTrait: 'Backflip Double Whip à la Concorde',
    wikiSlug: 'Anthony_Jeanjean'
  },
  {
    id: 'poly-unbound-gravel',
    title: 'Unbound Gravel (320 km)',
    subtitle: 'La Reine Américaine du Gravel dans les Flint Hills du Kansas',
    roleTag: 'Monument Gravel',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'VTT'],
    category: 'Épreuve / Monument',
    rarity: 'Épique',
    energyCost: 4,
    power: 85,
    technique: 87,
    endurance: 96,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 10,
    effectDescription: 'Annule tout malus (boue collante du Kansas) & +10 pts.',
    summary: 'Monument incontesté du gravel mondial depuis 2006 : 200 miles (322 km) d’autonomie quasi totale sur silex coupants et pistes argileuses balayées par le vent des grandes plaines.',
    nationality: 'États-Unis',
    countryCode: 'USA',
    keyYear: '322 km • Kansas',
    keyFact: 'Lors des orages printaniers, la terre argileuse du Kansas forme une colle épaisse ("peanut butter mud") qui oblige tous les participants à marcher.',
    specialTrait: 'Autonomie Totale sur 200 Miles',
    wikiSlug: 'Unbound_Gravel'
  },
  {
    id: 'poly-transcontinental',
    title: 'Transcontinental Race (TCR)',
    subtitle: '4 000 km Sans Assistance Traversant Toute l’Europe',
    roleTag: 'Ultra-Cyclisme',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'VTT'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 78,
    technique: 84,
    endurance: 96,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 9,
    effectDescription: 'Annule malus de distance & +9 pts d’endurance solitaire.',
    summary: 'Course d’ultra-endurance créée en 2013 par Mike Hall où chaque coureur trace son propre itinéraire entre quatre points de contrôle obligatoires avec zéro assistance mécanique ni abri en peloton.',
    nationality: 'Europe',
    countryCode: 'INT',
    keyYear: '4 000 km Solo',
    keyFact: 'Le chronomètre ne s’arrête jamais : alimentation, sommeil en bivouac et navigation se gèrent en temps continu.',
    specialTrait: 'Zéro Draft & Navigation Bivouac',
    wikiSlug: 'Transcontinental_Race'
  },
  {
    id: 'poly-paris-brest',
    title: 'Paris-Brest-Paris Randonneur',
    subtitle: '1 200 km Non-Stop Tous les 4 Ans • Plus Vieille Épreuve Cyclo',
    roleTag: 'Légende Randonneur',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'VTT'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 76,
    technique: 82,
    endurance: 95,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étapes 4 ou 5 (retour sous les 90 heures).',
    summary: 'Inventé en 1891 par Pierre Giffard (avant même le Tour de France !), ce brevet mythique réunit tous les quatre ans des milliers de randonneurs internationaux sur 1 200 km en moins de 90 heures.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Depuis 1891',
    keyFact: 'Des contrôles par carte tamponnée jalonnent le parcours aller-retour entre les Yvelines et la pointe bretonne nuit et jour.',
    specialTrait: 'Brevet Historique Sous 90 Heures',
    wikiSlug: 'Paris-Brest-Paris_randonneur'
  },
  {
    id: 'poly-gravel-cintre',
    title: 'Vélo Gravel & Bikepacking',
    subtitle: 'Cintre Évasé « Flare », Cadre Dégagé & Sacoches Étanches',
    roleTag: 'Architecture Gravel',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'VTT'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 70,
    technique: 78,
    endurance: 76,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 7,
    effectDescription: '+7 pts en transition Route/Chemins.',
    summary: 'Monture polyvalente mariant rendement de la position route et stabilité d’un large dégagement de pneus crantés, équipée de sacoches de cadre ou de selle pour l’itinérance.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: 'Multi-Surface',
    keyFact: 'Un cintre évasé à 16° élargit la prise basse dans les descentes cassantes pour offrir un bras de levier supérieur.',
    specialTrait: 'Cintre Flare 16° & Dégagement 45 mm',
    wikiSlug: 'Gravel_(vélo)'
  },
  {
    id: 'poly-soigneur',
    title: 'Le Soigneur au Ravitaillement',
    subtitle: 'Musettes à 45 km/h & Récupération Musculaire Post-Étape',
    roleTag: 'Staff Essentiel',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 68,
    technique: 76,
    endurance: 79,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 7,
    effectDescription: '+7 pts de fraîcheur transmis à votre prochaine carte.',
    summary: 'Maillon discret mais vital d’une équipe cycliste : il prépare les bidons glacés, tend la musette en bord de route sans déséquilibrer le coureur et assure les massages du soir.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: 'Zone Ravitaillement',
    keyFact: 'Saisir la lanière d’une musette tendue à 45 km/h demande un geste souple du poignet pour ne pas provoquer de chute.',
    specialTrait: 'Passage de Musette au Vol sans Faute',
    wikiSlug: 'Soigneur_(cyclisme)'
  },
  {
    id: 'poly-chrono-clm',
    title: 'Combinaison & Casque CLM',
    subtitle: 'Épaisseur Lycra Striée & Gain Aérodynamique de 35 Watts',
    roleTag: 'Équipement Contre-la-Montre',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'Piste'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 82,
    technique: 79,
    endurance: 75,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 4,
    effectDescription: '+4 pts par carte Matériel & Technique posée.',
    summary: 'Ensemble textile sur mesure sans le moindre pli avec tissu strié sur les épaules ("trip-strips") et coque englobante réduisant la traînée frontale au strict minimum réglementaire.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: '-35 Watts à 50 km/h',
    keyFact: 'La combinaison de contre-la-montre sur mesure économise parfois davantage de watts qu’un changement complet de paire de roues.',
    specialTrait: 'Économie de 35 W à 50 km/h',
    wikiSlug: 'Contre-la-montre_cycliste'
  },
  {
    id: 'poly-home-trainer',
    title: 'Séance Seuil FTP & PMA',
    subtitle: 'Blocs d’Interval Training Millimétrés au Capteur de Watts',
    roleTag: 'Méthode Entraînement',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'Piste'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 75,
    technique: 72,
    endurance: 77,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 7,
    effectDescription: '+7 pts en Étapes 1 ou 2 (échauffement ciblé au watt).',
    summary: 'Entraînement structuré par zones de puissance calibrées autour du seuil fonctionnel sur 60 minutes (FTP) afin d’élever le plafond aérobie et la tolérance lactique.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: 'Méthode Moderne',
    keyFact: 'Les meilleurs coureurs actuels dépassent régulièrement 6,3 à 6,7 watts par kilo pendant vingt à trente minutes d’ascension sèche.',
    specialTrait: 'Calibration Précise à 6,5 W/kg',
    wikiSlug: 'Puissance_à_vélo'
  }
];


// === FILE: src/data/verifiedMediaCatalog.ts ===
const EXTRA_WIKI_SLUGS                         = {
  "cx-albert": "Niels_Albert",
  "cx-alvarado": "Ceylin_del_Carmen_Alvarado",
  "cx-benidorm": "Cyclo-cross_de_Benidorm",
  "cx-brand": "Lucinda_Brand",
  "cx-cant": "Sanne_Cant",
  "cx-compton": "Katherine_Compton",
  "cx-dufraisse": "André_Dufraisse",
  "cx-gavere": "Cyclo-cross_de_Gavere",
  "cx-groenendaal": "Richard_Groenendaal",
  "cx-iserbyt": "Eli_Iserbyt",
  "cx-koppenberg": "Koppenbergcross",
  "cx-kupfernagel": "Hanka_Kupfernagel",
  "cx-liboton": "Roland_Liboton",
  "cx-loenhout": "Azencross",
  "cx-mondiaux": "Championnats_du_monde_de_cyclo-cross",
  "cx-namur-devers": "Cyclo-cross_de_Namur",
  "cx-nocturne-diegem": "Cyclo-cross_de_Diegem",
  "cx-nys": "Sven_Nys",
  "cx-robic": "Jean_Robic",
  "cx-ronhaar": "Pim_Ronhaar",
  "cx-stybar": "Zdeněk_Štybar",
  "cx-sweeck": "Laurens_Sweeck",
  "cx-thibau-nys": "Thibau_Nys",
  "cx-vananrooij": "Shirin_van_Anrooij",
  "cx-vanderhaar": "Lars_van_der_Haar",
  "cx-vanempel": "Fem_van_Empel",
  "cx-vanthourenhout": "Michael_Vanthourenhout",
  "cx-zonhoven-kuil": "Cyclo-cross_de_Zonhoven",
  "piste-andrews": "Ellesse_Andrews",
  "piste-aspi-derny": "Derny",
  "piste-bauge": "Grégory_Baugé",
  "piste-bthomas": "Benjamin_Thomas",
  "piste-casque-visiere": "Casque_de_vélo",
  "piste-copponi": "Clara_Copponi",
  "piste-course-points": "Course_aux_points",
  "piste-course-tempo": "Course_tempo",
  "piste-elimination": "Course_par_élimination",
  "piste-ganna": "Filippo_Ganna",
  "piste-gros": "Mathilde_Gros",
  "piste-hoy": "Chris_Hoy",
  "piste-keirin-epreuve": "Keirin",
  "piste-kenny": "Laura_Kenny",
  "piste-kilometre": "Kilomètre_(cyclisme)",
  "piste-lavreysen": "Harrie_Lavreysen",
  "piste-levier": "Vitesse_par_équipes",
  "piste-manchester": "Vélodrome_de_Manchester",
  "piste-meares": "Anna_Meares",
  "piste-morelon": "Daniel_Morelon",
  "piste-omnium-epreuve": "Omnium",
  "piste-pendleton": "Victoria_Pendleton",
  "piste-pervis": "François_Pervis",
  "piste-pignon-fixe": "Pignon_fixe",
  "piste-poursuite-eq": "Poursuite_par_équipes",
  "piste-poursuite-ind": "Poursuite_individuelle",
  "piste-recordheure": "Record_de_l'heure_cycliste",
  "piste-relais-madison": "Course_à_l'américaine_(cyclisme)",
  "piste-richardson": "Matthew_Richardson_(cyclisme)",
  "piste-rousseau": "Florian_Rousseau",
  "piste-scratch": "Course_scratch",
  "piste-sixjours": "Course_de_six_jours",
  "piste-sqy-national": "Vélodrome_national_de_Saint-Quentin-en-Yvelines",
  "piste-surplace": "Surplace",
  "piste-tandem-para": "Paracyclisme",
  "piste-tournant": "Arnaud_Tournant",
  "piste-veloroubaix": "Vélodrome_André-Pétrieux",
  "piste-vigier": "Sébastien_Vigier",
  "piste-vigorelli": "Vélodrome_Maspes-Vigorelli",
  "piste-virage-sqy": "Vélodrome_national_de_Saint-Quentin-en-Yvelines",
  "piste-viviani": "Elia_Viviani",
  "piste-vogel": "Kristina_Vogel",
  "piste-wiggins": "Bradley_Wiggins",
  "piste-wild": "Kirsten_Wild",
  "poly-cadence-sprint": "Sprint_(cyclisme)",
  "poly-capteur-watts": "Capteur_de_puissance_(cyclisme)",
  "poly-jeanjean": "Anthony_Jeanjean",
  "poly-kopecky": "Lotte_Kopecky",
  "poly-leaute": "Alexandre_Léauté",
  "poly-longo": "Jeannie_Longo",
  "poly-mohoric": "Matej_Mohorič",
  "poly-mvdp": "Mathieu_van_der_Poel",
  "poly-paris-brest": "Paris-Brest-Paris_randonneur",
  "poly-pfp": "Pauline_Ferrand-Prévot",
  "poly-pidcock": "Tom_Pidcock",
  "poly-pieterse": "Puck_Pieterse",
  "poly-pneu-gravel-42": "Gravel_(vélo)",
  "poly-sagan": "Peter_Sagan",
  "poly-storey": "Sarah_Storey",
  "poly-strade-bianche": "Strade_Bianche",
  "poly-vos": "Marianne_Vos",
  "poly-wva": "Wout_van_Aert",
  "route-alaphilippe": "Julian_Alaphilippe",
  "route-alpedhuez": "Alpe_d'Huez",
  "route-angliru": "Alto_de_l'Angliru",
  "route-anquetil": "Jacques_Anquetil",
  "route-arenberg": "Trouée_d'Arenberg",
  "route-bardet": "Romain_Bardet",
  "route-bartali": "Gino_Bartali",
  "route-bobet": "Louison_Bobet",
  "route-boonen": "Tom_Boonen",
  "route-cancellara": "Fabian_Cancellara",
  "route-cavendish": "Mark_Cavendish",
  "route-contador": "Alberto_Contador",
  "route-coppi": "Fausto_Coppi",
  "route-criterium-urbain": "Critérium",
  "route-dauphine": "Critérium_du_Dauphiné",
  "route-directeur-sportif": "Directeur_sportif_(cyclisme)",
  "route-evenepoel": "Remco_Evenepoel",
  "route-frein-patins": "Frein_sur_jante",
  "route-froome": "Chris_Froome",
  "route-galibier": "Col_du_Galibier",
  "route-gilbert": "Philippe_Gilbert",
  "route-girmay": "Biniam_Girmay",
  "route-giro": "Tour_d'Italie",
  "route-gpdenain": "Grand_Prix_de_Denain",
  "route-grace-brown": "Grace_Brown",
  "route-hinault": "Bernard_Hinault",
  "route-indurain": "Miguel_Indurain",
  "route-kelly": "Sean_Kelly_(cyclisme)",
  "route-koppenberg-route": "Vieux_Quaremont",
  "route-kuurne": "Kuurne-Bruxelles-Kuurne",
  "route-lanterne-rouge": "Lanterne_rouge_(cyclisme)",
  "route-laporte": "Christophe_Laporte",
  "route-lbl": "Liège-Bastogne-Liège",
  "route-lemond": "Greg_LeMond",
  "route-lombardie": "Tour_de_Lombardie",
  "route-madouas": "Valentin_Madouas",
  "route-martinez": "Lenny_Martinez",
  "route-merckx": "Eddy_Merckx",
  "route-milansanremo": "Milan-San_Remo",
  "route-mondiaux": "Championnats_du_monde_de_cyclisme_sur_route",
  "route-mortirolo": "Col_du_Mortirolo",
  "route-mur-huy": "Mur_de_Huy",
  "route-muzic": "Évita_Muzic",
  "route-niewiadoma": "Kasia_Niewiadoma",
  "route-pantani": "Marco_Pantani",
  "route-pedersen": "Mads_Pedersen",
  "route-philipsen": "Jasper_Philipsen",
  "route-pinot": "Thibaut_Pinot",
  "route-pogacar": "Tadej_Pogačar",
  "route-poulidor": "Raymond_Poulidor",
  "route-roglic": "Primož_Roglič",
  "route-ronde": "Tour_des_Flandres",
  "route-roubaix": "Paris-Roubaix",
  "route-roue-lenti": "Vélo_de_contre-la-montre",
  "route-seixas": "Paul_Seixas",
  "route-stelvio": "Col_du_Stelvio",
  "route-tdf": "Tour_de_France",
  "route-tdf-femmes": "Tour_de_France_Femmes",
  "route-tourmalet": "Col_du_Tourmalet",
  "route-trobroleon": "Tro_Bro_Leon",
  "route-valverde": "Alejandro_Valverde",
  "route-vanvleuten": "Annemiek_van_Vleuten",
  "route-ventoux": "Mont_Ventoux",
  "route-vingegaard": "Jonas_Vingegaard",
  "route-voiture-balai": "Voiture-balai",
  "route-vollering": "Demi_Vollering",
  "route-wiebes": "Lorena_Wiebes",
  "vtt-absalon": "Julien_Absalon",
  "vtt-atherton": "Rachel_Atherton",
  "vtt-bresset": "Julie_Bresset",
  "vtt-bruni": "Loïc_Bruni",
  "vtt-bunnyhop": "Bunny_hop",
  "vtt-cape-epic": "Cape_Epic",
  "vtt-chausson": "Anne-Caroline_Chausson",
  "vtt-clementz": "Jérôme_Clementz",
  "vtt-dahle": "Gunn-Rita_Dahle_Flesjå",
  "vtt-daudet": "Joris_Daudet",
  "vtt-dropper": "Tige_de_selle",
  "vtt-goldstone": "Jackson_Goldstone",
  "vtt-hart": "Danny_Hart",
  "vtt-hatherly": "Alan_Hatherly",
  "vtt-hill": "Sam_Hill_(cycliste)",
  "vtt-holl": "Valentina_Höll",
  "vtt-koretzky": "Victor_Koretzky",
  "vtt-lecomte": "Loana_Lecomte",
  "vtt-macaskill": "Danny_MacAskill",
  "vtt-marotte": "Maxime_Marotte",
  "vtt-minnaar": "Greg_Minnaar",
  "vtt-neff": "Jolanda_Neff",
  "vtt-nicole": "Myriam_Nicole",
  "vtt-pajon": "Mariana_Pajón",
  "vtt-pedales-plates": "Pédale_de_bicyclette",
  "vtt-pierron": "Amaury_Pierron",
  "vtt-pression-fourche": "Fourche_(vélo)",
  "vtt-pump-track": "Pump_track",
  "vtt-richards": "Evie_Richards",
  "vtt-roc-azur": "Roc_d'Azur",
  "vtt-sarrou": "Jordan_Sarrou",
  "vtt-schurter": "Nino_Schurter",
  "vtt-semi-rigide": "Vélo_tout-terrain",
  "vtt-tomac": "John_Tomac",
  "vtt-transmission-t-type": "Dérailleur",
  "vtt-vergier": "Loris_Vergier",
  "vtt-vouilloz": "Nicolas_Vouilloz"
};

// Catalogue vérifié de photographies Wikimedia Commons sous licences libres (CC0, Public domain, No restrictions, CC BY, CC BY-SA).
// Chaque entrée porte son attribution complète (auteur, licence exacte et lien Commons source).
const VERIFIED_COMMONS_MEDIA                                            = {
  "cx-albert": {
    "slug": "Niels_Albert",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3a/Niels_Albert_WK_2007_2.jpg/500px-Niels_Albert_WK_2007_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Peter Huys",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Niels_Albert_WK_2007_2.jpg",
      "sourceTitle": "Niels Albert WK 2007 2.jpg"
    }
  },
  "cx-alvarado": {
    "slug": "Ceylin_del_Carmen_Alvarado",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/2020_Brussel_Cyclocross_Alvarado2.jpg/500px-2020_Brussel_Cyclocross_Alvarado2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2020_Brussel_Cyclocross_Alvarado2.jpg",
      "sourceTitle": "2020 Brussel Cyclocross Alvarado2.jpg"
    }
  },
  "cx-benidorm": {
    "slug": "Cyclo-cross_de_Benidorm",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/2025-01_Cameron_Mason.jpg/500px-2025-01_Cameron_Mason.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "VeloShutter",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2025-01_Cameron_Mason.jpg",
      "sourceTitle": "2025-01 Cameron Mason.jpg"
    }
  },
  "cx-brand": {
    "slug": "Lucinda_Brand",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/2021_WK_Vlaanderen_002_Lucinda_Brand3.jpg/500px-2021_WK_Vlaanderen_002_Lucinda_Brand3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2021_WK_Vlaanderen_002_Lucinda_Brand3.jpg",
      "sourceTitle": "2021 WK Vlaanderen 002 Lucinda Brand3.jpg"
    }
  },
  "cx-cant": {
    "slug": "Sanne_Cant",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/2020_Brussel_Cyclocross_Cant2.jpg/500px-2020_Brussel_Cyclocross_Cant2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2020_Brussel_Cyclocross_Cant2.jpg",
      "sourceTitle": "2020 Brussel Cyclocross Cant2.jpg"
    }
  },
  "cx-compton": {
    "slug": "Katherine_Compton",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Katie_Compton.jpg/500px-Katie_Compton.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Thomas Ducroquet",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Katie_Compton.jpg",
      "sourceTitle": "Katie Compton.jpg"
    }
  },
  "cx-crossman-dep": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/1992_World_Cyclocross_Championships_%2815171882700%29.jpg/500px-1992_World_Cyclocross_Championships_%2815171882700%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Brian Townsley",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:1992_World_Cyclocross_Championships_(15171882700).jpg",
      "sourceTitle": "1992 World Cyclocross Championships (15171882700).jpg"
    }
  },
  "cx-dufraisse": {
    "slug": "André_Dufraisse",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Andr%C3%A9_Dufraisse%2C_91_ans.jpg/500px-Andr%C3%A9_Dufraisse%2C_91_ans.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Franck Petit",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Andr%C3%A9_Dufraisse,_91_ans.jpg",
      "sourceTitle": "André Dufraisse, 91 ans.jpg"
    }
  },
  "cx-gavere": {
    "slug": "Cyclo-cross_de_Gavere",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Eli_Iserbyt_Cyclocross_Asper-Gavere_2018.jpg/500px-Eli_Iserbyt_Cyclocross_Asper-Gavere_2018.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Aarohowiki",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Eli_Iserbyt_Cyclocross_Asper-Gavere_2018.jpg",
      "sourceTitle": "Eli Iserbyt Cyclocross Asper-Gavere 2018.jpg"
    }
  },
  "cx-grille-depart": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Cyclingworld_Cyclocross_Race_2024%2C_Meerbusch_%28P1170914%29.jpg/500px-Cyclingworld_Cyclocross_Race_2024%2C_Meerbusch_%28P1170914%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Matti Blume",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/deed.en",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Cyclingworld_Cyclocross_Race_2024,_Meerbusch_(P1170914).jpg",
      "sourceTitle": "Cyclingworld Cyclocross Race 2024, Meerbusch (P1170914).jpg"
    }
  },
  "cx-groenendaal": {
    "slug": "Richard_Groenendaal",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/Richard-groenendaal-1212605844.jpg/500px-Richard-groenendaal-1212605844.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Danny Lechanteur",
      "licenseShortName": "CC BY 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Richard-groenendaal-1212605844.jpg",
      "sourceTitle": "Richard-groenendaal-1212605844.jpg"
    }
  },
  "cx-iserbyt": {
    "slug": "Eli_Iserbyt",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Eli_Iserbyt_%28BEL%29_2019.jpg/500px-Eli_Iserbyt_%28BEL%29_2019.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Phil Roeder",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Eli_Iserbyt_(BEL)_2019.jpg",
      "sourceTitle": "Eli Iserbyt (BEL) 2019.jpg"
    }
  },
  "cx-koppenberg": {
    "slug": "Koppenbergcross",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Koppenbergcross_2022_1.jpg/500px-Koppenbergcross_2022_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Rz98",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Koppenbergcross_2022_1.jpg",
      "sourceTitle": "Koppenbergcross 2022 1.jpg"
    }
  },
  "cx-kupfernagel": {
    "slug": "Hanka_Kupfernagel",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/Hanka_Kupfernagel_GPLM_2009.jpg/500px-Hanka_Kupfernagel_GPLM_2009.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Thomas Ducroquet",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Hanka_Kupfernagel_GPLM_2009.jpg",
      "sourceTitle": "Hanka Kupfernagel GPLM 2009.jpg"
    }
  },
  "cx-lavage-karcher": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/2018_Jingle_Cross_UCI_Cyclocross_World_Cup_%2844293437994%29.jpg/500px-2018_Jingle_Cross_UCI_Cyclocross_World_Cup_%2844293437994%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Phil Roeder from Des Moines, IA, USA",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2018_Jingle_Cross_UCI_Cyclocross_World_Cup_(44293437994).jpg",
      "sourceTitle": "2018 Jingle Cross UCI Cyclocross World Cup (44293437994).jpg"
    }
  },
  "cx-liboton": {
    "slug": "Roland_Liboton",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Opdracht_AP_erepodium_v.l.n.r._Stamsnijder_%282e%29%2C_Liboton_%281e%29_en_Zweifel_%283e%29%2C_Bestanddeelnr_932-8744.jpg/500px-Opdracht_AP_erepodium_v.l.n.r._Stamsnijder_%282e%29%2C_Liboton_%281e%29_en_Zweifel_%283e%29%2C_Bestanddeelnr_932-8744.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Marcel Antonisse / Anefo",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Opdracht_AP_erepodium_v.l.n.r._Stamsnijder_(2e),_Liboton_(1e)_en_Zweifel_(3e),_Bestanddeelnr_932-8744.jpg",
      "sourceTitle": "Opdracht AP erepodium v.l.n.r. Stamsnijder (2e), Liboton (1e) en Zweifel (3e), Bestanddeelnr 932-8744.jpg"
    }
  },
  "cx-loenhout": {
    "slug": "Azencross",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/e/e3/Zden%C4%9Bk_%C5%A0tybar_at_the_Azencross_2012.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "FakirNL",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Zden%C4%9Bk_%C5%A0tybar_at_the_Azencross_2012.jpg",
      "sourceTitle": "Zdeněk Štybar at the Azencross 2012.jpg"
    }
  },
  "cx-mondiaux": {
    "slug": "Championnats_du_monde_de_cyclo-cross",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/2025_UCI_Cyclo-cross_World_Championships_-_Barbora_Bukovsk%C3%A1.jpg/500px-2025_UCI_Cyclo-cross_World_Championships_-_Barbora_Bukovsk%C3%A1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Felouch Kotek",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2025_UCI_Cyclo-cross_World_Championships_-_Barbora_Bukovsk%C3%A1.jpg",
      "sourceTitle": "2025 UCI Cyclo-cross World Championships - Barbora Bukovská.jpg"
    }
  },
  "cx-namur-devers": {
    "slug": "Cyclo-cross_de_Namur",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/2018_Citadelcross_Namur_114.jpg/500px-2018_Citadelcross_Namur_114.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2018_Citadelcross_Namur_114.jpg",
      "sourceTitle": "2018 Citadelcross Namur 114.jpg"
    }
  },
  "cx-nocturne-diegem": {
    "slug": "Cyclo-cross_de_Diegem",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/Cameron_Mason_at_Diegem_cyclocross_2025.jpg/500px-Cameron_Mason_at_Diegem_cyclocross_2025.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Spudem",
      "licenseShortName": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Cameron_Mason_at_Diegem_cyclocross_2025.jpg",
      "sourceTitle": "Cameron Mason at Diegem cyclocross 2025.jpg"
    }
  },
  "cx-nys": {
    "slug": "Sven_Nys",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Sven_nys-1516421245.jpg/500px-Sven_nys-1516421245.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Paul Van Welden",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Sven_nys-1516421245.jpg",
      "sourceTitle": "Sven nys-1516421245.jpg"
    }
  },
  "cx-pontchateau": {
    "slug": "Pontchâteau",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Jules_Simon_Pont-Chateau.jpg/500px-Jules_Simon_Pont-Chateau.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "MFonzatti",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jules_Simon_Pont-Chateau.jpg",
      "sourceTitle": "Jules Simon Pont-Chateau.jpg"
    }
  },
  "cx-portage-sable": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Wheels_Up_%2836993231280%29.jpg/500px-Wheels_Up_%2836993231280%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Phil Roeder from Des Moines, IA, USA",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Wheels_Up_(36993231280).jpg",
      "sourceTitle": "Wheels Up (36993231280).jpg"
    }
  },
  "cx-robic": {
    "slug": "Jean_Robic",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/e/e6/Jean_Robic_%281947%29.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Harry Sagers / Anefo",
      "licenseShortName": "CC BY-SA 3.0 nl",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/nl/deed.en",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jean_Robic_(1947).png",
      "sourceTitle": "Jean Robic (1947).png"
    }
  },
  "cx-ronhaar": {
    "slug": "Pim_Ronhaar",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/2024_Tour_de_Wallonie_-_4e_etappe_419_Pim_Ronhaar.jpg/500px-2024_Tour_de_Wallonie_-_4e_etappe_419_Pim_Ronhaar.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2024_Tour_de_Wallonie_-_4e_etappe_419_Pim_Ronhaar.jpg",
      "sourceTitle": "2024 Tour de Wallonie - 4e etappe 419 Pim Ronhaar.jpg"
    }
  },
  "cx-saut-amazone": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/2018_Jingle_Cross_UCI_Cyclocross_World_Cup_%2830076844857%29.jpg/500px-2018_Jingle_Cross_UCI_Cyclocross_World_Cup_%2830076844857%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Phil Roeder from Des Moines, IA, USA",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2018_Jingle_Cross_UCI_Cyclocross_World_Cup_(30076844857).jpg",
      "sourceTitle": "2018 Jingle Cross UCI Cyclocross World Cup (30076844857).jpg"
    }
  },
  "cx-saut-planches": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/72/Cyclocross_runup.JPG/500px-Cyclocross_runup.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Furmanj",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Cyclocross_runup.JPG",
      "sourceTitle": "Cyclocross runup.JPG"
    }
  },
  "cx-stybar": {
    "slug": "Zdeněk_Štybar",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Harelbeke_-_E3_Harelbeke%2C_27_maart_2015_%28G16%29.JPG/500px-Harelbeke_-_E3_Harelbeke%2C_27_maart_2015_%28G16%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémy-Günther-Heinz Jähnick",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Harelbeke_-_E3_Harelbeke,_27_maart_2015_(G16).JPG",
      "sourceTitle": "Harelbeke - E3 Harelbeke, 27 maart 2015 (G16).JPG"
    }
  },
  "cx-sweeck": {
    "slug": "Laurens_Sweeck",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Tongeren_-_Ronde_van_Limburg%2C_14_juni_2015_%28B052%29.JPG/500px-Tongeren_-_Ronde_van_Limburg%2C_14_juni_2015_%28B052%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémy-Günther-Heinz Jähnick",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tongeren_-_Ronde_van_Limburg,_14_juni_2015_(B052).JPG",
      "sourceTitle": "Tongeren - Ronde van Limburg, 14 juni 2015 (B052).JPG"
    }
  },
  "cx-thibau-nys": {
    "slug": "Thibau_Nys",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Thibau_Nys_-_2023_UCI_Road_World_Championships_%28Men%27s_under-23_road_race%29.jpg/500px-Thibau_Nys_-_2023_UCI_Road_World_Championships_%28Men%27s_under-23_road_race%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Cs-wolves",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Thibau_Nys_-_2023_UCI_Road_World_Championships_(Men%27s_under-23_road_race).jpg",
      "sourceTitle": "Thibau Nys - 2023 UCI Road World Championships (Men's under-23 road race).jpg"
    }
  },
  "cx-vananrooij": {
    "slug": "Shirin_van_Anrooij",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/2022_AGR_finish_Shirin_van_Anrooij.jpg/500px-2022_AGR_finish_Shirin_van_Anrooij.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2022_AGR_finish_Shirin_van_Anrooij.jpg",
      "sourceTitle": "2022 AGR finish Shirin van Anrooij.jpg"
    }
  },
  "cx-vanderhaar": {
    "slug": "Lars_van_der_Haar",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/Lars_Van_Der_Haar_%2837204745102%29.jpg/500px-Lars_Van_Der_Haar_%2837204745102%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Phil Roeder from Des Moines, IA, USA",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Lars_Van_Der_Haar_(37204745102).jpg",
      "sourceTitle": "Lars Van Der Haar (37204745102).jpg"
    }
  },
  "cx-vanempel": {
    "slug": "Fem_van_Empel",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Fem_vanEmpel_2023.jpg/500px-Fem_vanEmpel_2023.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "MFonzatti",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Fem_vanEmpel_2023.jpg",
      "sourceTitle": "Fem vanEmpel 2023.jpg"
    }
  },
  "cx-vanthourenhout": {
    "slug": "Michael_Vanthourenhout",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Pont-Ch%C3%A2teau_2023_men_elites_podium_%28cropped%29.jpg/500px-Pont-Ch%C3%A2teau_2023_men_elites_podium_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "MFonzatti",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Pont-Ch%C3%A2teau_2023_men_elites_podium_(cropped).jpg",
      "sourceTitle": "Pont-Château 2023 men elites podium (cropped).jpg"
    }
  },
  "cx-zonhoven-kuil": {
    "slug": "Cyclo-cross_de_Zonhoven",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/2019_Superprestige_Zonhoven_men_22.jpg/500px-2019_Superprestige_Zonhoven_men_22.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2019_Superprestige_Zonhoven_men_22.jpg",
      "sourceTitle": "2019 Superprestige Zonhoven men 22.jpg"
    }
  },
  "piste-andrews": {
    "slug": "Ellesse_Andrews",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Ellesse_Andrews_MNZM_%28cropped%29.jpg/500px-Ellesse_Andrews_MNZM_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Government House, Department of the Prime Minister and Cabinet",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Ellesse_Andrews_MNZM_(cropped).jpg",
      "sourceTitle": "Ellesse Andrews MNZM (cropped).jpg"
    }
  },
  "piste-aspi-derny": {
    "slug": "Derny",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Derny_vainqueur_des_500_m%C3%A8tres_de_Deauville_en_1903_sur_motocyclette_Cl%C3%A9ment.jpg/500px-Derny_vainqueur_des_500_m%C3%A8tres_de_Deauville_en_1903_sur_motocyclette_Cl%C3%A9ment.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jules Beau",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Derny_vainqueur_des_500_m%C3%A8tres_de_Deauville_en_1903_sur_motocyclette_Cl%C3%A9ment.jpg",
      "sourceTitle": "Derny vainqueur des 500 mètres de Deauville en 1903 sur motocyclette Clément.jpg"
    }
  },
  "piste-bauge": {
    "slug": "Grégory_Baugé",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/UCI_Track_World_Championships_2020_012.jpg/500px-UCI_Track_World_Championships_2020_012.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:UCI_Track_World_Championships_2020_012.jpg",
      "sourceTitle": "UCI Track World Championships 2020 012.jpg"
    }
  },
  "piste-bthomas": {
    "slug": "Benjamin_Thomas",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/2017_UEC_Track_Elite_European_Championships_226.jpg/500px-2017_UEC_Track_Elite_European_Championships_226.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2017_UEC_Track_Elite_European_Championships_226.jpg",
      "sourceTitle": "2017 UEC Track Elite European Championships 226.jpg"
    }
  },
  "piste-casque-visiere": {
    "slug": "Casque_de_vélo",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Casque_v%C3%A9lo_de_course.jpg/500px-Casque_v%C3%A9lo_de_course.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Ludovic Péron",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Casque_v%C3%A9lo_de_course.jpg",
      "sourceTitle": "Casque vélo de course.jpg"
    }
  },
  "piste-copponi": {
    "slug": "Clara_Copponi",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/2019_UEC_Track_Elite_European_Championships_045.jpg/500px-2019_UEC_Track_Elite_European_Championships_045.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2019_UEC_Track_Elite_European_Championships_045.jpg",
      "sourceTitle": "2019 UEC Track Elite European Championships 045.jpg"
    }
  },
  "piste-course-points": {
    "slug": "Course_aux_points",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Lizzie_Armistead_-_Flickr_-_johnthescone.jpg/500px-Lizzie_Armistead_-_Flickr_-_johnthescone.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "johnthescone from Sheffield",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Lizzie_Armistead_-_Flickr_-_johnthescone.jpg",
      "sourceTitle": "Lizzie Armistead - Flickr - johnthescone.jpg"
    }
  },
  "piste-course-tempo": {
    "slug": "Course_tempo",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/6/63/Podium_women%27s_points_race_-_2008_European_Track_Championships.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Sander.v.Ginkel",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Podium_women%27s_points_race_-_2008_European_Track_Championships.jpg",
      "sourceTitle": "Podium women's points race - 2008 European Track Championships.jpg"
    }
  },
  "piste-elimination": {
    "slug": "Course_par_élimination",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/0/05/Start_of_the_women%27s_elimination_race_of_the_omnium.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Sander.v.Ginkel",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Start_of_the_women%27s_elimination_race_of_the_omnium.jpg",
      "sourceTitle": "Start of the women's elimination race of the omnium.jpg"
    }
  },
  "piste-ganna": {
    "slug": "Filippo_Ganna",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/2022-08-17_European_Championships_2022_%E2%80%93_Road_Cycling_Men%27s_Time_Trial_by_Sandro_Halank%E2%80%93103.jpg/500px-2022-08-17_European_Championships_2022_%E2%80%93_Road_Cycling_Men%27s_Time_Trial_by_Sandro_Halank%E2%80%93103.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Sandro Halank , Wikimedia Commons",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2022-08-17_European_Championships_2022_%E2%80%93_Road_Cycling_Men%27s_Time_Trial_by_Sandro_Halank%E2%80%93103.jpg",
      "sourceTitle": "2022-08-17 European Championships 2022 – Road Cycling Men's Time Trial by Sandro Halank–103.jpg"
    }
  },
  "piste-gros": {
    "slug": "Mathilde_Gros",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/72/2022-08-15_202744_UEC_Track_Elite_European_Championships_%28cropped%29.jpg/500px-2022-08-15_202744_UEC_Track_Elite_European_Championships_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Tim Rademacher",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2022-08-15_202744_UEC_Track_Elite_European_Championships_(cropped).jpg",
      "sourceTitle": "2022-08-15 202744 UEC Track Elite European Championships (cropped).jpg"
    }
  },
  "piste-hoy": {
    "slug": "Chris_Hoy",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/UCI_Track_World_Championships_2020_110_%282%29.jpg/500px-UCI_Track_World_Championships_2020_110_%282%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:UCI_Track_World_Championships_2020_110_(2).jpg",
      "sourceTitle": "UCI Track World Championships 2020 110 (2).jpg"
    }
  },
  "piste-keirin-epreuve": {
    "slug": "Keirin",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/ColwoodKeirin.jpg/500px-ColwoodKeirin.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "FigBug",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:ColwoodKeirin.jpg",
      "sourceTitle": "ColwoodKeirin.jpg"
    }
  },
  "piste-kenny": {
    "slug": "Laura_Kenny",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/2015_UEC_Track_Elite_European_Championships_118.JPG/500px-2015_UEC_Track_Elite_European_Championships_118.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2015_UEC_Track_Elite_European_Championships_118.JPG",
      "sourceTitle": "2015 UEC Track Elite European Championships 118.JPG"
    }
  },
  "piste-kilometre": {
    "slug": "Kilomètre_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Vogel_Start_500_Meter.jpg/500px-Vogel_Start_500_Meter.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Vogel_Start_500_Meter.jpg",
      "sourceTitle": "Vogel Start 500 Meter.jpg"
    }
  },
  "piste-lavreysen": {
    "slug": "Harrie_Lavreysen",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/2017_UEC_Track_Elite_European_Championships_017.jpg/500px-2017_UEC_Track_Elite_European_Championships_017.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2017_UEC_Track_Elite_European_Championships_017.jpg",
      "sourceTitle": "2017 UEC Track Elite European Championships 017.jpg"
    }
  },
  "piste-levier": {
    "slug": "Vitesse_par_équipes",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/Qualifikation_Teamsprint_deutsches_Team.jpg/500px-Qualifikation_Teamsprint_deutsches_Team.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Qualifikation_Teamsprint_deutsches_Team.jpg",
      "sourceTitle": "Qualifikation Teamsprint deutsches Team.jpg"
    }
  },
  "piste-ligne-noire": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Velodrome_parc_tete_d%27or_3.jpg/500px-Velodrome_parc_tete_d%27or_3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "User:Jejecam",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Velodrome_parc_tete_d%27or_3.jpg",
      "sourceTitle": "Velodrome parc tete d'or 3.jpg"
    }
  },
  "piste-manchester": {
    "slug": "Vélodrome_de_Manchester",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/National_Cycling_Centre_-_Velodrome_-_geograph.org.uk_-_1595.jpg/500px-National_Cycling_Centre_-_Velodrome_-_geograph.org.uk_-_1595.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gary Barber",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:National_Cycling_Centre_-_Velodrome_-_geograph.org.uk_-_1595.jpg",
      "sourceTitle": "National Cycling Centre - Velodrome - geograph.org.uk - 1595.jpg"
    }
  },
  "piste-meares": {
    "slug": "Anna_Meares",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Anna_Meares_2.jpg/500px-Anna_Meares_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Blnguyen/ en:User:YellowMonkey",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Anna_Meares_2.jpg",
      "sourceTitle": "Anna Meares 2.jpg"
    }
  },
  "piste-morelon": {
    "slug": "Daniel_Morelon",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Daniel_Morelon.JPG/500px-Daniel_Morelon.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 3.0 de",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Daniel_Morelon.JPG",
      "sourceTitle": "Daniel Morelon.JPG"
    }
  },
  "piste-omnium-epreuve": {
    "slug": "Omnium",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/d/da/Start_of_the_women%27s_elimination_race_of_the_omnium_%282%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Sander.v.Ginkel",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Start_of_the_women%27s_elimination_race_of_the_omnium_(2).jpg",
      "sourceTitle": "Start of the women's elimination race of the omnium (2).jpg"
    }
  },
  "piste-pendleton": {
    "slug": "Victoria_Pendleton",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Victoria_Pendleton_2011.jpg/500px-Victoria_Pendleton_2011.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Victoria_Pendleton_2011.jpg",
      "sourceTitle": "Victoria Pendleton 2011.jpg"
    }
  },
  "piste-pervis": {
    "slug": "François_Pervis",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/2015_UEC_Track_Elite_European_Championships_46.JPG/500px-2015_UEC_Track_Elite_European_Championships_46.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2015_UEC_Track_Elite_European_Championships_46.JPG",
      "sourceTitle": "2015 UEC Track Elite European Championships 46.JPG"
    }
  },
  "piste-pignon-fixe": {
    "slug": "Pignon_fixe",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Fixed-gear-cogs.jpg/500px-Fixed-gear-cogs.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Contributeur Wikimedia Commons",
      "licenseShortName": "CC BY-SA 2.5",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.5",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Fixed-gear-cogs.jpg",
      "sourceTitle": "Fixed-gear-cogs.jpg"
    }
  },
  "piste-poursuite-eq": {
    "slug": "Poursuite_par_équipes",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c6/2015_UEC_Track_Elite_European_Championships_150.JPG/500px-2015_UEC_Track_Elite_European_Championships_150.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2015_UEC_Track_Elite_European_Championships_150.JPG",
      "sourceTitle": "2015 UEC Track Elite European Championships 150.JPG"
    }
  },
  "piste-poursuite-ind": {
    "slug": "Poursuite_individuelle",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Rob_Hayles_-_Men%27s_Individual_Pursuit.jpg/500px-Rob_Hayles_-_Men%27s_Individual_Pursuit.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "johnthescone from Sheffield",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Rob_Hayles_-_Men%27s_Individual_Pursuit.jpg",
      "sourceTitle": "Rob Hayles - Men's Individual Pursuit.jpg"
    }
  },
  "piste-prise-tour": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Kim_Geist%2C_Junior_Track_Nationals_%2830533177%29.jpg/500px-Kim_Geist%2C_Junior_Track_Nationals_%2830533177%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Steve Ryan from Monterey, CA, USA",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Kim_Geist,_Junior_Track_Nationals_(30533177).jpg",
      "sourceTitle": "Kim Geist, Junior Track Nationals (30533177).jpg"
    }
  },
  "piste-recordheure": {
    "slug": "Record_de_l'heure_cycliste",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Manchester_Velodrome.jpg/500px-Manchester_Velodrome.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Liz Dawson",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Manchester_Velodrome.jpg",
      "sourceTitle": "Manchester Velodrome.jpg"
    }
  },
  "piste-relais-madison": {
    "slug": "Course_à_l'américaine_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/The_Wheel_and_cycling_trade_review_%281896%29_%2814774919081%29.jpg/500px-The_Wheel_and_cycling_trade_review_%281896%29_%2814774919081%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Internet Archive Book Images",
      "licenseShortName": "No restrictions",
      "licenseUrl": "https://www.flickr.com/commons/usage/",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:The_Wheel_and_cycling_trade_review_(1896)_(14774919081).jpg",
      "sourceTitle": "The Wheel and cycling trade review (1896) (14774919081).jpg"
    }
  },
  "piste-richardson": {
    "slug": "Matthew_Richardson_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Matthew_Richardson_WCh_2020.jpg/500px-Matthew_Richardson_WCh_2020.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "crop by Leonprimer",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Matthew_Richardson_WCh_2020.jpg",
      "sourceTitle": "Matthew Richardson WCh 2020.jpg"
    }
  },
  "piste-roue-batons": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/US_Pro_Cycling_Championships_Greenville_South_Carolina_175.jpg/500px-US_Pro_Cycling_Championships_Greenville_South_Carolina_175.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Glory Cycles",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:US_Pro_Cycling_Championships_Greenville_South_Carolina_175.jpg",
      "sourceTitle": "US Pro Cycling Championships Greenville South Carolina 175.jpg"
    }
  },
  "piste-rousseau": {
    "slug": "Florian_Rousseau",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Florian_Rousseau_2012.jpg/500px-Florian_Rousseau_2012.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Florian_Rousseau_2012.jpg",
      "sourceTitle": "Florian Rousseau 2012.jpg"
    }
  },
  "piste-scratch": {
    "slug": "Course_scratch",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/44/Scratch_femme_13.jpg/500px-Scratch_femme_13.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Cyrille Largillier",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Scratch_femme_13.jpg",
      "sourceTitle": "Scratch femme 13.jpg"
    }
  },
  "piste-sixjours": {
    "slug": "Course_de_six_jours",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Iljo_Keisse_Robert_Bartko_Sixdays_Z%C3%BCrich_2007-2008.jpg/500px-Iljo_Keisse_Robert_Bartko_Sixdays_Z%C3%BCrich_2007-2008.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "tetedelacourse",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Iljo_Keisse_Robert_Bartko_Sixdays_Z%C3%BCrich_2007-2008.jpg",
      "sourceTitle": "Iljo Keisse Robert Bartko Sixdays Zürich 2007-2008.jpg"
    }
  },
  "piste-sqy-national": {
    "slug": "Vélodrome_national_de_Saint-Quentin-en-Yvelines",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/2024_Summer_Paralympics_-_Cycling_05.jpg/500px-2024_Summer_Paralympics_-_Cycling_05.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gail Leenstra",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2024_Summer_Paralympics_-_Cycling_05.jpg",
      "sourceTitle": "2024 Summer Paralympics - Cycling 05.jpg"
    }
  },
  "piste-stagiaire-club": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Behind_Bigger_Motors_at_Frankfurt_%2812343885584%29.jpg/500px-Behind_Bigger_Motors_at_Frankfurt_%2812343885584%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Brian Townsley",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Behind_Bigger_Motors_at_Frankfurt_(12343885584).jpg",
      "sourceTitle": "Behind Bigger Motors at Frankfurt (12343885584).jpg"
    }
  },
  "piste-surplace": {
    "slug": "Surplace",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Track_stand_Atlanta_CM.jpg/500px-Track_stand_Atlanta_CM.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Scott Ehardt",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Track_stand_Atlanta_CM.jpg",
      "sourceTitle": "Track stand Atlanta CM.jpg"
    }
  },
  "piste-tandem-para": {
    "slug": "Paracyclisme",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/2024_Summer_Paralympics_-_Cycling_15.jpg/500px-2024_Summer_Paralympics_-_Cycling_15.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gail Leenstra",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2024_Summer_Paralympics_-_Cycling_15.jpg",
      "sourceTitle": "2024 Summer Paralympics - Cycling 15.jpg"
    }
  },
  "piste-tournant": {
    "slug": "Arnaud_Tournant",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/Arnaud_Tournant_-_Six_jours_de_Grenoble_2011.jpg/500px-Arnaud_Tournant_-_Six_jours_de_Grenoble_2011.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Matthieu Riegler English : This photo has been taken by Matthieu Riegler ( User:Kyro ) and released ",
      "licenseShortName": "CC BY 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Arnaud_Tournant_-_Six_jours_de_Grenoble_2011.jpg",
      "sourceTitle": "Arnaud Tournant - Six jours de Grenoble 2011.jpg"
    }
  },
  "piste-veloroubaix": {
    "slug": "Vélodrome_André-Pétrieux",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Roubaix%2C_V%C3%A9lodrome.jpg/500px-Roubaix%2C_V%C3%A9lodrome.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicolas von Kospoth ( Triggerhappy )",
      "licenseShortName": "CC BY-SA 2.5",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.5",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Roubaix,_V%C3%A9lodrome.jpg",
      "sourceTitle": "Roubaix, Vélodrome.jpg"
    }
  },
  "piste-vigier": {
    "slug": "Sébastien_Vigier",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/2017_UEC_Track_Elite_European_Championships_229.jpg/500px-2017_UEC_Track_Elite_European_Championships_229.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2017_UEC_Track_Elite_European_Championships_229.jpg",
      "sourceTitle": "2017 UEC Track Elite European Championships 229.jpg"
    }
  },
  "piste-vigorelli": {
    "slug": "Vélodrome_Maspes-Vigorelli",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/Velodromo_Vigorelli_2018_veduta_dall%27alto.jpg/500px-Velodromo_Vigorelli_2018_veduta_dall%27alto.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Minnitre",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Velodromo_Vigorelli_2018_veduta_dall%27alto.jpg",
      "sourceTitle": "Velodromo Vigorelli 2018 veduta dall'alto.jpg"
    }
  },
  "piste-virage-sqy": {
    "slug": "Vélodrome_national_de_Saint-Quentin-en-Yvelines",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Journ%C3%A9e_portes_ouvertes_au_v%C3%A9lodrome_de_Saint-Quentin-en-Yvelines_le_1er_f%C3%A9vrier_2014_-_78.jpg/500px-Journ%C3%A9e_portes_ouvertes_au_v%C3%A9lodrome_de_Saint-Quentin-en-Yvelines_le_1er_f%C3%A9vrier_2014_-_78.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Lionel Allorge",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Journ%C3%A9e_portes_ouvertes_au_v%C3%A9lodrome_de_Saint-Quentin-en-Yvelines_le_1er_f%C3%A9vrier_2014_-_78.jpg",
      "sourceTitle": "Journée portes ouvertes au vélodrome de Saint-Quentin-en-Yvelines le 1er février 2014 - 78.jpg"
    }
  },
  "piste-viviani": {
    "slug": "Elia_Viviani",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/GIR30183_viviani_%2842462550871%29.jpg/500px-GIR30183_viviani_%2842462550871%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "filip bossuyt from Kortrijk, Belgium",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:GIR30183_viviani_(42462550871).jpg",
      "sourceTitle": "GIR30183 viviani (42462550871).jpg"
    }
  },
  "piste-vogel": {
    "slug": "Kristina_Vogel",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Deutsche_Meisterschaften_im_Bahnradsport_2022_068_Kristina_Vogel.jpg/500px-Deutsche_Meisterschaften_im_Bahnradsport_2022_068_Kristina_Vogel.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Deutsche_Meisterschaften_im_Bahnradsport_2022_068_Kristina_Vogel.jpg",
      "sourceTitle": "Deutsche Meisterschaften im Bahnradsport 2022 068 Kristina Vogel.jpg"
    }
  },
  "piste-wiggins": {
    "slug": "Bradley_Wiggins",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/7/7c/Bradley_Wiggins_CD_2011.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Petit Brun",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Bradley_Wiggins_CD_2011.jpg",
      "sourceTitle": "Bradley Wiggins CD 2011.jpg"
    }
  },
  "piste-wild": {
    "slug": "Kirsten_Wild",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/2018_Women%27s_Tour_de_Yorkshire_-_Kirsten_Wild.jpg/500px-2018_Women%27s_Tour_de_Yorkshire_-_Kirsten_Wild.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Cs-wolves",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2018_Women%27s_Tour_de_Yorkshire_-_Kirsten_Wild.jpg",
      "sourceTitle": "2018 Women's Tour de Yorkshire - Kirsten Wild.jpg"
    }
  },
  "poly-cadence-sprint": {
    "slug": "Sprint_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Sprint_00.jpg/500px-Sprint_00.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Kuebi",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Sprint_00.jpg",
      "sourceTitle": "Sprint 00.jpg"
    }
  },
  "poly-capteur-watts": {
    "slug": "Capteur_de_puissance_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/SRAM_Quarq_ELSA_10R_Power_Meter_02.jpg/500px-SRAM_Quarq_ELSA_10R_Power_Meter_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Glory Cycles",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:SRAM_Quarq_ELSA_10R_Power_Meter_02.jpg",
      "sourceTitle": "SRAM Quarq ELSA 10R Power Meter 02.jpg"
    }
  },
  "poly-entrainement-stage": {
    "slug": "Teide",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/Roque_Cinchado_und_Teide_%28Zuschnitt%29.jpg/500px-Roque_Cinchado_und_Teide_%28Zuschnitt%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Thomas Wolf , www.foto-tw.de",
      "licenseShortName": "CC BY-SA 3.0 de",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Roque_Cinchado_und_Teide_(Zuschnitt).jpg",
      "sourceTitle": "Roque Cinchado und Teide (Zuschnitt).jpg"
    }
  },
  "poly-jeanjean": {
    "slug": "Anthony_Jeanjean",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Anthony_Jeanjean_2020.jpg/500px-Anthony_Jeanjean_2020.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "NICOLAS MENNETREY",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Anthony_Jeanjean_2020.jpg",
      "sourceTitle": "Anthony Jeanjean 2020.jpg"
    }
  },
  "poly-kopecky": {
    "slug": "Lotte_Kopecky",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Lotte_Kopecky_poseert_in_KOERSkaffee_%28cropped%29.jpg/500px-Lotte_Kopecky_poseert_in_KOERSkaffee_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Diethard.Vlaeminck",
      "licenseShortName": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Lotte_Kopecky_poseert_in_KOERSkaffee_(cropped).jpg",
      "sourceTitle": "Lotte Kopecky poseert in KOERSkaffee (cropped).jpg"
    }
  },
  "poly-leaute": {
    "slug": "Alexandre_Léauté",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Alexandre_L%C3%A9aut%C3%A9_-_Paris_2024_-_French_delegation_Parade_%28cropped%29.jpg/500px-Alexandre_L%C3%A9aut%C3%A9_-_Paris_2024_-_French_delegation_Parade_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicolas22g",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Alexandre_L%C3%A9aut%C3%A9_-_Paris_2024_-_French_delegation_Parade_(cropped).jpg",
      "sourceTitle": "Alexandre Léauté - Paris 2024 - French delegation Parade (cropped).jpg"
    }
  },
  "poly-longo": {
    "slug": "Jeannie_Longo",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/Jeannie_Longo_-_6_jours_de_Grenoble_2011.jpg/500px-Jeannie_Longo_-_6_jours_de_Grenoble_2011.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Matthieu Riegler English : This photo has been taken by Matthieu Riegler ( User:Kyro ) and released ",
      "licenseShortName": "CC BY 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jeannie_Longo_-_6_jours_de_Grenoble_2011.jpg",
      "sourceTitle": "Jeannie Longo - 6 jours de Grenoble 2011.jpg"
    }
  },
  "poly-mohoric": {
    "slug": "Matej_Mohorič",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Matej_Mohori%C4%8D_Paris-Roubaix_2022.jpg/500px-Matej_Mohori%C4%8D_Paris-Roubaix_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Clémence LN",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Matej_Mohori%C4%8D_Paris-Roubaix_2022.jpg",
      "sourceTitle": "Matej Mohorič Paris-Roubaix 2022.jpg"
    }
  },
  "poly-mvdp": {
    "slug": "Mathieu_van_der_Poel",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/MVDP-PR2024.jpg/500px-MVDP-PR2024.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Clémence LN",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:MVDP-PR2024.jpg",
      "sourceTitle": "MVDP-PR2024.jpg"
    }
  },
  "poly-paris-brest": {
    "slug": "Paris-Brest-Paris_randonneur",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/8/8e/Bj%C3%B6rn_Lenhard.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Jmax",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Bj%C3%B6rn_Lenhard.jpg",
      "sourceTitle": "Björn Lenhard.jpg"
    }
  },
  "poly-pfp": {
    "slug": "Pauline_Ferrand-Prévot",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Javen%C3%A92025_074_Pauline_Ferrand-Pr%C3%A9vot.jpg/500px-Javen%C3%A92025_074_Pauline_Ferrand-Pr%C3%A9vot.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "MFonzatti",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Javen%C3%A92025_074_Pauline_Ferrand-Pr%C3%A9vot.jpg",
      "sourceTitle": "Javené2025 074 Pauline Ferrand-Prévot.jpg"
    }
  },
  "poly-pidcock": {
    "slug": "Tom_Pidcock",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Tom_Pidcock_%282023%29.jpg/500px-Tom_Pidcock_%282023%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Joost Pauwels",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tom_Pidcock_(2023).jpg",
      "sourceTitle": "Tom Pidcock (2023).jpg"
    }
  },
  "poly-pieterse": {
    "slug": "Puck_Pieterse",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/2022_EK_Namur_WU_podium_Puck_Pieterse.jpg/500px-2022_EK_Namur_WU_podium_Puck_Pieterse.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2022_EK_Namur_WU_podium_Puck_Pieterse.jpg",
      "sourceTitle": "2022 EK Namur WU podium Puck Pieterse.jpg"
    }
  },
  "poly-pneu-gravel-42": {
    "slug": "Gravel_(vélo)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Fyxation_Carbon_Adventure.jpg/500px-Fyxation_Carbon_Adventure.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Tim Reddington",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Fyxation_Carbon_Adventure.jpg",
      "sourceTitle": "Fyxation Carbon Adventure.jpg"
    }
  },
  "poly-sagan": {
    "slug": "Peter_Sagan",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Peter_Sagan_TDF2022.jpg/500px-Peter_Sagan_TDF2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Clémence LN",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Peter_Sagan_TDF2022.jpg",
      "sourceTitle": "Peter Sagan TDF2022.jpg"
    }
  },
  "poly-storey": {
    "slug": "Sarah_Storey",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/70/Sarah_Storey_medals_%28cropped%29.jpg/500px-Sarah_Storey_medals_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Bill",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Sarah_Storey_medals_(cropped).jpg",
      "sourceTitle": "Sarah Storey medals (cropped).jpg"
    }
  },
  "poly-strade-bianche": {
    "slug": "Strade_Bianche",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Strade_bianche_hommes_2018.png/500px-Strade_bianche_hommes_2018.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Psemdel",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Strade_bianche_hommes_2018.png",
      "sourceTitle": "Strade bianche hommes 2018.png"
    }
  },
  "poly-vos": {
    "slug": "Marianne_Vos",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Jumbo_tour_de_france_reims_1408748.jpg/500px-Jumbo_tour_de_france_reims_1408748.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "G.Garitan",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jumbo_tour_de_france_reims_1408748.jpg",
      "sourceTitle": "Jumbo tour de france reims 1408748.jpg"
    }
  },
  "poly-wva": {
    "slug": "Wout_van_Aert",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/WVA_Paris-Roubaix_2022.jpg/500px-WVA_Paris-Roubaix_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Clémence LN",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:WVA_Paris-Roubaix_2022.jpg",
      "sourceTitle": "WVA Paris-Roubaix 2022.jpg"
    }
  },
  "route-alaphilippe": {
    "slug": "Julian_Alaphilippe",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/2018_Tour_of_Britain_stage_3_-_stage_winner_Julian_Alaphilippe_%28cropped%29.JPG/500px-2018_Tour_of_Britain_stage_3_-_stage_winner_Julian_Alaphilippe_%28cropped%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Geof Sheppard",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2018_Tour_of_Britain_stage_3_-_stage_winner_Julian_Alaphilippe_(cropped).JPG",
      "sourceTitle": "2018 Tour of Britain stage 3 - stage winner Julian Alaphilippe (cropped).JPG"
    }
  },
  "route-alpedhuez": {
    "slug": "Alpe_d'Huez",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/Alpes_huez_pano_02_sign.jpg/500px-Alpes_huez_pano_02_sign.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gilles Perréal",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Alpes_huez_pano_02_sign.jpg",
      "sourceTitle": "Alpes huez pano 02 sign.jpg"
    }
  },
  "route-angliru": {
    "slug": "Alto_de_l'Angliru",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/El_angliru_desde_el_Monsacro.jpg/500px-El_angliru_desde_el_Monsacro.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Contributeur Wikimedia Commons",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:El_angliru_desde_el_Monsacro.jpg",
      "sourceTitle": "El angliru desde el Monsacro.jpg"
    }
  },
  "route-anquetil": {
    "slug": "Jacques_Anquetil",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Jacques_Anquetil_1966.jpg/500px-Jacques_Anquetil_1966.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Giorgio Lotti",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jacques_Anquetil_1966.jpg",
      "sourceTitle": "Jacques Anquetil 1966.jpg"
    }
  },
  "route-arenberg": {
    "slug": "Trouée_d'Arenberg",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Trou%C3%A9e_d%27Arenberg.png/500px-Trou%C3%A9e_d%27Arenberg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Fanny Schertzer",
      "licenseShortName": "CC BY 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Trou%C3%A9e_d%27Arenberg.png",
      "sourceTitle": "Trouée d'Arenberg.png"
    }
  },
  "route-bardet": {
    "slug": "Romain_Bardet",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Tour_de_l%27Ain_2014_-_Romain_Bardet.jpg/500px-Tour_de_l%27Ain_2014_-_Romain_Bardet.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Benoît Prieur",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tour_de_l%27Ain_2014_-_Romain_Bardet.jpg",
      "sourceTitle": "Tour de l'Ain 2014 - Romain Bardet.jpg"
    }
  },
  "route-bartali": {
    "slug": "Gino_Bartali",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/b/b6/Gino_Bartali.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Fulgur Photo-Press. Fotograaf onbekend/Unknown photographer. Collectie SPAARNESTAD PHOTO",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Gino_Bartali.jpg",
      "sourceTitle": "Gino Bartali.jpg"
    }
  },
  "route-bobet": {
    "slug": "Louison_Bobet",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/LouisonBobet-StudioHarcourt-1956.png/500px-LouisonBobet-StudioHarcourt-1956.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Studio Harcourt.",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:LouisonBobet-StudioHarcourt-1956.png",
      "sourceTitle": "LouisonBobet-StudioHarcourt-1956.png"
    }
  },
  "route-boonen": {
    "slug": "Tom_Boonen",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Gent_-_Omloop_Het_Nieuwsblad%2C_28_februari_2015_%28E04%29.JPG/500px-Gent_-_Omloop_Het_Nieuwsblad%2C_28_februari_2015_%28E04%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémy-Günther-Heinz Jähnick",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Gent_-_Omloop_Het_Nieuwsblad,_28_februari_2015_(E04).JPG",
      "sourceTitle": "Gent - Omloop Het Nieuwsblad, 28 februari 2015 (E04).JPG"
    }
  },
  "route-cancellara": {
    "slug": "Fabian_Cancellara",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/Cancellara_Fabian_2007.JPG/500px-Cancellara_Fabian_2007.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "The original uploader was Fliedermaus at Luxembourgish Wikipedia .",
      "licenseShortName": "CC BY-SA 1.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/1.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Cancellara_Fabian_2007.JPG",
      "sourceTitle": "Cancellara Fabian 2007.JPG"
    }
  },
  "route-cavendish": {
    "slug": "Mark_Cavendish",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Mark_Cavendish_2016.jpg/500px-Mark_Cavendish_2016.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Cs-wolves",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Mark_Cavendish_2016.jpg",
      "sourceTitle": "Mark Cavendish 2016.jpg"
    }
  },
  "route-contador": {
    "slug": "Alberto_Contador",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/2015_Tour_de_France_team_presentation%2C_Alberto_Contador_%28cropped%29.jpg/500px-2015_Tour_de_France_team_presentation%2C_Alberto_Contador_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "bert de boer",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2015_Tour_de_France_team_presentation,_Alberto_Contador_(cropped).jpg",
      "sourceTitle": "2015 Tour de France team presentation, Alberto Contador (cropped).jpg"
    }
  },
  "route-coppi": {
    "slug": "Fausto_Coppi",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/Fausto_Coppi%2C_Tour_de_France_1952_01_%28cropped%29.jpg/500px-Fausto_Coppi%2C_Tour_de_France_1952_01_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "J.D. Noske (Anefo)",
      "licenseShortName": "CC BY-SA 3.0 nl",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/nl/deed.en",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Fausto_Coppi,_Tour_de_France_1952_01_(cropped).jpg",
      "sourceTitle": "Fausto Coppi, Tour de France 1952 01 (cropped).jpg"
    }
  },
  "route-criterium-urbain": {
    "slug": "Critérium",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/1._Fixedgear_Crit%2C_Meerbusch_%28P1180041-RR%29.jpg/500px-1._Fixedgear_Crit%2C_Meerbusch_%28P1180041-RR%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Matti Blume",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/deed.en",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:1._Fixedgear_Crit,_Meerbusch_(P1180041-RR).jpg",
      "sourceTitle": "1. Fixedgear Crit, Meerbusch (P1180041-RR).jpg"
    }
  },
  "route-dauphine": {
    "slug": "Critérium_du_Dauphiné",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Crit%C3%A9rium_du_Dauphin%C3%A9_2014_-_Etape_6_-Peloton_au_ravitaillement_%281%29.jpg/500px-Crit%C3%A9rium_du_Dauphin%C3%A9_2014_-_Etape_6_-Peloton_au_ravitaillement_%281%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Ludovic Péron",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Crit%C3%A9rium_du_Dauphin%C3%A9_2014_-_Etape_6_-Peloton_au_ravitaillement_(1).jpg",
      "sourceTitle": "Critérium du Dauphiné 2014 - Etape 6 -Peloton au ravitaillement (1).jpg"
    }
  },
  "route-directeur-sportif": {
    "slug": "Directeur_sportif_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/ff/18th_stage_Tour_de_France_2025_%2882%29.jpg/500px-18th_stage_Tour_de_France_2025_%2882%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Tournasol7",
      "licenseShortName": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:18th_stage_Tour_de_France_2025_(82).jpg",
      "sourceTitle": "18th stage Tour de France 2025 (82).jpg"
    }
  },
  "route-equipier-plaine": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Gele_Trui_Schleck_2011_-_frontaal.jpg/500px-Gele_Trui_Schleck_2011_-_frontaal.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nike",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Gele_Trui_Schleck_2011_-_frontaal.jpg",
      "sourceTitle": "Gele Trui Schleck 2011 - frontaal.jpg"
    }
  },
  "route-evenepoel": {
    "slug": "Remco_Evenepoel",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Remco_Evenepoel_WC_2022.jpg/500px-Remco_Evenepoel_WC_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Matheusikidia",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Remco_Evenepoel_WC_2022.jpg",
      "sourceTitle": "Remco Evenepoel WC 2022.jpg"
    }
  },
  "route-frein-patins": {
    "slug": "Frein_sur_jante",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Shimanoexagebrake.jpg/500px-Shimanoexagebrake.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Rado bladteth Rzeznicki",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Shimanoexagebrake.jpg",
      "sourceTitle": "Shimanoexagebrake.jpg"
    }
  },
  "route-froome": {
    "slug": "Chris_Froome",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Chris_Froome_2022.jpg/500px-Chris_Froome_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Chris Froome",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Chris_Froome_2022.jpg",
      "sourceTitle": "Chris Froome 2022.jpg"
    }
  },
  "route-galibier": {
    "slug": "Col_du_Galibier",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Galibier.jpg/500px-Galibier.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Stephan Brunker",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Galibier.jpg",
      "sourceTitle": "Galibier.jpg"
    }
  },
  "route-gilbert": {
    "slug": "Philippe_Gilbert",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Philippe_Gilbert%2C_2020_Paris-Nice.jpg/500px-Philippe_Gilbert%2C_2020_Paris-Nice.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Claudio Martino",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Philippe_Gilbert,_2020_Paris-Nice.jpg",
      "sourceTitle": "Philippe Gilbert, 2020 Paris-Nice.jpg"
    }
  },
  "route-girmay": {
    "slug": "Biniam_Girmay",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Biniam_Girmay%2C_Grand_Prix_Cycliste_de_Qu%C3%A9bec_2022_%28UCI_WorldTour%29_%28cropped%29.jpg/500px-Biniam_Girmay%2C_Grand_Prix_Cycliste_de_Qu%C3%A9bec_2022_%28UCI_WorldTour%29_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Lëa-Kim Châteauneuf",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Biniam_Girmay,_Grand_Prix_Cycliste_de_Qu%C3%A9bec_2022_(UCI_WorldTour)_(cropped).jpg",
      "sourceTitle": "Biniam Girmay, Grand Prix Cycliste de Québec 2022 (UCI WorldTour) (cropped).jpg"
    }
  },
  "route-giro": {
    "slug": "Tour_d'Italie",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Giro_D_Italia_%28157670051%29.jpeg/500px-Giro_D_Italia_%28157670051%29.jpeg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jaap Joris Vens",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Giro_D_Italia_(157670051).jpeg",
      "sourceTitle": "Giro D Italia (157670051).jpeg"
    }
  },
  "route-gpdenain": {
    "slug": "Grand_Prix_de_Denain",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Denain_-_Passage_du_Grand_Prix_de_Denain_le_11_avril_2013_%28257%29.JPG/500px-Denain_-_Passage_du_Grand_Prix_de_Denain_le_11_avril_2013_%28257%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémy-Günther-Heinz Jähnick",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Denain_-_Passage_du_Grand_Prix_de_Denain_le_11_avril_2013_(257).JPG",
      "sourceTitle": "Denain - Passage du Grand Prix de Denain le 11 avril 2013 (257).JPG"
    }
  },
  "route-grace-brown": {
    "slug": "Grace_Brown",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/Ashleigh_MOOLMAN_and_Grace_BROWN.jpg/500px-Ashleigh_MOOLMAN_and_Grace_BROWN.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Shougissime",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Ashleigh_MOOLMAN_and_Grace_BROWN.jpg",
      "sourceTitle": "Ashleigh MOOLMAN and Grace BROWN.jpg"
    }
  },
  "route-hinault": {
    "slug": "Bernard_Hinault",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Profronde_van_Tiel_Bernard_Hinault_wordt_begroet_door_rondemiss_Vanessa%2C_Bestanddeelnr_932-2817.jpg/500px-Profronde_van_Tiel_Bernard_Hinault_wordt_begroet_door_rondemiss_Vanessa%2C_Bestanddeelnr_932-2817.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Marcel Antonisse / Anefo",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Profronde_van_Tiel_Bernard_Hinault_wordt_begroet_door_rondemiss_Vanessa,_Bestanddeelnr_932-2817.jpg",
      "sourceTitle": "Profronde van Tiel Bernard Hinault wordt begroet door rondemiss Vanessa, Bestanddeelnr 932-2817.jpg"
    }
  },
  "route-indurain": {
    "slug": "Miguel_Indurain",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Miguel_INDURAIN.jpg/500px-Miguel_INDURAIN.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Eric HOUDAS",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Miguel_INDURAIN.jpg",
      "sourceTitle": "Miguel INDURAIN.jpg"
    }
  },
  "route-kelly": {
    "slug": "Sean_Kelly_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Sean_Kelly%2C_Tour_de_France_2009.jpg/500px-Sean_Kelly%2C_Tour_de_France_2009.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Pierre Diéterlé ( Jean de Gribaldy.com )",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Sean_Kelly,_Tour_de_France_2009.jpg",
      "sourceTitle": "Sean Kelly, Tour de France 2009.jpg"
    }
  },
  "route-koppenberg-route": {
    "slug": "Vieux_Quaremont",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/e/e6/Vieux_Quaremont_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "John.john.59",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Vieux_Quaremont_1.jpg",
      "sourceTitle": "Vieux Quaremont 1.jpg"
    }
  },
  "route-kuurne": {
    "slug": "Kuurne-Bruxelles-Kuurne",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Kuurne_-_Kuurne-Brussel-Kuurne%2C_1_maart_2015_%28D09%29.JPG/500px-Kuurne_-_Kuurne-Brussel-Kuurne%2C_1_maart_2015_%28D09%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémy-Günther-Heinz Jähnick",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Kuurne_-_Kuurne-Brussel-Kuurne,_1_maart_2015_(D09).JPG",
      "sourceTitle": "Kuurne - Kuurne-Brussel-Kuurne, 1 maart 2015 (D09).JPG"
    }
  },
  "route-lanterne-rouge": {
    "slug": "Lanterne_rouge_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Tour_of_Britain_peloton_leaving_Glasgow_Road%2C_Strathaven_-_geograph.org.uk_-_228170.jpg/500px-Tour_of_Britain_peloton_leaving_Glasgow_Road%2C_Strathaven_-_geograph.org.uk_-_228170.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gordon Brown",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tour_of_Britain_peloton_leaving_Glasgow_Road,_Strathaven_-_geograph.org.uk_-_228170.jpg",
      "sourceTitle": "Tour of Britain peloton leaving Glasgow Road, Strathaven - geograph.org.uk - 228170.jpg"
    }
  },
  "route-laporte": {
    "slug": "Christophe_Laporte",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Christophe_Laporte_Paris-Roubaix_2022.jpg/500px-Christophe_Laporte_Paris-Roubaix_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Clémence LN",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Christophe_Laporte_Paris-Roubaix_2022.jpg",
      "sourceTitle": "Christophe Laporte Paris-Roubaix 2022.jpg"
    }
  },
  "route-lbl": {
    "slug": "Liège-Bastogne-Liège",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Liege-Bastogne-Liege_2012.png/500px-Liege-Bastogne-Liege_2012.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Maxxl2",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Liege-Bastogne-Liege_2012.png",
      "sourceTitle": "Liege-Bastogne-Liege 2012.png"
    }
  },
  "route-lemond": {
    "slug": "Greg_LeMond",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Greg_Lemond_%2815422478828%29_%28cropped%29.jpg/500px-Greg_Lemond_%2815422478828%29_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Brian Townsley",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Greg_Lemond_(15422478828)_(cropped).jpg",
      "sourceTitle": "Greg Lemond (15422478828) (cropped).jpg"
    }
  },
  "route-lombardie": {
    "slug": "Tour_de_Lombardie",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Moreno_Argentin_-_Giro_di_Lombardia_1987.jpg/500px-Moreno_Argentin_-_Giro_di_Lombardia_1987.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Roberto Bettini",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Moreno_Argentin_-_Giro_di_Lombardia_1987.jpg",
      "sourceTitle": "Moreno Argentin - Giro di Lombardia 1987.jpg"
    }
  },
  "route-madouas": {
    "slug": "Valentin_Madouas",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/Valentin_Madouas_%282016-04-09%29_-_Oudenaarde_-_Ronde_van_Vlaanderen_Beloften.jpg/500px-Valentin_Madouas_%282016-04-09%29_-_Oudenaarde_-_Ronde_van_Vlaanderen_Beloften.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémy-Günther-Heinz Jähnick",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Valentin_Madouas_(2016-04-09)_-_Oudenaarde_-_Ronde_van_Vlaanderen_Beloften.jpg",
      "sourceTitle": "Valentin Madouas (2016-04-09) - Oudenaarde - Ronde van Vlaanderen Beloften.jpg"
    }
  },
  "route-martinez": {
    "slug": "Lenny_Martinez",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Victoire_de_Lenny_Martinez_au_CIC-Mont_Ventoux_2023.jpg/500px-Victoire_de_Lenny_Martinez_au_CIC-Mont_Ventoux_2023.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "William Çannarella",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Victoire_de_Lenny_Martinez_au_CIC-Mont_Ventoux_2023.jpg",
      "sourceTitle": "Victoire de Lenny Martinez au CIC-Mont Ventoux 2023.jpg"
    }
  },
  "route-merckx": {
    "slug": "Eddy_Merckx",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/a/aa/Eddy_Merckx_Molteni_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Nationaal Archief",
      "licenseShortName": "No restrictions",
      "licenseUrl": "https://www.flickr.com/commons/usage/",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Eddy_Merckx_Molteni_2.jpg",
      "sourceTitle": "Eddy Merckx Molteni 2.jpg"
    }
  },
  "route-milansanremo": {
    "slug": "Milan-San_Remo",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Milano_Sanremo_1961_-_Punzonatura.jpg/500px-Milano_Sanremo_1961_-_Punzonatura.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Mario Germoglio",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Milano_Sanremo_1961_-_Punzonatura.jpg",
      "sourceTitle": "Milano Sanremo 1961 - Punzonatura.jpg"
    }
  },
  "route-mondiaux": {
    "slug": "Championnats_du_monde_de_cyclisme_sur_route",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/20180929_UCI_Road_World_Championships_Innsbruck_Women_Elite_Road_Race_850_1119.jpg/500px-20180929_UCI_Road_World_Championships_Innsbruck_Women_Elite_Road_Race_850_1119.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Granada",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:20180929_UCI_Road_World_Championships_Innsbruck_Women_Elite_Road_Race_850_1119.jpg",
      "sourceTitle": "20180929 UCI Road World Championships Innsbruck Women Elite Road Race 850 1119.jpg"
    }
  },
  "route-mortirolo": {
    "slug": "Col_du_Mortirolo",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Passo_del_Mortirolo.JPG/500px-Passo_del_Mortirolo.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gabri80",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Passo_del_Mortirolo.JPG",
      "sourceTitle": "Passo del Mortirolo.JPG"
    }
  },
  "route-mur-huy": {
    "slug": "Mur_de_Huy",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/2017_Mur_de_Huy_3.jpg/500px-2017_Mur_de_Huy_3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2017_Mur_de_Huy_3.jpg",
      "sourceTitle": "2017 Mur de Huy 3.jpg"
    }
  },
  "route-musette": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/Tour_de_France%2C_peloton_-_geograph.org.uk_-_4624719.jpg/500px-Tour_de_France%2C_peloton_-_geograph.org.uk_-_4624719.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Stephen Craven",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tour_de_France,_peloton_-_geograph.org.uk_-_4624719.jpg",
      "sourceTitle": "Tour de France, peloton - geograph.org.uk - 4624719.jpg"
    }
  },
  "route-muzic": {
    "slug": "Évita_Muzic",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/44/%C3%89vita_Muzic_-_Pr%C3%A9sentation_TCFIA_2025.jpg/500px-%C3%89vita_Muzic_-_Pr%C3%A9sentation_TCFIA_2025.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Kakoula10",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:%C3%89vita_Muzic_-_Pr%C3%A9sentation_TCFIA_2025.jpg",
      "sourceTitle": "Évita Muzic - Présentation TCFIA 2025.jpg"
    }
  },
  "route-niewiadoma": {
    "slug": "Kasia_Niewiadoma",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Katarzyna_Niewiadoma_-_2025_European_road_championship_podium_-_Guilherand-Granges.jpg/500px-Katarzyna_Niewiadoma_-_2025_European_road_championship_podium_-_Guilherand-Granges.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Kakoula10",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Katarzyna_Niewiadoma_-_2025_European_road_championship_podium_-_Guilherand-Granges.jpg",
      "sourceTitle": "Katarzyna Niewiadoma - 2025 European road championship podium - Guilherand-Granges.jpg"
    }
  },
  "route-pantani": {
    "slug": "Marco_Pantani",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Marco_Pantani.jpg/500px-Marco_Pantani.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Aldo Bolzan Scan Les Meloures at lb.wikipedia",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Marco_Pantani.jpg",
      "sourceTitle": "Marco Pantani.jpg"
    }
  },
  "route-patin-braquet": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Wereldkampioenschappen_wielrennen_te_Ronse_Amateurs_Gerben_Karstens_won_sprint%2C_Bestanddeelnr_915-4172.jpg/500px-Wereldkampioenschappen_wielrennen_te_Ronse_Amateurs_Gerben_Karstens_won_sprint%2C_Bestanddeelnr_915-4172.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Eric Koch for Anefo",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Wereldkampioenschappen_wielrennen_te_Ronse_Amateurs_Gerben_Karstens_won_sprint,_Bestanddeelnr_915-4172.jpg",
      "sourceTitle": "Wereldkampioenschappen wielrennen te Ronse Amateurs Gerben Karstens won sprint, Bestanddeelnr 915-4172.jpg"
    }
  },
  "route-pedersen": {
    "slug": "Mads_Pedersen",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Mads_Pedersen_%282025-05-14%29.jpeg/500px-Mads_Pedersen_%282025-05-14%29.jpeg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Mfran22",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Mads_Pedersen_(2025-05-14).jpeg",
      "sourceTitle": "Mads Pedersen (2025-05-14).jpeg"
    }
  },
  "route-philipsen": {
    "slug": "Jasper_Philipsen",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Jasper_Philipsen_2023_%28cropped%29.jpg/500px-Jasper_Philipsen_2023_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Joost Pauwels",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jasper_Philipsen_2023_(cropped).jpg",
      "sourceTitle": "Jasper Philipsen 2023 (cropped).jpg"
    }
  },
  "route-pinot": {
    "slug": "Thibaut_Pinot",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Tour_du_Doubs_2014_-_Pontarlier_-_Thibaut_Pinot.jpg/500px-Tour_du_Doubs_2014_-_Pontarlier_-_Thibaut_Pinot.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Benoît Prieur",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tour_du_Doubs_2014_-_Pontarlier_-_Thibaut_Pinot.jpg",
      "sourceTitle": "Tour du Doubs 2014 - Pontarlier - Thibaut Pinot.jpg"
    }
  },
  "route-pogacar": {
    "slug": "Tadej_Pogačar",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/2022_Tour_of_Slovenia_%28Stage_3%2C_Tadej_Poga%C4%8Dar_celebrating_victory_on_Celje_Castle_v2%29.jpg/500px-2022_Tour_of_Slovenia_%28Stage_3%2C_Tadej_Poga%C4%8Dar_celebrating_victory_on_Celje_Castle_v2%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Petar Milošević",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2022_Tour_of_Slovenia_(Stage_3,_Tadej_Poga%C4%8Dar_celebrating_victory_on_Celje_Castle_v2).jpg",
      "sourceTitle": "2022 Tour of Slovenia (Stage 3, Tadej Pogačar celebrating victory on Celje Castle v2).jpg"
    }
  },
  "route-poulidor": {
    "slug": "Raymond_Poulidor",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/7/79/Raymond_Poulidor_en_1968.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Panini",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Raymond_Poulidor_en_1968.jpg",
      "sourceTitle": "Raymond Poulidor en 1968.jpg"
    }
  },
  "route-relais-echappee": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/P_is_for_Peloton_-_E_X_P_L_O_R_E_D_-_Flickr_-_Clint_Budd.jpg/500px-P_is_for_Peloton_-_E_X_P_L_O_R_E_D_-_Flickr_-_Clint_Budd.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Clint Budd from About 15 miles North of Swansea, Wales",
      "licenseShortName": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:P_is_for_Peloton_-_E_X_P_L_O_R_E_D_-_Flickr_-_Clint_Budd.jpg",
      "sourceTitle": "P is for Peloton - E X P L O R E D - Flickr - Clint Budd.jpg"
    }
  },
  "route-roglic": {
    "slug": "Primož_Roglič",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Sprejem_v_%C4%8Dast_slovenskim_in_francoskim_kolesarjem_ob_zaklju%C4%8Dku_Dirke_po_Franciji_-_54683392137_%28cropped%29.jpg/500px-Sprejem_v_%C4%8Dast_slovenskim_in_francoskim_kolesarjem_ob_zaklju%C4%8Dku_Dirke_po_Franciji_-_54683392137_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Žan Kolman",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Sprejem_v_%C4%8Dast_slovenskim_in_francoskim_kolesarjem_ob_zaklju%C4%8Dku_Dirke_po_Franciji_-_54683392137_(cropped).jpg",
      "sourceTitle": "Sprejem v čast slovenskim in francoskim kolesarjem ob zaključku Dirke po Franciji - 54683392137 (cropped).jpg"
    }
  },
  "route-ronde": {
    "slug": "Tour_des_Flandres",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Ronde_Van_Vlaanderen_2018_Tour_of_Flanders_2018_%2840281669425%29.jpg/500px-Ronde_Van_Vlaanderen_2018_Tour_of_Flanders_2018_%2840281669425%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "s.yuki",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Ronde_Van_Vlaanderen_2018_Tour_of_Flanders_2018_(40281669425).jpg",
      "sourceTitle": "Ronde Van Vlaanderen 2018 Tour of Flanders 2018 (40281669425).jpg"
    }
  },
  "route-roubaix": {
    "slug": "Paris-Roubaix",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/2012_Paris-Roubaix%2C_Peloton_on_Cobbles_%287057784375%29.jpg/500px-2012_Paris-Roubaix%2C_Peloton_on_Cobbles_%287057784375%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Roxanne King",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2012_Paris-Roubaix,_Peloton_on_Cobbles_(7057784375).jpg",
      "sourceTitle": "2012 Paris-Roubaix, Peloton on Cobbles (7057784375).jpg"
    }
  },
  "route-roue-lenti": {
    "slug": "Vélo_de_contre-la-montre",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/20180924_UCI_Road_World_Championships_Innsbruck_Men_U23_ITT_Callum_Scotson_850_8281.jpg/500px-20180924_UCI_Road_World_Championships_Innsbruck_Men_U23_ITT_Callum_Scotson_850_8281.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Granada",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:20180924_UCI_Road_World_Championships_Innsbruck_Men_U23_ITT_Callum_Scotson_850_8281.jpg",
      "sourceTitle": "20180924 UCI Road World Championships Innsbruck Men U23 ITT Callum Scotson 850 8281.jpg"
    }
  },
  "route-seixas": {
    "slug": "Paul_Seixas",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Paul_Seixas_-_podium_medaille_bronze_-_2025_European_road_championship.jpg/500px-Paul_Seixas_-_podium_medaille_bronze_-_2025_European_road_championship.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Kakoula10",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Paul_Seixas_-_podium_medaille_bronze_-_2025_European_road_championship.jpg",
      "sourceTitle": "Paul Seixas - podium medaille bronze - 2025 European road championship.jpg"
    }
  },
  "route-stelvio": {
    "slug": "Col_du_Stelvio",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Stelvio.jpg/500px-Stelvio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Marco Mayer, Germany",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Stelvio.jpg",
      "sourceTitle": "Stelvio.jpg"
    }
  },
  "route-tdf": {
    "slug": "Tour_de_France",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/Tadej_Pogacar_and_his_team_in_front_of_the_peloton_during_Simacourbe_climb_of_Tour_de_France_2024_stage_13.jpg/500px-Tadej_Pogacar_and_his_team_in_front_of_the_peloton_during_Simacourbe_climb_of_Tour_de_France_2024_stage_13.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hugo LUC",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tadej_Pogacar_and_his_team_in_front_of_the_peloton_during_Simacourbe_climb_of_Tour_de_France_2024_stage_13.jpg",
      "sourceTitle": "Tadej Pogacar and his team in front of the peloton during Simacourbe climb of Tour de France 2024 stage 13.jpg"
    }
  },
  "route-tdf-femmes": {
    "slug": "Tour_de_France_Femmes",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Gele_Trui_Van_De_Vijver_1993_-_frontaal.jpg/500px-Gele_Trui_Van_De_Vijver_1993_-_frontaal.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Castelli Cycling",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Gele_Trui_Van_De_Vijver_1993_-_frontaal.jpg",
      "sourceTitle": "Gele Trui Van De Vijver 1993 - frontaal.jpg"
    }
  },
  "route-tourmalet": {
    "slug": "Col_du_Tourmalet",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Le_col_du_Tourmalet_r%C3%A9am%C3%A9n%C3%A9g%C3%A9_en_2023.jpg/500px-Le_col_du_Tourmalet_r%C3%A9am%C3%A9n%C3%A9g%C3%A9_en_2023.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Serge Ottaviani",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Le_col_du_Tourmalet_r%C3%A9am%C3%A9n%C3%A9g%C3%A9_en_2023.jpg",
      "sourceTitle": "Le col du Tourmalet réaménégé en 2023.jpg"
    }
  },
  "route-train-sprint": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/London_2012_Women_Road_Race.jpg/500px-London_2012_Women_Road_Race.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Peter Trimming from Croydon, England",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:London_2012_Women_Road_Race.jpg",
      "sourceTitle": "London 2012 Women Road Race.jpg"
    }
  },
  "route-trobroleon": {
    "slug": "Tro_Bro_Leon",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Franck_Perque_Tro_Bro_Leon_2002.jpg/500px-Franck_Perque_Tro_Bro_Leon_2002.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "FRANCKPERQUE",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Franck_Perque_Tro_Bro_Leon_2002.jpg",
      "sourceTitle": "Franck Perque Tro Bro Leon 2002.jpg"
    }
  },
  "route-valverde": {
    "slug": "Alejandro_Valverde",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/20180930_UCI_Road_World_Championships_Innsbruck_Men_Elite_Road_Race_Alejandro_Valverde_850_2213.jpg/500px-20180930_UCI_Road_World_Championships_Innsbruck_Men_Elite_Road_Race_Alejandro_Valverde_850_2213.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Granada",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:20180930_UCI_Road_World_Championships_Innsbruck_Men_Elite_Road_Race_Alejandro_Valverde_850_2213.jpg",
      "sourceTitle": "20180930 UCI Road World Championships Innsbruck Men Elite Road Race Alejandro Valverde 850 2213.jpg"
    }
  },
  "route-vanvleuten": {
    "slug": "Annemiek_van_Vleuten",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Annemiek_van_Vleuten_%282023%29.jpg/500px-Annemiek_van_Vleuten_%282023%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Joost Pauwels",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Annemiek_van_Vleuten_(2023).jpg",
      "sourceTitle": "Annemiek van Vleuten (2023).jpg"
    }
  },
  "route-ventoux": {
    "slug": "Mont_Ventoux",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/86/Mont_ventoux_from_mirabel.jpg/500px-Mont_ventoux_from_mirabel.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "User:Midgrid (formerly known as Diniz)",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Mont_ventoux_from_mirabel.jpg",
      "sourceTitle": "Mont ventoux from mirabel.jpg"
    }
  },
  "route-vingegaard": {
    "slug": "Jonas_Vingegaard",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Jonas_Vingegaard_-_Vainqueur_du_Tour_de_France_2023.jpg/500px-Jonas_Vingegaard_-_Vainqueur_du_Tour_de_France_2023.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "René Hourdry",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jonas_Vingegaard_-_Vainqueur_du_Tour_de_France_2023.jpg",
      "sourceTitle": "Jonas Vingegaard - Vainqueur du Tour de France 2023.jpg"
    }
  },
  "route-voiture-balai": {
    "slug": "Voiture-balai",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/VW_Crafter_Voiture_balai_Tour_de_France_2017_Nuits-Saint-Georges_%2838604172584%29.jpg/500px-VW_Crafter_Voiture_balai_Tour_de_France_2017_Nuits-Saint-Georges_%2838604172584%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Guillaume Vachey",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:VW_Crafter_Voiture_balai_Tour_de_France_2017_Nuits-Saint-Georges_(38604172584).jpg",
      "sourceTitle": "VW Crafter Voiture balai Tour de France 2017 Nuits-Saint-Georges (38604172584).jpg"
    }
  },
  "route-vollering": {
    "slug": "Demi_Vollering",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Demi_Vollering_-_2025_European_road_championship_podium_-_Guilherand-Granges.jpg/500px-Demi_Vollering_-_2025_European_road_championship_podium_-_Guilherand-Granges.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Kakoula10",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Demi_Vollering_-_2025_European_road_championship_podium_-_Guilherand-Granges.jpg",
      "sourceTitle": "Demi Vollering - 2025 European road championship podium - Guilherand-Granges.jpg"
    }
  },
  "route-wiebes": {
    "slug": "Lorena_Wiebes",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/2025_ToBW_Stage_4_001_Lorena_Wiebes.JPG/500px-2025_ToBW_Stage_4_001_Lorena_Wiebes.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Geof Sheppard",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2025_ToBW_Stage_4_001_Lorena_Wiebes.JPG",
      "sourceTitle": "2025 ToBW Stage 4 001 Lorena Wiebes.JPG"
    }
  },
  "vtt-absalon": {
    "slug": "Julien_Absalon",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Julien_Absalon_2013_%28cropped%29.JPG/500px-Julien_Absalon_2013_%28cropped%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Christophe95",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Julien_Absalon_2013_(cropped).JPG",
      "sourceTitle": "Julien Absalon 2013 (cropped).JPG"
    }
  },
  "vtt-appuis-relev": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/MTB_berm.jpg/500px-MTB_berm.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Spybeak",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:MTB_berm.jpg",
      "sourceTitle": "MTB berm.jpg"
    }
  },
  "vtt-atherton": {
    "slug": "Rachel_Atherton",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/RachelAhterton.jpg/500px-RachelAhterton.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Courtney Nash",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:RachelAhterton.jpg",
      "sourceTitle": "RachelAhterton.jpg"
    }
  },
  "vtt-beatrice-msa": {
    "slug": "Mont-Sainte-Anne",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/2010_UCI_Mountain_Bike_and_Trials_World_Championships_-_Mont-Sainte-Anne_-_trials.jpg/500px-2010_UCI_Mountain_Bike_and_Trials_World_Championships_-_Mont-Sainte-Anne_-_trials.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nsheard",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2010_UCI_Mountain_Bike_and_Trials_World_Championships_-_Mont-Sainte-Anne_-_trials.jpg",
      "sourceTitle": "2010 UCI Mountain Bike and Trials World Championships - Mont-Sainte-Anne - trials.jpg"
    }
  },
  "vtt-bresset": {
    "slug": "Julie_Bresset",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Julie_Bresset-Super-Besse-2012.jpg/500px-Julie_Bresset-Super-Besse-2012.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Sylenius",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Julie_Bresset-Super-Besse-2012.jpg",
      "sourceTitle": "Julie Bresset-Super-Besse-2012.jpg"
    }
  },
  "vtt-bruni": {
    "slug": "Loïc_Bruni",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/Loic_Bruni_2015_%28cropped%29.jpg/500px-Loic_Bruni_2015_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Downhill911",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Loic_Bruni_2015_(cropped).jpg",
      "sourceTitle": "Loic Bruni 2015 (cropped).jpg"
    }
  },
  "vtt-bunnyhop": {
    "slug": "Bunny_hop",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/DownhillJump.jpg/500px-DownhillJump.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Oyvind1979 at English Wikipedia",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:DownhillJump.jpg",
      "sourceTitle": "DownhillJump.jpg"
    }
  },
  "vtt-cape-epic": {
    "slug": "Cape_Epic",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Cape_epic_stage_5.jpg/500px-Cape_epic_stage_5.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "jason sager",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Cape_epic_stage_5.jpg",
      "sourceTitle": "Cape epic stage 5.jpg"
    }
  },
  "vtt-champery-wall": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/2011_UCI_Mountain_Bike_and_Trials_World_Championships_-_19.JPG/500px-2011_UCI_Mountain_Bike_and_Trials_World_Championships_-_19.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Shev123",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2011_UCI_Mountain_Bike_and_Trials_World_Championships_-_19.JPG",
      "sourceTitle": "2011 UCI Mountain Bike and Trials World Championships - 19.JPG"
    }
  },
  "vtt-chausson": {
    "slug": "Anne-Caroline_Chausson",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/4/46/Anne_Caroline_Chausson.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Robin Chausson",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Anne_Caroline_Chausson.png",
      "sourceTitle": "Anne Caroline Chausson.png"
    }
  },
  "vtt-check-ligne": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Downhill_Mountain_Bike_Course%2C_Holywell_Dene_-_geograph.org.uk_-_6435744.jpg/500px-Downhill_Mountain_Bike_Course%2C_Holywell_Dene_-_geograph.org.uk_-_6435744.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Geoff Holland",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Downhill_Mountain_Bike_Course,_Holywell_Dene_-_geograph.org.uk_-_6435744.jpg",
      "sourceTitle": "Downhill Mountain Bike Course, Holywell Dene - geograph.org.uk - 6435744.jpg"
    }
  },
  "vtt-clementz": {
    "slug": "Jérôme_Clementz",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Portrait_Jerome_Clementz.jpg/500px-Portrait_Jerome_Clementz.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémie Reuiller",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Portrait_Jerome_Clementz.jpg",
      "sourceTitle": "Portrait Jerome Clementz.jpg"
    }
  },
  "vtt-crankworx": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Whistler_Mountain_Bike_Park_slopestyle_course.jpg/500px-Whistler_Mountain_Bike_Park_slopestyle_course.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Roy and Susan",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Whistler_Mountain_Bike_Park_slopestyle_course.jpg",
      "sourceTitle": "Whistler Mountain Bike Park slopestyle course.jpg"
    }
  },
  "vtt-dahle": {
    "slug": "Gunn-Rita_Dahle_Flesjå",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Gunn-Rita_Dahle_2016.jpg/500px-Gunn-Rita_Dahle_2016.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "youkeys",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Gunn-Rita_Dahle_2016.jpg",
      "sourceTitle": "Gunn-Rita Dahle 2016.jpg"
    }
  },
  "vtt-daudet": {
    "slug": "Joris_Daudet",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Joris_Daudet_-_Rio_2016.jpg/500px-Joris_Daudet_-_Rio_2016.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Agência Brasil Fotografias",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Joris_Daudet_-_Rio_2016.jpg",
      "sourceTitle": "Joris Daudet - Rio 2016.jpg"
    }
  },
  "vtt-dh-mullet": {
    "slug": "",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/7/71/%E9%AB%98%E5%B1%B1_%E8%BC%9D_%28%E3%81%9F%E3%81%8B%E3%82%84%E3%81%BE_%E3%81%B2%E3%81%8B%E3%82%8B%29--MOWNTAIN_BIKE_DOWNHILL_RIDER----1998%E5%B9%B47%E6%9C%8815%E6%97%A5%E8%AA%95%E7%94%9F----%E5%9F%BC%E7%8E%89%E3%81%AEPro_Bicycle_Shop_AST_%E3%81%AE%E4%B8%89%E7%94%B7%E3%81%A8%E3%81%97%E3%81%A6%E7%94%9F%E3%81%BE%E3%82%8C%E3%82%8B%E3%80%82----%E6%9C%80%E5%88%9D%E3%81%AE%E9%A0%83%E3%81%AF%E3%80%81BMX%E3%83%AC%E3%83%BC%E3%82%B9%28JOSF%29%E3%82%92%E4%B8%AD%E5%BF%83%E3%81%AB%E3%83%AC%E3%83%BC%E3%82%B9_2013-06-07_23-16.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "User:Bullnocoes",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:%E9%AB%98%E5%B1%B1_%E8%BC%9D_(%E3%81%9F%E3%81%8B%E3%82%84%E3%81%BE_%E3%81%B2%E3%81%8B%E3%82%8B)--MOWNTAIN_BIKE_DOWNHILL_RIDER----1998%E5%B9%B47%E6%9C%8815%E6%97%A5%E8%AA%95%E7%94%9F----%E5%9F%BC%E7%8E%89%E3%81%AEPro_Bicycle_Shop_AST_%E3%81%AE%E4%B8%89%E7%94%B7%E3%81%A8%E3%81%97%E3%81%A6%E7%94%9F%E3%81%BE%E3%82%8C%E3%82%8B%E3%80%82----%E6%9C%80%E5%88%9D%E3%81%AE%E9%A0%83%E3%81%AF%E3%80%81BMX%E3%83%AC%E3%83%BC%E3%82%B9(JOSF)%E3%82%92%E4%B8%AD%E5%BF%83%E3%81%AB%E3%83%AC%E3%83%BC%E3%82%B9_2013-06-07_23-16.jpg",
      "sourceTitle": "高山 輝 (たかやま ひかる)--MOWNTAIN BIKE DOWNHILL RIDER----1998年7月15日誕生----埼玉のPro Bicycle Shop AST の三男として生まれる。----最初の頃は、BMXレース(JOS"
    }
  },
  "vtt-dropper": {
    "slug": "Tige_de_selle",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/TigedeSelle.JPG/500px-TigedeSelle.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Raminagrobis",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:TigedeSelle.JPG",
      "sourceTitle": "TigedeSelle.JPG"
    }
  },
  "vtt-fort-william": {
    "slug": "Fort_William_(Écosse)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/Fort_William_World_Cup_DH_2009-_Sunday_Practice._Sabrina_Jonnier.jpg/500px-Fort_William_World_Cup_DH_2009-_Sunday_Practice._Sabrina_Jonnier.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Douglas Cook",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Fort_William_World_Cup_DH_2009-_Sunday_Practice._Sabrina_Jonnier.jpg",
      "sourceTitle": "Fort William World Cup DH 2009- Sunday Practice. Sabrina Jonnier.jpg"
    }
  },
  "vtt-freins-4p": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Magura_Julie_disk_brake_rotor_160_mm.jpg/500px-Magura_Julie_disk_brake_rotor_160_mm.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Petar Milošević",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Magura_Julie_disk_brake_rotor_160_mm.jpg",
      "sourceTitle": "Magura Julie disk brake rotor 160 mm.jpg"
    }
  },
  "vtt-goldstone": {
    "slug": "Jackson_Goldstone",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/Jackson_goldstone_snowshoe_2022.jpg/500px-Jackson_goldstone_snowshoe_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Stephen LaBonte",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jackson_goldstone_snowshoe_2022.jpg",
      "sourceTitle": "Jackson goldstone snowshoe 2022.jpg"
    }
  },
  "vtt-hart": {
    "slug": "Danny_Hart",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Danny_Hart_cyclist.jpg/500px-Danny_Hart_cyclist.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Todd Hellinga",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Danny_Hart_cyclist.jpg",
      "sourceTitle": "Danny Hart cyclist.jpg"
    }
  },
  "vtt-hatherly": {
    "slug": "Alan_Hatherly",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Alan_Hatherly_%28RSA%29_2024.jpg/500px-Alan_Hatherly_%28RSA%29_2024.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Stephen LaBonte",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Alan_Hatherly_(RSA)_2024.jpg",
      "sourceTitle": "Alan Hatherly (RSA) 2024.jpg"
    }
  },
  "vtt-hill": {
    "slug": "Sam_Hill_(cycliste)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Sam_Hill_Sea_Otter_2009_Dual_Slalom_Winner.JPG/500px-Sam_Hill_Sea_Otter_2009_Dual_Slalom_Winner.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Thomas.fanghaenel",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Sam_Hill_Sea_Otter_2009_Dual_Slalom_Winner.JPG",
      "sourceTitle": "Sam Hill Sea Otter 2009 Dual Slalom Winner.JPG"
    }
  },
  "vtt-holl": {
    "slug": "Valentina_Höll",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Valentina_H%C3%B6ll_at_the_start_of_UCI_MTB_world_cup_in_Loudenvielle_2025.jpg/500px-Valentina_H%C3%B6ll_at_the_start_of_UCI_MTB_world_cup_in_Loudenvielle_2025.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hugo LUC",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Valentina_H%C3%B6ll_at_the_start_of_UCI_MTB_world_cup_in_Loudenvielle_2025.jpg",
      "sourceTitle": "Valentina Höll at the start of UCI MTB world cup in Loudenvielle 2025.jpg"
    }
  },
  "vtt-jeune-enduro": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Carson-Galbreath.png/500px-Carson-Galbreath.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Cgalbreath",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Carson-Galbreath.png",
      "sourceTitle": "Carson-Galbreath.png"
    }
  },
  "vtt-kit-co2": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Puncture-repaire-kit.jpg/500px-Puncture-repaire-kit.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Björn Appel",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Puncture-repaire-kit.jpg",
      "sourceTitle": "Puncture-repaire-kit.jpg"
    }
  },
  "vtt-koretzky": {
    "slug": "Victor_Koretzky",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Victor_Koretzky_-_Team_KMC_EKOI_ORBEA_-_2019.png/500px-Victor_Koretzky_-_Team_KMC_EKOI_ORBEA_-_2019.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "ClémentKoretzky",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Victor_Koretzky_-_Team_KMC_EKOI_ORBEA_-_2019.png",
      "sourceTitle": "Victor Koretzky - Team KMC EKOI ORBEA - 2019.png"
    }
  },
  "vtt-lecomte": {
    "slug": "Loana_Lecomte",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Loana_Lecomte_%28FRA%29_2019.jpg/500px-Loana_Lecomte_%28FRA%29_2019.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Sumpu",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Loana_Lecomte_(FRA)_2019.jpg",
      "sourceTitle": "Loana Lecomte (FRA) 2019.jpg"
    }
  },
  "vtt-macaskill": {
    "slug": "Danny_MacAskill",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Danny_MacAskill.jpg/500px-Danny_MacAskill.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Steve Hodgson",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Danny_MacAskill.jpg",
      "sourceTitle": "Danny MacAskill.jpg"
    }
  },
  "vtt-marotte": {
    "slug": "Maxime_Marotte",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/2016_MTB_World_Cup_Albstadt_M._Marotte.jpg/500px-2016_MTB_World_Cup_Albstadt_M._Marotte.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "youkeys",
      "licenseShortName": "CC BY 2.5",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.5",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2016_MTB_World_Cup_Albstadt_M._Marotte.jpg",
      "sourceTitle": "2016 MTB World Cup Albstadt M. Marotte.jpg"
    }
  },
  "vtt-minnaar": {
    "slug": "Greg_Minnaar",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/e/e9/Greg_Minnaar_2012_%28RSA%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Downhill911",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Greg_Minnaar_2012_(RSA).jpg",
      "sourceTitle": "Greg Minnaar 2012 (RSA).jpg"
    }
  },
  "vtt-neff": {
    "slug": "Jolanda_Neff",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/12._Internationale_Sportnacht_Davos_2014_%2815244762159%29_%28cropped%29.jpg/500px-12._Internationale_Sportnacht_Davos_2014_%2815244762159%29_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "12. Internationale Sportnacht Davos from Davos, Schweiz",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:12._Internationale_Sportnacht_Davos_2014_(15244762159)_(cropped).jpg",
      "sourceTitle": "12. Internationale Sportnacht Davos 2014 (15244762159) (cropped).jpg"
    }
  },
  "vtt-nicole": {
    "slug": "Myriam_Nicole",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Myriam_Nicole_at_the_start_of_UCI_MTB_world_cup_in_Loudenvielle_2025.jpg/500px-Myriam_Nicole_at_the_start_of_UCI_MTB_world_cup_in_Loudenvielle_2025.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hugo LUC",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Myriam_Nicole_at_the_start_of_UCI_MTB_world_cup_in_Loudenvielle_2025.jpg",
      "sourceTitle": "Myriam Nicole at the start of UCI MTB world cup in Loudenvielle 2025.jpg"
    }
  },
  "vtt-nove-mesto": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Brandl_Roth_UCI_Mountain_Bike_World_Cup_Nove_Mesto.jpg/500px-Brandl_Roth_UCI_Mountain_Bike_World_Cup_Nove_Mesto.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Lexware Mountainbike Team",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Brandl_Roth_UCI_Mountain_Bike_World_Cup_Nove_Mesto.jpg",
      "sourceTitle": "Brandl Roth UCI Mountain Bike World Cup Nove Mesto.jpg"
    }
  },
  "vtt-pajon": {
    "slug": "Mariana_Pajón",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/MarianaPajon.jpg/500px-MarianaPajon.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Seleccionantioquia",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:MarianaPajon.jpg",
      "sourceTitle": "MarianaPajon.jpg"
    }
  },
  "vtt-pedales-plates": {
    "slug": "Pédale_de_bicyclette",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/13-01-06-fahrradkram-05.jpg/500px-13-01-06-fahrradkram-05.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Ralf Roletschek ( talk ) - Infos über Fahrräder auf fahrradmonteur.de",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:13-01-06-fahrradkram-05.jpg",
      "sourceTitle": "13-01-06-fahrradkram-05.jpg"
    }
  },
  "vtt-pierron": {
    "slug": "Amaury_Pierron",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/Amaury_Pierron_2022_MSA.jpg/500px-Amaury_Pierron_2022_MSA.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Stephen LaBonte",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Amaury_Pierron_2022_MSA.jpg",
      "sourceTitle": "Amaury Pierron 2022 MSA.jpg"
    }
  },
  "vtt-pression-fourche": {
    "slug": "Fourche_(vélo)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Wittson_titanium_cyclocross_disc_bicycle_fork_02.jpg/500px-Wittson_titanium_cyclocross_disc_bicycle_fork_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gintaraszukauskas",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Wittson_titanium_cyclocross_disc_bicycle_fork_02.jpg",
      "sourceTitle": "Wittson titanium cyclocross disc bicycle fork 02.jpg"
    }
  },
  "vtt-pump-track": {
    "slug": "Pump_track",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/HeatleyParkTownsville_1.jpg/500px-HeatleyParkTownsville_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "ModularPumptrack",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:HeatleyParkTownsville_1.jpg",
      "sourceTitle": "HeatleyParkTownsville 1.jpg"
    }
  },
  "vtt-richards": {
    "slug": "Evie_Richards",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/2/23/Evie_Richards_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "RAY",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Evie_Richards_(cropped).jpg",
      "sourceTitle": "Evie Richards (cropped).jpg"
    }
  },
  "vtt-roc-azur": {
    "slug": "Roc_d'Azur",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/0/0e/RocDAzur.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Contributeur Wikimedia Commons",
      "licenseShortName": "CC BY-SA 2.5",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.5",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:RocDAzur.JPG",
      "sourceTitle": "RocDAzur.JPG"
    }
  },
  "vtt-sarrou": {
    "slug": "Jordan_Sarrou",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Jordan_Sarrou_%28FRA%29_2016.jpg/500px-Jordan_Sarrou_%28FRA%29_2016.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "youkeys",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jordan_Sarrou_(FRA)_2016.jpg",
      "sourceTitle": "Jordan Sarrou (FRA) 2016.jpg"
    }
  },
  "vtt-schurter": {
    "slug": "Nino_Schurter",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/12._Internationale_Sportnacht_Davos_2014_%2815244829340%29.jpg/500px-12._Internationale_Sportnacht_Davos_2014_%2815244829340%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "12. Internationale Sportnacht Davos from Davos, Schweiz",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:12._Internationale_Sportnacht_Davos_2014_(15244829340).jpg",
      "sourceTitle": "12. Internationale Sportnacht Davos 2014 (15244829340).jpg"
    }
  },
  "vtt-scrub-whip": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/A_downhill_mountain_biker_from_Arak.jpg/500px-A_downhill_mountain_biker_from_Arak.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Omid Jafarnezhad",
      "licenseShortName": "CC BY 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:A_downhill_mountain_biker_from_Arak.jpg",
      "sourceTitle": "A downhill mountain biker from Arak.jpg"
    }
  },
  "vtt-semi-rigide": {
    "slug": "Vélo_tout-terrain",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/The_Meridia_Mountain_Bike_Cross_Country_Race_-_geograph.org.uk_-_796196.jpg/500px-The_Meridia_Mountain_Bike_Cross_Country_Race_-_geograph.org.uk_-_796196.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Iain Lees",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:The_Meridia_Mountain_Bike_Cross_Country_Race_-_geograph.org.uk_-_796196.jpg",
      "sourceTitle": "The Meridia Mountain Bike Cross Country Race - geograph.org.uk - 796196.jpg"
    }
  },
  "vtt-singletrack-pin": {
    "slug": "",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/5/54/Singletrack%2C_Leanachan_Forest_-_geograph.org.uk_-_1502041.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Dorothy Carse",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Singletrack,_Leanachan_Forest_-_geograph.org.uk_-_1502041.jpg",
      "sourceTitle": "Singletrack, Leanachan Forest - geograph.org.uk - 1502041.jpg"
    }
  },
  "vtt-tomac": {
    "slug": "John_Tomac",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/John_Tomac.JPG/500px-John_Tomac.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Keanu @ no:wp",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:John_Tomac.JPG",
      "sourceTitle": "John Tomac.JPG"
    }
  },
  "vtt-transmission-t-type": {
    "slug": "Dérailleur",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/SRAM_Rival_front_derailleur_-_sideview.jpg/500px-SRAM_Rival_front_derailleur_-_sideview.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Fanny Schertzer",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:SRAM_Rival_front_derailleur_-_sideview.jpg",
      "sourceTitle": "SRAM Rival front derailleur - sideview.jpg"
    }
  },
  "vtt-vergier": {
    "slug": "Loris_Vergier",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Loris_VERGIER.jpg/500px-Loris_VERGIER.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Drikoulinos",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Loris_VERGIER.jpg",
      "sourceTitle": "Loris VERGIER.jpg"
    }
  },
  "vtt-vouilloz": {
    "slug": "Nicolas_Vouilloz",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Vouillozmc2011head2.JPG/500px-Vouillozmc2011head2.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Aurélien Vialatte",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Vouillozmc2011head2.JPG",
      "sourceTitle": "Vouillozmc2011head2.JPG"
    }
  }
};


// === FILE: src/data/cardsDatabase.ts ===
const MAX_DECK_ENERGY = 16;
const ECONOMY_CONFIG = {
  STARTER_WATTS: 180,
  STARTER_BIDONS: 2,
  MAX_PASSIVE_BIDONS: 3,
  BIDON_COOLDOWN_SEC: 1800, // 30 minutes par bidon gratuit
  FORGE_CARD_COST: 250,
  EXPRESS_QUIZ_REWARD_CORRECT: 20,
  EXPRESS_QUIZ_STREAK_BONUS: 10, // Bonus dès 3 bonnes réponses de suite (+30 W)
  EXPRESS_QUIZ_REWARD_WRONG: 0,
  EXPRESS_QUIZ_COOLDOWN_MS: 2000,
  DUEL_QUIZ_REWARD_SAFE: 10,
  DUEL_QUIZ_REWARD_ATTACK: 25,
  DUEL_QUIZ_REWARD_WRONG: 0
}         ;
const PROMO_CODES_CATALOG                                          = {
  PELOTON2026: {
    code: 'PELOTON2026',
    label: 'Pack Bienvenue Peloton',
    rewardWatts: 75,
    rewardBidons: 1
  },
  ECHAPPEE: {
    code: 'ECHAPPEE',
    label: 'Prime d’Échappée',
    rewardWatts: 60,
    rewardBidons: 0
  }
};
const RARITY_ORDER           = [
  'Commune',
  'Peu commune',
  'Rare',
  'Épique',
  'Légendaire'
];

// Calibrage strict : espérance de revente = 33,3 % du Booster Peloton (150 W) et 27,8 % des Spécialisés (180 W)
const RECYCLE_WATTS_BY_RARITY                              = {
  'Commune': 3,
  'Peu commune': 6,
  'Rare': 15,
  'Épique': 38,
  'Légendaire': 95
};
const STAR_UPGRADE_CONFIG         
                     
                
                           
                    
                    
   = [
  { targetStar: 1, label: '★1 Argent', duplicatesNeeded: 1, statBonus: 2, wattsCost: 30 },
  { targetStar: 2, label: '★2 Or', duplicatesNeeded: 2, statBonus: 5, wattsCost: 65 },
  { targetStar: 3, label: '★3 Prisme Arc-en-Ciel', duplicatesNeeded: 3, statBonus: 9, wattsCost: 120 }
];
const PITY_EPIC_THRESHOLD = 10;
const PITY_LEGENDARY_THRESHOLD = 30;
const GOD_PACK_CHANCE = 0.008; // 0.8% chance (1 sur 125 boosters)
const SLOT5_DROP_WEIGHTS                                       = [
  { rarity: 'Rare', weight: 84.0 },
  { rarity: 'Épique', weight: 13.5 },
  { rarity: 'Légendaire', weight: 2.5 }
];
const RARITY_CONFIG   
                    
                  
                    
                        
                      
                      
                       
                        
    
  = {
  'Commune': {
    label: 'Commune',
    badgeBg: 'bg-slate-600 text-slate-100',
    borderClass: 'border-slate-500/70',
    textColor: 'text-slate-300',
    glowColor: 'rgba(148, 163, 184, 0.22)',
    dropWeight: 62.0,
    defaultCost: 1
  },
  'Peu commune': {
    label: 'Peu commune',
    badgeBg: 'bg-emerald-600 text-emerald-50',
    borderClass: 'border-emerald-400/80',
    textColor: 'text-emerald-400',
    glowColor: 'rgba(16, 185, 129, 0.34)',
    dropWeight: 24.0,
    defaultCost: 2
  },
  'Rare': {
    label: 'Rare',
    badgeBg: 'bg-sky-600 text-sky-50',
    borderClass: 'border-sky-400/90',
    textColor: 'text-sky-400',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    dropWeight: 9.5,
    defaultCost: 3
  },
  'Épique': {
    label: 'Épique',
    badgeBg: 'bg-amber-400 text-slate-950 font-black',
    borderClass: 'border-amber-400',
    textColor: 'text-amber-400',
    glowColor: 'rgba(251, 191, 36, 0.65)',
    dropWeight: 3.5,
    defaultCost: 4
  },
  'Légendaire': {
    label: 'Légendaire • Arc-en-Ciel',
    badgeBg: 'uci-rainbow-badge text-slate-950 font-black',
    borderClass: 'uci-rainbow-border',
    textColor: 'text-yellow-300',
    glowColor: 'rgba(244, 63, 94, 0.8)',
    dropWeight: 1.0,
    defaultCost: 5
  }
};
const DISCIPLINE_CONFIG   
                        
                  
                       
                  
                   
                       
                      
                        
    
  = {
  'Route': {
    label: 'Cyclisme sur Route',
    shortLabel: 'Route',
    color: 'text-amber-400',
    bgSoft: 'bg-amber-500/15',
    borderSoft: 'border-amber-500/40',
    accentHex: '#f59e0b',
    description: 'Grands Tours, Monuments pavés, cols hors catégorie, bordures et trains de sprint'
  },
  'VTT': {
    label: 'VTT (XC, DH, Enduro & Freeride)',
    shortLabel: 'VTT',
    color: 'text-emerald-400',
    bgSoft: 'bg-emerald-500/15',
    borderSoft: 'border-emerald-500/40',
    accentHex: '#10b981',
    description: 'Cross-country XCO, descente DH, enduro, bike parks, rock gardens et sauts'
  },
  'Piste': {
    label: 'Cyclisme sur Piste',
    shortLabel: 'Piste',
    color: 'text-cyan-400',
    bgSoft: 'bg-cyan-500/15',
    borderSoft: 'border-cyan-500/40',
    accentHex: '#06b6d4',
    description: 'Anneaux de bois, keirin, vitesse, omnium, américaine, surplace et record de l’heure'
  },
  'Cyclo-cross': {
    label: 'Cyclo-cross',
    shortLabel: 'Cyclo-cross',
    color: 'text-orange-400',
    bgSoft: 'bg-orange-500/15',
    borderSoft: 'border-orange-500/40',
    accentHex: '#f97316',
    description: 'Labours hivernaux, fosses de sable, dévers boueux, saut de planches et portage'
  },
  'Polyvalent': {
    label: 'Polyvalent Multi-Disciplines',
    shortLabel: 'Polyvalent',
    color: 'text-fuchsia-400',
    bgSoft: 'bg-fuchsia-500/15',
    borderSoft: 'border-fuchsia-500/40',
    accentHex: '#d946ef',
    description: 'Profils hybrides et techniques universelles brillant sur plusieurs terrains'
  }
};

const CUSTOM_TCG_SEEDS                   = [
  // ============================================================================
  // 1. POLYVALENT (15 Cartes : Phénomènes Multi-Disciplines & Bases Universelles)
  // ============================================================================
  {
    id: 'poly-mvdp',
    title: 'Mathieu van der Poel',
    subtitle: 'Prodige Néerlandais • Route, CX & VTT',
    roleTag: 'Phénomène Multi',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'Cyclo-cross', 'VTT'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 97,
    technique: 97,
    endurance: 89,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 16,
    effectDescription: '+16 pts immédiats sur terrain Route, VTT ou Cyclo-cross.',
    summary: 'Phénomène d’explosivité capable de dynamiter le Tour des Flandres et Paris-Roubaix, de survoler sept Championnats du monde de cyclo-cross et de briller en Coupe du monde de VTT XCO.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: '2023',
    keyFact: 'Septuple champion du monde de cyclo-cross et champion du monde sur route à Glasgow en 2023.',
    specialTrait: 'Attaque Foudroyante (1 400 Watts en Bosse)',
    wikiSlug: 'Mathieu_van_der_Poel'
  },
  {
    id: 'poly-wva',
    title: 'Wout van Aert',
    subtitle: 'Le Couteau Suisse Belge • Route & CX',
    roleTag: 'All-Rounder Elite',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 94,
    technique: 93,
    endurance: 91,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 18,
    effectDescription: '+18 pts s’il est engagé dans les Étapes 4 ou 5.',
    summary: 'Triple champion du monde de cyclo-cross devenu le coureur le plus complet du peloton : vainqueur au Mont Ventoux, en contre-la-montre et au sprint sur les Champs-Élysées.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '2021',
    keyFact: 'A remporté en 2021 sur le même Tour de France l’étape du Ventoux, un chrono et les Champs-Élysées.',
    specialTrait: 'Moteur Diesel & Sprint Royal',
    wikiSlug: 'Wout_van_Aert'
  },
  {
    id: 'poly-vos',
    title: 'Marianne Vos',
    subtitle: 'La Cannibale • 13 Titres Mondiaux (Route, Piste, CX)',
    roleTag: 'Reine Polyvalente',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'Piste', 'Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 94,
    technique: 97,
    endurance: 95,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_PER_DISCIPLINE',
    effectValue: 6,
    effectDescription: '+6 pts par discipline distincte déjà jouée dans le match.',
    summary: 'Légende vivante du cyclisme féminin avec 13 maillots arc-en-ciel élites répartis entre la route, la piste (course aux points et scratch) et le cyclo-cross, plus deux titres olympiques.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: '2012',
    keyFact: 'Cumule 8 titres mondiaux en cyclo-cross, 3 sur route et 2 sur piste.',
    specialTrait: 'Science de la Course Absolue',
    wikiSlug: 'Marianne_Vos'
  },
  {
    id: 'poly-pfp',
    title: 'Pauline Ferrand-Prévot',
    subtitle: 'Quadruple Couronne Arc-en-Ciel • VTT, Route & CX',
    roleTag: 'Quadruple Couronne',
    discipline: 'Polyvalent',
    linkedDisciplines: ['VTT', 'Route', 'Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 93,
    technique: 96,
    endurance: 95,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 12,
    effectDescription: 'Immunisée aux malus de terrain & +12 pts bonus.',
    summary: 'Seule athlète de l’histoire sacrée simultanément championne du monde sur route, en cyclo-cross et en VTT XCO à 23 ans, avant de décrocher l’or olympique à Paris 2024 et Paris-Roubaix.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '2024',
    keyFact: 'Détentrice simultanée des titres mondiaux Route, Cyclo-cross et VTT en 2015, puis championne olympique VTT en 2024.',
    specialTrait: 'Maîtrise Multi-Surfaces Hors Norme',
    wikiSlug: 'Pauline_Ferrand-Prévot'
  },
  {
    id: 'poly-pidcock',
    title: 'Tom Pidcock',
    subtitle: 'Funambule Britannique • Double Or Olympique VTT',
    roleTag: 'Acrobate Multi',
    discipline: 'Polyvalent',
    linkedDisciplines: ['VTT', 'Route', 'Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 87,
    technique: 95,
    endurance: 86,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 11,
    effectDescription: 'Dépose une attaque technique : -11 pts au score adverse !',
    summary: 'Double champion olympique de VTT cross-country (2020 et 2024), champion du monde de cyclo-cross et vainqueur à l’Alpe d’Huez après une descente vertigineuse du Galibier.',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: '2022',
    keyFact: 'Vainqueur à l’Alpe d’Huez sur le Tour de France, des Strade Bianche et double champion olympique XCO.',
    specialTrait: 'Trajectoire Supersonique en Descente',
    wikiSlug: 'Tom_Pidcock'
  },
  {
    id: 'poly-sagan',
    title: 'Peter Sagan',
    subtitle: 'Tourminator • 3x Champion du Monde & 7 Maillots Verts',
    roleTag: 'Puncheur-Sprinteur',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'VTT', 'Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 94,
    technique: 94,
    endurance: 82,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 15,
    effectDescription: '+15 pts en Étape 4 ou 5 grâce à son kick en bosse.',
    summary: 'Issu du VTT et du cyclo-cross, le Slovaque a révolutionné le cyclisme sur route avec trois titres mondiaux consécutifs (2015-2017) et 7 maillots verts du Tour de France.',
    nationality: 'Slovaquie',
    countryCode: 'SVK',
    keyYear: '2017',
    keyFact: 'Seul coureur de l’histoire sacré trois fois consécutivement champion du monde sur route (2015-2017).',
    specialTrait: 'Wheelie Sans les Mains & Sprint en Bosse',
    wikiSlug: 'Peter_Sagan'
  },
  {
    id: 'poly-kopecky',
    title: 'Lotte Kopecky',
    subtitle: 'Impératrice Belge • Route & Piste',
    roleTag: 'Flandrienne-Pistarde',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'Piste'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 92,
    technique: 90,
    endurance: 86,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 13,
    effectDescription: '+13 pts si la carte précédente était d’une autre discipline.',
    summary: 'Double championne du monde sur route et sextuple championne du monde sur piste (américaine, élimination, course aux points), dominatrice sur les pavés de Paris-Roubaix et des Flandres.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '2024',
    keyFact: 'Allie la vélocité de l’anneau de piste à la puissance brute sur les secteurs pavés du Nord.',
    specialTrait: 'Vélocité d’Anneau sur les Pavés',
    wikiSlug: 'Lotte_Kopecky'
  },
  {
    id: 'poly-longo',
    title: 'Jeannie Longo',
    subtitle: 'Icône Française • 13 Titres Mondiaux Route & Piste',
    roleTag: 'Icône Multi',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'Piste', 'VTT'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 88,
    technique: 89,
    endurance: 95,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte Route, Piste ou VTT déjà engagée.',
    summary: 'Championne olympique sur route à Atlanta 1996, 13 fois championne du monde (9 sur route, 4 sur piste), médaillée mondiale en VTT et détentrice de 38 records du monde.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1996',
    keyFact: 'A remporté 59 titres de championne de France toutes disciplines confondues entre 1979 et 2011.',
    specialTrait: 'Longévité Hors du Commun',
    wikiSlug: 'Jeannie_Longo'
  },
  {
    id: 'poly-pieterse',
    title: 'Puck Pieterse',
    subtitle: 'Comète Néerlandaise • VTT, CX & Route',
    roleTag: 'Prodige Multi',
    discipline: 'Polyvalent',
    linkedDisciplines: ['VTT', 'Cyclo-cross', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 91,
    endurance: 84,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts si jouée lors des Étapes 1 ou 2.',
    summary: 'Championne du monde élite de VTT XCO 2024, meilleure jeune du Tour de France Femmes et figure majeure des Coupes du monde de cyclo-cross.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: '2024',
    keyFact: 'A remporté en 2024 une étape du Tour de France Femmes et le titre mondial élite de VTT XCO en Andorre.',
    specialTrait: 'Départ Canon en Terre & Bitume',
    wikiSlug: 'Puck_Pieterse'
  },
  {
    id: 'poly-mohoric',
    title: 'Matej Mohorič',
    subtitle: 'L’Inventeur Fou • Champion du Monde Gravel & Milan-San Remo',
    roleTag: 'Descendeur-Gravel',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'VTT'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 84,
    technique: 93,
    endurance: 85,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 10,
    effectDescription: 'Plonge dans la descente : -10 pts à l’adversaire.',
    summary: 'Champion du monde de Gravel 2023 et vainqueur de Milan-San Remo 2022 grâce à une tige de selle télescopique issue du VTT installée sur son vélo de route pour la descente du Poggio.',
    nationality: 'Slovénie',
    countryCode: 'SLO',
    keyYear: '2022',
    keyFact: 'A surpris tout le peloton en abaissant sa selle en pleine descente du Poggio à plus de 100 km/h.',
    specialTrait: 'Tige Télescopique sur Route',
    wikiSlug: 'Matej_Mohorič'
  },
  {
    id: 'poly-zone-lactique',
    title: 'Relance en Zone Rouge (VO2Max)',
    subtitle: 'Technique Universelle • Au-delà du Seuil Anaérobie',
    roleTag: 'Physiologie',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'VTT', 'Piste', 'Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 83,
    technique: 77,
    endurance: 84,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 12,
    effectDescription: 'Transmet +12 pts d’élan à votre prochaine carte !',
    summary: 'Capacité physiologique à enchaîner les accélérations au-dessus de 120% de la PMA tout en récupérant instantanément dans les roues ou les descentes courtes.',
    nationality: 'Universel',
    countryCode: 'TCG',
    keyYear: 'VO2 > 88',
    keyFact: 'Les meilleurs athlètes d’endurance cycliste affichent une VO2Max comprise entre 85 et 94 ml/min/kg.',
    specialTrait: 'Tolérance Lactique Extrême'
  },
  {
    id: 'poly-strade-bianche',
    title: 'Les Chemins Blancs (Strade Bianche)',
    subtitle: 'Classique Hybride • Graviers Toscans & Rampes à 18%',
    roleTag: 'Classique Hybride',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'Cyclo-cross', 'VTT'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 89,
    endurance: 85,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 12,
    effectDescription: '+12 pts si précédée par une carte d’une autre discipline.',
    summary: 'Secteurs poussiéreux de Toscane reliant Sienne sur des chemins de gravier blanc cassant où routeux, crossmen et vététistes s’affrontent à armes égales.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: 'Sienne',
    keyFact: 'Le secteur de Monte Sante Marie et le mur final de la Via Santa Caterina à 16% jugent la course.',
    specialTrait: 'Poussière Blanche de Toscane'
  },
  {
    id: 'poly-capteur-watts',
    title: 'Pédalier Capteur de Puissance Carbone',
    subtitle: 'Matériel Précision • Calibration au Watt près',
    roleTag: 'Matériel Pro',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'VTT', 'Piste', 'Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 78,
    technique: 79,
    endurance: 80,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 6,
    effectDescription: '+6 pts par carte Matériel & Technique jouée dans le duel.',
    summary: 'Jauges de contrainte intégrées dans l’étoile du pédalier mesurant couple et cadence en temps réel pour calibrer parfaitement le seuil FTP.',
    nationality: 'Universel',
    countryCode: 'TCG',
    keyYear: 'FTP Watts',
    keyFact: 'La puissance mécanique (en Watts) égale le couple appliqué sur les manivelles multiplié par la cadence.',
    specialTrait: 'Calibration Millimétrée du Seuil'
  },
  {
    id: 'poly-soufflerie',
    title: 'Position Aéro & Étude Posturale 3D',
    subtitle: 'Technique Universelle • Réduction du SCx Frontal',
    roleTag: 'Technique Aéro',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'Piste', 'VTT', 'Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 73,
    technique: 76,
    endurance: 72,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 8,
    effectDescription: 'Optimise la traînée : +8 pts à la prochaine carte jouée.',
    summary: 'Rentrer les coudes, casser les poignets et aligner le casque dans le prolongement du dos permet d’économiser jusqu’à 35 Watts à 45 km/h.',
    nationality: 'Universel',
    countryCode: 'TCG',
    keyYear: 'SCx 0,20',
    keyFact: 'À 45 km/h sur le plat, plus de 80% de l’effort sert uniquement à vaincre la résistance de l’air.',
    specialTrait: 'Gain Marginal de Soufflerie'
  },
  {
    id: 'poly-gel-iso',
    title: 'Ravitaillement Isotonique 120g/h',
    subtitle: 'Action Tactique • Éviter la Fringale Fatale',
    roleTag: 'Nutrition',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'VTT', 'Piste', 'Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 67,
    technique: 70,
    endurance: 79,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 7,
    effectDescription: 'Protège des malus de terrain & +7 pts bonus.',
    summary: 'Stratégie nutritionnelle moderne combinant maltodextrine et fructose pour maintenir la glycémie intacte lors des enchaînements de cols ou de boucles XCO.',
    nationality: 'Nutrition TCG',
    countryCode: 'TCG',
    keyYear: '120 g/h',
    keyFact: 'Le ratio glucose:fructose de 1:0,8 permet d’absorber jusqu’à 120 g de glucides par heure sans troubles digestifs.',
    specialTrait: 'Carburant Anti-Fringale'
  },

  // ============================================================================
  // 2. ROUTE (23 Cartes : Légendes, Stars, Femmes, Monuments, Cols, Tactiques)
  // ============================================================================
  {
    id: 'route-merckx',
    title: 'Eddy Merckx',
    subtitle: 'Le Cannibale • 525 Victoires Professionnelles',
    roleTag: 'Cannibale GOAT',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Piste'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 98,
    technique: 93,
    endurance: 99,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 18,
    effectDescription: '+18 pts immédiats sur terrain Route ou Piste.',
    summary: 'Le plus grand palmarès de l’histoire du cyclisme : 5 Tours de France, 5 Tours d’Italie, 1 Vuelta, 19 Monuments, 3 titres mondiaux et le record de l’heure à Mexico.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '1969',
    keyFact: 'En 1969, il remporte sur le même Tour de France les classements Général (Jaune), Points (Vert) et Montagne.',
    specialTrait: 'Appétit du Cannibale',
    wikiSlug: 'Eddy_Merckx'
  },
  {
    id: 'route-hinault',
    title: 'Bernard Hinault',
    subtitle: 'Le Blaireau • 10 Grands Tours & Sallanches 1980',
    roleTag: 'Patron & Puncheur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 96,
    technique: 91,
    endurance: 97,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 14,
    effectDescription: 'Ignore tous les malus météo/terrain & gagne +14 pts.',
    summary: 'Patron incontesté du peloton, quintuple vainqueur du Tour de France, triple lauréat du Giro et double vainqueur de la Vuelta, célèbre pour ses offensives sous la tempête.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1980',
    keyFact: 'A remporté Liège-Bastogne-Liège 1980 dans une tempête de neige avec plus de 9 minutes d’avance.',
    specialTrait: 'Tempérament du Blaireau',
    wikiSlug: 'Bernard_Hinault'
  },
  {
    id: 'route-pogacar',
    title: 'Tadej Pogačar',
    subtitle: 'Le Prodige Slovène • Triple Couronne Giro-Tour-Mondial',
    roleTag: 'Triple Couronne',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 96,
    technique: 95,
    endurance: 98,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 18,
    effectDescription: '+18 pts s’il attaque tôt (Étapes 1 ou 2) !',
    summary: 'Attaquant insatiable capable de partir seul à 100 kilomètres du but aux Mondiaux tout en écrasant la haute montagne et les Monuments.',
    nationality: 'Slovénie',
    countryCode: 'SLO',
    keyYear: '2024',
    keyFact: 'A réalisé en 2024 la mythique Triple Couronne (Giro, Tour de France et Championnat du monde).',
    specialTrait: 'Raid Solitaire à 100 km',
    wikiSlug: 'Tadej_Pogačar'
  },
  {
    id: 'route-pantani',
    title: 'Marco Pantani',
    subtitle: 'Il Pirata • Doublé Giro-Tour 1998',
    roleTag: 'Grimpeur Pur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 87,
    technique: 85,
    endurance: 98,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 18,
    effectDescription: '+18 pts en Étape 4 ou 5 (attaque finale en montagne).',
    summary: 'Symbole romantique de l’escalade pure : bandana jeté au pied du col, mains en bas du guidon en danseuse, auteur du doublé Giro-Tour 1998 via le Galibier.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: '1998',
    keyFact: 'Détenteur du record d’ascension historique de l’Alpe d’Huez (37 min 35 s) et héros des Deux Alpes 1998.',
    specialTrait: 'Danseuse Mains en Bas',
    wikiSlug: 'Marco_Pantani'
  },
  {
    id: 'route-coppi',
    title: 'Fausto Coppi',
    subtitle: 'Il Campionissimo • Premier Doublé Giro-Tour (1949)',
    roleTag: 'Campionissimo',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Piste'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 89,
    technique: 88,
    endurance: 96,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 14,
    effectDescription: '+14 pts si engagé en Étapes 1 ou 2.',
    summary: 'Légende italienne ayant dominé l’après-guerre, premier vainqueur à l’Alpe d’Huez en 1952 et auteur de chevauchées solitaires mythiques entre Cuneo et Pinerolo.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: '1949',
    keyFact: 'A battu le record de l’heure en 1942 au vélodrome Vigorelli (45,798 km) puis réalisé deux doublés Giro-Tour.',
    specialTrait: 'Un Homme Seul au Commandement',
    wikiSlug: 'Fausto_Coppi'
  },
  {
    id: 'route-vingegaard',
    title: 'Jonas Vingegaard',
    subtitle: 'Le Roi des Cimes • Double Vainqueur du Tour',
    roleTag: 'Grimpeur GC',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 86,
    technique: 84,
    endurance: 98,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 15,
    effectDescription: '+15 pts lors des Étapes finales (4 ou 5).',
    summary: 'Spécialiste des cols hors catégorie au-delà de 2 000 mètres d’altitude et des longs efforts au seuil, double vainqueur du Tour de France.',
    nationality: 'Danemark',
    countryCode: 'DEN',
    keyYear: '2022',
    keyFact: 'A renversé le Tour de France 2022 dans la terrible ascension du col du Granon.',
    specialTrait: 'VO2Max de Haute Altitude',
    wikiSlug: 'Jonas_Vingegaard'
  },
  {
    id: 'route-evenepoel',
    title: 'Remco Evenepoel',
    subtitle: 'L’Aéroballe Belge • Double Or Olympique Paris 2024',
    roleTag: 'Rouleur-Grimpeur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 95,
    technique: 87,
    endurance: 91,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 13,
    effectDescription: '+13 pts immédiats sur terrain Route.',
    summary: 'Premier homme sacré champion olympique du contre-la-montre et de la course en ligne aux mêmes Jeux (Paris 2024), champion du monde et vainqueur de la Vuelta.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '2024',
    keyFact: 'A remporté Liège-Bastogne-Liège en solitaire à deux reprises grâce à son aérodynamisme hors norme.',
    specialTrait: 'Position Aéroballe Irrésistible',
    wikiSlug: 'Remco_Evenepoel'
  },
  {
    id: 'route-vollering',
    title: 'Demi Vollering',
    subtitle: 'Reine du Tourmalet & Triplé des Ardennaises 2023',
    roleTag: 'Leader GC',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 89,
    technique: 87,
    endurance: 94,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 6,
    effectDescription: '+6 pts par carte Route jouée depuis le début du match.',
    summary: 'Vainqueure du Tour de France Femmes au sommet du Tourmalet et auteure du rarissime triplé Amstel-Flèche-Liège en 2023.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: '2023',
    keyFact: 'Seule coureuse avec Anna van der Breggen à réussir le triplé des classiques ardennaises la même année.',
    specialTrait: 'Domination des Ardennes & Tourmalet',
    wikiSlug: 'Demi_Vollering'
  },
  {
    id: 'route-alaphilippe',
    title: 'Julian Alaphilippe',
    subtitle: 'Loulou • Double Champion du Monde (2020-2021)',
    roleTag: 'Puncheur',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 90,
    technique: 93,
    endurance: 83,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 10,
    effectDescription: 'Attaque tranchante : -10 pts au score adverse.',
    summary: 'Puncheur au panache offensif inimitable, double champion du monde consécutif, triple vainqueur du Mur de Huy et héros de l’épopée en Jaune 2019.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '2020',
    keyFact: 'A porté le Maillot Jaune 14 jours sur le Tour 2019 et gagné Milan-San Remo la même année.',
    specialTrait: 'Giclette au Mur de Huy',
    wikiSlug: 'Julian_Alaphilippe'
  },
  {
    id: 'route-cavendish',
    title: 'Mark Cavendish',
    subtitle: 'Manx Missile • Recordman des 35 Étapes du Tour',
    roleTag: 'Sprinteur Pur',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Piste'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 97,
    technique: 89,
    endurance: 64,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 14,
    effectDescription: '+14 pts en Étape 4 ou 5 (emballage final).',
    summary: 'Sprinteur pur sang détenteur du record absolu de 35 victoires d’étapes sur le Tour de France et champion du monde à Copenhague en 2011.',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: '35 Étapes',
    keyFact: 'A battu le record mythique des 34 victoires d’Eddy Merckx en remportant sa 35e étape en 2024.',
    specialTrait: 'Sprint Bas à 75 km/h',
    wikiSlug: 'Mark_Cavendish'
  },
  {
    id: 'route-pinot',
    title: 'Thibaut Pinot',
    subtitle: 'L’Idole du Tourmalet & Vainqueur du Tour de Lombardie',
    roleTag: 'Grimpeur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 82,
    technique: 81,
    endurance: 91,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 12,
    effectDescription: '+12 pts si engagé sur un terrain Route.',
    summary: 'Grimpeur franc-comtois emblématique, vainqueur du Tour de Lombardie 2018 et d’étapes prestigieuses sur les trois Grands Tours (Alpe d’Huez, Tourmalet, Tre Cime).',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '2018',
    keyFact: 'Son Virage Pinot au Petit Ballon lors du Tour de France 2023 reste l’un des moments les plus vibrants de l’ère moderne.',
    specialTrait: 'Ferveur du Virage Pinot',
    wikiSlug: 'Thibaut_Pinot'
  },
  {
    id: 'route-tdf',
    title: 'Tour de France',
    subtitle: 'La Grande Boucle • Monument Mondial depuis 1903',
    roleTag: 'Grand Tour Roi',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Épreuve / Monument',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 94,
    technique: 92,
    endurance: 99,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 7,
    effectDescription: '+7 pts par carte Route jouée dans la partie.',
    summary: 'Trois semaines de bataille épique à travers plaines, pavés, Alpes et Pyrénées pour conquérir le Maillot Jaune, le Maillot Vert et le Maillot à Pois.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1903',
    keyFact: 'Créé en 1903 ; le premier Maillot Jaune fut endossé par Eugène Christophe en 1919 à Grenoble.',
    specialTrait: 'Prestige Suprême du Maillot Jaune',
    wikiSlug: 'Tour_de_France'
  },
  {
    id: 'route-roubaix',
    title: 'Paris-Roubaix',
    subtitle: 'L’Enfer du Nord • Monument des Pavés 5 Étoiles',
    roleTag: 'Monument Pavés',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Cyclo-cross'],
    category: 'Épreuve / Monument',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 96,
    technique: 96,
    endurance: 94,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 11,
    effectDescription: 'Résiste à la boue/poussière (annule malus) & +11 pts.',
    summary: 'La Reine des Classiques où le placement, la résistance mécanique et la puissance sur le haut du pavé décident du vainqueur au vélodrome.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1896',
    keyFact: 'Plus de 50 km de pavés répartis en près de 30 secteurs notés jusqu’à 5 étoiles.',
    specialTrait: 'Survivant de l’Enfer du Nord',
    wikiSlug: 'Paris-Roubaix'
  },
  {
    id: 'route-ronde',
    title: 'Tour des Flandres (De Ronde)',
    subtitle: 'Monument des Bergs Pavés • Quaremont & Paterberg',
    roleTag: 'Monument Flandres',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Cyclo-cross'],
    category: 'Épreuve / Monument',
    rarity: 'Épique',
    energyCost: 4,
    power: 92,
    technique: 91,
    endurance: 90,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 13,
    effectDescription: '+13 pts sur terrain Route ou Cyclo-cross.',
    summary: 'Monument sacré du peuple flamand, rythmé par l’enchaînement incessant des monts pavés à plus de 20% où seuls les flandriens les plus explosifs survivent.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '1913',
    keyFact: 'Le Vieux Quaremont et le Paterberg forment le juge de paix final de la classique.',
    specialTrait: 'Ferveur des Monts Flandriens',
    wikiSlug: 'Tour_des_Flandres'
  },
  {
    id: 'route-lbl',
    title: 'Liège-Bastogne-Liège',
    subtitle: 'La Doyenne des Classiques • Côte de la Redoute (1892)',
    roleTag: 'Monument Ardennes',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 84,
    technique: 84,
    endurance: 91,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts si engagée en Étape 4 ou 5 (La Redoute).',
    summary: 'Le plus ancien des cinq Monuments, long de plus de 255 km dans les Ardennes belges via Stockeu, la Redoute et la Roche-aux-Faucons.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '1892',
    keyFact: 'Surnommée « La Doyenne », elle a été remportée 5 fois par Eddy Merckx et 4 fois par Moreno Argentin et Alejandro Valverde.',
    specialTrait: 'Attaque dans la Redoute',
    wikiSlug: 'Liège-Bastogne-Liège'
  },
  {
    id: 'route-ventoux',
    title: 'Mont Ventoux (Géant de Provence)',
    subtitle: 'Ascension Hors Catégorie • 21,5 km à 7,5% (1 910 m)',
    roleTag: 'Col Mythique',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Terrain / Secteur',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 88,
    technique: 83,
    endurance: 98,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 12,
    effectDescription: 'Le mistral brûle les jambes : -12 pts à la carte adverse !',
    summary: 'Après la forêt étouffante jusqu’au Chalet Reynard, les six derniers kilomètres traversent un désert lunaire de calcaire blanc balayé par le mistral.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1 910 m',
    keyFact: '1 610 mètres de dénivelé positif depuis Bédoin jusqu’à l’observatoire blanc du sommet.',
    specialTrait: 'Fournaise & Mistral du Chalet Reynard',
    wikiSlug: 'Mont_Ventoux'
  },
  {
    id: 'route-arenberg',
    title: 'La Trouée d\'Arenberg',
    subtitle: 'Secteur Pavé 5 Étoiles • 2 300 m en Forêt de Raismes',
    roleTag: 'Secteur 5★',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Cyclo-cross'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 90,
    technique: 90,
    endurance: 83,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts en Étapes 1 ou 2 (sélection précoce).',
    summary: 'Ligne droite forestière mythique abordée à 60 km/h sur des pavés disjoints le long des anciens chevalements miniers de Wallers.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1968',
    keyFact: 'Introduite en 1968 sur la suggestion de l’ancien coureur et mineur de fond Jean Stablinski.',
    specialTrait: 'Secousses sur le Haut du Pavé',
    wikiSlug: 'Trouée_d\'Arenberg'
  },
  {
    id: 'route-galibier',
    title: 'Col du Galibier',
    subtitle: 'Toit Historique des Alpes • 2 642 m d’Altitude',
    roleTag: 'Col Alpin',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 81,
    technique: 82,
    endurance: 93,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 9,
    effectDescription: 'Prépare l’attaque finale : +9 pts à votre prochaine carte.',
    summary: 'Géant alpin reliant la Maurienne au Briançonnais où la raréfaction de l’oxygène au-dessus de 2 500 mètres met les organismes à rude épreuve.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '2 642 m',
    keyFact: 'Franchi pour la première fois par le Tour de France en 1911 grâce à Émile Georget.',
    specialTrait: 'Hypoxie de Haute Montagne',
    wikiSlug: 'Col_du_Galibier'
  },
  {
    id: 'route-alpedhuez',
    title: 'Les 21 Virages de l\'Alpe d\'Huez',
    subtitle: 'L’Amphithéâtre des Grimpeurs • 13,8 km à 8,1%',
    roleTag: 'Arrivée Mythique',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 85,
    technique: 83,
    endurance: 90,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étapes 4 ou 5 (arrivée au sommet).',
    summary: 'Montée théâtrale de l’Oisans jalonnée de 21 épingles numérotées à rebours où la foule forme un couloir incandescent.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '21 lacets',
    keyFact: 'Chaque virage porte une plaque au nom d’un vainqueur d’étape depuis Fausto Coppi en 1952.',
    specialTrait: 'Foule du Virage des Hollandais',
    wikiSlug: 'Alpe_d\'Huez'
  },
  {
    id: 'route-bordure',
    title: 'Bordure en Éventail dans le Vent',
    subtitle: 'Action Tactique Route • Coup de Trafalgar Collectif',
    roleTag: 'Tactique Vent',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 83,
    technique: 85,
    endurance: 77,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 11,
    effectDescription: 'Coupe le peloton : -11 pts au score adverse !',
    summary: 'Manœuvre collective par vent de trois-quarts : une équipe occupe toute la largeur de la route en oblique (« l’éventail ») pour priver ses rivaux d’abri.',
    nationality: 'Tactique Route',
    countryCode: 'TCG',
    keyYear: 'Vent 3/4',
    keyFact: 'Dès que l’éventail touche le bas-côté de la chaussée, les coureurs piégés derrière subissent le plein vent.',
    specialTrait: 'Cassure Brutale du Peloton'
  },
  {
    id: 'route-train-sprint',
    title: 'Train de Sprint & Poisson-Pilote',
    subtitle: 'Tactique Route • Lancement à 72 km/h sous la Flamme Rouge',
    roleTag: 'Tactique Sprint',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Piste'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 85,
    technique: 80,
    endurance: 66,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 11,
    effectDescription: 'Lance le sprinteur suivant : +11 pts à votre prochaine carte !',
    summary: 'File indienne de rouleurs surpuissants se sacrifiant tour à tour dans les 3 derniers km pour déposer leur leader à 200 m de la ligne.',
    nationality: 'Tactique Route',
    countryCode: 'TCG',
    keyYear: '200 m',
    keyFact: 'Dans l’aspiration d’un poisson-pilote à 65 km/h, un sprinteur économise jusqu’à 35% d’énergie avant de jaillir.',
    specialTrait: 'Rampe de Lancement'
  },
  {
    id: 'route-roue-lenti',
    title: 'Vélo CLM Roue Lenticulaire & Prolongateur',
    subtitle: 'Matériel Contre-la-Montre • Soufflerie & Plateau 60 Dents',
    roleTag: 'Matériel CLM',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Piste'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 84,
    technique: 74,
    endurance: 79,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 6,
    effectDescription: '+6 pts par carte Matériel & Technique jouée.',
    summary: 'Machine d’exercice solitaire étudiée en soufflerie avec roue arrière pleine lenticulaire, casque profilé et braquet géant.',
    nationality: 'Matériel Route',
    countryCode: 'TCG',
    keyYear: '60 dents',
    keyFact: 'À plus de 50 km/h sur le plat, la traînée aérodynamique représente plus de 85% de la résistance totale.',
    specialTrait: 'Effet Voile & Gain en Watts'
  },
  {
    id: 'route-grimpeur-poche',
    title: 'L\'Équipier Grimpeur de Poche (6,5 W/kg)',
    subtitle: 'Profil Route • Poids Plume des Sommets (Coût 1⚡)',
    roleTag: 'Équipier Montagne',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Commune',
    energyCost: 1,
    power: 68,
    technique: 72,
    endurance: 83,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 8,
    effectDescription: 'Imprime le tempo au pied du col : +8 pts à votre prochaine carte.',
    summary: 'Gabarit poids plume de 56 kilos qui s’efface dans le vent de plaine mais imprime un rythme asphyxiant dès que la pente dépasse 9%.',
    nationality: 'Archétype TCG',
    countryCode: 'TCG',
    keyYear: '6,8 kg UCI',
    keyFact: 'L’UCI impose un poids minimal réglementaire de 6,8 kg pour tout vélo de route en compétition officielle.',
    specialTrait: 'Tempo Asphyxiant au Pied du Col'
  },
  {
    id: 'route-musette',
    title: 'Chasse-Patate & Relais de Solidarité',
    subtitle: 'Action Tactique • Rattraper l’Échappée au Courage',
    roleTag: 'Baroudeur',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 71,
    technique: 72,
    endurance: 77,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 9,
    effectDescription: '+9 pts en Étape 1 ou 2 (effort précoce).',
    summary: 'Coincé entre l’échappée et le peloton (« en chasse-patate »), le baroudeur s’écrase sur son cintre pour boucher les 45 dernières secondes à la force du mental.',
    nationality: 'Tactique Route',
    countryCode: 'TCG',
    keyYear: 'Chasse-Patate',
    keyFact: 'On appelle « chasse-patate » un coureur parti en contre-attaque qui n’arrive ni à rejoindre la tête ni à se relever.',
    specialTrait: 'Ténacité du Baroudeur'
  },

  // ============================================================================
  // 3. VTT (23 Cartes : XCO, DH, Enduro, Freeride, Pilotes, Pistes & Techniques)
  // ============================================================================
  {
    id: 'vtt-schurter',
    title: 'Nino Schurter',
    subtitle: 'Le GOAT du Cross-Country • 10x Champion du Monde XCO',
    roleTag: 'GOAT XCO',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 94,
    technique: 98,
    endurance: 96,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 18,
    effectDescription: '+18 pts immédiats sur terrain VTT.',
    summary: 'Roi absolu du VTT Cross-Country Olympique avec 10 maillots arc-en-ciel élites, l’or à Rio 2016 et plus de 35 victoires en Coupe du monde.',
    nationality: 'Suisse',
    countryCode: 'SUI',
    keyYear: '10 Titres',
    keyFact: 'Record absolu de 10 titres de champion du monde élite XCO et 3 médailles olympiques consécutives.',
    specialTrait: 'Flow Parfait en Rock Garden',
    wikiSlug: 'Nino_Schurter'
  },
  {
    id: 'vtt-absalon',
    title: 'Julien Absalon',
    subtitle: 'Double Champion Olympique XCO (2004 & 2008)',
    roleTag: 'Double Or JO XCO',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 93,
    technique: 94,
    endurance: 98,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 7,
    effectDescription: '+7 pts par carte VTT jouée dans la partie.',
    summary: 'Légende française du VTT, double champion olympique consécutif à Athènes et Pékin, quintuple champion du monde et septuple lauréat du général de la Coupe du monde.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '2004-2008',
    keyFact: 'Premier vététiste masculin double champion olympique et auteur de 33 manches de Coupe du monde.',
    specialTrait: 'Cadence en Montée Racineuse',
    wikiSlug: 'Julien_Absalon'
  },
  {
    id: 'vtt-bruni',
    title: 'Loïc Bruni',
    subtitle: 'SuperBruni • Quintuple Champion du Monde de Descente (DH)',
    roleTag: 'Descendeur DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 91,
    technique: 99,
    endurance: 69,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 17,
    effectDescription: '+17 pts en Étapes 4 ou 5 (run final sous pression).',
    summary: 'Quintuple champion du monde élite de VTT Descente, maître des trajectoires tendues à plus de 70 km/h capable de se sublimer le jour des Mondiaux.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '5x Mondial DH',
    keyFact: 'Sacré champion du monde élite de descente en 2015, 2017, 2018, 2019 et 2022 aux Gets.',
    specialTrait: 'Run Supersonique sous Pression',
    wikiSlug: 'Loïc_Bruni'
  },
  {
    id: 'vtt-atherton',
    title: 'Rachel Atherton',
    subtitle: 'Reine Britannique de la Descente • Saison Parfaite 2016',
    roleTag: 'Descendeuse DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 90,
    technique: 96,
    endurance: 71,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 12,
    effectDescription: 'Maîtrise la boue britannique : annule malus & +12 pts.',
    summary: 'Quintuple championne du monde de descente et auteure en 2016 de l’unique saison parfaite invaincue de l’histoire en Coupe du monde DH.',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: '2016',
    keyFact: 'A remporté toutes les manches de la Coupe du monde 2016 plus le maillot arc-en-ciel, soit 40 victoires au total.',
    specialTrait: 'Saison Parfaite Invaincue',
    wikiSlug: 'Rachel_Atherton'
  },
  {
    id: 'vtt-vouilloz',
    title: 'Nicolas Vouilloz',
    subtitle: '« E.T. » • 10 Couronnes Mondiales en Descente VTT',
    roleTag: 'Légende DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 89,
    technique: 98,
    endurance: 72,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 11,
    effectDescription: 'Précision télémétrique : -11 pts au score adverse.',
    summary: 'Pionnier de la télémétrie sur suspensions et de l’étude millimétrée des trajectoires, dix fois champion du monde de descente (dont 7 en élites).',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1995-2002',
    keyFact: 'Surnommé « E.T. » pour sa précision extraterrestre avec 7 titres mondiaux élites consécutifs ou presque.',
    specialTrait: 'Trajectoire Chirurgicale d’E.T.',
    wikiSlug: 'Nicolas_Vouilloz'
  },
  {
    id: 'vtt-nicole',
    title: 'Myriam Nicole',
    subtitle: 'Pompon • Double Championne du Monde DH',
    roleTag: 'Descendeuse DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 87,
    technique: 95,
    endurance: 68,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 14,
    effectDescription: '+14 pts immédiats sur terrain VTT.',
    summary: 'Pilote française au style engagé et fluide, sacrée deux fois championne du monde élite sur les pistes les plus exigeantes à Mont-Sainte-Anne et Val di Sole.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '2019 & 2021',
    keyFact: 'Double championne du monde élite de descente VTT et lauréate du classement général de la Coupe du monde.',
    specialTrait: 'Engagement Total dans la Pente',
    wikiSlug: 'Myriam_Nicole'
  },
  {
    id: 'vtt-neff',
    title: 'Jolanda Neff',
    subtitle: 'Championne Olympique Tokyo 2020 & Virtuose Technique',
    roleTag: 'Or JO XCO',
    discipline: 'VTT',
    linkedDisciplines: ['VTT', 'Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 85,
    technique: 94,
    endurance: 87,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 11,
    effectDescription: '+11 pts immédiats sur terrain VTT ou Cyclo-cross.',
    summary: 'Médaillée d’or olympique à Tokyo 2020 devant ses compatriotes suisses et triple lauréate de la Coupe du monde XCO, réputée pour son aisance technique.',
    nationality: 'Suisse',
    countryCode: 'SUI',
    keyYear: 'Tokyo 2020',
    keyFact: 'A mené un triplé historique suisse sur le podium olympique féminin de Tokyo 2020 (Neff, Frei, Indergand).',
    specialTrait: 'Glisse Suisse dans les Racines',
    wikiSlug: 'Jolanda_Neff'
  },
  {
    id: 'vtt-pierron',
    title: 'Amaury Pierron',
    subtitle: 'Le Roi des Gets & de Fort William en Descente',
    roleTag: 'Descendeur DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 90,
    technique: 93,
    endurance: 67,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts s’il s’élance en Étapes 1 ou 2.',
    summary: 'Double vainqueur de la Coupe du monde de descente, célèbre pour son pilotage ultra-agressif capable de coller six secondes à l’élite mondiale dans la boue des Gets.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '2022 & 2024',
    keyFact: 'Auteur d’un run légendaire sous le déluge aux Gets en 2024 avec plus de 6 secondes d’avance.',
    specialTrait: 'Attaque Sauvage sous le Déluge',
    wikiSlug: 'Amaury_Pierron'
  },
  {
    id: 'vtt-koretzky',
    title: 'Victor Koretzky',
    subtitle: 'Champion du Monde Short-Track & Argent Olympique',
    roleTag: 'Pilote XCO/XCC',
    discipline: 'VTT',
    linkedDisciplines: ['VTT', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 89,
    technique: 90,
    endurance: 86,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts en Étapes 4 ou 5 (emballage Short-Track).',
    summary: 'Puncheur explosif du VTT français, champion du monde de Short-Track (XCC) et vice-champion olympique à Paris 2024 à Élancourt.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '2024',
    keyFact: 'Champion du monde de Short-Track XCC et médaillé d’argent olympique XCO en 2024.',
    specialTrait: 'Kick Foudroyant en Short-Track',
    wikiSlug: 'Victor_Koretzky'
  },
  {
    id: 'vtt-ravanel',
    title: 'Cécile Ravanel',
    subtitle: 'Triple Reine des Enduro World Series (2016-2018)',
    roleTag: 'Enduro Pro',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 79,
    technique: 87,
    endurance: 83,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte VTT jouée dans la partie.',
    summary: 'Triple championne du monde d’Enduro VTT, capable de dompter des spéciales alpines de 15 minutes à vue sans jamais commettre d’erreur.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '2018',
    keyFact: 'A remporté 7 des 8 manches de la saison Enduro World Series 2018.',
    specialTrait: 'Lecture à Vue en Spéciale',
    wikiSlug: 'Cécile_Ravanel'
  },
  {
    id: 'vtt-rampage',
    title: 'Freeride des Falaises de l\'Utah (Virgin)',
    subtitle: 'Le Sommet Mondial du VTT Freeride Extrême',
    roleTag: 'Freeride Extrême',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Épreuve / Monument',
    rarity: 'Épique',
    energyCost: 4,
    power: 91,
    technique: 99,
    endurance: 73,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 15,
    effectDescription: 'Impressionne le jury : -15 pts au score adverse !',
    summary: 'Épreuve mythique dans le désert de Virgin (Utah) où les meilleurs freeriders tracent leur propre ligne à flanc de falaise avec des drops de plus de 15 mètres.',
    nationality: 'États-Unis',
    countryCode: 'USA',
    keyYear: '2001',
    keyFact: 'Chaque pilote façonne sa propre ligne à la pelle et à la pioche sur les crêtes de grès rouge.',
    specialTrait: 'Drop de Falaise & Backflip Canyon'
  },
  {
    id: 'vtt-megavalanche',
    title: 'Mégavalanche de l\'Alpe d\'Huez',
    subtitle: 'Départ en Ligne sur le Glacier du Pic Blanc (3 330 m)',
    roleTag: 'Mass-Start Glacier',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Épreuve / Monument',
    rarity: 'Épique',
    energyCost: 4,
    power: 87,
    technique: 92,
    endurance: 94,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 14,
    effectDescription: '+14 pts si lancée en Étapes 1 ou 2 (holeshot sur neige).',
    summary: 'Course d’Enduro Mass-Start légendaire : des centaines de pilotes s’élancent à 90 km/h sur la neige du glacier à 3 330 m pour 2 600 m de descente non-stop.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '3 330 m',
    keyFact: '2 600 mètres de dénivelé négatif continu du glacier du Pic Blanc jusqu’à la vallée d’Allemond.',
    specialTrait: 'Mass-Start sur Glacier'
  },
  {
    id: 'vtt-crankworx',
    title: 'Crankworx Whistler (Joyride)',
    subtitle: 'Festival Mondial Slopestyle, Pump Track & Whip-Off',
    roleTag: 'Slopestyle',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 93,
    endurance: 70,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 11,
    effectDescription: '+11 pts si précédée par une autre discipline.',
    summary: 'La Mecque du VTT Gravity en Colombie-Britannique réunissant les meilleurs riders mondiaux de Slopestyle, Dual Slalom et Whip-Off.',
    nationality: 'Canada',
    countryCode: 'CAN',
    keyYear: 'Whistler',
    keyFact: 'Le contest Joyride de Whistler est la plus prestigieuse finale mondiale de VTT Slopestyle.',
    specialTrait: 'Double Tailwhip & Style Aérien'
  },
  {
    id: 'vtt-lesgets-gap',
    title: 'Le Road Gap & Mont Chéry (Les Gets)',
    subtitle: 'Secteur Mythique DH • Saut au-dessus de la Piste',
    roleTag: 'Secteur DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 92,
    endurance: 74,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 12,
    effectDescription: '+12 pts immédiats sur terrain VTT.',
    summary: 'L’arène bouillonnante du Mont Chéry aux Gets où les pilotes s’envolent sur le Road Gap au milieu d’une foule faisant hurler des tronçonneuses sans chaîne.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Les Gets',
    keyFact: 'A accueilli les Championnats du monde VTT 2004 et 2022 avec un triplé historique des descendeurs français.',
    specialTrait: 'Envol dans la Clameur Alpine',
    wikiSlug: 'Les_Gets'
  },
  {
    id: 'vtt-beatrice-msa',
    title: 'La Dalle « La Béatrice » (Mont-Sainte-Anne)',
    subtitle: 'Secteur XCO & DH • Pierrier Vertical Glissant du Québec',
    roleTag: 'Secteur Dalle',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 82,
    technique: 94,
    endurance: 80,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 10,
    effectDescription: 'Dalle piégeuse : inflige -10 pts à l’adversaire.',
    summary: 'Passage rocheux quasi-vertical niché dans la forêt québécoise où la moindre erreur de frein avant provoque une chute immédiate.',
    nationality: 'Canada',
    countryCode: 'CAN',
    keyYear: 'Québec',
    keyFact: 'Mont-Sainte-Anne est la doyenne des pistes de Coupe du monde UCI, présente au calendrier depuis 1991.',
    specialTrait: 'Descente sans Frein Avant',
    wikiSlug: 'Mont-Sainte-Anne'
  },
  {
    id: 'vtt-blacksnake',
    title: 'Piste « Black Snake » (Val di Sole)',
    subtitle: 'Secteur DH Extrême • Labyrinthe de Racines & Pente 42%',
    roleTag: 'Piste DH Noire',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 78,
    technique: 89,
    endurance: 72,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 9,
    effectDescription: 'Immunisé aux malus techniques & +9 pts.',
    summary: 'Piste de descente la plus raide et la plus piégeuse du circuit mondial : un tapis ininterrompu de racines à vif et de trous de freinage.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: 'Pente 42%',
    keyFact: 'Les racines obliques de la Black Snake obligent les pilotes à sauter par-dessus les sections plutôt que de les rouler.',
    specialTrait: 'Toile de Racines à Vif'
  },
  {
    id: 'vtt-fort-william',
    title: 'Autoroute Rocheuse de Fort William',
    subtitle: 'Secteur DH Écosse • 2,8 km de Blocs de Granit à 75 km/h',
    roleTag: 'Piste DH Granit',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 81,
    technique: 84,
    endurance: 77,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 10,
    effectDescription: '+10 pts en Étapes 4 ou 5 (motorway finale).',
    summary: 'La descente la plus longue et la plus physique de la Coupe du monde sur les pentes d’Aonach Mòr en Écosse, entre vent glacial et dalles de granit.',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: '2,8 km DH',
    keyFact: 'Un run à Fort William dure près de 4 minutes 40 secondes d’effort intense sur les bras et les cuisses.',
    specialTrait: 'Granit des Highlands'
  },
  {
    id: 'vtt-dh-mullet',
    title: 'VTT DH Mullet 200 mm Double Té',
    subtitle: 'Matériel Descente • Roue 29" Avant / 27.5" Arrière',
    roleTag: 'Vélo DH Pro',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 81,
    technique: 87,
    endurance: 71,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 7,
    effectDescription: '+7 pts par carte Matériel & Technique jouée.',
    summary: 'Montage « Mullet » plébiscité en DH : grande roue 29" devant pour franchir les rochers et roue 27,5" derrière pour la maniabilité dans les virages.',
    nationality: 'Matériel VTT',
    countryCode: 'TCG',
    keyYear: '200 mm',
    keyFact: 'Le montage Mullet (29" avant / 27.5" arrière) allie franchissement de la grande roue et vivacité en appui.',
    specialTrait: 'Absorption Totale 200 mm'
  },
  {
    id: 'vtt-bunnyhop',
    title: 'Bunny-Hop & Manual en Rock Garden',
    subtitle: 'Technique Pilotage VTT • Franchissement Aérien',
    roleTag: 'Technique Pilotage',
    discipline: 'VTT',
    linkedDisciplines: ['VTT', 'Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 76,
    technique: 89,
    endurance: 71,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 10,
    effectDescription: 'Garde toute la vitesse : +10 pts à votre prochaine carte.',
    summary: 'Lever la roue avant en compression (« Manual ») puis impulser avec les jambes (« Bunny-Hop ») pour survoler un pierrier sans freiner.',
    nationality: 'Technique VTT',
    countryCode: 'TCG',
    keyYear: 'Pilotage',
    keyFact: 'Un vrai Bunny-Hop décolle d’abord la roue avant par transfert de masse arrière avant de ramener la roue arrière.',
    specialTrait: 'Survol sans Perte de Vitesse'
  },
  {
    id: 'vtt-scrub-whip',
    title: 'Scrub & Whip sur Tablette',
    subtitle: 'Technique DH & Freeride • Écraser l’Appel de Saut',
    roleTag: 'Technique Aérienne',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 79,
    technique: 88,
    endurance: 68,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 10,
    effectDescription: '+10 pts en Étapes 1 ou 2 (prise de vitesse rapide).',
    summary: 'Coucher le vélo horizontalement sur la lèvre de l’appel (« Scrub ») pour passer moins de temps en l’air et remettre les gaz plus tôt à la réception.',
    nationality: 'Technique VTT',
    countryCode: 'TCG',
    keyYear: 'Air Time',
    keyFact: 'En descente chronométrée, le Scrub fait gagner des dixièmes en abaissant l’apogée de la trajectoire.',
    specialTrait: 'Trajectoire Rasante Gain de Temps'
  },
  {
    id: 'vtt-dropper',
    title: 'Tige de Selle Télescopique & Tubeless',
    subtitle: 'Matériel XCO & Enduro • Centre de Gravité Abaissé',
    roleTag: 'Matériel VTT',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 69,
    technique: 80,
    endurance: 74,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 5,
    effectDescription: '+5 pts par carte Matériel & Technique jouée.',
    summary: 'Commande au guidon abaissant la selle avant une descente raide, couplée à des pneus Tubeless basse pression avec liquide préventif.',
    nationality: 'Matériel VTT',
    countryCode: 'TCG',
    keyYear: '1,2 bar',
    keyFact: 'Le montage Tubeless évite les crevaisons par pincement et permet de rouler autour de 1,1 à 1,4 bar.',
    specialTrait: 'Grip Basse Pression & Mobilité'
  },
  {
    id: 'vtt-appuis-relev',
    title: 'Virage Relevé en Appui (Berm) à 50 km/h',
    subtitle: 'Technique Bike Park • Compression & Relance en Sortie',
    roleTag: 'Technique Virage',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 73,
    technique: 79,
    endurance: 69,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 8,
    effectDescription: 'Catapulte en sortie de courbe : +8 pts à la prochaine carte.',
    summary: 'Incliner le vélo dans la pente du virage relevé, pomper dans le creux avec les jambes et jaillir à pleine vitesse vers la section suivante.',
    nationality: 'Technique VTT',
    countryCode: 'TCG',
    keyYear: 'Pump & Go',
    keyFact: 'Regarder loin vers la sortie du virage relevé tout en chargeant la pédale extérieure maximise l’adhérence.',
    specialTrait: 'Pompage en Sortie de Courbe'
  },
  {
    id: 'vtt-freins-4p',
    title: 'Freins à Disque 4 Pistons (220 mm)',
    subtitle: 'Matériel Enduro & DH • Modulation à Un Doigt',
    roleTag: 'Freinage DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 69,
    technique: 78,
    endurance: 72,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 7,
    effectDescription: 'Freinage sous la pluie : annule malus & +7 pts.',
    summary: 'Étriers hydrauliques 4 pistons sur disques ventilés de 220 mm permettant de retarder les freinages à un seul doigt même après 1 500 m de dénivelé négatif.',
    nationality: 'Matériel VTT',
    countryCode: 'TCG',
    keyYear: '220 mm',
    keyFact: 'Les disques de 203 ou 220 mm dissipent beaucoup mieux la chaleur et offrent un bras de levier supérieur.',
    specialTrait: 'Freinage Tardif à Un Doigt'
  },

  // ============================================================================
  // 4. CYCLISME SUR PISTE (22 Cartes : Pistards, Vélodromes, Épreuves, Techniques)
  // ============================================================================
  {
    id: 'piste-lavreysen',
    title: 'Harrie Lavreysen',
    subtitle: 'The Beast • Quintuple Or Olympique & 16x Champion du Monde',
    roleTag: 'Sprinteur Piste GOAT',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 99,
    technique: 94,
    endurance: 70,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 18,
    effectDescription: '+18 pts immédiats sur terrain Piste.',
    summary: 'Roi incontesté du sprint mondial sur piste : auteur d’un triplé d’or olympique à Paris 2024 (Vitesse, Keirin, Vitesse par équipes) et 16 titres mondiaux UCI.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: '2 500 W',
    keyFact: 'Développe plus de 2 500 Watts en pic explosif et a signé le triplé olympique aux Jeux de Paris 2024.',
    specialTrait: 'Puissance Titanesque de 2 500 W',
    wikiSlug: 'Harrie_Lavreysen'
  },
  {
    id: 'piste-hoy',
    title: 'Sir Chris Hoy',
    subtitle: 'Légende Écossaise • 6 Médailles d’Or Olympiques sur Piste',
    roleTag: 'Keirin GOAT',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 98,
    technique: 93,
    endurance: 72,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 18,
    effectDescription: '+18 pts en Étapes 4 ou 5 (dernier tour de Keirin).',
    summary: 'Colosse des anneaux de bois, sextuple champion olympique (du kilomètre d’Athènes 2004 au keirin de Londres 2012) et onze fois champion du monde.',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: '6x Or JO',
    keyFact: 'A réalisé le triplé olympique Vitesse, Keirin et Vitesse par équipes aux Jeux de Pékin 2008.',
    specialTrait: 'Rush Final Inarrêtable en Keirin',
    wikiSlug: 'Chris_Hoy'
  },
  {
    id: 'piste-kenny',
    title: 'Laura Kenny',
    subtitle: 'Reine Britannique de l’Omnium • 5x Or Olympique',
    roleTag: 'Reine Omnium',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 89,
    technique: 95,
    endurance: 93,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 7,
    effectDescription: '+7 pts par carte Piste jouée dans le match.',
    summary: 'Cycliste britannique la plus titrée de l’histoire olympique avec cinq médailles d’or entre Londres 2012, Rio 2016 et Tokyo 2020 (Omnium, Poursuite par équipes, Américaine).',
    nationality: 'Royaume-Uni',
    countryCode: 'GBR',
    keyYear: '5x Or JO',
    keyFact: 'Double championne olympique de l’Omnium (2012 et 2016) et championne olympique de l’Américaine (2020).',
    specialTrait: 'Métronome de l’Omnium Olympique',
    wikiSlug: 'Laura_Kenny'
  },
  {
    id: 'piste-rousseau',
    title: 'Florian Rousseau',
    subtitle: 'Maître Tactique du Sprint Français • 3x Or JO & 10x Mondial',
    roleTag: 'Tacticien Sprint',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 93,
    technique: 96,
    endurance: 72,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 12,
    effectDescription: 'Surplace & contre tactique : -12 pts à l’adversaire !',
    summary: 'Triple champion olympique et dix fois champion du monde, célèbre pour son sens tactique chirurgical en vitesse individuelle et sa maîtrise du surplace.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1996-2000',
    keyFact: 'Champion olympique du kilomètre en 1996 puis du keirin et de la vitesse par équipes à Sydney en 2000.',
    specialTrait: 'Science du Match de Vitesse',
    wikiSlug: 'Florian_Rousseau'
  },
  {
    id: 'piste-ballanger',
    title: 'Félicia Ballanger',
    subtitle: 'Reine Invaincue du Sprint • 3x Or JO & 10x Mondiale',
    roleTag: 'Sprinteuse Piste',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 95,
    technique: 94,
    endurance: 70,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 14,
    effectDescription: '+14 pts en Étapes 1 ou 2 (départ canon sur 500 m).',
    summary: 'Dominatrice absolue de la vitesse et du 500 mètres départ arrêté pendant cinq saisons consécutives, triple championne olympique à Atlanta et Sydney.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '10 Titres',
    keyFact: 'Cinq doublés consécutifs Vitesse / 500 mètres aux Championnats du monde de 1995 à 1999.',
    specialTrait: 'Explosion au Départ Arrêté',
    wikiSlug: 'Félicia_Ballanger'
  },
  {
    id: 'piste-bthomas',
    title: 'Benjamin Thomas',
    subtitle: 'Champion Olympique de l’Omnium Paris 2024',
    roleTag: 'Or JO Omnium',
    discipline: 'Piste',
    linkedDisciplines: ['Piste', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 87,
    technique: 94,
    endurance: 91,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 14,
    effectDescription: '+14 pts en Étapes 4 ou 5 (dernier sprint doublé).',
    summary: 'Stratège hors pair des courses en peloton sur piste, sacré champion olympique de l’omnium à Saint-Quentin-en-Yvelines en 2024 et quintuple champion du monde.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '2024',
    keyFact: 'A remporté en 2024 une étape du Giro sur route et l’or olympique de l’omnium sur piste.',
    specialTrait: 'Tour pris en Solitaire',
    wikiSlug: 'Benjamin_Thomas'
  },
  {
    id: 'piste-ganna',
    title: 'Filippo Ganna',
    subtitle: 'Top Ganna • Recordman de l’Heure Unifié (56,792 km)',
    roleTag: 'Recordman Heure',
    discipline: 'Piste',
    linkedDisciplines: ['Piste', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 96,
    technique: 85,
    endurance: 96,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 11,
    effectDescription: 'Rythme inaltérable : ignore les malus & +11 pts.',
    summary: 'Locomotive italienne de la poursuite et de l’effort solitaire, sextuple champion du monde de poursuite individuelle et recordman de l’heure avec 56,792 km.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: '56,792 km',
    keyFact: 'A battu le record absolu de l’heure en 2022 à Granges tout en détenant le record du monde du 4 000 m.',
    specialTrait: 'Cadence Métronomique',
    wikiSlug: 'Filippo_Ganna'
  },
  {
    id: 'piste-pervis',
    title: 'François Pervis',
    subtitle: 'L’Homme du Kilomètre en 56 s 303 & Triplé Mondial 2014',
    roleTag: 'Homme du Kilomètre',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 95,
    technique: 86,
    endurance: 70,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts en Étapes 1 ou 2 (kilomètre lancé).',
    summary: 'Septuple champion du monde sur piste, auteur d’un triplé historique aux Mondiaux de Cali 2014 (Kilomètre, Keirin, Vitesse) et d’un kilomètre légendaire en 56 s 303.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '56 s 303',
    keyFact: 'Seul pistard de l’histoire à remporter les trois titres individuels du sprint lors d’un même Mondial.',
    specialTrait: 'Arraché de Bielle au Portillon',
    wikiSlug: 'François_Pervis'
  },
  {
    id: 'piste-bauge',
    title: 'Grégory Baugé',
    subtitle: 'Le Tigre • Quadruple Champion du Monde de Vitesse',
    roleTag: 'Sprinteur Vitesse',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 93,
    technique: 89,
    endurance: 68,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 12,
    effectDescription: '+12 pts immédiats sur terrain Piste.',
    summary: 'Neuf fois champion du monde sur piste (dont 4 titres en vitesse individuelle), célèbre pour ses démarrages explosifs depuis la balustrade.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '9 Titres',
    keyFact: 'A mené l’équipe de France de vitesse par équipes au sommet mondial pendant près d’une décennie.',
    specialTrait: 'Bond du Tigre depuis la Côte d’Azur',
    wikiSlug: 'Grégory_Baugé'
  },
  {
    id: 'piste-gros',
    title: 'Mathilde Gros',
    subtitle: 'Championne du Monde de Vitesse à SQY (2022)',
    roleTag: 'Sprinteuse Vitesse',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 86,
    technique: 83,
    endurance: 66,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 10,
    effectDescription: '+10 pts immédiats sur terrain Piste.',
    summary: 'Pistarde française sacrée championne du monde de vitesse individuelle à 23 ans devant son public au Vélodrome national de Saint-Quentin-en-Yvelines.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'SQY 2022',
    keyFact: 'Première Française championne du monde de vitesse individuelle depuis Félicia Ballanger.',
    specialTrait: 'Accélération dans le Virage',
    wikiSlug: 'Mathilde_Gros'
  },
  {
    id: 'piste-recordheure',
    title: 'Le Record de l\'Heure sur Vélodrome',
    subtitle: 'Monument Solitaire • 60 Minutes Face au Chronomètre',
    roleTag: 'Épreuve Ultime',
    discipline: 'Piste',
    linkedDisciplines: ['Piste', 'Route'],
    category: 'Épreuve / Monument',
    rarity: 'Épique',
    energyCost: 4,
    power: 91,
    technique: 87,
    endurance: 98,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 6,
    effectDescription: '+6 pts par carte Piste jouée dans le match.',
    summary: 'L’épreuve la plus pure et la plus cruelle du cyclisme depuis 1893 : tourner seul pendant une heure exacte en frôlant la ligne noire de mesure.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: '60 Minutes',
    keyFact: 'Pour valider la distance officielle, le coureur doit rester strictement sous la ligne noire de mesure.',
    specialTrait: 'Transe de la Ligne Noire',
    wikiSlug: 'Record_de_l\'heure_cycliste'
  },
  {
    id: 'piste-keirin-epreuve',
    title: 'Finale du Keirin derrière Derny',
    subtitle: 'Épreuve Reine du Sprint en Meute • 75 km/h',
    roleTag: 'Épreuve Keirin',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 92,
    technique: 88,
    endurance: 68,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts en Étapes 4 ou 5 (à 3 tours de la cloche).',
    summary: 'Six colosses lancés derrière un lièvre motorisé jusqu’à 50 km/h avant trois tours de combat épaule contre épaule à plus de 75 km/h.',
    nationality: 'Japon / UCI',
    countryCode: 'JPN',
    keyYear: '1948',
    keyFact: 'Il est interdit de dépasser la roue arrière du derny avant qu’il ne quitte la piste à 750 m de l’arrivée.',
    specialTrait: 'Déboîtement à la Cloche',
    wikiSlug: 'Keirin'
  },
  {
    id: 'piste-sixjours',
    title: 'Les Six Jours sur Piste (Gand & Londres)',
    subtitle: 'Épreuve Nocturne Mythique • Chasse, Américaine & Derny',
    roleTag: 'Show Nocturne',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Épreuve / Monument',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 78,
    technique: 85,
    endurance: 86,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 10,
    effectDescription: '+10 pts si précédée par une autre discipline.',
    summary: 'Show cycliste légendaire disputé pendant six nuits dans une ambiance électrique mêlant poursuites à l’américaine, éliminations et tours lancés.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '6 Nuits',
    keyFact: 'Le Kuipke de Gand est un anneau minuscule de 166 mètres aux virages vertigineux inclinés à 52 degrés.',
    specialTrait: 'Ambiance Électrique du Kuipke'
  },
  {
    id: 'piste-virage-sqy',
    title: 'Le Virage Relevé à 43,8° (Pin de Sibérie)',
    subtitle: 'Secteur de Vélodrome • Force Centrifuge & Plongeon',
    roleTag: 'Vélodrome JO 24',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 88,
    technique: 91,
    endurance: 76,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 11,
    effectDescription: 'Plonge dans la ligne droite : +11 pts à la prochaine carte !',
    summary: 'Mur de pin de Sibérie incliné à près de 44° : il faut rouler à plus de 28 km/h pour tenir en haut, puis plonger de la balustrade pour gagner 15 km/h.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '43,8°',
    keyFact: 'Une piste olympique moderne mesure exactement 250 m et comporte trois lignes : noire, rouge (sprint) et bleue (stayer).',
    specialTrait: 'Plongeon depuis la Balustrade',
    wikiSlug: 'Vélodrome_national_de_Saint-Quentin-en-Yvelines'
  },
  {
    id: 'piste-veloroubaix',
    title: 'Vélodrome André-Pétrieux de Roubaix',
    subtitle: 'Anneau Extérieur en Béton de 499,75 m',
    roleTag: 'Anneau Historique',
    discipline: 'Piste',
    linkedDisciplines: ['Piste', 'Route'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 84,
    technique: 85,
    endurance: 88,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts en Étape 4 ou 5 (arrivée finale à Roubaix).',
    summary: 'Sanctuaire historique inauguré en 1936 où se dénoue Paris-Roubaix après un tour et demi sur ses larges dalles de béton gris.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '499,75 m',
    keyFact: 'Ses célèbres cabines de douches en béton portent une plaque de cuivre au nom de chaque vainqueur.',
    specialTrait: 'Sprint d’Un Tour et Demi',
    wikiSlug: 'Vélodrome_André-Pétrieux'
  },
  {
    id: 'piste-aguascalientes',
    title: 'Vélodrome en Altitude d’Aguascalientes (1 887 m)',
    subtitle: 'Secteur Chasse aux Records • Air Raréfié du Mexique',
    roleTag: 'Anneau Altitude',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 85,
    technique: 78,
    endurance: 70,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 10,
    effectDescription: '+10 pts en Étapes 1 ou 2 (densité de l’air réduite).',
    summary: 'Anneau mexicain perché à près de 1 900 m d’altitude où la faible densité atmosphérique permet aux pistards d’exploser les records du monde de vitesse et du kilomètre.',
    nationality: 'Mexique',
    countryCode: 'MEX',
    keyYear: '1 887 m',
    keyFact: 'Moins d’oxygène signifie moins de traînée aérodynamique : idéal pour les efforts explosifs sous 4 minutes.',
    specialTrait: 'Air Raréfié Ultra-Rapide'
  },
  {
    id: 'piste-surplace',
    title: 'Surplace Tactique en Haut de Virage',
    subtitle: 'Technique de Vitesse sur Piste • Duel Psychologique',
    roleTag: 'Technique Vitesse',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 75,
    technique: 91,
    endurance: 68,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 11,
    effectDescription: 'Piège l’adversaire en tête : -11 pts au score adverse !',
    summary: 'Maintenir son vélo à pignon fixe totalement immobile en équilibre dans la pente du virage pour forcer son adversaire à passer devant et garder l’aspiration.',
    nationality: 'Technique Piste',
    countryCode: 'TCG',
    keyYear: '63 min max',
    keyFact: 'En 1968 à Milan, Bianchetto et Pettenella ont tenu 63 minutes en surplace avant que l’UCI ne limite l’exercice.',
    specialTrait: 'Équilibre Statique & Piège'
  },
  {
    id: 'piste-relais-madison',
    title: 'Relais à l\'Américaine (Main Lancée)',
    subtitle: 'Technique Duo • Transfert Cinétique à 60 km/h',
    roleTag: 'Technique Duo',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 81,
    technique: 89,
    endurance: 79,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 11,
    effectDescription: 'Propulse le relayeur : +11 pts à votre prochaine carte !',
    summary: 'Au cœur du peloton lancé à 60 km/h, le coureur en course saisit la main de son équipier et le catapulte vers l’avant en lui transférant toute son inertie.',
    nationality: 'Technique Piste',
    countryCode: 'TCG',
    keyYear: 'Madison',
    keyFact: 'Le coureur au repos patiente au-dessus de la ligne bleue des stayers avant de plonger dans le peloton pour recevoir le relais.',
    specialTrait: 'Catapulte Humaine en Duo',
    wikiSlug: 'Course_à_l\'américaine_(cyclisme)'
  },
  {
    id: 'piste-aspi-derny',
    title: 'Aspiration derrière Derny (55 km/h)',
    subtitle: 'Tactique Piste • Lancement Progressif de l’Effort',
    roleTag: 'Tactique Keirin',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 83,
    technique: 79,
    endurance: 71,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 9,
    effectDescription: 'Économise l’effort initial : +9 pts à votre prochaine carte.',
    summary: 'Caler son pneu avant à dix centimètres du rouleau protecteur arrière du cyclomoteur pour rouler à 55 km/h à seulement 250 Watts avant l’emballage final.',
    nationality: 'Technique Piste',
    countryCode: 'TCG',
    keyYear: 'Derny',
    keyFact: 'Le derny possède un rouleau métallique arrière horizontal qui empêche la roue avant du pistard de frotter.',
    specialTrait: 'Sillage Moteur jusqu’aux 750 m'
  },
  {
    id: 'piste-pignon-fixe',
    title: 'Vélo de Piste Pignon Fixe Carbone (64x14)',
    subtitle: 'Matériel Vélodrome • Sans Freins ni Roue Libre',
    roleTag: 'Matériel Piste',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 79,
    technique: 73,
    endurance: 68,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 5,
    effectDescription: '+5 pts par carte Matériel & Technique jouée.',
    summary: 'Machine d’une rigidité absolue dépourvue de freins et de roue libre : avec un braquet géant de 64x14 (près de 10 m par tour), seul le contre-pédalage ralentit le vélo.',
    nationality: 'Matériel Piste',
    countryCode: 'TCG',
    keyYear: 'Sans Freins',
    keyFact: 'Les freins sont interdits sur piste car un coup de frein brutal provoquerait un carambolage dans le virage relevé.',
    specialTrait: 'Rigidité Totale & Braquet 64x14'
  },
  {
    id: 'piste-portillon',
    title: 'Arraché du Portillon Automatique',
    subtitle: 'Technique Départ Arrêté • Force Pure sur les 60 Premiers Mètres',
    roleTag: 'Départ Arrêté',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 80,
    technique: 75,
    endurance: 62,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 9,
    effectDescription: '+9 pts en Étape 1 ou 2 (démarrage explosif).',
    summary: 'Tirer violemment sur le cintre vers le haut tout en poussant sur les cales bloquées dans les sangles dès le compte à rebours du portillon pneumatique.',
    nationality: 'Technique Piste',
    countryCode: 'TCG',
    keyYear: '0 à 60 km/h',
    keyFact: 'Les démarreurs de vitesse par équipes bouclent le premier tour de 250 m départ arrêté en environ 17 secondes.',
    specialTrait: 'Couple Maximum au Top Départ'
  },
  {
    id: 'piste-casque-visiere',
    title: 'Casque Profilé Visière Panoramique & Combinaison',
    subtitle: 'Matériel Vélodrome • Peau de Requin & Carbone',
    roleTag: 'Aéro Piste',
    discipline: 'Piste',
    linkedDisciplines: ['Piste', 'Route'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 74,
    technique: 74,
    endurance: 69,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 5,
    effectDescription: '+5 pts par carte Matériel & Technique jouée.',
    summary: 'Combinaison cousue sur mesure avec bandes texturées sur les manches pour contrôler la couche limite d’air jusqu’à 80 km/h.',
    nationality: 'Matériel Piste',
    countryCode: 'TCG',
    keyYear: 'Aéro Piste',
    keyFact: 'La combinaison de piste est ajustée si près du corps qu’il est presque impossible de se tenir totalement droit debout dedans.',
    specialTrait: 'Contrôle de Couche Limite'
  },

  // ============================================================================
  // 5. CYCLO-CROSS (22 Cartes : Spécialistes, Classiques, Secteurs, Techniques CX)
  // ============================================================================
  {
    id: 'cx-nys',
    title: 'Sven Nys',
    subtitle: 'Le Cannibale de Baal • 291 Victoires dans les Labours',
    roleTag: 'Cannibale de Baal',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross', 'VTT'],
    category: 'Athlète / Légende',
    rarity: 'Légendaire',
    energyCost: 5,
    power: 93,
    technique: 99,
    endurance: 95,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 18,
    effectDescription: '+18 pts immédiats sur terrain Cyclo-cross ou VTT.',
    summary: 'L’icône absolue du cyclo-cross flamand : double champion du monde, 7 Coupes du monde, 13 Superprestiges et 9 victoires au Koppenbergcross.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '291 Victoires',
    keyFact: 'A remporté 13 fois le classement général du Superprestige et participé aux Jeux olympiques en VTT XCO.',
    specialTrait: 'Passage sur le Vélo en Boue Profonde',
    wikiSlug: 'Sven_Nys'
  },
  {
    id: 'cx-devlaeminck',
    title: 'Erik De Vlaeminck',
    subtitle: 'Monsieur Cyclo-cross • 7 Titres Mondiaux (1966-1973)',
    roleTag: '7x Mondial CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 91,
    technique: 95,
    endurance: 94,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 7,
    effectDescription: '+7 pts par carte Cyclo-cross jouée dans le match.',
    summary: 'Pionnier légendaire ayant régné sur le cyclo-cross mondial durant les années 1960-1970 avec sept maillots arc-en-ciel élites, un record resté inégalé pendant plus de 50 ans.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '7 Titres',
    keyFact: 'Frère aîné de Roger De Vlaeminck (Monsieur Paris-Roubaix) et premier détenteur de 7 titres mondiaux élites CX.',
    specialTrait: 'Règne des Années 70',
    wikiSlug: 'Erik_De_Vlaeminck'
  },
  {
    id: 'cx-stybar',
    title: 'Zdeněk Štybar',
    subtitle: 'Triple Champion du Monde de Cyclo-cross (2010, 2011, 2014)',
    roleTag: '3x Mondial CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 91,
    technique: 94,
    endurance: 89,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 15,
    effectDescription: '+15 pts en Étapes 4 ou 5 (dernier tour épique).',
    summary: 'Triple champion du monde élite de cyclo-cross au terme de duels légendaires avec Sven Nys, également vainqueur des Strade Bianche et sur le Tour de France.',
    nationality: 'Tchéquie',
    countryCode: 'CZE',
    keyYear: '2014',
    keyFact: 'Son duel du dernier tour face à Sven Nys aux Mondiaux de Hoogerheide 2014 reste une référence absolue.',
    specialTrait: 'Punch Glacé de Hoogerheide',
    wikiSlug: 'Zdeněk_Štybar'
  },
  {
    id: 'cx-vanempel',
    title: 'Fem van Empel',
    subtitle: 'Reine Néerlandaise des Sous-Bois • Multiple Championne du Monde',
    roleTag: 'Reine Hivernale',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 90,
    technique: 95,
    endurance: 88,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 14,
    effectDescription: '+14 pts en Étape 1 ou 2 (cavalière seule dès le départ).',
    summary: 'Prodige sacrée championne du monde élite dès 20 ans, alliant explosivité en relance, franchissement des planches sur le vélo et course à pied véloce.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: '2023 & 2024',
    keyFact: 'A remporté près de 90% de ses courses de cyclo-cross lors de la saison 2023-2024.',
    specialTrait: 'Relance Éclair en Épingle',
    wikiSlug: 'Fem_van_Empel'
  },
  {
    id: 'cx-albert',
    title: 'Niels Albert',
    subtitle: 'Double Champion du Monde CX (Hoogerheide 2009 & Coxyde 2012)',
    roleTag: 'Maître du Sable',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 89,
    technique: 90,
    endurance: 86,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 13,
    effectDescription: '+13 pts immédiats sur terrain Cyclo-cross.',
    summary: 'Spécialiste des dunes de sable de Coxyde et des circuits rapides, auteur d’une démonstration historique en menant du premier au dernier mètre aux Mondiaux 2012.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: 'Coxyde 2012',
    keyFact: 'A mené un quadruplé historique belge sur les plages de sable de Coxyde lors des Mondiaux 2012.',
    specialTrait: 'Maître des Dunes de Coxyde',
    wikiSlug: 'Niels_Albert'
  },
  {
    id: 'cx-brand',
    title: 'Lucinda Brand',
    subtitle: 'La Reine du Bourbier Lourd • Championne du Monde 2021',
    roleTag: 'Moteur Boue',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 87,
    technique: 87,
    endurance: 93,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 11,
    effectDescription: 'Aime la boue profonde : annule malus & +11 pts.',
    summary: 'Métronome infatigable de l’hiver : plus le circuit est lourd, boueux et exigeant à pied, plus sa puissance au seuil creuse des écarts dans le final.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: 'Ostende 2021',
    keyFact: 'A enchaîné plus de 30 podiums consécutifs sur les grandes classiques hivernales de cyclo-cross.',
    specialTrait: 'Traction dans le Bourbier',
    wikiSlug: 'Lucinda_Brand'
  },
  {
    id: 'cx-iserbyt',
    title: 'Eli Iserbyt',
    subtitle: 'Le Technicien des Dévers • Double Lauréat Coupe du Monde',
    roleTag: 'Technicien Dévers',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 84,
    technique: 92,
    endurance: 86,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 10,
    effectDescription: 'Intérieur serré dans l’épingle : -10 pts à l’adversaire.',
    summary: 'Gabarit léger et ultra-agile capable de virer dans un mouchoir de poche sur les dévers glissants, double vainqueur du classement général de la Coupe du monde UCI.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '2022 & 2024',
    keyFact: 'A remporté au cours de sa carrière la Coupe du monde, le Superprestige et le Trofee.',
    specialTrait: 'Pivot Instantané en Épingle',
    wikiSlug: 'Eli_Iserbyt'
  },
  {
    id: 'cx-compton',
    title: 'Katie Compton',
    subtitle: '15x Championne des États-Unis & 24 Manches Coupe du Monde',
    roleTag: 'Pionnière USA',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 81,
    technique: 83,
    endurance: 83,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte Cyclo-cross jouée dans le match.',
    summary: 'Pionnière américaine du cyclo-cross féminin ayant dominé son championnat national pendant quinze années consécutives et remporté 24 Coupes du monde.',
    nationality: 'États-Unis',
    countryCode: 'USA',
    keyYear: '15x USA',
    keyFact: 'A remporté 15 titres consécutifs de championne des États-Unis de cyclo-cross entre 2004 et 2018.',
    specialTrait: 'Régularité Transatlantique'
  },
  {
    id: 'cx-vanderhaar',
    title: 'Lars van der Haar',
    subtitle: 'Le Démarreur Fusée • Double Champion d’Europe CX',
    roleTag: 'Démarreur CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Athlète / Légende',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 84,
    technique: 86,
    endurance: 78,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 11,
    effectDescription: '+11 pts en Étapes 1 ou 2 (holeshot premier virage).',
    summary: 'Petit gabarit surpuissant au démarrage, abonné aux trous de souris dans le premier virage et aux podiums au Koppenbergcross.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: 'Holeshot',
    keyFact: 'Vainqueur du Koppenbergcross et double champion d’Europe élite de cyclo-cross (2015 et 2021).',
    specialTrait: 'Holeshot au Premier Virage'
  },
  {
    id: 'cx-mondiaux',
    title: 'Championnats du Monde de Cyclo-cross',
    subtitle: 'Une Heure d’Intensité Totale pour l’Arc-en-Ciel d’Hiver',
    roleTag: 'Mondial CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Épreuve / Monument',
    rarity: 'Épique',
    energyCost: 4,
    power: 91,
    technique: 94,
    endurance: 92,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 7,
    effectDescription: '+7 pts par carte Cyclo-cross jouée dans le match.',
    summary: 'Depuis le sacre inaugural de Jean Robic à Paris en 1950, le Mondial de cyclo-cross condense en 60 minutes à bloc toute la dramaturgie du vélo hivernal.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: '1950',
    keyFact: 'Jean Robic fut sacré premier champion du monde de cyclo-cross de l’histoire en 1950 à Paris.',
    specialTrait: 'Ferveur Hivernale Arc-en-Ciel',
    wikiSlug: 'Championnats_du_monde_de_cyclo-cross'
  },
  {
    id: 'cx-koppenberg',
    title: 'Koppenbergcross (L’Enfer du 1er Novembre)',
    subtitle: 'Monument des Labours • Pavés à 22% & Boue d’Audenarde',
    roleTag: 'Classique Boue',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross', 'Route'],
    category: 'Épreuve / Monument',
    rarity: 'Épique',
    energyCost: 4,
    power: 91,
    technique: 89,
    endurance: 94,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 15,
    effectDescription: '+15 pts en Étapes 4 ou 5 (dernier mur à 22%).',
    summary: 'Disputé chaque jour de la Toussaint : les coureurs gravissent à chaque tour les pavés à 22% du Koppenberg avant de plonger dans les prairies grasses.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '1er Nov.',
    keyFact: 'Le vainqueur reçoit un authentique pavé et les écarts dépassent souvent plusieurs minutes.',
    specialTrait: 'Acide Lactique au Koppenberg',
    wikiSlug: 'Koppenbergcross'
  },
  {
    id: 'cx-gavere',
    title: 'Cyclo-cross de Gavere (Château & Boue Lourde)',
    subtitle: 'Classique Hivernale • Côte Asphyxiante & Descente Rapide',
    roleTag: 'Classique Château',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 87,
    endurance: 89,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 11,
    effectDescription: '+11 pts immédiats sur terrain Cyclo-cross.',
    summary: 'Monument flamand disputé au lendemain de Noël dans le parc boueux du château de Grenier, célèbre pour son mur de boue interminable.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '26 Déc.',
    keyFact: 'L’effort dans la longue montée glaiseuse de Gavere oblige souvent à courir à côté du vélo.',
    specialTrait: 'Glaise Collante du Château'
  },
  {
    id: 'cx-zonhoven-kuil',
    title: 'La Fosse de Sable « De Kuil » (Zonhoven)',
    subtitle: 'Secteur Iconique CX • Plongeon Vertigineux dans le Sable',
    roleTag: 'Fosse de Sable',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 85,
    technique: 94,
    endurance: 83,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 12,
    effectDescription: 'Force l’adversaire à déclipper : -12 pts au score adverse !',
    summary: 'Cratère naturel de sable blond dans le Limbourg où les coureurs basculent dans une pente à 35% en plaçant tout leur poids derrière la selle.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: 'De Kuil',
    keyFact: 'Plus de 15 000 spectateurs entourent la fosse de Zonhoven pour regarder les plongeons dans l’ornière.',
    specialTrait: 'Plongeon dans l’Ornière de Sable',
    wikiSlug: 'Cyclo-cross_de_Zonhoven'
  },
  {
    id: 'cx-namur-devers',
    title: 'Le Dévers Oblique de la Citadelle (Namur)',
    subtitle: 'Secteur Technique CX • Glissade au Bord du Ravin',
    roleTag: 'Dévers Citadelle',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross', 'VTT'],
    category: 'Terrain / Secteur',
    rarity: 'Rare',
    energyCost: 3,
    power: 83,
    technique: 93,
    endurance: 86,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 12,
    effectDescription: '+12 pts sur terrain Cyclo-cross ou VTT.',
    summary: 'Pente transversale boueuse tracée sous les remparts de Vauban : il faut braquer vers le haut du talus tout en contrôlant la dérive des deux roues.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: 'Citadelle',
    keyFact: 'La Citadelle de Namur offre le plus fort dénivelé cumulé de toute la Coupe du monde de cyclo-cross.',
    specialTrait: 'Équilibre Funambule en Dévers',
    wikiSlug: 'Cyclo-cross_de_Namur'
  },
  {
    id: 'cx-coxyde-dunes',
    title: 'Les Dunes de Sable de Coxyde (Duinencross)',
    subtitle: 'Secteur Maritime • Ornières Profondes & Vent de la Mer du Nord',
    roleTag: 'Secteur Sable',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 81,
    technique: 86,
    endurance: 83,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 9,
    effectDescription: 'Surfe sur le sable mou : annule malus & +9 pts.',
    summary: 'Tracé côtier légendaire serpentant entre dunes géantes de sable sec et mou où il faut garder un braquet souple sans jamais casser son élan.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: 'Herygers Dune',
    keyFact: 'Coxyde a accueilli les Championnats du monde 1994 et 2012 au cœur de la Dune Herygers.',
    specialTrait: 'Surf dans le Sable de Mer'
  },
  {
    id: 'cx-saut-planches',
    title: 'Saut de Planches à Pleine Vitesse (40 cm)',
    subtitle: 'Technique Cyclo-cross • Bunny-Hop des Double Obstacles',
    roleTag: 'Technique Planches',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross', 'VTT'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 81,
    technique: 90,
    endurance: 74,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 12,
    effectDescription: 'Gagne 3 secondes par tour : +12 pts à votre prochaine carte !',
    summary: 'Au lieu de poser pied à terre pour courir par-dessus les deux planches de 40 cm, les meilleurs techniciens les sautent sur le vélo à plus de 30 km/h.',
    nationality: 'Technique CX',
    countryCode: 'TCG',
    keyYear: '40 cm max',
    keyFact: 'Le règlement UCI fixe la hauteur maximale des planches artificielles à 40 cm, espacées de 4 à 6 mètres.',
    specialTrait: 'Gain de 3 s/Tour sur les Planches'
  },
  {
    id: 'cx-portage-sable',
    title: 'Portage à l\'Épaule & Sprint dans les Escaliers',
    subtitle: 'Technique Cyclo-cross • Démontage Éclair en Mouvement',
    roleTag: 'Technique Portage',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 80,
    technique: 85,
    endurance: 85,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 10,
    effectDescription: '+10 pts si précédée par une autre discipline.',
    summary: 'Décliper en roulant, passer le bras dans le cadre pour poser le tube horizontal sur l’épaule et gravir quatre par quatre les marches boueuses.',
    nationality: 'Technique CX',
    countryCode: 'TCG',
    keyYear: 'Portage',
    keyFact: 'Les cadres de cyclo-cross ont un tube supérieur aplati dessous et des câbles routés en interne pour ne pas blesser l’épaule.',
    specialTrait: 'Transition Vélo-Course Instantanée'
  },
  {
    id: 'cx-boyaux-dugast',
    title: 'Boyaux Cousus Main 33 mm (1,4 bar)',
    subtitle: 'Matériel Cyclo-cross • Carcasse Coton & Crampons Rhino',
    roleTag: 'Boyaux 33 mm',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 75,
    technique: 88,
    endurance: 77,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 6,
    effectDescription: '+6 pts par carte Matériel & Technique jouée.',
    summary: 'Boyaux artisanaux limités à 33 mm par l’UCI mais gonflés à seulement 1,35 bar pour mordre la glaise liquide sans déjanter dans les virages.',
    nationality: 'Matériel CX',
    countryCode: 'TCG',
    keyYear: '33 mm',
    keyFact: 'Trois profils de sculpture dominent l’hiver : picots bas (sable), crampons intermédiaires (mixte) et crampons hauts espacés (boue profonde).',
    specialTrait: 'Motricité Boue à 1,35 Bar'
  },
  {
    id: 'cx-poste-depannage',
    title: 'Changement de Vélo au Poste Double',
    subtitle: 'Tactique Cyclo-cross • Échange à la Volée en 2 Secondes',
    roleTag: 'Poste Matériel',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 71,
    technique: 82,
    endurance: 76,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 8,
    effectDescription: 'Vélo propre : annule les malus de boue & +8 pts.',
    summary: 'Dans la boue collante qui alourdit le vélo de 4 kilos par demi-tour, sauter en voltige sur un vélo propre fraîchement nettoyé au poste.',
    nationality: 'Tactique CX',
    countryCode: 'TCG',
    keyYear: 'Poste Double',
    keyFact: 'Contrairement au VTT XCO, le changement complet de vélo au poste matériel est autorisé à chaque demi-tour.',
    specialTrait: 'Gain de 4 Kilos au Poste'
  },
  {
    id: 'cx-saut-amazone',
    title: 'Saut en Amazone & Réception en Selle',
    subtitle: 'Technique Cyclo-cross • Remontée Fluide Sans Freiner',
    roleTag: 'Technique Remontée',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 72,
    technique: 82,
    endurance: 70,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 8,
    effectDescription: 'Reclipe en 1 tour de pédale : +8 pts à la prochaine carte.',
    summary: 'Courir main sur la potence et main sur la selle, lancer la jambe droite par-dessus le vélo en glissant l’intérieur de la cuisse sur la selle pour recliper dès le premier appui.',
    nationality: 'Technique CX',
    countryCode: 'TCG',
    keyYear: 'Amazone',
    keyFact: 'Une remontée propre sans atterrir brutalement sur le périnée fait gagner 1 à 2 secondes à chaque obstacle.',
    specialTrait: 'Remontée Aérienne Fluide'
  },
  {
    id: 'cx-nocturne-diegem',
    title: 'Nocturne de Diegem sous les Projecteurs',
    subtitle: 'Épreuve Ambiance • Course à 20h30 sous la Ferveur Flamande',
    roleTag: 'Course Nocturne',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Épreuve / Monument',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 81,
    technique: 84,
    endurance: 78,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 10,
    effectDescription: '+10 pts en Étapes 4 ou 5 (final sous projecteurs).',
    summary: 'Le seul cyclo-cross disputé de nuit en plein cœur de ville sous les projecteurs halogènes et l’odeur des friteries devant 25 000 fans en délire.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '20h30 Nuit',
    keyFact: 'Disputé fin décembre depuis 1975 dans les rues et parcs éclairés de Diegem près de Bruxelles.',
    specialTrait: 'Magie Nocturne de Diegem'
  },
  {
    id: 'cx-crampons-acier',
    title: 'Chaussures à Crampons Acier 18 mm',
    subtitle: 'Matériel Cyclo-cross • Grip Vertical sur Glace & Pente Grasse',
    roleTag: 'Crampons Hiver',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 70,
    technique: 79,
    endurance: 75,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 8,
    effectDescription: '+8 pts en Étape 1 ou 2 (talus glissant).',
    summary: 'Deux pointes coniques vissées sous l’avant de la semelle carbone pour planter ses appuis dans les montées boueuses ou verglacées lors des portions pédestres.',
    nationality: 'Matériel CX',
    countryCode: 'TCG',
    keyYear: 'Pointes 18mm',
    keyFact: 'Des crampons de 15 à 18 mm à l’avant de la chaussure évitent de glisser sur le ventre dans les talus à 30%.',
    specialTrait: 'Ancrage Pédestre Acier'
  },

  // ============================================================================
  // 6. CARTES SUPPLÉMENTAIRES POUR ATTEINDRE 105+ CARTES ÉQUILIBRÉES
  // ============================================================================
  {
    id: 'route-anquetil',
    title: 'Jacques Anquetil',
    subtitle: 'Maître Jacques • Premier Quintuple Vainqueur du Tour',
    roleTag: 'Rouleur-Maître',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'Piste'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 93,
    technique: 87,
    endurance: 94,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 13,
    effectDescription: '+13 pts sur terrain Route ou Piste.',
    summary: 'Horloger normand du contre-la-montre, premier coureur de l’histoire à remporter 5 Tours de France et les 3 Grands Tours (Tour, Giro, Vuelta).',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1964',
    keyFact: 'Son duel épaule contre épaule avec Raymond Poulidor dans le Puy de Dôme 1964 est gravé dans la légende.',
    specialTrait: 'Style Puriste du Chronomètre',
    wikiSlug: 'Jacques_Anquetil'
  },
  {
    id: 'route-vanvleuten',
    title: 'Annemiek van Vleuten',
    subtitle: 'Reine des Grands Tours • Triplé Giro-Tour-Vuelta 2022',
    roleTag: 'Grimpeuse-CLM',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 90,
    technique: 87,
    endurance: 96,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 15,
    effectDescription: '+15 pts en Étape 4 ou 5 (raid solitaire final).',
    summary: 'Championne olympique du contre-la-montre, double championne du monde et auteure en 2022 du triplé historique des trois Grands Tours féminins plus le Mondial.',
    nationality: 'Pays-Bas',
    countryCode: 'NED',
    keyYear: '2022',
    keyFact: 'A remporté le Tour de France Femmes 2022 en s’isolant seule dès le col du Petit Ballon.',
    specialTrait: 'Raid de la Planche des Belles Filles',
    wikiSlug: 'Annemiek_van_Vleuten'
  },
  {
    id: 'route-giro',
    title: 'Tour d\'Italie (Il Giro • Maglia Rosa)',
    subtitle: 'La Corsa Rosa • Passo dello Stelvio & Dolomites (1909)',
    roleTag: 'Grand Tour',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Épreuve / Monument',
    rarity: 'Épique',
    energyCost: 4,
    power: 88,
    technique: 89,
    endurance: 95,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte Route jouée dans le match.',
    summary: 'Grand Tour printanier mythique traversant les cols enneigés à plus de 2 700 m comme le Stelvio et le Gavia pour la Maglia Rosa.',
    nationality: 'Italie',
    countryCode: 'ITA',
    keyYear: '1909',
    keyFact: 'La Cima Coppi désigne chaque année le col le plus haut de la course ; le maillot rose vient du papier de La Gazzetta dello Sport.',
    specialTrait: 'Cima Coppi dans les Dolomites',
    wikiSlug: 'Tour_d\'Italie'
  },
  {
    id: 'vtt-bresset',
    title: 'Julie Bresset',
    subtitle: 'Championne Olympique Londres 2012 & Double Championne du Monde',
    roleTag: 'Or JO XCO',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 89,
    endurance: 88,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts si engagée en Étape 1 ou 2.',
    summary: 'Championne olympique de VTT cross-country à Hadleigh Farm (Londres 2012) et double championne du monde XCO en 2012 et 2013.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: 'Londres 2012',
    keyFact: 'A offert à la France l’or olympique en VTT à seulement 23 ans puis défendu son titre mondial en 2013.',
    specialTrait: 'Envole de Hadleigh Farm',
    wikiSlug: 'Julie_Bresset'
  },
  {
    id: 'vtt-minnaar',
    title: 'Greg Minnaar',
    subtitle: 'The G.O.A.T. de la DH • 4 Titres Mondiaux & 23 Coupes du Monde',
    roleTag: 'GOAT DH',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Athlète / Légende',
    rarity: 'Épique',
    energyCost: 4,
    power: 90,
    technique: 96,
    endurance: 77,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 6,
    effectDescription: '+6 pts par carte VTT jouée dans le match.',
    summary: 'Sud-Africain au style impérial longiligne, détenteur de 23 victoires en Coupe du monde de descente et champion du monde à près de 40 ans à Val di Sole 2021.',
    nationality: 'Afrique du Sud',
    countryCode: 'RSA',
    keyYear: '23 Victoires',
    keyFact: 'A remporté 4 titres mondiaux élites en descente entre 2003 et 2021 sur trois décennies différentes.',
    specialTrait: 'Fluidité Inusable sur Trois Décennies',
    wikiSlug: 'Greg_Minnaar'
  },
  {
    id: 'piste-levier',
    title: 'Vitesse par Équipes (Relais à 3)',
    subtitle: 'Épreuve Olympique • Synchronisation au Centième',
    roleTag: 'Épreuve Équipe',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Épreuve / Monument',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 86,
    technique: 83,
    endurance: 67,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 10,
    effectDescription: 'Écartement parfait : +10 pts à votre prochaine carte.',
    summary: 'Trois sprinters lancés départ arrêté sur 750 m (3 tours) : chaque coureur mène un tour à bloc avant de s’écarter dans le virage pour laisser filer ses équipiers.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: '750 m',
    keyFact: 'Un écartement de plus de 15 mètres au passage sur la ligne entre le coureur qui sort et son relayeur entraîne la disqualification.',
    specialTrait: 'Passage de Relais Millimétré'
  },
  {
    id: 'piste-poursuite-ind',
    title: 'Poursuite Individuelle 4 000 m',
    subtitle: 'Épreuve Reine du Chronomètre sur Bois • Face à Face Opposé',
    roleTag: 'Épreuve 4 000 m',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Épreuve / Monument',
    rarity: 'Rare',
    energyCost: 3,
    power: 89,
    technique: 84,
    endurance: 90,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 12,
    effectDescription: '+12 pts en Étapes 1 ou 2 (allure record dès le 1er km).',
    summary: 'Deux coureurs s’élancent simultanément aux deux lignes opposées du vélodrome pour couvrir 16 tours (4 000 m) en dessous des 4 minutes.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: 'Sub-4 min',
    keyFact: 'Si un coureur rattrape physiquement son adversaire sur la piste, la poursuite s’arrête immédiatement par victoire.',
    specialTrait: 'Traque sur Lignes Opposées'
  },
  {
    id: 'cx-robic',
    title: 'Jean Robic',
    subtitle: 'Tête de Cuir • Premier Champion du Monde CX (1950) & Tour 1947',
    roleTag: '1ᵉʳ Mondial 1950',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross', 'Route'],
    category: 'Athlète / Légende',
    rarity: 'Rare',
    energyCost: 3,
    power: 85,
    technique: 87,
    endurance: 91,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts en Étapes 4 ou 5 (renversement héroïque final).',
    summary: 'Légende bretonne au casque de cuir, vainqueur du Tour de France 1947 lors de la dernière étape vers Paris et tout premier champion du monde de cyclo-cross en 1950.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '1950',
    keyFact: 'A inventé la technique de l’élan dans les descentes et triomphé à Paris en 1950 devant 40 000 spectateurs.',
    specialTrait: 'Panache de Biquet',
    wikiSlug: 'Jean_Robic'
  },
  // Cartes Communes & Peu Communes supplémentaires pour un pool Gacha & Budget 16⚡ ultra-riche
  {
    id: 'route-tourmalet',
    title: 'Col du Tourmalet (2 115 m)',
    subtitle: 'Géant des Pyrénées • Col le Plus Franchi du Tour',
    roleTag: 'Col Pyrénéen',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Terrain / Secteur',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 76,
    technique: 76,
    endurance: 88,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 5,
    effectDescription: '+5 pts par carte Route jouée dans le match.',
    summary: 'Plus haut col routier des Pyrénées françaises, gravi plus de 85 fois par le Tour de France depuis Octave Lapize en 1910.',
    nationality: 'France',
    countryCode: 'FRA',
    keyYear: '2 115 m',
    keyFact: 'En 1910, Octave Lapize franchit le sommet à pied et lança aux organisateurs « Vous êtes des assassins ! ».',
    specialTrait: 'Statue du Géant Lapize',
    wikiSlug: 'Col_du_Tourmalet'
  },
  {
    id: 'route-patin-braquet',
    title: 'Braquet Souple en Vélocité (105 tr/min)',
    subtitle: 'Technique Grimpeur Route • Économie Musculaire',
    roleTag: 'Technique Cadence',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 67,
    technique: 75,
    endurance: 79,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 5,
    effectDescription: '+5 pts par carte Matériel & Technique jouée.',
    summary: 'Tourner les jambes rapidement sur un petit développement (39x32 ou 36x30) préserve les fibres musculaires pour la troisième semaine.',
    nationality: 'Technique Route',
    countryCode: 'TCG',
    keyYear: '105 RPM',
    keyFact: 'Passer d’une cadence de 70 à 100 tr/min transfère une grande partie de la charge des muscles vers le système cardiovasculaire.',
    specialTrait: 'Moulinette Haute Fréquence'
  },
  {
    id: 'route-relais-echappee',
    title: 'Relais Appuyé en Échappée',
    subtitle: 'Action Tactique • Entente Parfaite des Baroudeurs',
    roleTag: 'Tactique Base',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 73,
    technique: 74,
    endurance: 76,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 9,
    effectDescription: '+9 pts si jouée en Étape 1 ou 2.',
    summary: 'Passer des relais courts de 20 secondes en tête sans à-coups tout en prenant soin de s’abriter du côté opposé au vent.',
    nationality: 'Tactique Route',
    countryCode: 'TCG',
    keyYear: 'Relais 20s',
    keyFact: 'Un groupe de 5 baroudeurs bien organisés économise près de 25% d’énergie par rapport à un homme seul.',
    specialTrait: 'Tourniquet Parfait'
  },
  {
    id: 'vtt-pression-fourche',
    title: 'Réglage Rebond & Tokens de Fourche Air',
    subtitle: 'Matériel & Mécanique VTT • Préparation Suspensions',
    roleTag: 'Réglage Air',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 66,
    technique: 81,
    endurance: 70,
    keyword: 'Continu',
    effectCode: 'ONGOING_GEAR_SCALING',
    effectValue: 5,
    effectDescription: '+5 pts par carte Matériel & Technique jouée.',
    summary: 'Ajuster le SAG à 25% et ajouter des cales de volume (tokens) dans la chambre positive pour garder de la sensibilité tout en évitant le talonnage sur gros chocs.',
    nationality: 'Mécanique VTT',
    countryCode: 'TCG',
    keyYear: 'SAG 25%',
    keyFact: 'Le SAG correspond à l’enfoncement statique de la suspension sous le seul poids du pilote en position d’attaque.',
    specialTrait: 'Courbe Progressive sans Talonnage'
  },
  {
    id: 'vtt-pump-track',
    title: 'Enchaînement Pump-Track sans Pédaler',
    subtitle: 'Technique Pilotage VTT • Générer de la Vitesse par Pompage',
    roleTag: 'Technique Pompage',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Terrain / Secteur',
    rarity: 'Commune',
    energyCost: 1,
    power: 72,
    technique: 82,
    endurance: 68,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 9,
    effectDescription: 'Conserve l’inertie : +9 pts à votre prochaine carte.',
    summary: 'Absorber les bosses avec les bras et pousser fort dans les creux des rollers pour accélérer à 40 km/h sans donner un seul coup de pédale.',
    nationality: 'Technique VTT',
    countryCode: 'TCG',
    keyYear: 'Zéro Pédale',
    keyFact: 'Le pompage transforme l’énergie potentielle de gravité en vitesse horizontale à chaque compression.',
    specialTrait: 'Inertie Pure sur Rollers'
  },
  {
    id: 'vtt-singletrack-pin',
    title: 'Singletrack d’Épingles en Sous-Bois',
    subtitle: 'Terrain VTT Naturel • Aiguilles de Pin & Racines',
    roleTag: 'Sentier Naturel',
    discipline: 'VTT',
    linkedDisciplines: ['VTT', 'Cyclo-cross'],
    category: 'Terrain / Secteur',
    rarity: 'Commune',
    energyCost: 1,
    power: 68,
    technique: 80,
    endurance: 75,
    keyword: 'Synergie',
    effectCode: 'SYNERGY_MULTI_DISC',
    effectValue: 8,
    effectDescription: '+8 pts si la carte précédente était d’une autre discipline.',
    summary: 'Sentier monotrace large comme un pneu sinuant entre les sapins où l’anticipation du regard fait toute la différence.',
    nationality: 'Terrain VTT',
    countryCode: 'TCG',
    keyYear: 'Monotrace',
    keyFact: 'En VTT technique, le regard doit toujours se porter 5 à 10 mètres devant la roue avant et jamais sur le pneu.',
    specialTrait: 'Regard Lointain en Monotrace'
  },
  {
    id: 'piste-ligne-noire',
    title: 'Tenue Millimétrée de la Ligne Noire',
    subtitle: 'Technique Piste • Trajectoire la Plus Courte (250 m exacts)',
    roleTag: 'Trajectoire Piste',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 71,
    technique: 79,
    endurance: 73,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 7,
    effectDescription: 'Trajectoire optimale : annule les malus & +7 pts.',
    summary: 'La distance officielle d’un vélodrome (250 m) est mesurée exactement à 20 cm au-dessus du bord intérieur de la ligne noire de mesure.',
    nationality: 'Technique Piste',
    countryCode: 'TCG',
    keyYear: '250,0 m',
    keyFact: 'Rouler 1 mètre au-dessus de la ligne noire fait parcourir environ 6,28 mètres supplémentaires à chaque tour !',
    specialTrait: 'Corde Intérieure Absolue'
  },
  {
    id: 'piste-course-tempo',
    title: 'Course Tempo (1 Point par Tour)',
    subtitle: 'Épreuve Piste d’Endurance • 40 Tours à Haute Intensité',
    roleTag: 'Épreuve Endurance',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Épreuve / Monument',
    rarity: 'Commune',
    energyCost: 1,
    power: 75,
    technique: 74,
    endurance: 77,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 9,
    effectDescription: '+9 pts si jouée en Étape 1 ou 2.',
    summary: 'Deuxième épreuve de l’Omnium : après les 5 premiers tours, le premier coureur sur la ligne à chaque tour remporte 1 point, et prendre un tour rapporte 20 points.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: '10 km',
    keyFact: 'Le rythme y est souvent supérieur à 52 km/h de moyenne tant la chasse au point par tour est incessante.',
    specialTrait: 'Chasse au Point par Tour'
  },
  {
    id: 'piste-elimination',
    title: 'Course par Élimination (« L’Australienne »)',
    subtitle: 'Épreuve Piste • Le Dernier sur la Ligne Sort Tous les 2 Tours',
    roleTag: 'Australienne',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Épreuve / Monument',
    rarity: 'Peu commune',
    energyCost: 2,
    power: 81,
    technique: 86,
    endurance: 76,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 9,
    effectDescription: 'Enferme le rival à la corde : -9 pts à l’adversaire !',
    summary: 'Jeu de chaises musicales à 55 km/h : tous les deux tours, la roue arrière qui franchit la ligne en dernière position est éliminée par le jury.',
    nationality: 'International',
    countryCode: 'INT',
    keyYear: 'Élimination',
    keyFact: 'La décision d’élimination se juge sur la roue ARRIÈRE du coureur au passage sur la ligne d’arrivée.',
    specialTrait: 'Survie dans le Peloton Resserré'
  },
  {
    id: 'cx-superprestige-niel',
    title: 'Jaarmarktcross de Niel (Boue de l’Escaut)',
    subtitle: 'Classique Hivernale Belge • 11 Novembre',
    roleTag: 'Classique Boue',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Épreuve / Monument',
    rarity: 'Commune',
    energyCost: 1,
    power: 73,
    technique: 77,
    endurance: 77,
    keyword: 'Continu',
    effectCode: 'ONGOING_DISC_AURA',
    effectValue: 4,
    effectDescription: '+4 pts par carte Cyclo-cross jouée dans le match.',
    summary: 'Classique belge disputée le 11 novembre le long des rives boueuses du Rupel, où les ornières profondes mettent la technique à rude épreuve.',
    nationality: 'Belgique',
    countryCode: 'BEL',
    keyYear: '11 Nov.',
    keyFact: 'Le tracé de Niel inclut souvent des pontons étroits au-dessus des mares d’eau hivernales.',
    specialTrait: 'Ornières du 11 Novembre'
  },
  {
    id: 'cx-lavage-karcher',
    title: 'Mécanicien Express au Poste Matériel',
    subtitle: 'Action Tactique CX • Pression 140 Bars & Changement Vélo',
    roleTag: 'Staff Méca CX',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 68,
    technique: 78,
    endurance: 77,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 8,
    effectDescription: 'Transmission impeccable : +8 pts à votre prochaine carte.',
    summary: 'Un tour sur deux dans la glaise, le mécanicien nettoie le vélo boueux en 45 secondes chrono pour qu’il soit immaculé au passage suivant du coureur.',
    nationality: 'Staff CX',
    countryCode: 'TCG',
    keyYear: '45 s Chrono',
    keyFact: 'Les mécaniciens pros apportent parfois jusqu’à trois ou quatre vélos identiques par coureur sur les Coupes du monde boueuses.',
    specialTrait: 'Vélos Immaculés en Boucle'
  },
  {
    id: 'poly-cadence-sprint',
    title: 'Lancer de Vélo sur la Ligne (Photo-Finish)',
    subtitle: 'Geste Universel • Gagner d’Un Demi-Boyau à 1000 Images/s',
    roleTag: 'Photo-Finish',
    discipline: 'Polyvalent',
    linkedDisciplines: ['Route', 'Piste', 'VTT', 'Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Commune',
    energyCost: 1,
    power: 76,
    technique: 78,
    endurance: 66,
    keyword: 'Sprint final',
    effectCode: 'SPRINT_FINAL_SURGE',
    effectValue: 10,
    effectDescription: '+10 pts en Étape 4 ou 5 (lancer de vélo sur la ligne).',
    summary: 'Pousser violemment le guidon vers l’avant tout en jetant le bassin derrière la selle dans les deux derniers mètres pour gagner vingt centimètres précieux sur la photo-finish.',
    nationality: 'Universel',
    countryCode: 'TCG',
    keyYear: 'Photo-Finish',
    keyFact: 'La caméra photo-finish moderne scanne la ligne blanche à plus de 3 000 à 10 000 lignes par seconde.',
    specialTrait: 'Demi-Boyau sur la Ligne'
  }
];
const ALL_CARD_SEEDS                   = [
  ...CUSTOM_TCG_SEEDS,
  ...EXTRA_TCG_SEEDS,
  ...EXPANSION_SERIES2_SEEDS
];
const INITIAL_CARDS_DATABASE             = ALL_CARD_SEEDS.map((seed, index) => {
  const overall = Math.round((seed.power + seed.technique + seed.endurance) / 3);
  const energyCost =
    seed.energyCost !== undefined
      ? seed.energyCost
      : RARITY_CONFIG[seed.rarity].defaultCost;

  const verifiedMedia = VERIFIED_COMMONS_MEDIA[seed.id];

  return {
    id: seed.id,
    cardNumber: index + 1,
    title: seed.title,
    subtitle: seed.subtitle,
    roleTag: seed.roleTag,
    discipline: seed.discipline,
    linkedDisciplines: seed.linkedDisciplines,
    category: seed.category,
    rarity: seed.rarity,
    energyCost,
    stats: {
      power: seed.power,
      technique: seed.technique,
      endurance: seed.endurance,
      overall
    },
    keyword: seed.keyword,
    effectCode: seed.effectCode,
    effectValue: seed.effectValue,
    effectDescription: seed.effectDescription,
    summary: seed.summary,
    nationality: seed.nationality,
    countryCode: seed.countryCode,
    keyYear: seed.keyYear,
    keyFact: seed.keyFact,
    specialTrait: seed.specialTrait,
    wikiSlug: seed.wikiSlug || EXTRA_WIKI_SLUGS[seed.id],
    imageUrl: verifiedMedia?.thumbnailUrl,
    imageAttribution: verifiedMedia?.attribution
  };
});
const BOOSTER_PACKS                = [
  {
    id: 'pack-peloton',
    name: 'Booster Peloton Intégral',
    subtitle: 'Toutes Disciplines • 5 Cartes TCG',
    description: 'Mélange les 4 disciplines et profils Polyvalents. La 5ᵉ carte garantit une Rare+. Compteur Pity à 10 (Épique+) et 30 (Légendaire).',
    costWatts: 150,
    allowFreeBidon: true,
    targetDiscipline: 'ALL',
    accentHex: '#f59e0b',
    ribbonLabel: 'PELOTON • BIDON OK',
    guaranteedMinRarity: 'Rare'
  },
  {
    id: 'pack-route',
    name: 'Booster Grands Tours & Pavés',
    subtitle: 'Spécial Route • 5 Cartes TCG',
    description: 'Grimpeurs, sprinteurs, Monuments pavés, cols hors catégorie, bordures et matériel WorldTour. 5ᵉ carte Rare+ garantie.',
    costWatts: 180,
    allowFreeBidon: false,
    targetDiscipline: 'Route',
    accentHex: '#eab308',
    ribbonLabel: 'SPÉCIAL ROUTE',
    guaranteedMinRarity: 'Rare'
  },
  {
    id: 'pack-vtt',
    name: 'Booster Singletrack & Downhill',
    subtitle: 'Spécial VTT • 5 Cartes TCG',
    description: 'Pilotes XCO et DH, Freeride, Rock Gardens, VTT Mullet 200 mm, Bunny-Hop et Scrub. 5ᵉ carte Rare+ garantie.',
    costWatts: 180,
    allowFreeBidon: false,
    targetDiscipline: 'VTT',
    accentHex: '#10b981',
    ribbonLabel: 'SPÉCIAL VTT',
    guaranteedMinRarity: 'Rare'
  },
  {
    id: 'pack-piste',
    name: 'Booster Anneau de Vélodrome',
    subtitle: 'Spécial Piste • 5 Cartes TCG',
    description: 'Sprinteurs, keirin, omnium, record de l’heure, virages à 43,8°, surplace et relais Madison. 5ᵉ carte Rare+ garantie.',
    costWatts: 180,
    allowFreeBidon: false,
    targetDiscipline: 'Piste',
    accentHex: '#06b6d4',
    ribbonLabel: 'SPÉCIAL PISTE',
    guaranteedMinRarity: 'Rare'
  },
  {
    id: 'pack-cx',
    name: 'Booster Labours, Sable & Boue',
    subtitle: 'Spécial Cyclo-cross • 5 Cartes TCG',
    description: 'Spécialistes des sous-bois, fosse de Zonhoven, Koppenberg, saut de planches et boyaux 33 mm. 5ᵉ carte Rare+ garantie.',
    costWatts: 180,
    allowFreeBidon: false,
    targetDiscipline: 'Cyclo-cross',
    accentHex: '#f97316',
    ribbonLabel: 'SPÉCIAL CYCLO-CROSS',
    guaranteedMinRarity: 'Rare'
  }
];
const TERRAIN_STAGES                 = [
  {
    id: 'stage-ventoux',
    name: 'Col de Haute Montagne (Mont Ventoux)',
    subtitle: 'Ascension Hors Catégorie • 21,5 km à 7,5%',
    favoredDiscipline: 'Route',
    description: 'Montée lunaire balayée par le mistral. Endurance et puissance au seuil sont décisives.',
    weather: 'Soleil & Mistral 70 km/h',
    elevation: '+1 610 m D+',
    statWeights: { power: 0.35, technique: 0.15, endurance: 0.50 },
    terrainBonusPct: 25,
    modifierTitle: 'Ascension des Leaders',
    modifierRule: 'Les cartes de Coût 4-5⚡ gagnent +10 pts ; Route +25%.',
    modifierType: 'HIGH_COST_PRESTIGE',
    modifierValue: 10
  },
  {
    id: 'stage-lesgets-dh',
    name: 'Descente VTT Rock Garden (Les Gets)',
    subtitle: 'Piste Noire DH • Sauts, Racines & Pierriers',
    favoredDiscipline: 'VTT',
    description: 'Plongée vertigineuse à 65 km/h entre sapins et racines humides.',
    weather: 'Averse Alpine',
    elevation: '-680 m D-',
    statWeights: { power: 0.30, technique: 0.55, endurance: 0.15 },
    terrainBonusPct: 25,
    modifierTitle: 'Ornières & Pierrier Glissant',
    modifierRule: '-8 pts aux cartes non-VTT (sauf Bouclier Météo / Tech ≥ 92).',
    modifierType: 'PENALIZE_NON_FAVORED',
    modifierValue: 8
  },
  {
    id: 'stage-velodrome-keirin',
    name: 'Vélodrome Olympique • Finale du Keirin',
    subtitle: 'Anneau en Bois 250 m Incliné à 43,8°',
    favoredDiscipline: 'Piste',
    description: 'Le derny s’écarte à 3 tours de la cloche : sprint furieux à plus de 75 km/h.',
    weather: 'Indoor Parfait (26°C)',
    elevation: 'Virages à 43,8°',
    statWeights: { power: 0.55, technique: 0.30, endurance: 0.15 },
    terrainBonusPct: 25,
    modifierTitle: 'Zone Watts Survoltée',
    modifierRule: 'Toute carte avec ⚡ Puissance ≥ 90 reçoit +11 pts bonus !',
    modifierType: 'POWER_OVERDRIVE',
    modifierValue: 11
  },
  {
    id: 'stage-cx-zonhoven',
    name: 'Circuit Boueux & Fosse de Sable (Zonhoven)',
    subtitle: 'Labours Hivernaux, Dévers & Saut de Planches',
    favoredDiscipline: 'Cyclo-cross',
    description: 'Plongeon dans la fosse de sable De Kuil suivi d’un bourbier profond et d’escaliers.',
    weather: 'Boue & Pluie (4°C)',
    elevation: 'Dévers & Sable',
    statWeights: { power: 0.25, technique: 0.50, endurance: 0.25 },
    terrainBonusPct: 25,
    modifierTitle: 'Bourbier & Pluie Hivernale',
    modifierRule: '+9 pts supplémentaires aux cartes Cyclo-cross ; -7 pts aux cartes non-CX sans Bouclier.',
    modifierType: 'PENALIZE_NON_FAVORED',
    modifierValue: 7
  },
  {
    id: 'stage-paves-arenberg',
    name: 'Secteur Pavé 5 Étoiles & Bordures',
    subtitle: 'Trouée d’Arenberg & Éventail dans le Vent',
    favoredDiscipline: 'Route',
    description: '2 300 m de pavés disjoints avalés à 55 km/h suivis d’une plaine exposée au vent.',
    weather: 'Vent de 3/4 & Poussière',
    elevation: 'Pavés *****',
    statWeights: { power: 0.45, technique: 0.25, endurance: 0.30 },
    terrainBonusPct: 25,
    modifierTitle: 'Abri dans l’Éventail',
    modifierRule: 'Les cartes à bas coût (1-2⚡) gagnent +10 pts d’agilité dans les bordures.',
    modifierType: 'LOW_COST_SHELTER',
    modifierValue: 10
  },
  {
    id: 'stage-vtt-xco',
    name: 'Circuit Olympique XCO (Dalle La Béatrice)',
    subtitle: 'Dalle Rocheuse Abrupte & Montées Explosives',
    favoredDiscipline: 'VTT',
    description: 'Circuit cardio alternant côtes à 22% et franchissements de dalles rocheuses.',
    weather: 'Humide & Technique',
    elevation: '+950 m D+',
    statWeights: { power: 0.30, technique: 0.40, endurance: 0.30 },
    terrainBonusPct: 25,
    modifierTitle: 'Matériel & Pilotage Clés',
    modifierRule: 'Les cartes « Matériel & Technique » reçoivent +10 pts de rendement.',
    modifierType: 'GEAR_TECH_BONUS',
    modifierValue: 10
  },
  {
    id: 'stage-piste-heure',
    name: 'Anneau de Vitesse • Poursuite & Record de l’Heure',
    subtitle: 'Effort Solitaire Millimétré sur la Ligne Noire',
    favoredDiscipline: 'Piste',
    description: 'Tenir plus de 56 km/h de moyenne sans jamais dévier de la ligne noire.',
    weather: 'Pression Basse (Record)',
    elevation: 'Anneau 250 m',
    statWeights: { power: 0.40, technique: 0.15, endurance: 0.45 },
    terrainBonusPct: 25,
    modifierTitle: 'Dernier Effort Chronométré',
    modifierRule: 'En Étape 4 ou 5, octroie +14 pts bonus de Sprint Final à toutes les cartes Piste/Route !',
    modifierType: 'DOUBLE_FINAL_ROUND',
    modifierValue: 14
  },
  {
    id: 'stage-cx-koppenberg',
    name: 'Mur du Koppenberg & Dévers de Namur',
    subtitle: 'Rampe Pavée à 22% & Ornières Glissantes',
    favoredDiscipline: 'Cyclo-cross',
    description: 'Effort violent à relancer dans chaque épingle et changer de vélo au poste.',
    weather: 'Brouillard Flandrien (2°C)',
    elevation: 'Pente max 22%',
    statWeights: { power: 0.35, technique: 0.35, endurance: 0.30 },
    terrainBonusPct: 25,
    modifierTitle: 'Relances à Bas Coût',
    modifierRule: 'Les cartes de Coût 1-2⚡ gagnent +9 pts pour leur nervosité au portage.',
    modifierType: 'LOW_COST_SHELTER',
    modifierValue: 9
  },
  {
    id: 'stage-enduro-mega',
    name: 'Spéciale Glacier & Forêt (Mégavalanche)',
    subtitle: 'Départ en Ligne sur Neige & Singletrack Alpin',
    favoredDiscipline: 'VTT',
    description: 'Glissade contrôlée sur névé suivie de 20 minutes de singletrack rapide.',
    weather: 'Neige & Soleil',
    elevation: '-2 600 m D-',
    statWeights: { power: 0.25, technique: 0.45, endurance: 0.30 },
    terrainBonusPct: 25,
    modifierTitle: 'Avantage Équipement',
    modifierRule: 'Les cartes « Matériel & Technique » reçoivent +10 pts bonus.',
    modifierType: 'GEAR_TECH_BONUS',
    modifierValue: 10
  },
  {
    id: 'stage-route-champs',
    name: 'Sprint Royal des Champs-Élysées / Poggio',
    subtitle: 'Arrivée Finale Prestige • Vitesse Maximale',
    favoredDiscipline: 'Route',
    description: 'Dernière ligne droite pavée devant une foule immense où tout se joue au lancer de vélo.',
    weather: 'Ciel Dégagé (24°C)',
    elevation: 'Pavés Urbains',
    statWeights: { power: 0.50, technique: 0.25, endurance: 0.25 },
    terrainBonusPct: 25,
    modifierTitle: 'Apothéose Finale',
    modifierRule: 'En Étape 4 ou 5, toutes les cartes reçoivent +12 pts d’adrénaline supplémentaire.',
    modifierType: 'DOUBLE_FINAL_ROUND',
    modifierValue: 12
  }
];
const AI_OPPONENTS               = [
  {
    id: 'ai-regional',
    name: 'DS Gérard « La Musette »',
    title: 'Directeur Sportif Division Nationale',
    difficulty: 'Souple',
    codeBadge: 'DN-1',
    description: 'Alignement modeste (budget 12⚡). Idéal pour roder vos synergies de cartes et vos attaques Quiz.',
    rewardWinWatts: 75,
    rewardLossWatts: 25,
    minRarityPool: ['Commune', 'Peu commune', 'Rare'],
    maxBudget: 12,
    aiQuizAccuracy: 0.30
  },
  {
    id: 'ai-proteam',
    name: 'DS Clara « Oreillette »',
    title: 'Stratège WorldTour & Sous-Bois',
    difficulty: 'Tactique',
    codeBadge: 'WT-PRO',
    description: 'Équipe équilibrée (budget 15⚡) adaptée aux terrains et gestion fine des mots-clés sur 5 manches.',
    rewardWinWatts: 115,
    rewardLossWatts: 35,
    minRarityPool: ['Peu commune', 'Rare', 'Épique'],
    maxBudget: 15,
    aiQuizAccuracy: 0.55
  },
  {
    id: 'ai-legende',
    name: 'Le Grand Jury Arc-en-Ciel',
    title: 'Armada Hors Catégorie',
    difficulty: 'Hors Catégorie',
    codeBadge: 'ELITE-HC',
    description: 'Budget maximal (16⚡), têtes d’affiche Épiques/Légendaires et lecture redoutable des étapes.',
    rewardWinWatts: 165,
    rewardLossWatts: 45,
    minRarityPool: ['Rare', 'Épique', 'Légendaire'],
    maxBudget: 16,
    aiQuizAccuracy: 0.72
  }
];
const QUEST_POOL                    = [
  {
    id: 'q-win-vtt',
    title: 'Roi du Singletrack',
    description: 'Remporter 1 Duel avec au moins 2 cartes VTT (ou Polyvalent VTT) dans votre deck.',
    metric: 'duelsWonVTT',
    target: 1,
    rewardWatts: 95
  },
  {
    id: 'q-win-route',
    title: 'Patron du Peloton',
    description: 'Remporter 1 Duel avec au moins 2 cartes Route dans votre deck.',
    metric: 'duelsWonRoute',
    target: 1,
    rewardWatts: 95
  },
  {
    id: 'q-win-piste',
    title: 'Fusée du Vélodrome',
    description: 'Remporter 1 Duel avec au moins 2 cartes Piste dans votre deck.',
    metric: 'duelsWonPiste',
    target: 1,
    rewardWatts: 95
  },
  {
    id: 'q-win-cx',
    title: 'Forçat des Labours',
    description: 'Remporter 1 Duel avec au moins 2 cartes Cyclo-cross dans votre deck.',
    metric: 'duelsWonCX',
    target: 1,
    rewardWatts: 95
  },
  {
    id: 'q-quiz-3',
    title: 'Encyclopédie Vivante',
    description: 'Réussir 3 bonnes réponses au Quiz Culture Vélo (Duel ou Express).',
    metric: 'quizCorrect',
    target: 3,
    rewardWatts: 75
  },
  {
    id: 'q-attack-snap',
    title: 'Coup de Bordure (Snap)',
    description: 'Réussir 2 Quiz en mode « Attaque Risquée » pendant des Duels.',
    metric: 'attackQuizSuccess',
    target: 2,
    rewardWatts: 95,
    rewardBidons: 1
  },
  {
    id: 'q-open-2',
    title: 'Collectionneur Assidu',
    description: 'Ouvrir 2 Boosters dans la Boutique.',
    metric: 'boostersOpened',
    target: 2,
    rewardWatts: 70
  },
  {
    id: 'q-upgrade-1',
    title: 'Atelier Mécanique ★',
    description: 'Améliorer 1 carte avec vos doublons (Rang ★1, ★2 ou ★3).',
    metric: 'cardsUpgraded',
    target: 1,
    rewardWatts: 85,
    rewardBidons: 1
  },
  {
    id: 'q-win-2',
    title: 'Maillot Jaune Confirmé',
    description: 'Remporter 2 Duels contre les Directeurs Sportifs IA.',
    metric: 'duelsWon',
    target: 2,
    rewardWatts: 130,
    rewardBidons: 1
  }
];
const ACHIEVEMENT_POOL                          = [
  {
    id: 'ach-first-pack',
    code: 'PACK-01',
    title: 'Déchirure Inaugurale',
    description: 'Ouvrir votre premier booster dans la Boutique.',
    rewardWatts: 50,
    check: (s) => s.stats.boostersOpened >= 1
  },
  {
    id: 'ach-first-win',
    code: 'WIN-01',
    title: 'Premier Bouquet',
    description: 'Remporter votre premier Duel en 5 étapes.',
    rewardWatts: 60,
    check: (s) => s.stats.duelsWon >= 1
  },
  {
    id: 'ach-collector-35',
    code: 'ALB-35',
    title: 'Peloton de Chasse',
    description: 'Débloquer au moins 35 cartes distinctes dans l’Album.',
    rewardWatts: 100,
    check: (s) => Object.values(s.inventory).filter((c) => c > 0).length >= 35
  },
  {
    id: 'ach-collector-75',
    code: 'ALB-75',
    title: 'Directeur Sportif Confirmé',
    description: 'Débloquer au moins 75 cartes distinctes dans l’Album.',
    rewardWatts: 160,
    check: (s) => Object.values(s.inventory).filter((c) => c > 0).length >= 75
  },
  {
    id: 'ach-collector-120',
    code: 'ALB-120',
    title: 'Encyclopédie du Cyclisme',
    description: 'Débloquer 120 cartes distinctes ou plus.',
    rewardWatts: 250,
    check: (s) => Object.values(s.inventory).filter((c) => c > 0).length >= 120
  },
  {
    id: 'ach-star-upgrade',
    code: 'STAR-1',
    title: 'Atelier Carbone ★',
    description: 'Améliorer une carte avec des doublons au rang ★1 ou supérieur.',
    rewardWatts: 65,
    check: (s) => s.stats.cardsUpgraded >= 1
  },
  {
    id: 'ach-snap-3',
    code: 'SNAP-3',
    title: 'Roi du Coup de Bordure',
    description: 'Réussir 3 Quiz en mode Attaque Risquée (Snap).',
    rewardWatts: 100,
    check: (s) => s.stats.attackQuizSuccess >= 3
  },
  {
    id: 'ach-quiz-10',
    code: 'QUIZ-10',
    title: 'Consultant Plateau TV',
    description: 'Cumuler 10 bonnes réponses au Quiz Culture Vélo.',
    rewardWatts: 90,
    check: (s) => s.stats.quizCorrect >= 10
  },
  {
    id: 'ach-win-5',
    code: 'WIN-05',
    title: 'Maillot Jaune Régulier',
    description: 'Remporter 5 Duels contre les Directeurs Sportifs IA.',
    rewardWatts: 160,
    check: (s) => s.stats.duelsWon >= 5
  },
  {
    id: 'ach-legendary-pull',
    code: 'LEG-01',
    title: 'Frisson Arc-en-Ciel',
    description: 'Tirer votre première carte Légendaire dans un booster.',
    rewardWatts: 200,
    check: (s) => s.stats.legendariesPulled >= 1
  }
];


// === FILE: src/utils/cardEffects.ts ===
function getEffectiveCardStats(card          , starLevel         = 0) {
  const starConf = STAR_UPGRADE_CONFIG.find((s) => s.targetStar === starLevel);
  const bonus = starConf ? starConf.statBonus : 0;
  const power = card.stats.power + bonus;
  const technique = card.stats.technique + bonus;
  const endurance = card.stats.endurance + bonus;
  const overall = Math.round((power + technique + endurance) / 3);
  return { power, technique, endurance, overall, starBonus: bonus };
}
function getDeckEnergyCost(cards            )         {
  return cards.reduce((sum, c) => sum + c.energyCost, 0);
}
function isDeckValid(cards            )   
                 
                      
                  
  {
  const totalEnergy = getDeckEnergyCost(cards);
  if (cards.length < 5) {
    return {
      valid: false,
      totalEnergy,
      reason: `Votre équipe doit compter 5 cartes (${cards.length}/5).`
    };
  }
  if (totalEnergy > MAX_DECK_ENERGY) {
    return {
      valid: false,
      totalEnergy,
      reason: `Budget d’énergie dépassé (${totalEnergy}/${MAX_DECK_ENERGY} ⚡ max).`
    };
  }
  return { valid: true, totalEnergy };
}
function getCardTerrainBonusPct(
  card          ,
  stage              
)         {
  if (card.discipline === stage.favoredDiscipline) {
    return stage.terrainBonusPct; // +25%
  }
  if (card.linkedDisciplines.includes(stage.favoredDiscipline)) {
    return 20; // +20% pour Polyvalent / bi-discipline compatible
  }
  return 0;
}
function checkAllFourDisciplinesCovered(cards            )          {
  const core                   = ['Route', 'VTT', 'Piste', 'Cyclo-cross'];
  return core.every((d) =>
    cards.some((c) => c.linkedDisciplines.includes(d))
  );
}
function buildBalancedBudgetDeck(
  ownedCards            ,
  cardStars               = {}
)             {
  if (ownedCards.length <= 5) {
    return ownedCards.slice(0, 5);
  }

  // Trier par note effective décroissante puis coût croissant
  const sorted = [...ownedCards].sort((a, b) => {
    const effA = getEffectiveCardStats(a, cardStars[a.id] || 0).overall;
    const effB = getEffectiveCardStats(b, cardStars[b.id] || 0).overall;
    if (effB !== effA) return effB - effA;
    return a.energyCost - b.energyCost;
  });

  const chosen             = [];
  let currentCost = 0;
  const coreDisciplines                   = [
    'Route',
    'VTT',
    'Piste',
    'Cyclo-cross'
  ];

  // Essayer d'abord de couvrir les 4 disciplines tout en laissant au moins 1⚡ par slot restant
  for (let i = 0; i < coreDisciplines.length; i++) {
    const disc = coreDisciplines[i];
    const remainingSlotsAfterThis = 4 - chosen.length;
    const maxAllowedCost = MAX_DECK_ENERGY - currentCost - remainingSlotsAfterThis;

    const candidate = sorted.find(
      (c) =>
        !chosen.some((ch) => ch.id === c.id) &&
        c.energyCost <= maxAllowedCost &&
        (c.discipline === disc || c.linkedDisciplines.includes(disc))
    );
    if (candidate) {
      chosen.push(candidate);
      currentCost += candidate.energyCost;
    }
  }

  // Compléter jusqu'à 5 cartes dans la limite de MAX_DECK_ENERGY (16⚡)
  for (const c of sorted) {
    if (chosen.length >= 5) break;
    const remainingSlotsAfterThis = 4 - chosen.length;
    const maxAllowedCost = MAX_DECK_ENERGY - currentCost - remainingSlotsAfterThis;
    if (!chosen.some((ch) => ch.id === c.id) && c.energyCost <= maxAllowedCost) {
      chosen.push(c);
      currentCost += c.energyCost;
    }
  }

  // Fallback absolu avec les cartes les moins chères si besoin
  if (chosen.length < 5) {
    const cheapest = [...ownedCards].sort((a, b) => a.energyCost - b.energyCost);
    for (const c of cheapest) {
      if (chosen.length >= 5) break;
      if (!chosen.some((ch) => ch.id === c.id)) {
        chosen.push(c);
      }
    }
  }

  return chosen;
}
function buildAIDeckWithinBudget(
  pool            ,
  allCards            ,
  maxBudget        
)             {
  const source = pool.length >= 8 ? pool : allCards;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const chosen             = [];
  let cost = 0;

  // Tenter d'inclure 1 carte de chaque discipline
  const discs                   = ['Route', 'VTT', 'Piste', 'Cyclo-cross'];
  for (const d of discs) {
    const remainingAfter = 4 - chosen.length;
    const cap = maxBudget - cost - remainingAfter;
    const match = shuffled.find(
      (c) =>
        !chosen.some((ch) => ch.id === c.id) &&
        c.energyCost <= cap &&
        c.linkedDisciplines.includes(d)
    );
    if (match) {
      chosen.push(match);
      cost += match.energyCost;
    }
  }

  for (const c of shuffled) {
    if (chosen.length >= 5) break;
    const remainingAfter = 4 - chosen.length;
    const cap = maxBudget - cost - remainingAfter;
    if (!chosen.some((ch) => ch.id === c.id) && c.energyCost <= cap) {
      chosen.push(c);
      cost += c.energyCost;
    }
  }

  if (chosen.length < 5) {
    const byCheapest = [...allCards].sort((a, b) => a.energyCost - b.energyCost);
    for (const c of byCheapest) {
      if (chosen.length >= 5) break;
      if (!chosen.some((ch) => ch.id === c.id)) {
        chosen.push(c);
      }
    }
  }

  return chosen;
}
function evaluateStageSide(params   
                 
                    
                      
                              
                           
                           
                              
                          
                         
                       
                     
 )                                                                 
                               
  {
  const {
    card,
    starLevel,
    stage,
    roundNumber,
    playedBefore,
    carriedAllyBonus,
    hasFullTeamSynergy,
    energyAvailable,
    quizMode,
    quizSuccess,
    skipQuiz
  } = params;

  const effStats = getEffectiveCardStats(card, starLevel);
  const { power, technique, endurance } = stage.statWeights;
  const baseScore = Math.round(
    effStats.power * power +
      effStats.technique * technique +
      effStats.endurance * endurance
  );

  const terrainBonusPct = getCardTerrainBonusPct(card, stage);
  const terrainBonusPts = Math.round(baseScore * (terrainBonusPct / 100));
  const teamSynergyPts = hasFullTeamSynergy ? Math.round(baseScore * 0.05) : 0;

  // Vérifier si la carte est immunisée aux malus de terrain
  const isWeatherShield = card.effectCode === 'ONGOING_WEATHER_SHIELD';
  const isCompatibleWithTerrain = card.linkedDisciplines.includes(
    stage.favoredDiscipline
  );

  // 1. Modificateur dynamique du Terrain (Marvel Snap style)
  let modifierPts = 0;
  switch (stage.modifierType) {
    case 'HIGH_COST_PRESTIGE':
      if (card.energyCost >= 4) modifierPts = stage.modifierValue;
      break;
    case 'LOW_COST_SHELTER':
      if (card.energyCost <= 2) modifierPts = stage.modifierValue;
      break;
    case 'POWER_OVERDRIVE':
      if (effStats.power >= 90) modifierPts = stage.modifierValue;
      break;
    case 'GEAR_TECH_BONUS':
      if (card.category === 'Matériel & Technique') modifierPts = stage.modifierValue;
      break;
    case 'DOUBLE_FINAL_ROUND':
      if (roundNumber >= 4) {
        if (stage.id === 'stage-piste-heure') {
          if (
            card.linkedDisciplines.includes('Piste') ||
            card.linkedDisciplines.includes('Route')
          ) {
            modifierPts = stage.modifierValue;
          }
        } else {
          modifierPts = stage.modifierValue;
        }
      }
      break;
    case 'PENALIZE_NON_FAVORED':
      if (isCompatibleWithTerrain) {
        if (stage.id === 'stage-cx-zonhoven') modifierPts = 9;
      } else if (!isWeatherShield && effStats.technique < 94) {
        modifierPts = -stage.modifierValue;
      }
      break;
    default:
      break;
  }

  // 2. Effet TCG de la Carte (Mot-clé)
  let keywordEffectPts = 0;
  let nextAllyBonusToCarry = 0;
  let debuffInflicted = 0;

  const allCardsPlayedSide = [...playedBefore, card];

  switch (card.effectCode) {
    case 'REVEAL_TERRAIN_BOOST':
      if (isCompatibleWithTerrain) {
        keywordEffectPts = card.effectValue;
      }
      break;
    case 'REVEAL_NEXT_ALLY':
      nextAllyBonusToCarry = card.effectValue;
      break;
    case 'REVEAL_DEBUFF_FOE':
      debuffInflicted = card.effectValue;
      break;
    case 'REVEAL_PER_DISCIPLINE': {
      const distinctDisc = new Set(allCardsPlayedSide.map((c) => c.discipline));
      keywordEffectPts = distinctDisc.size * card.effectValue;
      break;
    }
    case 'ONGOING_DISC_AURA': {
      const matchingCount = allCardsPlayedSide.filter(
        (c) =>
          c.discipline === card.discipline ||
          (card.discipline !== 'Polyvalent' &&
            c.linkedDisciplines.includes(card.discipline                  ))
      ).length;
      keywordEffectPts = matchingCount * card.effectValue;
      break;
    }
    case 'ONGOING_WEATHER_SHIELD':
      keywordEffectPts = card.effectValue;
      break;
    case 'ONGOING_GEAR_SCALING': {
      const gearCount = allCardsPlayedSide.filter(
        (c) => c.category === 'Matériel & Technique'
      ).length;
      keywordEffectPts = gearCount * card.effectValue;
      break;
    }
    case 'SPRINT_FINAL_SURGE':
      if (roundNumber >= 4) {
        keywordEffectPts = card.effectValue;
      }
      break;
    case 'BREAKAWAY_EARLY_SURGE':
      if (roundNumber <= 2) {
        keywordEffectPts = card.effectValue;
      }
      break;
    case 'SYNERGY_MULTI_DISC': {
      if (playedBefore.length > 0) {
        const lastCard = playedBefore[playedBefore.length - 1];
        if (lastCard.discipline !== card.discipline) {
          keywordEffectPts = card.effectValue;
        }
      }
      break;
    }
  }

  // 3. Quiz Culture Vélo & Risque Tactique (SAFE vs ATTACK)
  let quizPts = 0;
  if (!skipQuiz) {
    if (quizMode === 'SAFE') {
      quizPts = quizSuccess ? Math.round(baseScore * 0.15) : 0;
    } else {
      // Mode ATTACK (Coup de Bordure / Snap!)
      if (quizSuccess) {
        quizPts = Math.round(baseScore * 0.30);
        // Amplifie également de +50% l'effet spécial TCG de la carte !
        keywordEffectPts = Math.round(keywordEffectPts * 1.5);
        nextAllyBonusToCarry = Math.round(nextAllyBonusToCarry * 1.5);
        debuffInflicted = Math.round(debuffInflicted * 1.5);
      } else {
        quizPts = -Math.round(baseScore * 0.10);
      }
    }
  }

  // 4. Élan d'Énergie Économisée
  const energySaved = Math.max(0, energyAvailable - card.energyCost);
  const energyElanPts = energySaved * 2;

  const rawScoreBeforeDebuff =
    baseScore +
    terrainBonusPts +
    modifierPts +
    keywordEffectPts +
    carriedAllyBonus +
    teamSynergyPts +
    energyElanPts +
    quizPts;

  const lines                       = [
    {
      label: `Score de base (${effStats.starBonus > 0 ? `★${starLevel} +${effStats.starBonus} stats` : 'stats × terrain'})`,
      value: baseScore,
      tone: 'neutral'
    }
  ];

  if (terrainBonusPts > 0) {
    lines.push({
      label: `Affinité terrain ${stage.favoredDiscipline} (+${terrainBonusPct}%)`,
      value: terrainBonusPts,
      tone: 'positive'
    });
  }

  if (modifierPts !== 0) {
    lines.push({
      label: `Règle d’étape : ${stage.modifierTitle}`,
      value: modifierPts,
      tone: modifierPts > 0 ? 'positive' : 'negative'
    });
  }

  if (keywordEffectPts > 0) {
    lines.push({
      label: `${card.keyword} : ${card.title}`,
      value: keywordEffectPts,
      tone: 'special'
    });
  }

  if (carriedAllyBonus > 0) {
    lines.push({
      label: 'Relais / Élan transmis par la carte précédente',
      value: carriedAllyBonus,
      tone: 'positive'
    });
  }

  if (teamSynergyPts > 0) {
    lines.push({
      label: 'Synergie Deck 4 Disciplines (+5%)',
      value: teamSynergyPts,
      tone: 'positive'
    });
  }

  if (energyElanPts > 0) {
    lines.push({
      label: `Énergie économisée (${energySaved} ⚡ × 2)`,
      value: energyElanPts,
      tone: 'positive'
    });
  }

  if (quizPts !== 0) {
    lines.push({
      label:
        quizMode === 'ATTACK'
          ? quizSuccess
            ? 'Attaque Risquée réussie (+30% & Effet ×1.5) !'
            : 'Attaque Risquée manquée (Fringale -10%)'
          : 'Allure Contrôlée : Quiz réussi (+15%)',
      value: quizPts,
      tone: quizPts > 0 ? 'special' : 'negative'
    });
  }

  return {
    rawScoreBeforeDebuff,
    baseScore,
    terrainBonusPct,
    terrainBonusPts,
    modifierPts,
    keywordEffectPts,
    carriedAllyPts: carriedAllyBonus,
    teamSynergyPts,
    energyElanPts,
    quizPts,
    debuffInflicted,
    nextAllyBonusToCarry,
    lines
  };
}


// === FILE: src/services/wikiService.ts ===



const FAILED_SLUG_BACKOFF = new Map                ();
let lastApiCallMs = 0;

const SECRET_TCG_BLUEPRINTS         
                
                   
                         
                                      
                         
                 
                     
                
                    
                    
                       
                             
                      
                            
                  
                      
                      
                  
                  
                       
                    
   = [
  {
    title: 'Descente en Position Aérodynamique Extrême',
    subtitle: 'Technique Route • 105 km/h dans les Lacets du Poggio',
    discipline: 'Route',
    linkedDisciplines: ['Route', 'VTT'],
    category: 'Matériel & Technique',
    rarity: 'Épique',
    energyCost: 4,
    power: 88,
    technique: 97,
    endurance: 84,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_DEBUFF_FOE',
    effectValue: 12,
    effectDescription: 'Lâche la concurrence en descente : -12 pts à l’adversaire.',
    summary: 'Se plaquer sur le cadre en utilisant une tige de selle télescopique sur un vélo de route pour retarder chaque freinage et creuser un écart décisif.',
    nationality: 'Technique TCG',
    countryCode: 'TCG',
    keyYear: '105 km/h',
    keyFact: 'Matej Mohorič a remporté Milan-San Remo 2022 en installant une tige télescopique de VTT sur son vélo de route.',
    specialTrait: 'Trajectoire de Descente Kamikaze'
  },
  {
    title: 'Attaque du Kilomètre Zéro (L\'Échappée Matinale)',
    subtitle: 'Tactique Route • Baroudeurs Face au Peloton',
    discipline: 'Route',
    linkedDisciplines: ['Route'],
    category: 'Matériel & Technique',
    rarity: 'Rare',
    energyCost: 3,
    power: 85,
    technique: 82,
    endurance: 92,
    keyword: 'Échappée',
    effectCode: 'BREAKAWAY_EARLY_SURGE',
    effectValue: 13,
    effectDescription: '+13 pts si lancée dès les Étapes 1 ou 2.',
    summary: 'Démarrer dès le baisser de drapeau pour prendre dix minutes d’avance et résister au retour des équipes de sprinteurs jusqu’à la flamme rouge.',
    nationality: 'Tactique TCG',
    countryCode: 'TCG',
    keyYear: 'Km 0',
    keyFact: 'La règle empirique du peloton accorde environ 1 minute d’avance récupérable tous les 10 kilomètres de poursuite.',
    specialTrait: 'Résistance du Baroudeur'
  },
  {
    title: 'Nose-Turn & Épingle Engagée en Enduro',
    subtitle: 'Technique VTT • Pivot sur la Roue Avant en Pente Raide',
    discipline: 'VTT',
    linkedDisciplines: ['VTT'],
    category: 'Matériel & Technique',
    rarity: 'Rare',
    energyCost: 3,
    power: 80,
    technique: 95,
    endurance: 81,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_TERRAIN_BOOST',
    effectValue: 12,
    effectDescription: '+12 pts immédiats sur terrain VTT.',
    summary: 'Dans une épingle alpine trop étroite pour tourner normalement, doser le frein avant pour lever la roue arrière et pivoter le vélo de 180°.',
    nationality: 'Technique VTT',
    countryCode: 'TCG',
    keyYear: 'Pivot 180°',
    keyFact: 'Le Nose-Turn (ou Endo-Turn) est indispensable sur les sentiers naturels de haute montagne en Enduro.',
    specialTrait: 'Rotation 180° sur la Roue Avant'
  },
  {
    title: 'Lancement de la Vitesse par Équipes (Démarreur)',
    subtitle: 'Tactique Piste • 17 Secondes au Tour Départ Arrêté',
    discipline: 'Piste',
    linkedDisciplines: ['Piste'],
    category: 'Matériel & Technique',
    rarity: 'Épique',
    energyCost: 4,
    power: 97,
    technique: 91,
    endurance: 79,
    keyword: 'À la révélation',
    effectCode: 'REVEAL_NEXT_ALLY',
    effectValue: 14,
    effectDescription: 'Lance les relayeurs à 65 km/h : +14 pts à votre prochaine carte.',
    summary: 'S’arracher du portillon automatique avec un couple phénoménal pour emmener ses équipiers à 65 km/h en un seul tour de 250 m.',
    nationality: 'Tactique Piste',
    countryCode: 'TCG',
    keyYear: '1 Tour (250m)',
    keyFact: 'En vitesse par équipes, chacun des trois sprinteurs mène exactement un tour de piste avant de s’écarter.',
    specialTrait: 'Couple Explosif hors du Portillon'
  },
  {
    title: 'Ornière Gelée & Passage en Course à Pied',
    subtitle: 'Technique Cyclo-cross • Crampons Acier & Relance',
    discipline: 'Cyclo-cross',
    linkedDisciplines: ['Cyclo-cross'],
    category: 'Matériel & Technique',
    rarity: 'Rare',
    energyCost: 3,
    power: 86,
    technique: 91,
    endurance: 89,
    keyword: 'Continu',
    effectCode: 'ONGOING_WEATHER_SHIELD',
    effectValue: 10,
    effectDescription: 'Ignore les malus de boue/verglas & +10 pts.',
    summary: 'Visser des pointes métalliques sous ses chaussures de cyclo-cross pour gravir en courant un talus verglacé impraticable à vélo.',
    nationality: 'Technique CX',
    countryCode: 'TCG',
    keyYear: 'Crampons',
    keyFact: 'Le saut en amazone sur la selle en sortie de portage permet de recliper les pédales tout en accélérant.',
    specialTrait: 'Saut en Amazone & Griffes Acier'
  }
];

function extractWikimediaFileName(imageUrl        )                {
  try {
    const parsed = new URL(imageUrl);
    if (parsed.hostname !== 'upload.wikimedia.org') return null;
    const segments = parsed.pathname.split('/').filter(Boolean);
    // Pattern thumb: /wikipedia/commons/thumb/a/ab/File.jpg/320px-File.jpg
    const thumbIdx = segments.indexOf('thumb');
    if (thumbIdx !== -1 && segments.length > thumbIdx + 3) {
      return decodeURIComponent(segments[thumbIdx + 3]);
    }
    const last = segments[segments.length - 1];
    return last ? decodeURIComponent(last) : null;
  } catch {
    return null;
  }
}

async function verifyWikimediaCommonsLicense(
  fileName        ,
  candidateThumbUrl        
)                                                                     {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3200);
    const title = fileName.startsWith('File:') ? fileName : `File:${fileName}`;
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      title
    )}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&format=json&origin=*`;

    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const json = await res.json();
    const pages = json?.query?.pages;
    if (!pages || typeof pages !== 'object') return null;
    const firstPage = Object.values(pages)[0]                                   ;
    const info = firstPage?.imageinfo?.[0];
    if (!info || !info.extmetadata) return null;

    const ext = info.extmetadata;
    const licenseShortName = sanitizeText(
      stripHtmlTags(ext.LicenseShortName?.value || ''),
      48
    );
    if (!isAllowedFreeLicense(licenseShortName)) {
      return null;
    }

    const author = sanitizeText(
      stripHtmlTags(ext.Artist?.value || ''),
      100,
      'Contributeur Wikimedia Commons'
    );
    const licenseUrl = sanitizeHttpsUrl(ext.LicenseUrl?.value, [
      'creativecommons.org',
      'wikimedia.org',
      'wikipedia.org'
    ]);
    const commonsUrl =
      sanitizeHttpsUrl(info.descriptionurl, ['commons.wikimedia.org']) ||
      `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`;
    const safeUrl = sanitizeHttpsUrl(
      info.thumburl || info.url || candidateThumbUrl,
      ['upload.wikimedia.org', 'thumb.wikimedia.org']
    );
    if (!safeUrl) return null;

    return {
      safeUrl,
      attribution: {
        author,
        licenseShortName,
        licenseUrl,
        commonsUrl,
        sourceTitle: sanitizeText(fileName, 140)
      }
    };
  } catch {
    return null;
  }
}
async function fetchWikiSummary(
  wikiSlug                    ,
  cache                  
)                                    {
  if (!wikiSlug) return null;

  if (
    cache[wikiSlug] &&
    Date.now() - cache[wikiSlug].fetchedAt < 1000 * 60 * 60 * 24
  ) {
    return {
      thumbnailUrl: cache[wikiSlug].thumbnailUrl,
      extract: cache[wikiSlug].extract,
      pageUrl: cache[wikiSlug].pageUrl,
      attribution: cache[wikiSlug].attribution
    };
  }

  const lastFail = FAILED_SLUG_BACKOFF.get(wikiSlug);
  if (lastFail && Date.now() - lastFail < 1000 * 60 * 5) {
    return null;
  }

  const now = Date.now();
  if (now - lastApiCallMs < 220) {
    return null;
  }
  lastApiCallMs = now;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3200);
    const url = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      wikiSlug
    )}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      FAILED_SLUG_BACKOFF.set(wikiSlug, Date.now());
      return null;
    }

    const data = await res.json();
    const extract = sanitizeText(data?.extract, 600) || undefined;
    const pageUrl =
      sanitizeHttpsUrl(data?.content_urls?.desktop?.page, ['wikipedia.org']) ||
      `https://fr.wikipedia.org/wiki/${encodeURIComponent(wikiSlug)}`;

    let thumbnailUrl                    ;
    let attribution                              ;

    const rawSource = sanitizeHttpsUrl(
      data?.thumbnail?.source || data?.originalimage?.source,
      ['upload.wikimedia.org', 'thumb.wikimedia.org']
    );
    if (rawSource) {
      const fileName = extractWikimediaFileName(rawSource);
      if (fileName) {
        const verified = await verifyWikimediaCommonsLicense(fileName, rawSource);
        if (verified) {
          thumbnailUrl = verified.safeUrl;
          attribution = verified.attribution;
        }
      }
    }

    return { thumbnailUrl, extract, pageUrl, attribution };
  } catch {
    FAILED_SLUG_BACKOFF.set(wikiSlug, Date.now());
    return null;
  }
}
async function forgeCustomTcgCard(
  inputTitle        ,
  chosenDiscipline            ,
  chosenCategory              ,
  nextCardNumber        
)                    {
  const trimmed = sanitizeText(inputTitle, 64);

  const matchedBlueprint = SECRET_TCG_BLUEPRINTS.find(
    (b) =>
      trimmed !== '' &&
      (b.title.toLowerCase().includes(trimmed.toLowerCase()) ||
        trimmed.toLowerCase().includes(b.title.toLowerCase()))
  );

  if (!trimmed || matchedBlueprint) {
    const pick =
      matchedBlueprint ||
      SECRET_TCG_BLUEPRINTS[
        Math.floor(Math.random() * SECRET_TCG_BLUEPRINTS.length)
      ];
    const overall = Math.round(
      (pick.power + pick.technique + pick.endurance) / 3
    );

    return {
      id: `forged-${Date.now().toString().slice(-5)}-${Math.floor(
        Math.random() * 100
      )}`,
      cardNumber: nextCardNumber,
      title: pick.title,
      subtitle: pick.subtitle,
      roleTag: 'Plan Secret',
      discipline: pick.discipline,
      linkedDisciplines: pick.linkedDisciplines,
      category: pick.category,
      rarity: pick.rarity,
      energyCost: pick.energyCost,
      stats: {
        power: pick.power,
        technique: pick.technique,
        endurance: pick.endurance,
        overall
      },
      keyword: pick.keyword,
      effectCode: pick.effectCode,
      effectValue: pick.effectValue,
      effectDescription: pick.effectDescription,
      summary: pick.summary,
      nationality: pick.nationality,
      countryCode: pick.countryCode,
      keyYear: pick.keyYear,
      keyFact: pick.keyFact,
      specialTrait: pick.specialTrait,
      wikiSlug: pick.wikiSlug,
      isCustomForged: true
    };
  }

  const linkedDisciplines                   =
    chosenDiscipline === 'Polyvalent'
      ? ['Route', 'VTT', 'Piste', 'Cyclo-cross']
      : [chosenDiscipline];

  const baseRoll = 76 + Math.floor(Math.random() * 16);
  const power = Math.min(
    97,
    baseRoll +
      (chosenDiscipline === 'Piste' ? 5 : chosenDiscipline === 'Route' ? 3 : 1)
  );
  const technique = Math.min(
    97,
    baseRoll +
      (chosenDiscipline === 'VTT' || chosenDiscipline === 'Cyclo-cross' ? 6 : 2)
  );
  const endurance = Math.min(
    97,
    baseRoll +
      (chosenDiscipline === 'Route' || chosenDiscipline === 'Polyvalent' ? 5 : 2)
  );
  const overall = Math.round((power + technique + endurance) / 3);

  let rarity         = 'Rare';
  if (overall >= 91) rarity = 'Légendaire';
  else if (overall >= 86) rarity = 'Épique';
  else if (overall <= 79) rarity = 'Peu commune';

  const energyCost = RARITY_CONFIG[rarity].defaultCost;

  const templates         
                         
                               
                        
                              
     = [
    {
      keyword: 'À la révélation',
      effectCode: 'REVEAL_TERRAIN_BOOST',
      effectValue: 11,
      effectDescription: `+11 pts immédiats sur terrain ${linkedDisciplines.join('/')}.`
    },
    {
      keyword: 'À la révélation',
      effectCode: 'REVEAL_NEXT_ALLY',
      effectValue: 10,
      effectDescription: 'Transmet +10 pts d’élan à votre prochaine carte.'
    },
    {
      keyword: 'Continu',
      effectCode: 'ONGOING_WEATHER_SHIELD',
      effectValue: 9,
      effectDescription: 'Protège contre les malus de terrain & +9 pts.'
    },
    {
      keyword: 'Sprint final',
      effectCode: 'SPRINT_FINAL_SURGE',
      effectValue: 12,
      effectDescription: '+12 pts si engagée lors des Étapes 4 ou 5.'
    }
  ];
  const tpl = templates[Math.floor(Math.random() * templates.length)];

  return {
    id: `forged-${Date.now().toString().slice(-5)}`,
    cardNumber: nextCardNumber,
    title: trimmed,
    subtitle: `Création Sur Mesure • ${chosenCategory}`,
    roleTag: 'Forge TCG',
    discipline: chosenDiscipline,
    linkedDisciplines,
    category: chosenCategory,
    rarity,
    energyCost,
    stats: { power, technique, endurance, overall },
    keyword: tpl.keyword,
    effectCode: tpl.effectCode,
    effectValue: tpl.effectValue,
    effectDescription: tpl.effectDescription,
    summary: `Carte TCG forgée sur mesure (${chosenCategory} • ${chosenDiscipline}) conçue pour briller sur les étapes de ${linkedDisciplines.join(', ')}.`,
    nationality: 'Création TCG',
    countryCode: 'TCG',
    keyYear: chosenDiscipline,
    keyFact: `${trimmed} octroie un avantage stratégique majeur sur les terrains ${linkedDisciplines.join(' & ')}.`,
    specialTrait: `Signature : ${trimmed.slice(0, 26)}`,
    isCustomForged: true
  };
}


// === FILE: src/services/soundService.ts ===

class SoundEffectsService {
          ctx      = null;
          enabled          = true;

         setEnabled(val         ) {
    this.enabled = val;
  }

         isEnabled()          {
    return this.enabled;
  }

          getContext()      {
    if (!this.enabled) return null;
    try {
      const w      = typeof window !== 'undefined' ? window : null;
      if (!w) return null;
      const AudioCtx = w.AudioContext || w.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

          playTone(
    freq        ,
    duration        ,
    type                                              = 'sine',
    gainVal         = 0.06,
    delay         = 0,
    endFreq         
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
      }
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(gainVal, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // Ignorer les restrictions audio éventuelles
    }
  }

         playClick() {
    // Clic sec façon roue libre Campagnolo / cliquet
    this.playTone(920, 0.045, 'triangle', 0.035, 0, 420);
  }

         playPackRip() {
    // Déchirure plastique/aluminium + montée lumineuse
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const bufferSize = ctx.sampleRate * 0.22;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(4200, ctx.currentTime + 0.2);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch {
      // Fallback
    }
    this.playTone(340, 0.22, 'sine', 0.045, 0.08, 680);
  }

         playCardFlip(rarity        ) {
    if (rarity === 'Commune') {
      this.playTone(460, 0.08, 'triangle', 0.04, 0, 560);
    } else if (rarity === 'Peu commune') {
      this.playTone(523.25, 0.1, 'triangle', 0.05);
      this.playTone(659.25, 0.14, 'sine', 0.05, 0.06);
    } else if (rarity === 'Rare') {
      this.playTone(587.33, 0.12, 'triangle', 0.06);
      this.playTone(739.99, 0.14, 'sine', 0.055, 0.06);
      this.playTone(880, 0.22, 'sine', 0.06, 0.12);
    } else if (rarity === 'Épique') {
      this.playTone(523.25, 0.12, 'triangle', 0.065);
      this.playTone(659.25, 0.14, 'triangle', 0.065, 0.07);
      this.playTone(783.99, 0.16, 'sine', 0.07, 0.14);
      this.playTone(1046.5, 0.35, 'sine', 0.075, 0.21);
    } else {
      // Légendaire Arc-en-Ciel : fanfare chromatique majestueuse
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((n, idx) => {
        this.playTone(n, idx === 4 ? 0.55 : 0.16, 'triangle', 0.075, idx * 0.07);
      });
    }
  }

         playGodPack() {
    const chord = [440, 554.37, 659.25, 880, 1108.73, 1318.5];
    chord.forEach((n, idx) => {
      this.playTone(n, 0.65, 'sine', 0.065, idx * 0.06);
    });
  }

         playQuizSuccess(isSnap         ) {
    this.playTone(587.33, 0.1, 'sine', 0.055);
    this.playTone(880, 0.22, 'sine', 0.065, 0.07);
    if (isSnap) {
      this.playTone(1174.66, 0.32, 'triangle', 0.07, 0.14);
    }
  }

         playQuizFail() {
    this.playTone(310, 0.16, 'sawtooth', 0.035, 0, 195);
  }

         playRoundWin() {
    this.playTone(523.25, 0.12, 'triangle', 0.06);
    this.playTone(783.99, 0.25, 'triangle', 0.065, 0.09);
  }

         playMatchWin() {
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((n, i) => {
      this.playTone(n, i === 3 ? 0.45 : 0.14, 'triangle', 0.07, i * 0.09);
    });
  }

         playUpgradeStar() {
    this.playTone(659.25, 0.12, 'sine', 0.06);
    this.playTone(987.77, 0.15, 'sine', 0.065, 0.07);
    this.playTone(1318.51, 0.35, 'triangle', 0.07, 0.14);
  }
}
const soundFX = new SoundEffectsService();


// === FILE: src/utils/quizGenerator.ts ===

function shuffleArray   (arr     )      {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

const STOP_WORDS = new Set([
  'les', 'des', 'une', 'sur', 'par', 'aux', 'qui', 'que', 'est', 'son', 'ses',
  'dans', 'avec', 'pour', 'sans', 'sous', 'vers', 'plus', 'très', 'entre',
  'dont', 'tout', 'tous', 'elle', 'être', 'avoir', 'faire', 'tour', 'coupe',
  'vélo', 'piste', 'route', 'mont', 'côte', 'grand', 'petit', 'deux', 'trois',
  'quatre', 'cinq', 'mois', 'ans', 'monde', 'équipe', 'france', 'belgique',
  'italie', 'suisse', 'pays', 'bas', 'record', 'heure', 'sable', 'boue',
  'mur', 'dalle', 'col', 'virage', 'virages', 'fosse', 'dévers', 'course',
  'finale', 'saut', 'planches', 'portage', 'relais', 'train', 'sprint',
  'roue', 'freins', 'pignon', 'fixe', 'boyaux', 'crampons', 'tige', 'selle',
  'double', 'triple', 'champion', 'championne', 'reine', 'roi', 'maître',
  'sir', 'jean', 'julian', 'tom', 'pauline', 'chris', 'mark', 'peter',
  'sven', 'erik', 'eli', 'fem', 'lars', 'niels', 'marco', 'fausto',
  'jacques', 'bernard', 'eddy', 'tadej', 'jonas', 'remco', 'thibaut',
  'julien', 'nino', 'loïc', 'nicolas', 'myriam', 'amaury', 'victor',
  'cécile', 'rachel', 'jolanda', 'julie', 'greg', 'harrie', 'florian',
  'félicia', 'benjamin', 'filippo', 'françois', 'grégory', 'mathilde',
  'laura', 'marianne', 'wout', 'mathieu', 'lotte', 'jeannie', 'puck', 'matej',
  'van', 'der', 'de', 'la', 'du', 'le', 'en', 'au', 'et', 'ou', 'à'
]);
function maskCardTitleInText(text        , title        )         {
  let masked = text;
  const escapedFull = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  masked = masked.replace(new RegExp(escapedFull, 'gi'), '[ █████ ]');

  // Extraire les mots significatifs (y compris noms courts comme Nys, Hoy, Vos, et sous-racines comme Koppenberg)
  const rawTokens = title
    .replace(/[()'’«»".,:/-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const tokensToMask = new Set        ();
  for (const tok of rawTokens) {
    const clean = tok.trim();
    const lower = clean.toLowerCase();
    if (clean.length >= 3 && !STOP_WORDS.has(lower)) {
      tokensToMask.add(clean);
      // Gérer les mots composés type "Koppenbergcross" -> masquer aussi "Koppenberg"
      if (lower.endsWith('cross') && clean.length > 8) {
        tokensToMask.add(clean.slice(0, -5));
      }
    }
  }

  // Trier par longueur décroissante pour éviter les remplacements partiels
  const sortedTokens = Array.from(tokensToMask).sort(
    (a, b) => b.length - a.length
  );

  for (const part of sortedTokens) {
    const escapedPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    masked = masked.replace(new RegExp(`\\b${escapedPart}\\b`, 'gi'), '[ █████ ]');
  }

  return masked;
}

                                 
                            
                         
 

/**
 * Génère une question de Quiz Culture Vélo & Tactique TCG fiable, sans fuite d'indice
 * et sans répétition au sein d'un même match.
 */
function generateCardQuizQuestion(
  focusCard          ,
  allCards            ,
  optionsOrMode                          
)               {
  const opts                 =
    typeof optionsOrMode === 'number'
      ? { preferredMode: optionsOrMode }
      : optionsOrMode || {};

  const excludeSet = new Set(opts.excludeCardIds || []);

  // Si la focusCard a déjà été questionnée dans ce match, choisir une autre carte non utilisée si possible
  let targetCard = focusCard;
  if (excludeSet.has(focusCard.id)) {
    const unusedSameDisc = allCards.filter(
      (c) => !excludeSet.has(c.id) && c.discipline === focusCard.discipline
    );
    const unusedAny = allCards.filter((c) => !excludeSet.has(c.id));
    const pool = unusedSameDisc.length > 0 ? unusedSameDisc : unusedAny;
    if (pool.length > 0) {
      targetCard = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  const otherCards = allCards.filter((c) => c.id !== targetCard.id);
  const sameCategoryPool = otherCards.filter(
    (c) => c.category === targetCard.category
  );
  const distractorSource =
    sameCategoryPool.length >= 4 ? sameCategoryPool : otherCards;

  // Vérifier si le mode Discipline/Catégorie est adapté (carte mono-discipline pour la question discipline)
  const canAskDiscipline =
    targetCard.discipline !== 'Polyvalent' &&
    targetCard.linkedDisciplines.length === 1;

  const roll =
    opts.preferredMode !== undefined
      ? opts.preferredMode % 4
      : Math.floor(Math.random() * 4);

  // Mode 0 : Texte à trous sur le Lore / Description cycliste de la carte
  if (roll === 0) {
    const distractors = shuffleArray(distractorSource)
      .slice(0, 3)
      .map((c) => c.title);
    const options = shuffleArray([targetCard.title, ...distractors]);
    const correctIndex = options.indexOf(targetCard.title);
    const clozeExcerpt = maskCardTitleInText(
      targetCard.summary,
      targetCard.title
    );

    return {
      id: `quiz-cloze-${targetCard.id}-${Date.now()}`,
      type: 'cloze',
      questionText:
        'À quelle carte du cyclisme (Athlète, Épreuve, Secteur ou Technique) correspond cette description ?',
      contextExcerpt: `« ${clozeExcerpt} »`,
      options,
      correctIndex,
      explanation: `Il s’agit de « ${targetCard.title} » (${targetCard.discipline} • ${targetCard.category}).`,
      relatedCardId: targetCard.id,
      relatedCardTitle: targetCard.title,
      relatedDiscipline: targetCard.discipline
    };
  }

  // Mode 1 : Règle technique, fait marquant ou culture vélo
  if (roll === 1) {
    const distractors = shuffleArray(distractorSource)
      .slice(0, 3)
      .map((c) => c.title);
    const options = shuffleArray([targetCard.title, ...distractors]);
    const correctIndex = options.indexOf(targetCard.title);

    return {
      id: `quiz-fact-${targetCard.id}-${Date.now()}`,
      type: 'fact',
      questionText:
        'Quel élément de l’univers du cyclisme est directement lié à ce fait ou cette règle technique ?',
      contextExcerpt: `« ${maskCardTitleInText(
        targetCard.keyFact,
        targetCard.title
      )} »`,
      options,
      correctIndex,
      explanation: `${targetCard.title} : ${targetCard.keyFact}`,
      relatedCardId: targetCard.id,
      relatedCardTitle: targetCard.title,
      relatedDiscipline: targetCard.discipline
    };
  }

  // Mode 2 : Capacité Spéciale TCG & Tactique de Course (sans fuite dans le contexte)
  if (roll === 2) {
    const distractors = shuffleArray(distractorSource)
      .slice(0, 3)
      .map((c) => c.title);
    const options = shuffleArray([targetCard.title, ...distractors]);
    const correctIndex = options.indexOf(targetCard.title);

    const maskedFact = maskCardTitleInText(targetCard.keyFact, targetCard.title);

    return {
      id: `quiz-tech-${targetCard.id}-${Date.now()}`,
      type: 'technique',
      questionText: `Dans le deck « ${targetCard.discipline} », quelle carte porte la signature « ${targetCard.specialTrait} » ?`,
      contextExcerpt: `Indice (${targetCard.category}) : ${maskedFact}`,
      options,
      correctIndex,
      explanation: `La signature « ${targetCard.specialTrait} » caractérise « ${targetCard.title} » !`,
      relatedCardId: targetCard.id,
      relatedCardTitle: targetCard.title,
      relatedDiscipline: targetCard.discipline
    };
  }

  // Mode 3 : Discipline principale ou Catégorie de la carte (100% Culture Vélo pure !)
  if (canAskDiscipline) {
    const allDiscs                   = ['Route', 'VTT', 'Piste', 'Cyclo-cross'];
    const options = shuffleArray(allDiscs);
    const correctIndex = options.indexOf(targetCard.discipline                  );

    return {
      id: `quiz-disc-${targetCard.id}-${Date.now()}`,
      type: 'matchup',
      questionText: `À quelle discipline majeure du cyclisme est rattachée la carte « ${targetCard.title} » ?`,
      contextExcerpt: `Catégorie : ${targetCard.category} • Repère : ${targetCard.keyYear}`,
      options,
      correctIndex,
      explanation: `« ${targetCard.title} » appartient à l’univers ${targetCard.discipline} (${targetCard.subtitle}).`,
      relatedCardId: targetCard.id,
      relatedCardTitle: targetCard.title,
      relatedDiscipline: targetCard.discipline
    };
  }

  // Sinon, poser la question sur la Catégorie ou le texte à trous du sous-titre/fait
  const allCats                 = [
    'Athlète / Légende',
    'Épreuve / Monument',
    'Terrain / Secteur',
    'Matériel & Technique'
  ];
  const options = shuffleArray(allCats);
  const correctIndex = options.indexOf(targetCard.category);

  return {
    id: `quiz-cat-${targetCard.id}-${Date.now()}`,
    type: 'matchup',
    questionText: `Dans quelle catégorie TCG classe-t-on « ${targetCard.title} » (${targetCard.discipline}) ?`,
    contextExcerpt: `Fait clé : ${maskCardTitleInText(targetCard.keyFact, targetCard.title)}`,
    options,
    correctIndex,
    explanation: `« ${targetCard.title} » est classé(e) dans « ${targetCard.category} » (${targetCard.subtitle}).`,
    relatedCardId: targetCard.id,
    relatedCardTitle: targetCard.title,
    relatedDiscipline: targetCard.discipline
  };
}


// === FILE: src/components/SportIcons.tsx ===
function WheelLogoIcon({ className = 'w-6 h-6' }           ) {
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: (className) }, React.createElement("circle", { cx: "12", cy: "12", r: "9" }), React.createElement("circle", { cx: "12", cy: "12", r: "2.5" }), React.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "9.5" }), React.createElement("line", { x1: "12", y1: "14.5", x2: "12", y2: "21" }), React.createElement("line", { x1: "4.2", y1: "7.5", x2: "9.8", y2: "10.7" }), React.createElement("line", { x1: "14.2", y1: "13.3", x2: "19.8", y2: "16.5" }), React.createElement("line", { x1: "19.8", y1: "7.5", x2: "14.2", y2: "10.7" }), React.createElement("line", { x1: "9.8", y1: "13.3", x2: "4.2", y2: "16.5" }))
  );
}
function BoltWattIcon({ className = 'w-4 h-4' }           ) {
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: (className) }, React.createElement("path", { d: "M13 2L4 14h6.5l-1.5 8L19 10h-6.5L13 2z" }))
  );
}
function BidonIcon({ className = 'w-4 h-4' }           ) {
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("path", { d: "M10 3h4v2l2 2v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V7l2-2V3z" }), React.createElement("line", { x1: "8", y1: "10", x2: "16", y2: "10" }), React.createElement("line", { x1: "11", y1: "1.5", x2: "13", y2: "1.5" }))
  );
}
function TrophyIcon({ className = 'w-4 h-4' }           ) {
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("path", { d: "M6 4h12v5a6 6 0 0 1-12 0V4z" }), React.createElement("path", { d: "M6 6H3v2a3 3 0 0 0 3 3" }), React.createElement("path", { d: "M18 6h3v2a3 3 0 0 1-3 3" }), React.createElement("line", { x1: "12", y1: "15", x2: "12", y2: "19" }), React.createElement("path", { d: "M8 21h8" }))
  );
}
function BoosterPackIcon({ className = 'w-4 h-4' }           ) {
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("path", { d: "M6 3h12l-1 3 1 15H6l1-15-1-3z" }), React.createElement("line", { x1: "6.5", y1: "7", x2: "17.5", y2: "7" }), React.createElement("polygon", { points: "12,10 13.8,13.5 17.5,14 14.8,16.5 15.5,20 12,18.2 8.5,20 9.2,16.5 6.5,14 10.2,13.5" }))
  );
}
function BookAlbumIcon({ className = 'w-4 h-4' }           ) {
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("rect", { x: "4", y: "3", width: "16", height: "18", rx: "2" }), React.createElement("line", { x1: "8", y1: "3", x2: "8", y2: "21" }), React.createElement("rect", { x: "11", y: "7", width: "6", height: "4", rx: "0.5" }), React.createElement("line", { x1: "11", y1: "14", x2: "17", y2: "14" }), React.createElement("line", { x1: "11", y1: "17", x2: "15", y2: "17" }))
  );
}
function SquadDeckIcon({ className = 'w-4 h-4' }           ) {
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("rect", { x: "3", y: "7", width: "11", height: "14", rx: "2" }), React.createElement("path", { d: "M9 5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-1" }), React.createElement("line", { x1: "6", y1: "12", x2: "11", y2: "12" }), React.createElement("line", { x1: "6", y1: "15", x2: "10", y2: "15" }))
  );
}
function DuelFlagIcon({ className = 'w-4 h-4' }           ) {
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("path", { d: "M4 21V4" }), React.createElement("path", { d: "M4 5h12l-2 4 2 4H4" }), React.createElement("circle", { cx: "17", cy: "17", r: "4" }), React.createElement("polyline", { points: "17 15 17 17 18.5 18" }))
  );
}
function BrainQuizIcon({ className = 'w-4 h-4' }           ) {
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("circle", { cx: "12", cy: "12", r: "9" }), React.createElement("path", { d: "M9.5 9a2.5 2.5 0 0 1 5 .8c0 1.7-2.5 2.2-2.5 3.7" }), React.createElement("circle", { cx: "12", cy: "17", r: "0.8", fill: "currentColor" }))
  );
}
function SpeakerIcon({ enabled, className = 'w-4 h-4' }                                          ) {
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }), (enabled ? (
        React.createElement(React.Fragment, null, React.createElement("path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07" }), React.createElement("path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14" }))
      ) : (
        React.createElement(React.Fragment, null, React.createElement("line", { x1: "22", y1: "9", x2: "16", y2: "15" }), React.createElement("line", { x1: "16", y1: "9", x2: "22", y2: "15" }))
      )))
  );
}
function ShieldIcon({ className = 'w-4 h-4' }           ) {
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("path", { d: "M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" }))
  );
}
function StarIcon({ className = 'w-3.5 h-3.5' }           ) {
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: (className) }, React.createElement("polygon", { points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" }))
  );
}
function ShareIcon({ className = 'w-4 h-4' }           ) {
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2" }), React.createElement("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" }))
  );
}
function DisciplineIcon({
  discipline,
  className = 'w-4 h-4'
}   
                         
                     
 ) {
  if (discipline === 'Route') {
    return (
      React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("path", { d: "M3 19l6-11 4 6 3-5 5 10H3z" }))
    );
  }
  if (discipline === 'VTT') {
    return (
      React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("polygon", { points: "12 3 6 13 18 13" }), React.createElement("polygon", { points: "12 9 4 19 20 19" }), React.createElement("line", { x1: "12", y1: "19", x2: "12", y2: "22" }))
    );
  }
  if (discipline === 'Piste') {
    return (
      React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("ellipse", { cx: "12", cy: "12", rx: "9", ry: "5.5" }), React.createElement("ellipse", { cx: "12", cy: "12", rx: "4.5", ry: "2.2" }))
    );
  }
  if (discipline === 'Cyclo-cross') {
    return (
      React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("path", { d: "M4 17l4-4 3 2 4-5 5 7" }), React.createElement("path", { d: "M3 20h18" }), React.createElement("circle", { cx: "7", cy: "7", r: "2" }))
    );
  }
  return (
    React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (className) }, React.createElement("circle", { cx: "12", cy: "12", r: "9" }), React.createElement("path", { d: "M6 12h12" }), React.createElement("path", { d: "M12 6v12" }))
  );
}


// === FILE: src/components/ErrorBoundary.tsx ===
class ErrorBoundary extends React.Component 
                     
                    
  {
  constructor(props                    ) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
  }

  static getDerivedStateFromError(error         )                     {
    const msg =
      error instanceof Error
        ? error.message
        : 'Une erreur d’affichage inattendue est survenue.';
    return {
      hasError: true,
      errorMessage: msg
    };
  }

  componentDidCatch(error         ) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[VeloLegends ErrorBoundary]', error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        React.createElement("div", { className: "min-h-dvh bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6" }, React.createElement("div", { className: "max-w-lg w-full rounded-3xl bg-slate-900 border-2 border-rose-500/60 p-6 text-center space-y-4 shadow-2xl" }, React.createElement("div", { className: "w-12 h-12 mx-auto rounded-2xl bg-rose-500/15 border border-rose-400/40 flex items-center justify-center text-rose-400" }, React.createElement(ShieldIcon, { className: "w-6 h-6" })), React.createElement("h2", { className: "text-xl font-black text-white" }, "Incident Technique Détecté"), React.createElement("p", { className: "text-xs text-slate-300 leading-relaxed" }, "Le module d’interface a rencontré une exception. Votre progression est protégée dans votre navigateur."), React.createElement("div", { className: "rounded-xl bg-slate-950 border border-slate-800 p-3 text-[11px] font-mono text-rose-300" }, (this.state.errorMessage)), React.createElement("div", { className: "flex flex-wrap items-center justify-center gap-3 pt-1" }, React.createElement("button", { type: "button", onClick: (() => {
                  this.setState({ hasError: false, errorMessage: '' });
                }), className: "px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition" }, "Recharger la vue"), (this.props.onResetSave && (
                React.createElement("button", { type: "button", onClick: (() => {
                    this.props.onResetSave?.();
                    this.setState({ hasError: false, errorMessage: '' });
                  }), className: "px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition" }, "Réinitialiser les données locales")
              )))))
      );
    }
    return this.props.children;
  }
}


// === FILE: src/components/CardVisualArt.tsx ===


let externalMediaAllowedFlag = true;
function setExternalMediaAllowed(allowed         ) {
  externalMediaAllowedFlag = Boolean(allowed);
}
function getExternalMediaAllowed()          {
  return externalMediaAllowedFlag;
}
function CardVisualArt({
  card,
  liveImageUrl,
  compact
}                    ) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [card.id, liveImageUrl, card.imageUrl]);

  const effectiveImg =
    externalMediaAllowedFlag && !imgFailed ? card.imageUrl || liveImageUrl : undefined;

  const getPalette = () => {
    switch (card.discipline) {
      case 'Route':
        return {
          bgFrom: '#291704',
          bgVia: '#4a2505',
          bgTo: '#0c0f16',
          accent: '#f59e0b',
          secondary: '#fde047',
          surfaceLabel: 'ASPHALTE'
        };
      case 'VTT':
        return {
          bgFrom: '#05291e',
          bgVia: '#094432',
          bgTo: '#090e12',
          accent: '#10b981',
          secondary: '#6ee7b7',
          surfaceLabel: 'SINGLETRACK'
        };
      case 'Piste':
        return {
          bgFrom: '#062634',
          bgVia: '#0c4154',
          bgTo: '#0a0e17',
          accent: '#06b6d4',
          secondary: '#67e8f9',
          surfaceLabel: 'PIN 250M'
        };
      case 'Cyclo-cross':
        return {
          bgFrom: '#2a1005',
          bgVia: '#511c08',
          bgTo: '#120e0d',
          accent: '#f97316',
          secondary: '#fdba74',
          surfaceLabel: 'LABOURS'
        };
      case 'Polyvalent':
      default:
        return {
          bgFrom: '#1f162d',
          bgVia: '#2c1d3d',
          bgTo: '#0c0f17',
          accent: '#f43f5e',
          secondary: '#facc15',
          surfaceLabel: 'POLYVALENT'
        };
    }
  };

  const palette = getPalette();

  return (
    React.createElement("div", { className: "relative w-full h-full overflow-hidden select-none", style: ({
        background: `linear-gradient(150deg, ${palette.bgFrom} 0%, ${palette.bgVia} 48%, ${palette.bgTo} 100%)`
      }) }, React.createElement("svg", { viewBox: "0 0 320 200", className: "absolute inset-0 w-full h-full object-cover opacity-90", preserveAspectRatio: "xMidYMid slice" }, React.createElement("defs", null, React.createElement("radialGradient", { id: (`glow-${card.id}`), cx: "50%", cy: "40%", r: "62%" }, React.createElement("stop", { offset: "0%", stopColor: (palette.accent), stopOpacity: "0.42" }), React.createElement("stop", { offset: "100%", stopColor: (palette.bgTo), stopOpacity: "0" }))), React.createElement("rect", { width: "320", height: "200", fill: (`url(#glow-${card.id})`) }), React.createElement("g", { stroke: (palette.accent), strokeOpacity: "0.1", strokeWidth: "1" }, React.createElement("line", { x1: "0", y1: "40", x2: "320", y2: "40" }), React.createElement("line", { x1: "0", y1: "80", x2: "320", y2: "80" }), React.createElement("line", { x1: "0", y1: "120", x2: "320", y2: "120" }), React.createElement("line", { x1: "0", y1: "160", x2: "320", y2: "160" }), React.createElement("line", { x1: "80", y1: "0", x2: "80", y2: "200" }), React.createElement("line", { x1: "160", y1: "0", x2: "160", y2: "200" }), React.createElement("line", { x1: "240", y1: "0", x2: "240", y2: "200" })), (card.discipline === 'Route' && (
          React.createElement("g", null, React.createElement("polygon", { points: "0,178 70,84 140,136 225,52 320,162 320,200 0,200", fill: "#0f172a", fillOpacity: "0.78" }), React.createElement("polygon", { points: "225,52 200,84 250,84", fill: "#f8fafc", fillOpacity: "0.65" }), React.createElement("path", { d: "M 110 200 Q 185 174 148 150 Q 118 130 185 112 Q 232 95 225 58", fill: "none", stroke: (palette.accent), strokeWidth: "3", strokeDasharray: "5 3", strokeOpacity: "0.85" }))
        )), (card.discipline === 'VTT' && (
          React.createElement("g", null, React.createElement("path", { d: "M0,150 Q75,112 155,142 T320,120 L320,200 L0,200 Z", fill: "#064e3b", fillOpacity: "0.6" }), React.createElement("path", { d: "M0,172 Q95,142 185,168 T320,152", fill: "none", stroke: (palette.secondary), strokeWidth: "1.5", strokeOpacity: "0.35" }), React.createElement("polygon", { points: "34,180 46,125 58,180", fill: "#047857" }), React.createElement("polygon", { points: "256,180 270,118 284,180", fill: "#047857" }), React.createElement("polygon", { points: "280,185 294,132 308,185", fill: "#065f46" }))
        )), (card.discipline === 'Piste' && (
          React.createElement("g", null, React.createElement("path", { d: "M -20 192 Q 160 88 340 192", fill: "none", stroke: "#92400e", strokeWidth: "34", strokeOpacity: "0.52" }), React.createElement("path", { d: "M -20 198 Q 160 94 340 198", fill: "none", stroke: "#090d16", strokeWidth: "2.5" }), React.createElement("path", { d: "M -20 186 Q 160 82 340 186", fill: "none", stroke: "#ef4444", strokeWidth: "2" }), React.createElement("path", { d: "M -20 171 Q 160 67 340 171", fill: "none", stroke: "#38bdf8", strokeWidth: "2" }))
        )), (card.discipline === 'Cyclo-cross' && (
          React.createElement("g", null, React.createElement("path", { d: "M 0 156 Q 82 114 166 148 T 320 132 L 320 200 L 0 200 Z", fill: "#78350f", fillOpacity: "0.72" }), React.createElement("path", { d: "M 20 188 L 115 162", stroke: "#fb923c", strokeWidth: "2.5", strokeDasharray: "6 4", strokeOpacity: "0.55" }), React.createElement("polyline", { points: "232,188 232,175 245,175 245,162 258,162 258,149 271,149 271,136", fill: "none", stroke: "#fed7aa", strokeWidth: "2.5", strokeOpacity: "0.7" }))
        )), (card.discipline === 'Polyvalent' && (
          React.createElement("g", { transform: "rotate(-12 160 100)", opacity: "0.55" }, React.createElement("rect", { x: "-40", y: "114", width: "400", height: "6", fill: "#0055A4" }), React.createElement("rect", { x: "-40", y: "120", width: "400", height: "6", fill: "#EF4135" }), React.createElement("rect", { x: "-40", y: "126", width: "400", height: "6", fill: "#111827" }), React.createElement("rect", { x: "-40", y: "132", width: "400", height: "6", fill: "#FACC15" }), React.createElement("rect", { x: "-40", y: "138", width: "400", height: "6", fill: "#16A34A" }))
        )), (!effectiveImg && (
          React.createElement("g", { transform: "translate(160, 96)" }, React.createElement("circle", { cx: "-32", cy: "18", r: "21", fill: "none", stroke: (palette.accent), strokeWidth: "3.2" }), React.createElement("circle", { cx: "-32", cy: "18", r: "3.5", fill: "#f8fafc" }), React.createElement("circle", { cx: "32", cy: "18", r: "21", fill: "none", stroke: (palette.accent), strokeWidth: "3.2" }), React.createElement("circle", { cx: "32", cy: "18", r: "3.5", fill: "#f8fafc" }), React.createElement("polygon", { points: "-32,18 -5,18 14,-8 -15,-8", fill: "none", stroke: "#f8fafc", strokeWidth: "3.2", strokeLinejoin: "round" }), React.createElement("line", { x1: "14", y1: "-8", x2: "32", y2: "18", stroke: "#f8fafc", strokeWidth: "3.2" }), React.createElement("line", { x1: "-15", y1: "-8", x2: "-20", y2: "-19", stroke: "#f8fafc", strokeWidth: "3.2" }), (card.category === 'Athlète / Légende' ? (
              React.createElement("g", null, React.createElement("path", { d: "M -17 -18 Q -4 -35 16 -23 L 18 -9 L -5 4 Z", fill: (palette.accent), fillOpacity: "0.92" }), React.createElement("circle", { cx: "19", cy: "-29", r: "8", fill: "#f8fafc" }), React.createElement("path", { d: "M 12 -33 Q 22 -39 28 -29 Z", fill: (palette.secondary) }))
            ) : card.category === 'Épreuve / Monument' ? (
              React.createElement("g", { transform: "translate(0, -27)" }, React.createElement("polygon", { points: "0,-16 4.5,-5 17,-5 7,2.5 11,14 0,7 -11,14 -7,2.5 -17,-5 -4.5,-5", fill: "#facc15" }))
            ) : card.category === 'Matériel & Technique' ? (
              React.createElement("g", { transform: "translate(0, -27)" }, React.createElement("circle", { cx: "0", cy: "0", r: "13", fill: "none", stroke: "#facc15", strokeWidth: "2.8", strokeDasharray: "4 3" }), React.createElement("polygon", { points: "-3,-9 5,-2 0,-2 3,9 -5,2 0,2", fill: "#f8fafc" }))
            ) : (
              React.createElement("g", { transform: "translate(0, -25)" }, React.createElement("polygon", { points: "-16,10 0,-15 16,10", fill: (palette.accent), fillOpacity: "0.45", stroke: "#f8fafc", strokeWidth: "2" }))
            )))
        ))), (effectiveImg && (
        React.createElement("div", { className: "absolute inset-0 flex items-center justify-center p-1" }, React.createElement("img", { src: (effectiveImg), alt: (card.title), loading: "lazy", decoding: "async", referrerPolicy: "no-referrer", onError: (() => setImgFailed(true)), className: "w-full h-full object-cover object-top rounded-lg border border-white/15" }), React.createElement("div", { className: "absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/15 to-transparent pointer-events-none" }))
      )), React.createElement("div", { className: "absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between text-[10px] font-bold tracking-wide text-slate-100 z-10" }, React.createElement("span", { className: "px-1.5 py-0.5 rounded bg-slate-950/85 border border-white/15 backdrop-blur-sm truncate max-w-[64%] uppercase" }, (card.roleTag || card.category)), (!compact && (
          React.createElement("span", { className: "px-1.5 py-0.5 rounded bg-slate-950/85 border border-white/15 backdrop-blur-sm font-mono text-amber-300" }, (card.countryCode), " • ", (card.keyYear))
        ))))
  );
}


// === FILE: src/components/CyclingCard.tsx ===
function CyclingCard({
  card,
  liveImageUrl,
  count = 1,
  starLevel = 0,
  isLocked = false,
  isNew = false,
  isInDeck = false,
  isSelected = false,
  isEnergyBlocked = false,
  terrainBonusPct = 0,
  compact = false,
  onClick,
  actionButton
}                  ) {
  const [tiltStyle, setTiltStyle] = useState     ({});
  const [glareStyle, setGlareStyle] = useState     ({ opacity: 0 });

  useEffect(() => {
    setTiltStyle({});
    setGlareStyle({ opacity: 0 });
  }, [card.id]);

  const rarityInfo = RARITY_CONFIG[card.rarity];
  const discInfo = DISCIPLINE_CONFIG[card.discipline];
  const effStats = getEffectiveCardStats(card, starLevel);
  const isHolo =
    !isLocked &&
    (starLevel >= 2 ||
      card.rarity === 'Légendaire' ||
      card.rarity === 'Épique' ||
      card.rarity === 'Rare');
  const isRainbow = card.rarity === 'Légendaire' && !isLocked;

  const handleMouseMove = (e     ) => {
    if (isLocked || compact) return;
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      !window.matchMedia('(hover: hover)').matches
    ) {
      return;
    }
    const rect = e.currentTarget?.getBoundingClientRect?.();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotY = (px - 0.5) * 14;
    const rotX = (0.5 - py) * 12;
    setTiltStyle({
      transform: `perspective(850px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) scale(1.02)`,
      transition: 'transform 80ms ease-out'
    });
    setGlareStyle({
      opacity: isHolo ? 0.55 : 0.25,
      background: `radial-gradient(circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(255,255,255,0.42) 0%, rgba(250,204,21,0.12) 32%, transparent 70%)`
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(850px) rotateX(0deg) rotateY(0deg) scale(1)',
      transition: 'transform 220ms ease-out'
    });
    setGlareStyle({ opacity: 0, transition: 'opacity 220ms ease-out' });
  };

  const renderStars = () => {
    if (starLevel <= 0) return null;
    const items = [];
    for (let i = 0; i < starLevel; i++) {
      items.push(React.createElement(StarIcon, { key: (i), className: "w-2.5 h-2.5 text-amber-300" }));
    }
    return (
      React.createElement("span", { className: "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-400/60" }, (items))
    );
  };

  const btnBg =
    actionButton?.variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500 text-white'
      : actionButton?.variant === 'amber'
      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950';

  return (
    React.createElement("div", { onClick: (isEnergyBlocked ? undefined : onClick), onMouseMove: (handleMouseMove), onMouseLeave: (handleMouseLeave), style: ({
        ...tiltStyle,
        boxShadow:
          !isLocked && !isRainbow
            ? `0 10px 26px -10px ${rarityInfo.glowColor}`
            : undefined
      }), className: (`group relative rounded-2xl border-2 overflow-hidden flex flex-col justify-between select-none touch-manipulation transition duration-200 ${
        compact ? 'h-[280px] sm:h-[310px]' : 'h-[310px] sm:h-[370px]'
      } ${
        isRainbow
          ? 'uci-rainbow-border bg-slate-950'
          : `${rarityInfo.borderClass} bg-slate-900`
      } ${isLocked ? 'opacity-55' : ''} ${
        isSelected ? 'ring-2 ring-amber-400 scale-[1.02]' : ''
      } ${
        isEnergyBlocked
          ? 'opacity-55 cursor-not-allowed'
          : onClick
          ? 'cursor-pointer active:scale-95'
          : ''
      }`) }, React.createElement("div", { className: (`h-1.5 w-full shrink-0 ${isRainbow ? 'uci-rainbow-stripe' : ''}`), style: (isRainbow ? undefined : { backgroundColor: discInfo.accentHex }) }), (isHolo && (
        React.createElement("div", { className: "pointer-events-none absolute inset-0 z-20 foil-prism-sheen", "aria-hidden": "true" })
      )), React.createElement("div", { className: "pointer-events-none absolute inset-0 z-20", style: (glareStyle), "aria-hidden": "true" }), React.createElement("div", { className: "relative z-10 flex flex-col flex-1 min-h-0 p-2 sm:p-2.5 gap-1.5 sm:gap-2" }, React.createElement("div", { className: "flex items-center justify-between gap-1" }, React.createElement("div", { className: "flex items-center gap-1 min-w-0" }, React.createElement("span", { className: "hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-[10px] font-mono font-bold text-slate-300 tabular-nums" }, "#", (String(card.cardNumber).padStart(3, '0'))), React.createElement("span", { className: (`inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate ${discInfo.bgSoft} ${discInfo.borderSoft} ${discInfo.color}`) }, React.createElement(DisciplineIcon, { discipline: (card.discipline), className: "w-2.5 h-2.5 shrink-0" }), React.createElement("span", { className: "truncate" }, (discInfo.shortLabel)))), React.createElement("div", { className: "flex items-center gap-1 shrink-0" }, (renderStars()), React.createElement("span", { title: (`Coût : ${card.energyCost} Watts d'énergie`), className: "inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded bg-slate-950 border border-cyan-500/40 text-cyan-300 font-mono font-black text-[10px] sm:text-[11px] tabular-nums" }, React.createElement("span", null, (card.energyCost)), React.createElement(BoltWattIcon, { className: "w-2.5 h-2.5" })), React.createElement("span", { className: "px-1 sm:px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-black text-[10px] sm:text-[11px] tabular-nums" }, (effStats.overall)))), ((isNew || isInDeck || terrainBonusPct > 0 || count > 1 || isLocked) && (
          React.createElement("div", { className: "flex flex-wrap items-center gap-1 -mt-0.5" }, (isNew && (
              React.createElement("span", { className: "px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[8px] sm:text-[9px] font-black uppercase tracking-wider" }, "NOUVEAU")
            )), (isInDeck && (
              React.createElement("span", { className: "px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider" }, "TITULAIRE")
            )), (terrainBonusPct > 0 && (
              React.createElement("span", { className: "px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-[8px] sm:text-[9px] font-mono font-bold" }, "+", (terrainBonusPct), "% TERRAIN")
            )), (count > 1 && (
              React.createElement("span", { className: "px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-200 text-[8px] sm:text-[9px] font-mono font-bold" }, "x", (count))
            )), (isLocked && (
              React.createElement("span", { className: "px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-400 text-[8px] sm:text-[9px] font-mono font-bold uppercase" }, "VERROUILLÉE")
            )))
        )), React.createElement("div", { className: (`relative w-full rounded-xl overflow-hidden border border-slate-700/70 bg-slate-950 ${compact ? 'h-20 sm:h-24' : 'h-24 sm:h-32'} shrink-0`) }, (isLocked ? (
            React.createElement("div", { className: "w-full h-full flex flex-col items-center justify-center bg-slate-950/90 text-slate-600" }, React.createElement(ShieldIcon, { className: "w-6 h-6 sm:w-7 sm:h-7 mb-1" }), React.createElement("span", { className: "text-[9px] sm:text-[10px] font-mono uppercase tracking-widest" }, "CARTE À DÉBLOQUER"))
          ) : (
            React.createElement(CardVisualArt, { card: (card), liveImageUrl: (liveImageUrl) })
          )), React.createElement("span", { className: (`absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded border text-[8px] sm:text-[9px] font-black uppercase tracking-wider backdrop-blur-sm bg-slate-950/80 ${rarityInfo.borderClass} ${rarityInfo.textColor}`) }, (card.rarity))), React.createElement("div", { className: "min-w-0" }, React.createElement("h3", { className: "text-xs sm:text-sm font-black text-white leading-tight truncate tracking-tight" }, (isLocked ? '??? (Profil Masqué)' : card.title)), React.createElement("p", { className: "text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5" }, (isLocked ? `${card.discipline} • ${card.category}` : card.subtitle))), React.createElement("div", { className: "rounded-lg bg-slate-950/85 border border-slate-800 px-1.5 sm:px-2 py-0.5 sm:py-1 min-w-0" }, React.createElement("div", { className: "flex items-center justify-between gap-1" }, React.createElement("span", { className: "text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-amber-300 shrink-0" }, "[", (card.keyword), "]"), React.createElement("span", { className: "text-[9px] sm:text-[10px] font-semibold text-slate-200 truncate" }, (isLocked ? 'Effet au déblocage' : card.specialTrait)))), React.createElement("div", { className: "grid grid-cols-3 gap-1 sm:gap-1.5 mt-auto" }, React.createElement("div", { className: "rounded-lg bg-slate-950 border border-slate-800 px-1 sm:px-1.5 py-1 text-center" }, React.createElement("span", { className: "block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400" }, "PUI"), React.createElement("span", { className: "text-[11px] sm:text-xs font-mono font-black text-amber-300 tabular-nums" }, (isLocked ? '--' : effStats.power))), React.createElement("div", { className: "rounded-lg bg-slate-950 border border-slate-800 px-1 sm:px-1.5 py-1 text-center" }, React.createElement("span", { className: "block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400" }, "TEC"), React.createElement("span", { className: "text-[11px] sm:text-xs font-mono font-black text-cyan-300 tabular-nums" }, (isLocked ? '--' : effStats.technique))), React.createElement("div", { className: "rounded-lg bg-slate-950 border border-slate-800 px-1 sm:px-1.5 py-1 text-center" }, React.createElement("span", { className: "block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400" }, "END"), React.createElement("span", { className: "text-[11px] sm:text-xs font-mono font-black text-emerald-300 tabular-nums" }, (isLocked ? '--' : effStats.endurance)))), (actionButton && (
          React.createElement("button", { type: "button", disabled: (actionButton.disabled), onClick: ((e     ) => {
              e.stopPropagation();
              actionButton.onAction(e);
            }), className: (`w-full min-h-[34px] py-1.5 px-1.5 sm:px-2 rounded-xl font-black text-[10px] sm:text-xs leading-tight active:scale-95 transition ${
              actionButton.disabled
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : btnBg
            }`) }, (actionButton.label))
        ))))
  );
}


// === FILE: src/components/CardDetailModal.tsx ===
function CardDetailModal({
  card,
  count,
  starLevel,
  watts,
  isInDeck,
  liveImageUrl,
  liveExtract,
  liveAttribution,
  onClose,
  onToggleDeck,
  onRecycleOne,
  onUpgradeStar
}                      ) {
  if (!card) return null;

  const isUnlocked = count > 0;
  const rarityInfo = RARITY_CONFIG[card.rarity];
  const discInfo = DISCIPLINE_CONFIG[card.discipline];
  const recycleValue = RECYCLE_WATTS_BY_RARITY[card.rarity];
  const effStats = getEffectiveCardStats(card, starLevel);
  const duplicatesAvailable = Math.max(0, count - 1);

  const nextUpgrade = STAR_UPGRADE_CONFIG.find(
    (s) => s.targetStar === starLevel + 1
  );
  const canUpgrade =
    Boolean(nextUpgrade) &&
    duplicatesAvailable >= (nextUpgrade?.duplicatesNeeded || 99) &&
    watts >= (nextUpgrade?.wattsCost || 99999);

  return (
    React.createElement("div", { onClick: (() => {
        soundFX.playClick();
        onClose();
      }), className: "fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto" }, React.createElement("div", { onClick: ((e     ) => e.stopPropagation()), className: "w-full max-w-4xl rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden animate-fadeIn my-2 sm:my-auto max-h-[92dvh] flex flex-col" }, React.createElement("div", { className: (`h-2 w-full shrink-0 ${
            card.rarity === 'Légendaire' ? 'uci-rainbow-stripe' : ''
          }`), style: (
            card.rarity === 'Légendaire'
              ? undefined
              : { backgroundColor: discInfo.accentHex }
          ) }), React.createElement("div", { className: "px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-2 shrink-0" }, React.createElement("div", { className: "flex items-center gap-2 min-w-0" }, React.createElement("span", { className: "px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-[10px] font-mono font-bold text-slate-300 shrink-0" }, "#", (String(card.cardNumber).padStart(3, '0'))), React.createElement("span", { className: "text-xs sm:text-sm font-black text-white truncate" }, (card.title))), React.createElement("button", { type: "button", onClick: (() => {
              soundFX.playClick();
              onClose();
            }), className: "min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs shrink-0" }, "Fermer")), React.createElement("div", { className: "overflow-y-auto flex-1 min-h-0 p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start" }, React.createElement("div", { className: "md:col-span-5 flex flex-col items-center gap-3" }, React.createElement("div", { className: "w-full max-w-[260px] sm:max-w-[290px]" }, React.createElement(CyclingCard, { card: (card), liveImageUrl: (liveImageUrl), count: (count), starLevel: (starLevel), isLocked: (!isUnlocked), isInDeck: (isInDeck) })), (isUnlocked && (
              React.createElement("div", { className: "w-full max-w-[260px] sm:max-w-[290px] rounded-2xl bg-slate-950 border border-slate-800 p-3 space-y-2" }, React.createElement("div", { className: "flex items-center justify-between text-xs" }, React.createElement("span", { className: "font-bold text-slate-300 flex items-center gap-1.5" }, React.createElement(StarIcon, { className: "w-3.5 h-3.5 text-amber-400" }), React.createElement("span", null, "Évolution Prisme")), React.createElement("span", { className: "font-mono font-black text-amber-400" }, "Rang ", (starLevel), "/3 (", (effStats.starBonusLabel), ")")), (nextUpgrade ? (
                  React.createElement("button", { type: "button", disabled: (!canUpgrade), onClick: (() => {
                      soundFX.playUpgradeStar();
                      onUpgradeStar(card.id);
                    }), className: (`w-full min-h-[40px] py-2 px-3 rounded-xl font-black text-xs active:scale-95 transition ${
                      canUpgrade
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`) }, "Passer au rang ★", (nextUpgrade.targetStar), " (", (nextUpgrade.duplicatesNeeded), " doublon + ", (nextUpgrade.wattsCost), " W)")
                ) : (
                  React.createElement("div", { className: "text-center text-[11px] font-bold text-amber-300 py-1" }, "Carte au rang maximal ★★★ Prisme")
                )))
            ))), React.createElement("div", { className: "md:col-span-7 space-y-4 min-w-0" }, React.createElement("div", { className: "flex items-start justify-between gap-3" }, React.createElement("div", { className: "min-w-0" }, React.createElement("div", { className: "flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5" }, React.createElement("span", { className: (`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${discInfo.bgSoft} ${discInfo.borderSoft} ${discInfo.color}`) }, React.createElement(DisciplineIcon, { discipline: (card.discipline), className: "w-3 h-3" }), React.createElement("span", null, (card.discipline))), React.createElement("span", { className: (`px-2 py-0.5 rounded-full text-[11px] font-bold border ${rarityInfo.borderClass} ${rarityInfo.textColor} bg-slate-950`) }, (card.rarity)), React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-800 text-cyan-300 inline-flex items-center gap-1" }, React.createElement("span", null, "Coût ", (card.energyCost)), React.createElement(BoltWattIcon, { className: "w-3 h-3" })), (card.roleTag && (
                    React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-950 border border-slate-700 text-slate-300" }, (card.roleTag))
                  ))), React.createElement("h2", { className: "text-xl sm:text-2xl font-black text-white leading-tight break-words" }, (card.title)), React.createElement("p", { className: "text-xs sm:text-sm text-slate-400 mt-0.5" }, (card.subtitle), " ", (card.countryCode ? `• ${card.countryCode}` : ''), (' '), (card.keyYear ? `• ${card.keyYear}` : '')))), React.createElement("div", { className: "rounded-2xl bg-slate-950/90 border border-slate-800 p-4 space-y-2" }, React.createElement("div", { className: "flex items-center justify-between text-xs" }, React.createElement("span", { className: "font-black uppercase tracking-wider text-amber-300" }, "Pouvoir TCG [", (card.keyword), "] : ", (card.specialTrait)), React.createElement("span", { className: "font-mono font-bold text-slate-400" }, "#", (String(card.cardNumber).padStart(3, '0')))), React.createElement("p", { className: "text-xs text-slate-300 leading-relaxed" }, (card.effectDescription)), React.createElement("div", { className: "text-[11px] text-slate-400 pt-1 border-t border-slate-800/80" }, "Affinité terrain :", (' '), React.createElement("strong", { className: "text-emerald-300" }, (card.linkedDisciplines.join(' • '))))), React.createElement("div", { className: "rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-2" }, React.createElement("div", { className: "text-xs font-bold uppercase tracking-wider text-slate-400" }, "Fiche Technique & Culture Vélo"), React.createElement("p", { className: "text-sm text-slate-200 leading-relaxed" }, (liveExtract || card.summary)), React.createElement("div", { className: "pt-2 border-t border-slate-800/80 text-xs text-amber-300" }, "Fait marquant :", (' '), React.createElement("span", { className: "text-slate-200" }, (card.keyFact))), (card.wikiSlug && (
                React.createElement("div", { className: "pt-1" }, React.createElement("a", { href: (`https://fr.wikipedia.org/wiki/${encodeURIComponent(card.wikiSlug)}`), target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 underline" }, "Lire la fiche Wikipédia FR (", (card.wikiSlug.replace(/_/g, ' ')), ")"))
              )), ((card.imageAttribution || liveAttribution) &&
                getExternalMediaAllowed() &&
                (card.imageUrl || liveImageUrl) && (
                React.createElement("div", { className: "pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2" }, React.createElement("span", { className: "min-w-0 break-words" }, "Crédit photo (libre) :", (' '), React.createElement("strong", { className: "text-slate-200" }, ((card.imageUrl && card.imageAttribution
                        ? card.imageAttribution
                        : liveAttribution || card.imageAttribution
                      )?.author)), (' '), "(", ((card.imageUrl && card.imageAttribution
                      ? card.imageAttribution
                      : liveAttribution || card.imageAttribution
                    )?.licenseShortName), ")"), React.createElement("a", { href: (
                      (card.imageUrl && card.imageAttribution
                        ? card.imageAttribution
                        : liveAttribution || card.imageAttribution
                      )?.commonsUrl
                    ), target: "_blank", rel: "noopener noreferrer", className: "text-emerald-400 hover:underline font-semibold" }, "Source Wikimedia Commons"))
              ))), React.createElement("div", { className: "flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1" }, (isUnlocked ? (
                React.createElement(React.Fragment, null, React.createElement("button", { type: "button", onClick: (() => {
                      soundFX.playClick();
                      onToggleDeck(card.id);
                    }), className: (`flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-black text-xs active:scale-95 transition ${
                      isInDeck
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`) }, (isInDeck ? 'Retirer du Deck (5 cartes)' : 'Aligner dans le Deck')), (duplicatesAvailable > 0 ? (
                    React.createElement("button", { type: "button", onClick: (() => {
                        soundFX.playClick();
                        onRecycleOne(card.id);
                      }), className: "min-h-[44px] py-2.5 px-4 rounded-xl font-black text-xs bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 border border-amber-500/30 transition" }, "Recycler 1 doublon (+", (recycleValue), " W)")
                  ) : (
                    React.createElement("span", { className: "py-2.5 px-3 rounded-xl text-[11px] font-semibold text-center bg-slate-950 text-slate-400 border border-slate-800" }, "Exemplaire unique protégé (Deck / Album)")
                  )))
              ) : (
                React.createElement("div", { className: "w-full rounded-xl bg-slate-800/70 border border-slate-700 p-3 text-center text-xs text-slate-300" }, "Carte non encore débloquée. Ouvrez des boosters ", React.createElement("strong", null, (card.discipline)), " ou Peloton pour l'obtenir !")
              )))))))
  );
}


// === FILE: src/components/LegalModal.tsx ===
function LegalModal({
  isOpen,
  initialTab,
  saveState,
  allCards,
  wikiCache,
  onClose,
  onToggleWikiSync,
  onClearWikiCache,
  onImportSaveJson,
  onEraseAllUserData
}                 ) {
  const [activeTab, setActiveTab] = useState              (initialTab);
  const [statusFeedback, setStatusFeedback] = useState               (null);
  const fileInputRef = useRef     (null);

  if (!isOpen) return null;

  const catalogAttributedEntries = allCards
    .filter((card) => Boolean(card.imageUrl && card.imageAttribution))
    .map((card) => ({
      key: `card:${card.id}`,
      cardTitle: card.title,
      commonsUrl: card.imageAttribution .commonsUrl,
      attribution: card.imageAttribution 
    }));

  const seenCommonsUrls = new Set(
    catalogAttributedEntries.map((item) => item.commonsUrl)
  );

  const liveCacheAttributedEntries = Object.entries(wikiCache)
    .filter(
      ([, entry]) =>
        Boolean(entry.thumbnailUrl && entry.attribution) &&
        !seenCommonsUrls.has(entry.attribution .commonsUrl)
    )
    .map(([slug, entry]) => {
      const card = allCards.find((c) => c.wikiSlug === slug);
      return {
        key: `wiki:${slug}`,
        cardTitle: card?.title || slug.replace(/_/g, ' '),
        commonsUrl: entry.attribution .commonsUrl,
        attribution: entry.attribution 
      };
    });

  const attributedEntries = [
    ...catalogAttributedEntries,
    ...liveCacheAttributedEntries
  ];

  const handleExportBackup = () => {
    const json = createBackupExportJson(saveState);
    try {
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `velolegends-tcg-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusFeedback('Sauvegarde JSON exportée avec succès.');
    } catch {
      setStatusFeedback('Export préparé (téléchargement navigateur indisponible ici).');
    }
  };

  const handleFileChange = (e     ) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const res = onImportSaveJson(text);
      setStatusFeedback(res.message);
    };
    reader.readAsText(file);
  };

  return (
    React.createElement("div", { onClick: (onClose), className: "fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto" }, React.createElement("div", { onClick: ((e     ) => e.stopPropagation()), className: "w-full max-w-4xl rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden animate-fadeIn my-2 sm:my-auto max-h-[92dvh] flex flex-col" }, React.createElement("div", { className: "uci-rainbow-stripe h-1.5 w-full shrink-0" }), React.createElement("div", { className: "px-4 sm:px-6 pt-4 pb-3 border-b border-slate-800 shrink-0 space-y-3 bg-slate-900" }, React.createElement("div", { className: "flex items-center justify-between gap-2" }, React.createElement("div", { className: "flex items-center gap-2.5 min-w-0" }, React.createElement("div", { className: "w-9 h-9 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0" }, React.createElement(ShieldIcon, { className: "w-5 h-5" })), React.createElement("div", { className: "min-w-0" }, React.createElement("h2", { className: "text-sm sm:text-lg font-black text-white truncate" }, "Légal, Crédits & Confidentialité"), React.createElement("p", { className: "text-[11px] text-slate-400 truncate" }, "VeloLegends TCG • Jeu indépendant gratuit et non officiel"))), React.createElement("button", { type: "button", onClick: (onClose), className: "min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs shrink-0" }, "Fermer")), React.createElement("div", { className: "flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5" }, ((
              [
                { id: 'MENTIONS', label: 'Mentions Légales' },
                {
                  id: 'CREDITS',
                  label: `Crédits & Licences (${attributedEntries.length} média${
                    attributedEntries.length > 1 ? 's' : ''
                  })`
                },
                { id: 'PRIVACY', label: 'Confidentialité / RGPD' }
              ]                                              
            ).map((t) => (
              React.createElement("button", { key: (t.id), type: "button", onClick: (() => {
                  setActiveTab(t.id);
                  setStatusFeedback(null);
                }), className: (`shrink-0 min-h-[38px] px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition active:scale-95 ${
                  activeTab === t.id
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-600'
                }`) }, (t.label))
            ))))), React.createElement("div", { className: "p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0" }, (activeTab === 'MENTIONS' && (
            React.createElement("div", { className: "space-y-4 text-xs text-slate-300 leading-relaxed" }, React.createElement("div", { className: "rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2" }, React.createElement("h3", { className: "text-sm font-black text-white" }, "1. Éditeur du site (Application Web)"), React.createElement("p", null, React.createElement("strong", { className: "text-amber-300" }, "Nom / Pseudonyme / Raison sociale :"), (' '), "[À compléter : Votre Nom, Prénom ou Dénomination]"), React.createElement("p", null, React.createElement("strong", { className: "text-amber-300" }, "Responsable de publication :"), (' '), "[À compléter : Nom du directeur de publication]"), React.createElement("p", null, React.createElement("strong", { className: "text-amber-300" }, "Contact électronique :"), (' '), "[À compléter : contact@votre-domaine.fr]"), React.createElement("p", null, React.createElement("strong", { className: "text-amber-300" }, "Statut :"), " Projet ludique et éducatif indépendant (sans vente d’objets contre argent réel).")), React.createElement("div", { className: "rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2" }, React.createElement("h3", { className: "text-sm font-black text-white" }, "2. Hébergement technique"), React.createElement("p", null, React.createElement("strong", { className: "text-amber-300" }, "Hébergeur :"), (' '), "[À compléter : ex. Vercel Inc., Netlify Inc., Cloudflare Pages ou OVH SAS]"), React.createElement("p", null, React.createElement("strong", { className: "text-amber-300" }, "Adresse & Contact hébergeur :"), (' '), "[À compléter : Adresse postale et site web de l’hébergeur choisi]")), React.createElement("div", { className: "rounded-2xl bg-amber-950/25 border border-amber-500/40 p-4 space-y-2" }, React.createElement("h3", { className: "text-sm font-black text-amber-300" }, "3. Propriété Intellectuelle & Avertissement d’Indépendance"), React.createElement("p", null, React.createElement("strong", null, "VeloLegends TCG"), " est une création de fan indépendante, gratuite et non officielle à vocation ludique et culturelle sur l’histoire du cyclisme (Route, VTT, Piste et Cyclo-cross)."), React.createElement("p", null, "Ce site n’est ", React.createElement("strong", null, "ni affilié, ni parrainé, ni approuvé"), " par l’Union Cycliste Internationale (UCI), Amaury Sport Organisation (ASO), Flanders Classics, les fédérations nationales, ni par aucune équipe, marque commerciale de cycle ou personnalité mentionnée à titre encyclopédique dans le jeu et son quiz. Tous les scores, énergies et mécaniques de cartes sont des données fictives créées pour l’équilibrage ludique.")))
          )), (activeTab === 'CREDITS' && (
            React.createElement("div", { className: "space-y-4 text-xs text-slate-300 leading-relaxed" }, React.createElement("div", { className: "rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2" }, React.createElement("h3", { className: "text-sm font-black text-white flex items-center gap-2" }, React.createElement(BookAlbumIcon, { className: "w-4 h-4 text-amber-400" }), React.createElement("span", null, "Actifs Visuels, Audio & Code Source Intégrés")), React.createElement("ul", { className: "space-y-1.5 list-disc pl-4" }, React.createElement("li", null, React.createElement("strong", null, "Illustrations SVG des cartes & icônes UI"), " (", React.createElement("code", null, "CardVisualArt.tsx"), ", ", React.createElement("code", null, "SportIcons.tsx"), ", ", React.createElement("code", null, "favicon.svg"), ") : Visuels vectoriels originaux générés localement pour le projet (aucun logo protégé reproduit, zéro hotlink commercial)."), React.createElement("li", null, React.createElement("strong", null, "Synthèse sonore Web Audio"), " (", React.createElement("code", null, "soundService.ts"), ") : Bruitages générés mathématiquement par oscillateurs navigateur (aucun fichier sonore tiers)."), React.createElement("li", null, React.createElement("strong", null, "Typographies"), " : Polices système locales natives (zéro appel serveur de polices externe, zéro transfert d’adresse IP tiers)."), React.createElement("li", null, React.createElement("strong", null, "Moteur d’interface"), " : Code TypeScript / React autonome compilé localement sans dépendance réseau d’exécution tierce."))), React.createElement("div", { className: "rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3" }, React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" }, React.createElement("h3", { className: "text-sm font-black text-white" }, "Photographies Wikimedia Commons Chargées (Licences Libres Vérifiées)"), React.createElement("span", { className: "px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold" }, "FILTRE STRICT : CC0 / PD / CC BY / CC BY-SA")), React.createElement("p", { className: "text-[11px] text-slate-400" }, "Lorsque la synchronisation optionnelle est active, seules les images vérifiées sous licence libre (sans clause NC/ND ni Fair Use) via l’API Wikimedia Commons sont conservées avec leur attribution ci-dessous. En cas d’absence ou d’exclusion, le jeu affiche l’illustration SVG locale."), (attributedEntries.length === 0 ? (
                  React.createElement("div", { className: "rounded-xl bg-slate-900 border border-slate-800 p-4 text-center text-slate-400" }, "Aucune photographie externe chargée actuellement — affichage 100 % vectoriel SVG local actif.")
                ) : (
                  React.createElement("div", { className: "max-h-56 overflow-y-auto space-y-2 pr-1" }, (attributedEntries.map((item) => (
                      React.createElement("div", { key: (item.key), className: "rounded-xl bg-slate-900 border border-slate-800 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2" }, React.createElement("div", { className: "min-w-0" }, React.createElement("div", { className: "font-bold text-white truncate" }, (item.cardTitle)), React.createElement("div", { className: "text-[11px] text-slate-400 truncate" }, "Auteur : ", (item.attribution.author), " • Licence :", (' '), React.createElement("span", { className: "text-emerald-300 font-semibold" }, (item.attribution.licenseShortName)))), React.createElement("a", { href: (item.attribution.commonsUrl), target: "_blank", rel: "noopener noreferrer", className: "shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-[11px]" }, "Source Commons"))
                    ))))
                ))))
          )), (activeTab === 'PRIVACY' && (
            React.createElement("div", { className: "space-y-4 text-xs text-slate-300 leading-relaxed" }, React.createElement("div", { className: "rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2" }, React.createElement("h3", { className: "text-sm font-black text-white" }, "Politique de Confidentialité (Conforme RGPD)"), React.createElement("ul", { className: "space-y-1.5 list-disc pl-4" }, React.createElement("li", null, React.createElement("strong", null, "Stockage 100 % local :"), " Votre collection, vos Watts, votre deck et vos statistiques sont enregistrés uniquement dans le ", React.createElement("code", null, "localStorage"), " de votre navigateur (clé ", React.createElement("code", null, "velolegends_tcg_save_v4"), "). Aucune donnée n’est envoyée sur un serveur de jeu ou une base de données distante."), React.createElement("li", null, React.createElement("strong", null, "Zéro cookie traceur ni publicité :"), " Ce site n’utilise aucun cookie analytique, publicitaire ou de pistage inter-sites."), React.createElement("li", null, React.createElement("strong", null, "Requêtes externes optionnelles :"), " Si l’option Wikimedia ci-dessous est activée, votre navigateur interroge directement les API publiques de Wikipédia FR et Wikimedia Commons pour enrichir les résumés et images sous licence libre."))), React.createElement("div", { className: "rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3" }, React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-3" }, React.createElement("div", null, React.createElement("div", { className: "font-bold text-white" }, "Synchronisation optionnelle Wikipédia / Wikimedia Commons"), React.createElement("div", { className: "text-[11px] text-slate-400" }, "Désactivez pour jouer en mode 100 % hors-ligne / SVG local strict (zéro requête API externe).")), React.createElement("button", { type: "button", onClick: (() => {
                      onToggleWikiSync(!saveState.wikiSyncEnabled);
                      setStatusFeedback(
                        !saveState.wikiSyncEnabled
                          ? 'Synchronisation Wikimedia Commons activée.'
                          : 'Mode 100 % SVG local activé (requêtes Wikimedia désactivées).'
                      );
                    }), className: (`px-4 py-2 rounded-xl font-black text-xs transition ${
                      saveState.wikiSyncEnabled
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`) }, (saveState.wikiSyncEnabled ? 'Activée (ON)' : 'Désactivée (OFF)'))), React.createElement("div", { className: "pt-3 border-t border-slate-800 grid grid-cols-1 sm:flex sm:flex-wrap gap-2.5" }, React.createElement("button", { type: "button", onClick: (handleExportBackup), className: "min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs transition" }, React.createElement(BoltWattIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, "Exporter mes données (.json)")), React.createElement("input", { ref: (fileInputRef), type: "file", accept: "application/json,.json", onChange: (handleFileChange), className: "hidden" }), React.createElement("button", { type: "button", onClick: (() => fileInputRef.current?.click?.()), className: "min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs border border-slate-700 transition" }, "Importer une sauvegarde (.json)"), React.createElement("button", { type: "button", onClick: (() => {
                      onClearWikiCache();
                      setStatusFeedback('Cache d’images Wikimedia purgé.');
                    }), className: "min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs border border-slate-700 transition" }, "Purger le cache média"), React.createElement("button", { type: "button", onClick: (() => {
                      if (
                        window.confirm(
                          'Supprimer définitivement toutes vos données locales VeloLegends TCG ?'
                        )
                      ) {
                        onEraseAllUserData();
                        setStatusFeedback(
                          'Toutes vos données locales ont été supprimées.'
                        );
                      }
                    }), className: "min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs transition" }, "Supprimer toutes mes données (RGPD)")), (statusFeedback && (
                  React.createElement("p", { className: "text-xs font-semibold text-emerald-400 pt-1" }, (statusFeedback))
                ))))
          )))))
  );
}


// === FILE: src/components/BoosterShopView.tsx ===
function BoosterShopView({
  watts,
  bidons,
  maxBidons,
  secondsToNextBidon,
  pityEpicCounter,
  pityLegendaryCounter,
  expressQuizStreak,
  unlockedAchievements,
  playerState,
  totalCardsCount,
  cardStars,
  deck,
  wikiCache,
  quests,
  onOpenPack,
  onSelectCardForDetail,
  onStartExpressQuiz,
  onCompleteExpressQuiz,
  onClaimQuestReward,
  onRedeemPromoCode
}                      ) {
  const [activePack, setActivePack] = useState                    (null);
  const [packStage, setPackStage] = useState           ('IDLE');
  const [drawnSlots, setDrawnSlots] = useState                 ([]);
  const [isGodPackDraw, setIsGodPackDraw] = useState(false);
  const [pityBanner, setPityBanner] = useState               (null);
  const [copiedPullToast, setCopiedPullToast] = useState(false);

  const [expressQuiz, setExpressQuiz] = useState                     (null);
  const [selectedQuizIndex, setSelectedQuizIndex] = useState               (null);
  const [promoInput, setPromoInput] = useState('');
  const [promoFeedback, setPromoFeedback] = useState  
                
                    
           (null);

  const handleTriggerPack = (pack             , useBidon         ) => {
    if (packStage === 'SEALED' || packStage === 'RIPPING') return;
    const result = onOpenPack(pack, useBidon);
    if (!result) return;
    soundFX.playClick();
    setActivePack(pack);
    setDrawnSlots(result.slots);
    setIsGodPackDraw(result.isGodPack);
    setCopiedPullToast(false);
    if (result.triggeredPityLegendary) {
      setPityBanner('GARANTIE PITY 30/30 DÉCLENCHÉE : LÉGENDAIRE ASSURÉE !');
    } else if (result.triggeredPityEpic) {
      setPityBanner('GARANTIE PITY 10/10 DÉCLENCHÉE : ÉPIQUE+ ASSURÉE !');
    } else {
      setPityBanner(null);
    }
    setPackStage('SEALED');
  };

  const handleRipSealedPack = () => {
    if (packStage !== 'SEALED') return;
    soundFX.playPackRip();
    setPackStage('RIPPING');
    setTimeout(() => {
      setPackStage('REVEAL');
      if (isGodPackDraw) {
        soundFX.playGodPack();
      }
    }, 440);
  };

  const handleRevealOne = (idx        ) => {
    const target = drawnSlots[idx];
    if (!target || target.revealed) return;
    soundFX.playCardFlip(target.card.rarity);
    setDrawnSlots((prev) =>
      prev.map((slot, i) => (i === idx ? { ...slot, revealed: true } : slot))
    );
  };

  const handleRevealAll = () => {
    const unrevealed = drawnSlots.filter((s) => !s.revealed);
    if (unrevealed.some((s) => s.card.rarity === 'Légendaire')) {
      soundFX.playCardFlip('Légendaire');
    } else if (unrevealed.some((s) => s.card.rarity === 'Épique')) {
      soundFX.playCardFlip('Épique');
    } else {
      soundFX.playCardFlip('Rare');
    }
    setDrawnSlots((prev) => prev.map((slot) => ({ ...slot, revealed: true })));
  };

  const handleCloseReveal = () => {
    soundFX.playClick();
    setActivePack(null);
    setPackStage('IDLE');
    setDrawnSlots([]);
    setIsGodPackDraw(false);
    setPityBanner(null);
    setCopiedPullToast(false);
  };

  const handleOpenExpressQuiz = () => {
    soundFX.playClick();
    const q = onStartExpressQuiz();
    setExpressQuiz(q);
    setSelectedQuizIndex(null);
  };

  const handleAnswerExpress = (idx        ) => {
    if (selectedQuizIndex !== null || !expressQuiz) return;
    setSelectedQuizIndex(idx);
    const isCorrect = idx === expressQuiz.correctIndex;
    if (isCorrect) {
      soundFX.playQuizSuccess(false);
    } else {
      soundFX.playQuizFail();
    }
    onCompleteExpressQuiz(expressQuiz.id, isCorrect);
  };

  const handlePromoSubmit = (e     ) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    soundFX.playClick();
    const res = onRedeemPromoCode(promoInput);
    setPromoFeedback(res);
    if (res.ok) {
      soundFX.playUpgradeStar();
      setPromoInput('');
    }
  };

  const formatTimer = (sec        ) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const allRevealed =
    drawnSlots.length > 0 && drawnSlots.every((slot) => slot.revealed);

  const bestPulledCard = drawnSlots.reduce                 ((best, slot) => {
    if (!best) return slot.card;
    const rank = ['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire'];
    const diff = rank.indexOf(slot.card.rarity) - rank.indexOf(best.rarity);
    if (diff > 0) return slot.card;
    if (diff === 0 && slot.card.stats.overall > best.stats.overall) return slot.card;
    return best;
  }, null);

  const isHighlightPull =
    allRevealed &&
    (isGodPackDraw ||
      drawnSlots.some(
        (s) => s.card.rarity === 'Épique' || s.card.rarity === 'Légendaire'
      ));

  const copyPullRecap = () => {
    if (!activePack) return;
  const lines = drawnSlots.map(
      (s) =>
        `• [${s.card.rarity.toUpperCase()}] ${s.card.title} (${s.card.discipline} • OVR ${s.card.stats.overall})${
          s.isNew ? ' [NEW]' : ''
        }`
    );
    const header = isGodPackDraw
      ? 'TIRAGE DU SIECLE - GOD PACK ARC-EN-CIEL SUR VELOLEGENDS TCG'
      : `TIRAGE VELOLEGENDS TCG - ${activePack.name}`;
    const text = `${header}\n${lines.join('\n')}\nCarte star : ${bestPulledCard?.title || ''}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch {
      // Clipboard disabled in headless environment
    }
    soundFX.playClick();
    setCopiedPullToast(true);
    setTimeout(() => setCopiedPullToast(false), 2600);
  };

  // ETAPE 1 : FOIL SEALED WRAPPER / RIPPING STAGE
  if (activePack && (packStage === 'SEALED' || packStage === 'RIPPING')) {
    return (
      React.createElement("div", { className: "min-h-[520px] flex flex-col items-center justify-center py-6 space-y-6" }, React.createElement("div", { className: "text-center space-y-1" }, React.createElement("span", { className: "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400" }, React.createElement(BoosterPackIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, "BOOSTER SCELLÉ • ", (activePack.ribbonLabel))), React.createElement("h2", { className: "text-2xl font-black text-white tracking-tight" }, (activePack.name)), (pityBanner && (
            React.createElement("div", { className: "inline-block mt-1 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400 text-xs font-black text-amber-300" }, (pityBanner))
          ))), React.createElement("div", { onClick: (handleRipSealedPack), style: ({ borderColor: activePack.accentHex }), className: (`relative w-full max-w-[290px] h-[386px] rounded-3xl border-2 bg-slate-900 shadow-2xl overflow-hidden cursor-pointer select-none touch-manipulation flex flex-col justify-between transition ${
            packStage === 'RIPPING'
              ? 'animate-packRip pointer-events-none'
              : 'hover:scale-105 active:scale-95'
          }`) }, React.createElement("div", { className: "bg-slate-950 border-b border-dashed border-amber-400/70 px-4 py-3 flex items-center justify-between" }, React.createElement("span", { className: "text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300" }, "PACK PRO SCELLÉ"), React.createElement("span", { style: ({ color: activePack.accentHex }), className: "text-[10px] font-mono font-black uppercase" }, "TIREZ ICI >>>")), React.createElement("div", { className: "h-1.5 w-full", style: ({ backgroundColor: activePack.accentHex }) }), React.createElement("div", { className: "flex-1 flex flex-col items-center justify-center p-6 text-center relative bg-asphalt-grid" }, React.createElement("div", { className: "foil-prism-sheen absolute inset-0 pointer-events-none" }), React.createElement("div", { style: ({ borderColor: activePack.accentHex }), className: "w-20 h-20 rounded-2xl bg-slate-950/90 border-2 flex items-center justify-center mb-4 shadow-xl" }, React.createElement(DisciplineIcon, { discipline: (
                  activePack.targetDiscipline === 'ALL'
                    ? 'Polyvalent'
                    : activePack.targetDiscipline
                ), className: "w-10 h-10 text-white" })), React.createElement("div", { className: "text-[11px] font-mono font-bold uppercase tracking-widest text-amber-300 mb-1" }, (activePack.ribbonLabel)), React.createElement("h3", { className: "text-2xl font-black text-white uppercase tracking-tight leading-none" }, (activePack.name)), React.createElement("p", { className: "text-xs text-slate-300 mt-2 leading-snug" }, (activePack.subtitle)), React.createElement("div", { className: "mt-4 px-3 py-1 rounded-full bg-slate-950 border border-slate-700 text-[10px] font-mono font-bold text-slate-300" }, "5 CARTES • SLOT 5 ", (activePack.guaranteedMinRarity), "+ GARANTI")), React.createElement("div", { className: "bg-slate-950 border-t border-slate-800 px-4 py-3 text-center" }, React.createElement("span", { className: "inline-block px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow" }, (packStage === 'RIPPING'
                ? 'OUVERTURE EN COURS...'
                : 'DÉCHIRER LE PAQUET')))))
    );
  }

  // ETAPE 2 : RÉVÉLATION DES 5 CARTES
  if (activePack && drawnSlots.length > 0 && packStage === 'REVEAL') {
    const newCardsCount = drawnSlots.filter((s) => s.isNew).length;

    return (
      React.createElement("div", { className: "space-y-6" }, React.createElement("div", { className: (`rounded-3xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl ${
            isGodPackDraw
              ? 'bg-gradient-to-r from-amber-950 via-rose-950 to-indigo-950 border-amber-400'
              : 'bg-slate-900 border-slate-700'
          }`) }, React.createElement("div", null, (isGodPackDraw ? (
              React.createElement("span", { className: "px-3 py-1 rounded-full uci-rainbow-badge text-slate-950 text-xs font-black tracking-wider uppercase" }, "GOD PACK ARC-EN-CIEL LÉGENDAIRE !")
            ) : (
              React.createElement("span", { className: "inline-flex items-center gap-1.5 text-xs font-mono font-extrabold uppercase tracking-wider text-amber-400" }, React.createElement(BoosterPackIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, "Tirage • ", (activePack.name)))
            )), React.createElement("h2", { className: "text-2xl font-black text-white mt-1" }, (allRevealed
                ? `Tirage terminé (${newCardsCount} nouvelle${
                    newCardsCount > 1 ? 's' : ''
                  })`
                : isGodPackDraw
                ? '5 cartes exclusivement Épiques & Légendaires !'
                : 'Retournez chaque carte pour découvrir votre tirage')), (pityBanner ? (
              React.createElement("p", { className: "text-xs font-bold text-amber-300 mt-1" }, (pityBanner))
            ) : (
              React.createElement("p", { className: "text-xs text-slate-400 mt-1" }, "Le halo autour du dos d’une carte annonce son rang (Or = Épique, Arc-en-Ciel = Légendaire).")
            ))), React.createElement("div", { className: "flex flex-wrap items-center gap-2.5 w-full sm:w-auto" }, (!allRevealed ? (
              React.createElement("button", { type: "button", onClick: (handleRevealAll), className: "w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm shadow-lg transition" }, "Tout Révéler (5)")
            ) : (
              React.createElement(React.Fragment, null, React.createElement("button", { type: "button", onClick: (() =>
                    handleTriggerPack(
                      activePack,
                      Boolean(activePack.allowFreeBidon && bidons > 0)
                    )
                  ), disabled: (
                    !(
                      (activePack.allowFreeBidon && bidons > 0) ||
                      watts >= activePack.costWatts
                    )
                  ), className: "flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-sm shadow-lg transition" }, "Ouvrir un autre"), React.createElement("button", { type: "button", onClick: (handleCloseReveal), className: "flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-sm border border-slate-600 transition" }, "Retour Boutique"))
            )))), (isHighlightPull && bestPulledCard && (
          React.createElement("div", { className: "rounded-2xl bg-slate-900 border-2 border-amber-400/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn" }, React.createElement("div", { className: "flex items-center gap-3" }, React.createElement("div", { className: "w-11 h-11 rounded-xl uci-rainbow-badge flex items-center justify-center text-slate-950 shrink-0" }, React.createElement(TrophyIcon, { className: "w-6 h-6" })), React.createElement("div", null, React.createElement("div", { className: "text-[10px] font-mono font-black uppercase tracking-widest text-amber-400" }, (isGodPackDraw ? 'ÉDITION VIRALE • GOD PACK' : 'GROS TIRAGE DÉTECTÉ')), React.createElement("div", { className: "text-sm font-black text-white" }, "Carte Star : ", (bestPulledCard.title), " (", (bestPulledCard.rarity), " • OVR ", (bestPulledCard.overall), ")"))), React.createElement("button", { type: "button", onClick: (copyPullRecap), className: "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition shrink-0" }, React.createElement(ShareIcon, { className: "w-4 h-4" }), React.createElement("span", null, (copiedPullToast
                  ? 'Récapitulatif copié !'
                  : 'Partager le Tirage du Siècle'))))
        )), React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4" }, (drawnSlots.map((slot, idx) => {
            const rInfo = RARITY_CONFIG[slot.card.rarity];
            const cached = slot.card.wikiSlug
              ? wikiCache[slot.card.wikiSlug]
              : undefined;
            const star = cardStars[slot.card.id] || 0;

            if (!slot.revealed) {
              const isHighRarity =
                slot.card.rarity === 'Légendaire' ||
                slot.card.rarity === 'Épique' ||
                slot.card.rarity === 'Rare';

              return (
                React.createElement("div", { key: (`${slot.card.id}_${idx}`), onClick: (() => handleRevealOne(idx)), className: (`h-[310px] sm:h-[370px] rounded-2xl border-2 cursor-pointer touch-manipulation active:scale-95 flex flex-col items-center justify-center p-4 sm:p-5 text-center transition duration-200 hover:scale-105 bg-slate-900 bg-asphalt-grid relative overflow-hidden ${
                    slot.card.rarity === 'Légendaire'
                      ? 'uci-rainbow-border animate-pulse'
                      : slot.card.rarity === 'Épique'
                      ? 'border-amber-400 shadow-xl'
                      : isHighRarity
                      ? 'border-sky-400 shadow-lg'
                      : 'border-slate-700 hover:border-amber-400'
                  }`) }, React.createElement("div", { className: "uci-rainbow-stripe h-1.5 w-full absolute top-0 left-0" }), React.createElement("div", { className: "w-16 h-16 rounded-2xl bg-slate-950 border border-slate-700 flex items-center justify-center mb-3 shadow-inner text-amber-400" }, React.createElement(BoosterPackIcon, { className: "w-8 h-8" })), React.createElement("div", { className: "text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1" }, "SLOT #", (idx + 1)), React.createElement("div", { className: "text-sm font-black text-white uppercase tracking-wider" }, "Révéler la Carte"), React.createElement("span", { className: (`mt-3 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-700 ${rInfo.textColor}`) }, "Aura : ", (slot.card.rarity)))
              );
            }

            return (
              React.createElement("div", { key: (`${slot.card.id}_${idx}_rev`), className: "card-flip-in" }, React.createElement(CyclingCard, { card: (slot.card), liveImageUrl: (cached?.thumbnailUrl), count: (slot.newCount), starLevel: (star), isNew: (slot.isNew), isInDeck: (deck.includes(slot.card.id)), onClick: (() => onSelectCardForDetail(slot.card)) }))
            );
          }))))
    );
  }

  // VUE BOUTIQUE NORMALE
  const unclaimedQuestsCount = quests.activeQuestIds.filter(
    (qId) =>
      !quests.completedQuestIds.includes(qId) &&
      (quests.progress[qId] || 0) >=
        (QUEST_POOL.find((q) => q.id === qId)?.target || 999)
  ).length;

  const godPackPct = (GOD_PACK_CHANCE * 100).toFixed(1);

  return (
    React.createElement("div", { className: "space-y-6" }, React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-4" }, React.createElement("div", { className: "lg:col-span-6 rounded-3xl bg-slate-900 border border-slate-700 p-5 flex flex-col justify-between gap-4 shadow-xl bg-asphalt-grid" }, React.createElement("div", { className: "space-y-2" }, React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, React.createElement("span", { className: "px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-black tracking-wider uppercase" }, "CENTRE D’ENTRAÎNEMENT • QUIZ EXPRESS"), React.createElement("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold" }, React.createElement(BidonIcon, { className: "w-3 h-3" }), React.createElement("span", null, (bidons), "/", (maxBidons), " Bidons", (bidons < maxBidons
                    ? ` (prochain dans ${formatTimer(secondsToNextBidon)})`
                    : ' (Réservoir plein)')))), React.createElement("h2", { className: "text-xl font-black text-white tracking-tight" }, "Culture Cyclisme : Gagnez des Watts au mérite"), React.createElement("p", { className: "text-xs text-slate-300 leading-relaxed" }, "+", (ECONOMY_CONFIG.EXPRESS_QUIZ_REWARD_CORRECT), " W par bonne réponse (+", (ECONOMY_CONFIG.EXPRESS_QUIZ_STREAK_BONUS), " W bonus en série de 3+, 0 W si erreur). Série actuelle :", (' '), React.createElement("strong", { className: "text-amber-300 font-mono" }, (expressQuizStreak)), ".")), React.createElement("button", { type: "button", onClick: (handleOpenExpressQuiz), className: "w-full sm:w-auto min-h-[44px] self-start inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow transition" }, React.createElement(BrainQuizIcon, { className: "w-4 h-4" }), React.createElement("span", null, "Question Culture Vélo (+", (ECONOMY_CONFIG.EXPRESS_QUIZ_REWARD_CORRECT), " W)"))), React.createElement("div", { className: "lg:col-span-6 rounded-3xl bg-slate-900 border border-slate-700 p-5 flex flex-col justify-between gap-3 shadow-xl" }, React.createElement("div", { className: "flex items-center justify-between gap-2" }, React.createElement("span", { className: "text-xs font-mono font-black uppercase tracking-wider text-cyan-300" }, "PROBABILITÉS DE TIRAGE & GARANTIE PITY"), React.createElement("span", { className: "px-2 py-0.5 rounded uci-rainbow-badge text-slate-950 text-[10px] font-mono font-black" }, "GOD PACK ", (godPackPct), "%")), React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-center" }, ((
              ['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire']         
            ).map((rar) => {
              const rc = RARITY_CONFIG[rar];
              return (
                React.createElement("div", { key: (rar), className: "rounded-xl bg-slate-950 border border-slate-800 px-1.5 py-2" }, React.createElement("div", { className: (`text-[10px] font-bold truncate ${rc.textColor}`) }, (rar)), React.createElement("div", { className: "text-xs font-mono font-black text-white tabular-nums mt-0.5" }, (rc.dropWeight), "%"))
              );
            }))), React.createElement("div", { className: "text-[11px] text-slate-400" }, "Slot 5 garanti ", React.createElement("strong", { className: "text-sky-300" }, "Rare+"), " (84% Rare / 13.5% Épique / 2.5% Légendaire)."), React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" }, React.createElement("div", { className: "rounded-xl bg-slate-950 border border-slate-800 p-2.5" }, React.createElement("div", { className: "flex justify-between text-[11px] mb-1" }, React.createElement("span", { className: "font-bold text-amber-300" }, "Pity Épique+"), React.createElement("span", { className: "font-mono font-black text-white tabular-nums" }, (pityEpicCounter), " / ", (PITY_EPIC_THRESHOLD))), React.createElement("div", { className: "w-full h-1.5 bg-slate-800 rounded-full overflow-hidden" }, React.createElement("div", { className: "h-full bg-amber-400 transition-all duration-300", style: ({
                    width: `${Math.min(
                      100,
                      (pityEpicCounter / PITY_EPIC_THRESHOLD) * 100
                    )}%`
                  }) }))), React.createElement("div", { className: "rounded-xl bg-slate-950 border border-slate-800 p-2.5" }, React.createElement("div", { className: "flex justify-between text-[11px] mb-1" }, React.createElement("span", { className: "font-bold text-cyan-300" }, "Pity Légendaire"), React.createElement("span", { className: "font-mono font-black text-white tabular-nums" }, (pityLegendaryCounter), " / ", (PITY_LEGENDARY_THRESHOLD))), React.createElement("div", { className: "w-full h-1.5 bg-slate-800 rounded-full overflow-hidden" }, React.createElement("div", { className: "h-full uci-rainbow-stripe transition-all duration-300", style: ({
                    width: `${Math.min(
                      100,
                      (pityLegendaryCounter / PITY_LEGENDARY_THRESHOLD) * 100
                    )}%`
                  }) })))))), (expressQuiz && (
        React.createElement("div", { className: "rounded-2xl bg-slate-900 border-2 border-amber-400/70 p-5 space-y-4 animate-fadeIn shadow-2xl" }, React.createElement("div", { className: "flex items-center justify-between" }, React.createElement("span", { className: "inline-flex items-center gap-1.5 text-xs font-mono font-black text-amber-300 uppercase tracking-wider" }, React.createElement(BrainQuizIcon, { className: "w-4 h-4" }), React.createElement("span", null, "QUIZ EXPRESS (", (expressQuiz.relatedCardTitle), ")")), React.createElement("button", { type: "button", onClick: (() => setExpressQuiz(null)), className: "text-xs font-bold text-slate-400 hover:text-white" }, "Fermer")), React.createElement("p", { className: "text-base font-bold text-white leading-snug" }, (expressQuiz.questionText)), (expressQuiz.contextExcerpt && (
            React.createElement("div", { className: "p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 italic leading-relaxed" }, (expressQuiz.contextExcerpt))
          )), React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5" }, (expressQuiz.options.map((opt, idx) => {
              const answered = selectedQuizIndex !== null;
              const isSelected = selectedQuizIndex === idx;
              const isCorrect = idx === expressQuiz.correctIndex;
              let btnClass =
                'bg-slate-800/80 border-slate-700 hover:border-amber-400 text-slate-100';
              if (answered) {
                if (isCorrect) {
                  btnClass =
                    'bg-emerald-500/20 border-emerald-400 text-emerald-200';
                } else if (isSelected) {
                  btnClass = 'bg-rose-500/20 border-rose-400 text-rose-200';
                } else {
                  btnClass = 'bg-slate-900 border-slate-800 text-slate-500';
                }
              }
              return (
                React.createElement("button", { key: (idx), type: "button", disabled: (answered), onClick: (() => handleAnswerExpress(idx)), className: (`min-h-[46px] text-left px-4 py-3 rounded-xl border text-xs font-semibold active:scale-95 transition ${btnClass}`) }, React.createElement("span", { className: "font-mono font-bold mr-2 opacity-75" }, (String.fromCharCode(65 + idx)), "."), (opt))
              );
            }))), (selectedQuizIndex !== null && (
            React.createElement("div", { className: "rounded-xl bg-slate-950 border border-slate-800 p-3 flex flex-col sm:flex-row items-center justify-between gap-3" }, React.createElement("p", { className: "text-xs text-slate-300" }, (selectedQuizIndex === expressQuiz.correctIndex
                  ? `Bonne réponse ! +${
                      ECONOMY_CONFIG.EXPRESS_QUIZ_REWARD_CORRECT +
                      (expressQuizStreak >= 3
                        ? ECONOMY_CONFIG.EXPRESS_QUIZ_STREAK_BONUS
                        : 0)
                    } W crédités${
                      expressQuizStreak >= 3 ? ' (dont bonus série 3+ !)' : '.'
                    } `
                  : 'Manqué (0 W — la précision prime). '), (expressQuiz.explanation)), React.createElement("button", { type: "button", onClick: (handleOpenExpressQuiz), className: "shrink-0 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs" }, "Question Suivante"))
          )))
      )), React.createElement("div", { className: "rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3" }, React.createElement("div", { className: "flex items-center justify-between" }, React.createElement("div", { className: "flex items-center gap-2" }, React.createElement(TrophyIcon, { className: "w-4 h-4 text-amber-400" }), React.createElement("h3", { className: "text-sm font-black text-white uppercase tracking-wider" }, "Objectifs du Jour"), (unclaimedQuestsCount > 0 && (
              React.createElement("span", { className: "px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black" }, (unclaimedQuestsCount), " prête(s)")
            ))), React.createElement("span", { className: "text-[11px] font-mono text-slate-400" }, "Récompenses immédiates en Watts")), React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3" }, (quests.activeQuestIds.map((qId) => {
            const q = QUEST_POOL.find((item) => item.id === qId);
            if (!q) return null;
            const current = quests.progress[qId] || 0;
            const done = current >= q.target;
            const claimed = quests.completedQuestIds.includes(qId);
            const pct = Math.min(100, Math.round((current / q.target) * 100));

            return (
              React.createElement("div", { key: (qId), className: (`rounded-xl border p-3 flex flex-col justify-between gap-2 ${
                  claimed
                    ? 'bg-slate-950/40 border-slate-800 opacity-60'
                    : done
                    ? 'bg-emerald-950/30 border-emerald-500/50'
                    : 'bg-slate-950/80 border-slate-800'
                }`) }, React.createElement("div", null, React.createElement("div", { className: "flex items-center justify-between gap-2" }, React.createElement("span", { className: "text-xs font-extrabold text-white" }, (q.title)), React.createElement("span", { className: "inline-flex items-center gap-0.5 text-[11px] font-mono font-black text-amber-300 shrink-0" }, "+", (q.rewardWatts), React.createElement(BoltWattIcon, { className: "w-3 h-3" }))), React.createElement("p", { className: "text-[11px] text-slate-400 mt-0.5" }, (q.description))), React.createElement("div", { className: "space-y-1.5" }, React.createElement("div", { className: "flex items-center justify-between text-[10px] font-mono text-slate-400" }, React.createElement("span", null, (Math.min(current, q.target)), " / ", (q.target)), React.createElement("span", null, (pct), "%")), React.createElement("div", { className: "w-full h-1.5 bg-slate-800 rounded-full overflow-hidden" }, React.createElement("div", { className: (`h-full transition-all duration-300 ${
                        done ? 'bg-emerald-400' : 'bg-amber-400'
                      }`), style: ({ width: `${pct}%` }) })), (done && !claimed && (
                    React.createElement("button", { type: "button", onClick: (() => {
                        soundFX.playUpgradeStar();
                        onClaimQuestReward(q.id);
                      }), className: "w-full mt-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition" }, "Récupérer +", (q.rewardWatts), " Watts")
                  )), (claimed && (
                    React.createElement("div", { className: "text-[10px] text-emerald-400 font-bold text-center" }, "Validée")
                  ))))
            );
          })))), React.createElement("div", null, React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 mb-3" }, React.createElement("h3", { className: "text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2" }, React.createElement(BoosterPackIcon, { className: "w-4 h-4 text-amber-400" }), React.createElement("span", null, "Boutique Peloton : Boosters (5 Cartes)")), React.createElement("span", { className: "text-xs font-mono text-slate-400" }, "Slot 5 garanti Rare+ • Pity 10 Épique / 30 Légendaire")), React.createElement("form", { onSubmit: (handlePromoSubmit), className: "mb-4 rounded-2xl bg-slate-900 border border-slate-800 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3" }, React.createElement("div", { className: "text-xs text-slate-300" }, React.createElement("strong", { className: "text-amber-300 font-mono uppercase" }, "Code Cadeau Peloton (usage unique) :"), (' '), "essayez ", React.createElement("code", { className: "px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300 font-mono" }, "PELOTON2026"), " ou", (' '), React.createElement("code", { className: "px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300 font-mono" }, "ECHAPPEE"), "."), React.createElement("div", { className: "flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0" }, React.createElement("input", { type: "text", value: (promoInput), onChange: ((e     ) => setPromoInput(e.target.value)), placeholder: "Saisir un code promo...", className: "flex-1 min-w-0 min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400" }), React.createElement("button", { type: "submit", className: "min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs transition shrink-0" }, "Valider"))), (promoFeedback && (
          React.createElement("div", { className: (`mb-4 rounded-xl px-4 py-2 text-xs font-bold border ${
              promoFeedback.ok
                ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/35 border-rose-500/40 text-rose-300'
            }`) }, (promoFeedback.message))
        )), React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" }, (BOOSTER_PACKS.map((pack) => {
            const canUseFreeBidon = pack.allowFreeBidon && bidons > 0;
            const canBuyWatts = watts >= pack.costWatts;

            return (
              React.createElement("div", { key: (pack.id), className: "rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col justify-between shadow-lg hover:border-slate-600 transition" }, React.createElement("div", { className: "h-2 w-full", style: ({ backgroundColor: pack.accentHex }) }), React.createElement("div", { className: "p-5 space-y-4 flex-1 flex flex-col justify-between" }, React.createElement("div", null, React.createElement("div", { className: "flex items-center justify-between gap-2 mb-2" }, React.createElement("span", { style: ({
                          color: pack.accentHex,
                          borderColor: pack.accentHex
                        }), className: "px-2.5 py-0.5 rounded bg-slate-950 border text-[10px] font-mono font-black tracking-widest uppercase" }, (pack.ribbonLabel)), React.createElement("span", { className: "inline-flex items-center gap-1 text-xs font-mono font-black text-amber-400" }, React.createElement("span", null, (pack.costWatts)), React.createElement(BoltWattIcon, { className: "w-3.5 h-3.5" }))), React.createElement("h4", { className: "text-lg font-black text-white" }, (pack.name)), React.createElement("p", { className: "text-xs font-semibold text-slate-400" }, (pack.subtitle)), React.createElement("p", { className: "text-xs text-slate-300 mt-2 leading-relaxed" }, (pack.description))), React.createElement("div", { className: "space-y-2 pt-2" }, (pack.allowFreeBidon && (
                      React.createElement("button", { type: "button", disabled: (!canUseFreeBidon), onClick: (() => handleTriggerPack(pack, true)), className: (`w-full min-h-[44px] py-2.5 rounded-xl font-black text-xs active:scale-95 transition inline-flex items-center justify-center gap-1.5 ${
                          canUseFreeBidon
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow'
                            : 'bg-slate-800/70 text-slate-500 cursor-not-allowed'
                        }`) }, React.createElement(BidonIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, (canUseFreeBidon
                            ? `Ouvrir avec 1 Bidon Gratuit (${bidons} dispo)`
                            : 'Aucun Bidon disponible')))
                    )), React.createElement("button", { type: "button", disabled: (!canBuyWatts), onClick: (() => handleTriggerPack(pack, false)), className: (`w-full min-h-[44px] py-2.5 rounded-xl font-black text-xs active:scale-95 transition inline-flex items-center justify-center gap-1.5 ${
                        canBuyWatts
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`) }, React.createElement(BoltWattIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, "Ouvrir pour ", (pack.costWatts), " Watts")))))
            );
          })))), React.createElement("div", { className: "rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3" }, React.createElement("div", { className: "flex items-center justify-between" }, React.createElement("div", { className: "flex items-center gap-2" }, React.createElement(ShieldIcon, { className: "w-4 h-4 text-cyan-400" }), React.createElement("h3", { className: "text-sm font-black text-white uppercase tracking-wider" }, "Trophées & Distinctions Peloton (", (unlockedAchievements.length), "/", (ACHIEVEMENT_POOL.length), ")")), React.createElement("span", { className: "text-[11px] font-mono text-slate-400" }, "Déblocage automatique + bonus Watts")), React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-5 gap-2.5" }, (ACHIEVEMENT_POOL.map((ach) => {
            const isUnlocked =
              unlockedAchievements.includes(ach.id) ||
              ach.check(playerState, totalCardsCount);

            return (
              React.createElement("div", { key: (ach.id), className: (`rounded-xl border p-3 flex flex-col justify-between gap-1.5 ${
                  isUnlocked
                    ? 'bg-amber-950/25 border-amber-500/50'
                    : 'bg-slate-950/70 border-slate-800 opacity-65'
                }`) }, React.createElement("div", { className: "flex items-center justify-between gap-1" }, React.createElement("span", { className: (`px-1.5 py-0.5 rounded text-[9px] font-mono font-black ${
                      isUnlocked
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`) }, (ach.code)), React.createElement("span", { className: "inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-amber-300" }, "+", (ach.rewardWatts), " W")), React.createElement("div", { className: "text-xs font-extrabold text-white leading-tight flex items-center gap-1" }, (isUnlocked && React.createElement(StarIcon, { className: "w-3 h-3 text-amber-400 shrink-0" })), React.createElement("span", null, (ach.title))), React.createElement("p", { className: "text-[10px] text-slate-400 leading-snug" }, (ach.description)))
            );
          })))))
  );
}


// === FILE: src/components/CollectionAlbumView.tsx ===
function CollectionAlbumView({
  allCards,
  inventory,
  cardStars,
  deck,
  watts,
  wikiCache,
  onSelectCard,
  onRecycleAllDuplicates,
  onForgeCustomCard
}                          ) {
  const [selectedDiscipline, setSelectedDiscipline] = useState 
                      
   ('ALL');
  const [selectedCategory, setSelectedCategory] = useState 
                        
   ('ALL');
  const [selectedRarity, setSelectedRarity] = useState                ('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState 
                                                             
   ('ALL');
  const [sortBy, setSortBy] = useState 
                                                                        
   ('NUMBER');
  const [searchQuery, setSearchQuery] = useState('');

  // Atelier de Forge TCG sur mesure
  const [forgeTitle, setForgeTitle] = useState('');
  const [forgeDiscipline, setForgeDiscipline] = useState            ('Route');
  const [forgeCategory, setForgeCategory] = useState              (
    'Matériel & Technique'
  );
  const [isForging, setIsForging] = useState(false);
  const [forgeMessage, setForgeMessage] = useState               (null);

  const unlockedCount = useMemo(
    () => allCards.filter((c) => (inventory[c.id] || 0) > 0).length,
    [allCards, inventory]
  );

  const upgradableCount = useMemo(() => {
    return allCards.filter((c) => {
      const count = inventory[c.id] || 0;
      const star = cardStars[c.id] || 0;
      const next = STAR_UPGRADE_CONFIG.find((s) => s.targetStar === star + 1);
      return Boolean(next) && count - 1 >= (next?.duplicatesNeeded || 99);
    }).length;
  }, [allCards, inventory, cardStars]);

  const duplicateSummary = useMemo(() => {
    let totalDupes = 0;
    let totalWatts = 0;
    for (const card of allCards) {
      const count = inventory[card.id] || 0;
      if (count > 1) {
        const extra = count - 1;
        totalDupes += extra;
        totalWatts += extra * RECYCLE_WATTS_BY_RARITY[card.rarity];
      }
    }
    return { totalDupes, totalWatts };
  }, [allCards, inventory]);

  const filteredCards = useMemo(() => {
    return allCards
      .filter((card) => {
        if (
          selectedDiscipline !== 'ALL' &&
          card.discipline !== selectedDiscipline
        ) {
          return false;
        }
        if (selectedCategory !== 'ALL' && card.category !== selectedCategory) {
          return false;
        }
        if (selectedRarity !== 'ALL' && card.rarity !== selectedRarity) {
          return false;
        }
        const count = inventory[card.id] || 0;
        const star = cardStars[card.id] || 0;
        const nextUp = STAR_UPGRADE_CONFIG.find((s) => s.targetStar === star + 1);

        if (ownershipFilter === 'OWNED' && count === 0) return false;
        if (ownershipFilter === 'MISSING' && count > 0) return false;
        if (ownershipFilter === 'DUPLICATES' && count <= 1) return false;
        if (
          ownershipFilter === 'UPGRADABLE' &&
          (!nextUp || count - 1 < nextUp.duplicatesNeeded)
        ) {
          return false;
        }

        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const match =
            card.title.toLowerCase().includes(q) ||
            card.subtitle.toLowerCase().includes(q) ||
            card.specialTrait.toLowerCase().includes(q) ||
            card.keyword.toLowerCase().includes(q) ||
            (card.roleTag || '').toLowerCase().includes(q) ||
            card.summary.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const effA = getEffectiveCardStats(a, cardStars[a.id] || 0);
        const effB = getEffectiveCardStats(b, cardStars[b.id] || 0);
        if (sortBy === 'OVR') return effB.overall - effA.overall;
        if (sortBy === 'RARITY') {
          return (
            RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)
          );
        }
        if (sortBy === 'COST_ASC') return a.energyCost - b.energyCost;
        if (sortBy === 'POWER') return effB.power - effA.power;
        if (sortBy === 'TECH') return effB.technique - effA.technique;
        if (sortBy === 'ENDU') return effB.endurance - effA.endurance;
        return a.cardNumber - b.cardNumber;
      });
  }, [
    allCards,
    inventory,
    cardStars,
    selectedDiscipline,
    selectedCategory,
    selectedRarity,
    ownershipFilter,
    sortBy,
    searchQuery
  ]);

  const handleForgeSubmit = async (e     ) => {
    e.preventDefault();
    if (watts < ECONOMY_CONFIG.FORGE_CARD_COST || isForging) return;
    soundFX.playClick();
    setIsForging(true);
    setForgeMessage(null);
    const created = await onForgeCustomCard(
      forgeTitle,
      forgeDiscipline,
      forgeCategory
    );
    setIsForging(false);
    if (created) {
      soundFX.playUpgradeStar();
      setForgeTitle('');
      setForgeMessage(
        `Carte TCG forgée : "${created.title}" (${created.rarity} • ${created.energyCost} W énergie)`
      );
      onSelectCard(created);
    }
  };

  const disciplinesList                            = [
    'ALL',
    'Route',
    'VTT',
    'Piste',
    'Cyclo-cross',
    'Polyvalent'
  ];

  const categoriesList                              = [
    'ALL',
    'Athlète / Légende',
    'Épreuve / Monument',
    'Terrain / Secteur',
    'Matériel & Technique'
  ];

  return (
    React.createElement("div", { className: "space-y-6" }, React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-4" }, React.createElement("div", { className: "lg:col-span-7 rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between bg-asphalt-grid" }, React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 mb-2" }, React.createElement("div", null, React.createElement("h2", { className: "text-xl font-black text-white flex items-center gap-2" }, React.createElement(BookAlbumIcon, { className: "w-5 h-5 text-amber-400" }), React.createElement("span", null, "Carnet & Album VeloLegends TCG")), React.createElement("p", { className: "text-xs text-slate-400 mt-0.5" }, "Fusionnez vos doublons pour monter vos cartes au rang ★1..★3 Prisme, ou recyclez le surplus en Watts.")), React.createElement("div", { className: "text-right" }, React.createElement("span", { className: "text-2xl font-black text-amber-400 font-mono tabular-nums" }, (unlockedCount), " / ", (allCards.length)), React.createElement("span", { className: "block text-[10px] font-mono uppercase tracking-wider text-slate-400" }, "Débloquées (", (Math.round((unlockedCount / allCards.length) * 100)), "%)"))), React.createElement("div", { className: "w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3" }, React.createElement("div", { className: "h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 transition-all duration-500", style: ({ width: `${(unlockedCount / allCards.length) * 100}%` }) })), React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-2" }, ((
              [
                'Route',
                'VTT',
                'Piste',
                'Cyclo-cross',
                'Polyvalent'
              ]                
            ).map((disc) => {
              const totalDisc = allCards.filter(
                (c) => c.discipline === disc
              ).length;
              const ownedDisc = allCards.filter(
                (c) => c.discipline === disc && (inventory[c.id] || 0) > 0
              ).length;
              const dConf = DISCIPLINE_CONFIG[disc];

              return (
                React.createElement("div", { key: (disc), onClick: (() => {
                    soundFX.playClick();
                    setSelectedDiscipline(
                      selectedDiscipline === disc ? 'ALL' : disc
                    );
                  }), className: (`cursor-pointer rounded-xl px-2.5 py-2 border text-center transition ${
                    selectedDiscipline === disc
                      ? `${dConf.bgSoft} ${dConf.borderSoft}`
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`) }, React.createElement("div", { className: (`inline-flex items-center justify-center gap-1 text-[11px] font-bold ${dConf.color}`) }, React.createElement(DisciplineIcon, { discipline: (disc), className: "w-3 h-3" }), React.createElement("span", null, (dConf.shortLabel))), React.createElement("div", { className: "text-xs font-mono font-bold text-white tabular-nums mt-0.5" }, (ownedDisc), "/", (totalDisc)))
              );
            })))), React.createElement("div", { className: "lg:col-span-5 flex flex-col gap-3" }, React.createElement("div", { className: "rounded-2xl bg-slate-900 border border-emerald-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" }, React.createElement("div", null, React.createElement("h3", { className: "text-sm font-black text-white flex items-center gap-1.5" }, React.createElement(StarIcon, { className: "w-4 h-4 text-emerald-400" }), React.createElement("span", null, "Recyclage & Fusion (", (upgradableCount), " améliorable", (upgradableCount > 1 ? 's' : ''), ")")), React.createElement("p", { className: "text-xs text-slate-400 mt-0.5" }, (duplicateSummary.totalDupes > 0
                  ? `${duplicateSummary.totalDupes} doublon(s) disponible(s) (+${duplicateSummary.totalWatts} W). Seuls les doublons sont recyclables : 1 exemplaire reste toujours protégé.`
                  : 'Aucun doublon en surplus — vos exemplaires uniques restent protégés.'))), React.createElement("button", { type: "button", disabled: (duplicateSummary.totalDupes === 0), onClick: (() => {
                soundFX.playUpgradeStar();
                onRecycleAllDuplicates();
              }), className: (`w-full sm:w-auto min-h-[42px] shrink-0 px-3.5 py-2 rounded-xl font-black text-xs active:scale-95 transition ${
                duplicateSummary.totalDupes > 0
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`) }, "Tout Recycler (+", (duplicateSummary.totalWatts), " W)")), React.createElement("form", { onSubmit: (handleForgeSubmit), className: "rounded-2xl bg-slate-900 border border-cyan-500/35 p-4 space-y-2.5" }, React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-1" }, React.createElement("span", { className: "inline-flex items-center gap-1.5 text-xs font-black text-cyan-300" }, React.createElement(ShieldIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, "Atelier de Forge TCG (", (ECONOMY_CONFIG.FORGE_CARD_COST), " W)")), React.createElement("span", { className: "text-[10px] font-mono text-slate-400" }, "Création Libre + Plans Secrets")), React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" }, React.createElement("select", { value: (forgeDiscipline), onChange: ((e     ) => setForgeDiscipline(e.target.value)), className: "min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-2 text-xs text-slate-200" }, React.createElement("option", { value: "Route" }, "Discipline : Route"), React.createElement("option", { value: "VTT" }, "Discipline : VTT"), React.createElement("option", { value: "Piste" }, "Discipline : Piste"), React.createElement("option", { value: "Cyclo-cross" }, "Discipline : Cyclo-cross"), React.createElement("option", { value: "Polyvalent" }, "Discipline : Polyvalent")), React.createElement("select", { value: (forgeCategory), onChange: ((e     ) => setForgeCategory(e.target.value)), className: "min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-2 text-xs text-slate-200" }, React.createElement("option", { value: "Matériel & Technique" }, "Matériel & Technique"), React.createElement("option", { value: "Terrain / Secteur" }, "Terrain / Secteur"), React.createElement("option", { value: "Athlète / Légende" }, "Athlète / Légende"), React.createElement("option", { value: "Épreuve / Monument" }, "Épreuve / Monument"))), React.createElement("div", { className: "flex flex-col sm:flex-row gap-2" }, React.createElement("input", { type: "text", value: (forgeTitle), onChange: ((e     ) => setForgeTitle(e.target.value)), placeholder: "Nom libre (ou vide pour Plan Secret)...", className: "flex-1 min-w-0 min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400" }), React.createElement("button", { type: "submit", disabled: (watts < ECONOMY_CONFIG.FORGE_CARD_COST || isForging), className: (`min-h-[42px] px-3.5 py-2 rounded-xl font-black text-xs active:scale-95 transition shrink-0 inline-flex items-center justify-center gap-1 ${
                  watts >= ECONOMY_CONFIG.FORGE_CARD_COST && !isForging
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`) }, React.createElement(BoltWattIcon, { className: "w-3 h-3" }), React.createElement("span", null, (isForging
                    ? 'Forge...'
                    : forgeTitle.trim()
                    ? `Forger (${ECONOMY_CONFIG.FORGE_CARD_COST} W)`
                    : `Plan Secret (${ECONOMY_CONFIG.FORGE_CARD_COST} W)`)))), (forgeMessage && (
              React.createElement("p", { className: "text-[11px] text-emerald-400 font-semibold" }, (forgeMessage))
            ))))), React.createElement("div", { className: "rounded-2xl bg-slate-900 border border-slate-800 p-3.5 sm:p-4 space-y-3" }, React.createElement("div", { className: "flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1" }, React.createElement("span", { className: "shrink-0 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mr-1" }, "Discipline :"), (disciplinesList.map((disc) => (
            React.createElement("button", { key: (disc), type: "button", onClick: (() => {
                soundFX.playClick();
                setSelectedDiscipline(disc);
              }), className: (`shrink-0 min-h-[36px] px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition ${
                selectedDiscipline === disc
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`) }, (disc === 'ALL' ? 'Toutes (4 + Polyvalent)' : disc))
          )))), React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-800" }, React.createElement("input", { type: "text", value: (searchQuery), onChange: ((e     ) => setSearchQuery(e.target.value)), placeholder: "Rechercher coureur, rôle, vélo...", className: "min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400" }), React.createElement("select", { value: (selectedCategory), onChange: ((e     ) => setSelectedCategory(e.target.value)), className: "min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-200" }, (categoriesList.map((cat) => (
              React.createElement("option", { key: (cat), value: (cat) }, (cat === 'ALL' ? 'Catégorie : Toutes' : cat))
            )))), React.createElement("select", { value: (selectedRarity), onChange: ((e     ) => setSelectedRarity(e.target.value)), className: "min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-200" }, React.createElement("option", { value: "ALL" }, "Rareté : Toutes"), (RARITY_ORDER.map((r) => (
              React.createElement("option", { key: (r), value: (r) }, (r))
            )))), React.createElement("select", { value: (ownershipFilter), onChange: ((e     ) => setOwnershipFilter(e.target.value)), className: "min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-200" }, React.createElement("option", { value: "ALL" }, "Statut : Toutes (", (allCards.length), ")"), React.createElement("option", { value: "OWNED" }, "Débloquées uniquement (", (unlockedCount), ")"), React.createElement("option", { value: "MISSING" }, "Manquantes (", (allCards.length - unlockedCount), ")"), React.createElement("option", { value: "DUPLICATES" }, "Doublons en surplus"), React.createElement("option", { value: "UPGRADABLE" }, "Améliorables en ★ (", (upgradableCount), ")")), React.createElement("select", { value: (sortBy), onChange: ((e     ) => setSortBy(e.target.value)), className: "min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-200" }, React.createElement("option", { value: "NUMBER" }, "Tri : Numéro (#001..)"), React.createElement("option", { value: "OVR" }, "Tri : Note Globale (OVR)"), React.createElement("option", { value: "COST_ASC" }, "Tri : Coût Énergie (1 → 5 W)"), React.createElement("option", { value: "RARITY" }, "Tri : Rareté"), React.createElement("option", { value: "POWER" }, "Tri : Puissance (PUI)"), React.createElement("option", { value: "TECH" }, "Tri : Technique (TEC)"), React.createElement("option", { value: "ENDU" }, "Tri : Endurance (END)")))), React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4" }, (filteredCards.map((card) => {
          const count = inventory[card.id] || 0;
          const starLevel = cardStars[card.id] || 0;
          const cached = card.wikiSlug ? wikiCache[card.wikiSlug] : undefined;
          return (
            React.createElement(CyclingCard, { key: (card.id), card: (card), liveImageUrl: (cached?.thumbnailUrl), count: (count), starLevel: (starLevel), isLocked: (count === 0), isInDeck: (deck.includes(card.id)), onClick: (() => {
                soundFX.playClick();
                onSelectCard(card);
              }) })
          );
        }))), (filteredCards.length === 0 && (
        React.createElement("div", { className: "rounded-2xl bg-slate-900 border border-slate-800 p-10 text-center text-slate-400" }, "Aucune carte ne correspond à vos filtres actuels.")
      )))
  );
}


// === FILE: src/components/DeckBuilderView.tsx ===
function DeckBuilderView({
  allCards,
  inventory,
  cardStars,
  deck,
  wikiCache,
  onToggleCardInDeck,
  onAutoBuildBalancedDeck,
  onSelectCardDetail,
  onGoToDuel
}                      ) {
  const [filterDisc, setFilterDisc] = useState                    ('ALL');
  const [filterCost, setFilterCost] = useState                ('ALL');

  const deckCards = useMemo(
    () =>
      deck
        .map((id) => allCards.find((c) => c.id === id))
        .filter((c)                => Boolean(c)),
    [deck, allCards]
  );

  const deckCheck = useMemo(() => isDeckValid(deckCards), [deckCards]);
  const totalEnergy = getDeckEnergyCost(deckCards);
  const remainingEnergy = MAX_DECK_ENERGY - totalEnergy;

  const unlockedCards = useMemo(
    () =>
      allCards
        .filter((c) => (inventory[c.id] || 0) > 0)
        .sort((a, b) => {
          const effA = getEffectiveCardStats(a, cardStars[a.id] || 0).overall;
          const effB = getEffectiveCardStats(b, cardStars[b.id] || 0).overall;
          return effB - effA;
        }),
    [allCards, inventory, cardStars]
  );

  const filteredReserve = useMemo(
    () =>
      unlockedCards.filter((c) => {
        if (filterDisc !== 'ALL' && c.discipline !== filterDisc) return false;
        if (filterCost !== 'ALL' && c.energyCost !== filterCost) return false;
        return true;
      }),
    [unlockedCards, filterDisc, filterCost]
  );

  const coreDisciplines                   = [
    'Route',
    'VTT',
    'Piste',
    'Cyclo-cross'
  ];

  const coverageMap = useMemo(() => {
    const result                                      = {
      Route: 0,
      VTT: 0,
      Piste: 0,
      'Cyclo-cross': 0
    };
    for (const card of deckCards) {
      for (const d of card.linkedDisciplines) {
        result[d] = (result[d] || 0) + 1;
      }
    }
    return result;
  }, [deckCards]);

  const allFourCovered = checkAllFourDisciplinesCovered(deckCards);

  const teamStats = useMemo(() => {
    if (deckCards.length === 0) {
      return { power: 0, technique: 0, endurance: 0, overall: 0 };
    }
    const sum = deckCards.reduce(
      (acc, c) => {
        const eff = getEffectiveCardStats(c, cardStars[c.id] || 0);
        return {
          power: acc.power + eff.power,
          technique: acc.technique + eff.technique,
          endurance: acc.endurance + eff.endurance,
          overall: acc.overall + eff.overall
        };
      },
      { power: 0, technique: 0, endurance: 0, overall: 0 }
    );
    const n = deckCards.length;
    return {
      power: Math.round(sum.power / n),
      technique: Math.round(sum.technique / n),
      endurance: Math.round(sum.endurance / n),
      overall: Math.round(sum.overall / n)
    };
  }, [deckCards, cardStars]);

  return (
    React.createElement("div", { className: "space-y-6" }, React.createElement("div", { className: "rounded-3xl bg-slate-900 border border-slate-700 p-4 sm:p-5 shadow-xl space-y-5 bg-asphalt-grid" }, React.createElement("div", { className: "flex flex-col lg:flex-row lg:items-center justify-between gap-4" }, React.createElement("div", null, React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-mono font-black uppercase tracking-wider" }, React.createElement(SquadDeckIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, "BUS DE L’ÉQUIPE • ", (deckCards.length), " / 5 TITULAIRES")), React.createElement("span", { className: (`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black font-mono border tabular-nums ${
                  totalEnergy > MAX_DECK_ENERGY
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                    : 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                }`) }, React.createElement(BoltWattIcon, { className: "w-3 h-3" }), React.createElement("span", null, "Budget Énergie : ", (totalEnergy), " / ", (MAX_DECK_ENERGY))), (allFourCovered && deckCards.length === 5 && (
                React.createElement("span", { className: "px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[11px] font-mono font-extrabold" }, "SYNERGIE 4 DISCIPLINES (+5%)")
              ))), React.createElement("h2", { className: "text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight" }, "Composition Stratégique du Deck (Plafond ", (MAX_DECK_ENERGY), " W Énergie)"), React.createElement("p", { className: "text-xs text-slate-300 mt-0.5" }, "Associez 1 ou 2 leaders (4-5 W) à des équipiers et matériels tactiques (1-3 W) sans dépasser ", (MAX_DECK_ENERGY), " W d’énergie.")), React.createElement("div", { className: "grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0" }, React.createElement("button", { type: "button", onClick: (() => {
                soundFX.playClick();
                onAutoBuildBalancedDeck();
              }), className: "min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-600 text-white font-bold text-xs shadow transition" }, "Auto-Deck Équilibré (&le; ", (MAX_DECK_ENERGY), " W)"), React.createElement("button", { type: "button", disabled: (!deckCheck.valid), onClick: (() => {
                soundFX.playClick();
                onGoToDuel();
              }), className: (`min-h-[44px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl font-black text-xs active:scale-95 transition shadow-lg ${
                deckCheck.valid
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`) }, React.createElement(DuelFlagIcon, { className: "w-4 h-4" }), React.createElement("span", null, "Lancer un Duel (", (deckCards.length), "/5)")))), React.createElement("div", { className: "space-y-1.5" }, React.createElement("div", { className: "flex items-center justify-between text-xs" }, React.createElement("span", { className: "text-slate-300 font-semibold" }, "Jauge de Budget Énergie Peloton (", (totalEnergy), "/", (MAX_DECK_ENERGY), " W)"), React.createElement("span", { className: (`font-mono font-bold tabular-nums ${
                remainingEnergy >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`) }, (remainingEnergy >= 0
                ? `${remainingEnergy} W disponible(s)`
                : `Dépassement de ${Math.abs(remainingEnergy)} W !`))), React.createElement("div", { className: "w-full h-2.5 bg-slate-800 rounded-full overflow-hidden" }, React.createElement("div", { className: (`h-full transition-all duration-300 ${
                totalEnergy > MAX_DECK_ENERGY
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400'
              }`), style: ({
                width: `${Math.min(100, (totalEnergy / MAX_DECK_ENERGY) * 100)}%`
              }) }))), React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-slate-800" }, React.createElement("div", { className: "lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5" }, (coreDisciplines.map((disc) => {
              const count = coverageMap[disc];
              const dConf = DISCIPLINE_CONFIG[disc];
              const isCovered = count > 0;

              return (
                React.createElement("div", { key: (disc), className: (`rounded-xl p-2.5 border ${
                    isCovered
                      ? `${dConf.bgSoft} ${dConf.borderSoft}`
                      : 'bg-rose-950/30 border-rose-500/40'
                  }`) }, React.createElement("div", { className: "flex items-center justify-between" }, React.createElement("span", { className: (`inline-flex items-center gap-1 text-xs font-extrabold ${dConf.color}`) }, React.createElement(DisciplineIcon, { discipline: (disc), className: "w-3.5 h-3.5" }), React.createElement("span", null, (dConf.shortLabel))), React.createElement("span", { className: (`text-[10px] font-mono font-black ${
                        isCovered ? 'text-emerald-300' : 'text-rose-400'
                      }`) }, (isCovered ? 'OK' : 'MANQUE'))), React.createElement("div", { className: "text-xs font-bold text-white mt-1" }, (isCovered
                      ? `${count} carte${count > 1 ? 's' : ''}`
                      : 'Non couverte')))
              );
            }))), React.createElement("div", { className: "lg:col-span-5 grid grid-cols-4 gap-2 bg-slate-950 rounded-xl p-2.5 border border-slate-800 text-center" }, React.createElement("div", null, React.createElement("div", { className: "text-[10px] font-mono uppercase text-slate-400" }, "Moy. OVR"), React.createElement("div", { className: "text-base font-black text-amber-400 font-mono tabular-nums" }, (teamStats.overall))), React.createElement("div", null, React.createElement("div", { className: "text-[10px] font-mono uppercase text-amber-300" }, "PUI"), React.createElement("div", { className: "text-base font-black text-white font-mono tabular-nums" }, (teamStats.power))), React.createElement("div", null, React.createElement("div", { className: "text-[10px] font-mono uppercase text-cyan-300" }, "TEC"), React.createElement("div", { className: "text-base font-black text-white font-mono tabular-nums" }, (teamStats.technique))), React.createElement("div", null, React.createElement("div", { className: "text-[10px] font-mono uppercase text-emerald-300" }, "END"), React.createElement("div", { className: "text-base font-black text-white font-mono tabular-nums" }, (teamStats.endurance))))), React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4" }, ([0, 1, 2, 3, 4].map((slotIdx) => {
            const card = deckCards[slotIdx];
            if (!card) {
              return (
                React.createElement("div", { key: (`empty-${slotIdx}`), className: "h-[280px] sm:h-[310px] rounded-2xl border-2 border-dashed border-amber-500/40 bg-slate-950/60 flex flex-col items-center justify-center p-3 sm:p-4 text-center" }, React.createElement("div", { className: "w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-black text-lg mb-2" }, "+", (slotIdx + 1)), React.createElement("p", { className: "text-xs font-bold text-slate-300" }, "Titulaire #", (slotIdx + 1), " disponible"), React.createElement("p", { className: "text-[11px] font-mono text-slate-500 mt-1" }, "Budget restant : ", (Math.max(0, remainingEnergy)), " W"))
              );
            }

            const cached = card.wikiSlug ? wikiCache[card.wikiSlug] : undefined;
            return (
              React.createElement(CyclingCard, { key: (card.id), card: (card), liveImageUrl: (cached?.thumbnailUrl), count: (inventory[card.id] || 1), starLevel: (cardStars[card.id] || 0), isInDeck: (true), compact: (true), onClick: (() => {
                  soundFX.playClick();
                  onSelectCardDetail(card);
                }), actionButton: ({
                  label: `Retirer (${card.energyCost} W)`,
                  variant: 'danger',
                  onAction: (e     ) => {
                    e.stopPropagation();
                    soundFX.playClick();
                    onToggleCardInDeck(card.id);
                  }
                }) })
            );
          })))), React.createElement("div", { className: "space-y-4" }, React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-3" }, React.createElement("h3", { className: "text-lg font-black text-white flex items-center gap-2" }, React.createElement(ShieldIcon, { className: "w-4 h-4 text-cyan-400" }), React.createElement("span", null, "Effectif Débloqué (", (unlockedCards.length), " cartes disponibles)")), React.createElement("div", { className: "flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto" }, React.createElement("div", { className: "flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1" }, ((
                [
                  'ALL',
                  'Route',
                  'VTT',
                  'Piste',
                  'Cyclo-cross',
                  'Polyvalent'
                ]                             
              ).map((d) => (
                React.createElement("button", { key: (d), type: "button", onClick: (() => {
                    soundFX.playClick();
                    setFilterDisc(d);
                  }), className: (`shrink-0 min-h-[36px] px-3 py-1 rounded-full text-xs font-bold active:scale-95 transition ${
                    filterDisc === d
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`) }, (d === 'ALL' ? 'Toutes' : d))
              )))), React.createElement("select", { value: (filterCost === 'ALL' ? 'ALL' : String(filterCost)), onChange: ((e     ) =>
                setFilterCost(
                  e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                )
              ), className: "min-h-[42px] rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-slate-200" }, React.createElement("option", { value: "ALL" }, "Coût : Tous"), React.createElement("option", { value: "1" }, "1 W (Équipier)"), React.createElement("option", { value: "2" }, "2 W (Solide)"), React.createElement("option", { value: "3" }, "3 W (Lieutenant)"), React.createElement("option", { value: "4" }, "4 W (Leader)"), React.createElement("option", { value: "5" }, "5 W (Légende)")))), React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4" }, (filteredReserve.map((card) => {
            const inDeck = deck.includes(card.id);
            const wouldExceed =
              !inDeck &&
              (deck.length >= 5 || totalEnergy + card.energyCost > MAX_DECK_ENERGY);
            const cached = card.wikiSlug ? wikiCache[card.wikiSlug] : undefined;

            let btnLabel = `Titulariser (${card.energyCost} W)`;
            if (inDeck) btnLabel = 'Retirer du Deck';
            else if (deck.length >= 5) btnLabel = 'Deck Complet (5/5)';
            else if (totalEnergy + card.energyCost > MAX_DECK_ENERGY) {
              btnLabel = `Budget dépassé (${card.energyCost} > ${remainingEnergy} W)`;
            }

            return (
              React.createElement(CyclingCard, { key: (card.id), card: (card), liveImageUrl: (cached?.thumbnailUrl), count: (inventory[card.id] || 1), starLevel: (cardStars[card.id] || 0), isInDeck: (inDeck), compact: (true), onClick: (() => {
                  soundFX.playClick();
                  onSelectCardDetail(card);
                }), actionButton: ({
                  label: btnLabel,
                  variant: inDeck ? 'danger' : 'amber',
                  disabled: wouldExceed,
                  onAction: (e     ) => {
                    e.stopPropagation();
                    soundFX.playClick();
                    onToggleCardInDeck(card.id);
                  }
                }) })
            );
          })))))
  );
}


// === FILE: src/components/DuelArenaView.tsx ===








function shuffle   (arr     )      {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
function DuelArenaView({
  allCards,
  deckIds,
  cardStars,
  wikiCache,
  onGoToDeckBuilder,
  onRecordQuizAnswer,
  onFinishDuel
}                    ) {
  const [selectedOpponent, setSelectedOpponent] = useState            (
    AI_OPPONENTS[0]
  );
  const [duelPhase, setDuelPhase] = useState 
                                                                           
   ('LOBBY');

  const [stages, setStages] = useState                ([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [playerHand, setPlayerHand] = useState            ([]);
  const [aiHand, setAiHand] = useState            ([]);
  const [playedPlayerCards, setPlayedPlayerCards] = useState            ([]);
  const [playedAiCards, setPlayedAiCards] = useState            ([]);
  const [playerCarryBonus, setPlayerCarryBonus] = useState(0);
  const [aiCarryBonus, setAiCarryBonus] = useState(0);
  const [usedQuizCardIds, setUsedQuizCardIds] = useState          ([]);

  const [chosenPlayerCard, setChosenPlayerCard] = useState                 (null);
  const [chosenAiCard, setChosenAiCard] = useState                 (null);
  const [activeQuiz, setActiveQuiz] = useState                     (null);
  const [quizRiskMode, setQuizRiskMode] = useState              ('SAFE');
  const [selectedOptionIdx, setSelectedOptionIdx] = useState               (null);

  const [roundHistory, setRoundHistory] = useState                    ([]);
  const [lastRoundResult, setLastRoundResult] =
    useState                         (null);
  const [matchQuizWatts, setMatchQuizWatts] = useState(0);
  const [matchFinalReward, setMatchFinalReward] = useState(0);
  const [copiedRecap, setCopiedRecap] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState        ('');
  const [matchSubmitted, setMatchSubmitted] = useState         (false);

  const playerDeckCards = useMemo(
    () =>
      deckIds
        .map((id) => allCards.find((c) => c.id === id))
        .filter((c)                => Boolean(c)),
    [deckIds, allCards]
  );

  const deckValidity = useMemo(
    () => isDeckValid(playerDeckCards),
    [playerDeckCards]
  );

  const hasFullTeamSynergy = useMemo(
    () => checkAllFourDisciplinesCovered(playerDeckCards),
    [playerDeckCards]
  );

  const startNewMatch = (opponent            ) => {
    if (!deckValidity.valid) return;
    soundFX.playClick();

    const coreStages                 = [];
    const disciplines                   = [
      'Route',
      'VTT',
      'Piste',
      'Cyclo-cross'
    ];
    for (const d of disciplines) {
      const candidates = TERRAIN_STAGES.filter((s) => s.favoredDiscipline === d);
      const picked = shuffle(candidates)[0];
      if (picked) coreStages.push(picked);
    }
    const remainingStages = TERRAIN_STAGES.filter(
      (s) => !coreStages.some((cs) => cs.id === s.id)
    );
    const fifthStage = shuffle(remainingStages)[0] || TERRAIN_STAGES[0];
    const fiveStages = shuffle([...coreStages, fifthStage]);

    const aiPool = allCards.filter((c) =>
      opponent.minRarityPool.includes(c.rarity)
    );
    const pickedAiHand = buildAIDeckWithinBudget(
      aiPool,
      allCards,
      opponent.maxBudget
    );

    setSelectedOpponent(opponent);
    setStages(fiveStages);
    setCurrentRoundIdx(0);
    setPlayerHand([...playerDeckCards]);
    setAiHand(pickedAiHand);
    setPlayedPlayerCards([]);
    setPlayedAiCards([]);
    setPlayerCarryBonus(0);
    setAiCarryBonus(0);
    setUsedQuizCardIds([]);
    setRoundHistory([]);
    setChosenPlayerCard(null);
    setChosenAiCard(null);
    setActiveQuiz(null);
    setQuizRiskMode('SAFE');
    setSelectedOptionIdx(null);
    setLastRoundResult(null);
    setMatchQuizWatts(0);
    setMatchFinalReward(0);
    setCopiedRecap(false);
    setCurrentMatchId(
      `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    );
    setMatchSubmitted(false);
    setDuelPhase('SELECT_CARD');
  };

  const currentStage = stages[currentRoundIdx];
  const roundNumber = currentRoundIdx + 1;
  const energyAvailable = 2 + roundNumber; // 3, 4, 5, 6, 7

  const playableCardIds = useMemo(() => {
    const affordable = playerHand.filter((c) => c.energyCost <= energyAvailable);
    if (affordable.length > 0) {
      return new Set(affordable.map((c) => c.id));
    }
    const minCost = Math.min(...playerHand.map((c) => c.energyCost));
    return new Set(
      playerHand.filter((c) => c.energyCost === minCost).map((c) => c.id)
    );
  }, [playerHand, energyAvailable]);

  const handleChooseCardForRound = (card          ) => {
    if (!currentStage || !playableCardIds.has(card.id)) return;
    soundFX.playClick();

    const affordableAi = aiHand.filter((c) => c.energyCost <= energyAvailable);
    const aiCandidates =
      affordableAi.length > 0
        ? affordableAi
        : [...aiHand].sort((a, b) => a.energyCost - b.energyCost).slice(0, 1);

    let aiPick = aiCandidates[0];
    if (selectedOpponent.difficulty === 'Souple') {
      aiPick = shuffle(aiCandidates)[0];
    } else {
      const aiFullSynergy = checkAllFourDisciplinesCovered([
        ...playedAiCards,
        ...aiHand
      ]);
      const scored = [...aiCandidates].sort((a, b) => {
        const evalA = evaluateStageSide({
          card: a,
          starLevel: 0,
          stage: currentStage,
          roundNumber,
          playedBefore: playedAiCards,
          carriedAllyBonus: aiCarryBonus,
          hasFullTeamSynergy: aiFullSynergy,
          energyAvailable,
          quizMode: 'SAFE',
          quizSuccess: false,
          skipQuiz: true
        });
        const evalB = evaluateStageSide({
          card: b,
          starLevel: 0,
          stage: currentStage,
          roundNumber,
          playedBefore: playedAiCards,
          carriedAllyBonus: aiCarryBonus,
          hasFullTeamSynergy: aiFullSynergy,
          energyAvailable,
          quizMode: 'SAFE',
          quizSuccess: false,
          skipQuiz: true
        });
        return evalB.rawScoreBeforeDebuff - evalA.rawScoreBeforeDebuff;
      });
      aiPick = scored[0];
    }

    const focusCandidate =
      !usedQuizCardIds.includes(card.id)
        ? card
        : !usedQuizCardIds.includes(aiPick.id)
        ? aiPick
        : card;

    const question = generateCardQuizQuestion(focusCandidate, allCards, {
      excludeCardIds: usedQuizCardIds,
      preferredMode: currentRoundIdx
    });

    setUsedQuizCardIds((prev) => [...prev, question.relatedCardId]);
    setChosenPlayerCard(card);
    setChosenAiCard(aiPick);
    setActiveQuiz(question);
    setQuizRiskMode('SAFE');
    setSelectedOptionIdx(null);
    setDuelPhase('QUIZ_ATTACK');
  };

  const handleAnswerRoundQuiz = (optIndex        ) => {
    if (
      selectedOptionIdx !== null ||
      !activeQuiz ||
      !chosenPlayerCard ||
      !chosenAiCard ||
      !currentStage
    ) {
      return;
    }

    setSelectedOptionIdx(optIndex);
    const playerQuizSuccess = optIndex === activeQuiz.correctIndex;
    const instantQuizWatts = playerQuizSuccess
      ? quizRiskMode === 'ATTACK'
        ? ECONOMY_CONFIG.DUEL_QUIZ_REWARD_ATTACK
        : ECONOMY_CONFIG.DUEL_QUIZ_REWARD_SAFE
      : ECONOMY_CONFIG.DUEL_QUIZ_REWARD_WRONG;

    if (playerQuizSuccess) {
      soundFX.playQuizSuccess(quizRiskMode === 'ATTACK');
    } else {
      soundFX.playQuizFail();
    }

    onRecordQuizAnswer(playerQuizSuccess, quizRiskMode, instantQuizWatts);
    setMatchQuizWatts((prev) => prev + instantQuizWatts);

    const aiQuizSuccess = Math.random() < selectedOpponent.aiQuizAccuracy;
    const aiFullSynergy = checkAllFourDisciplinesCovered([
      ...playedAiCards,
      ...aiHand
    ]);

    const playerEval = evaluateStageSide({
      card: chosenPlayerCard,
      starLevel: cardStars[chosenPlayerCard.id] || 0,
      stage: currentStage,
      roundNumber,
      playedBefore: playedPlayerCards,
      carriedAllyBonus: playerCarryBonus,
      hasFullTeamSynergy,
      energyAvailable,
      quizMode: quizRiskMode,
      quizSuccess: playerQuizSuccess
    });

    const aiEval = evaluateStageSide({
      card: chosenAiCard,
      starLevel: 0,
      stage: currentStage,
      roundNumber,
      playedBefore: playedAiCards,
      carriedAllyBonus: aiCarryBonus,
      hasFullTeamSynergy: aiFullSynergy,
      energyAvailable,
      quizMode: 'SAFE',
      quizSuccess: aiQuizSuccess
    });

    const pLines = [...playerEval.lines];
    const aLines = [...aiEval.lines];

    if (aiEval.debuffInflicted > 0) {
      pLines.push({
        label: `Attaque adverse subie (${chosenAiCard.title})`,
        value: -aiEval.debuffInflicted,
        tone: 'negative'
      });
    }
    if (playerEval.debuffInflicted > 0) {
      aLines.push({
        label: `Attaque subie (${chosenPlayerCard.title})`,
        value: -playerEval.debuffInflicted,
        tone: 'negative'
      });
    }

    const playerFinalScore = Math.max(
      10,
      playerEval.rawScoreBeforeDebuff - aiEval.debuffInflicted
    );
    const aiFinalScore = Math.max(
      10,
      aiEval.rawScoreBeforeDebuff - playerEval.debuffInflicted
    );

    let winner                           = 'DRAW';
    if (playerFinalScore > aiFinalScore) {
      winner = 'PLAYER';
      setTimeout(() => soundFX.playRoundWin(), 180);
    } else if (aiFinalScore > playerFinalScore) {
      winner = 'AI';
    }

    const resultItem                   = {
      roundNumber,
      stage: currentStage,
      playerCard: chosenPlayerCard,
      aiCard: chosenAiCard,
      playerScore: playerFinalScore,
      aiScore: aiFinalScore,
      playerTerrainBonusPct: playerEval.terrainBonusPct,
      aiTerrainBonusPct: aiEval.terrainBonusPct,
      playerQuizSuccess,
      playerQuizMode: quizRiskMode,
      aiQuizSuccess,
      playerLines: pLines,
      aiLines: aLines,
      playerDebuffInflicted: playerEval.debuffInflicted,
      aiDebuffInflicted: aiEval.debuffInflicted,
      playerNextAllyBonus: playerEval.nextAllyBonusToCarry,
      winner
    };

    setLastRoundResult(resultItem);
    setRoundHistory((prev) => [...prev, resultItem]);
    setPlayedPlayerCards((prev) => [...prev, chosenPlayerCard]);
    setPlayedAiCards((prev) => [...prev, chosenAiCard]);
    setPlayerCarryBonus(playerEval.nextAllyBonusToCarry);
    setAiCarryBonus(aiEval.nextAllyBonusToCarry);
    setPlayerHand((prev) => prev.filter((c) => c.id !== chosenPlayerCard.id));
    setAiHand((prev) => prev.filter((c) => c.id !== chosenAiCard.id));
    setDuelPhase('ROUND_RESULT');
  };

  const handleProceedAfterRound = () => {
    soundFX.playClick();
    if (currentRoundIdx + 1 >= 5) {
      if (matchSubmitted) return;
      setMatchSubmitted(true);
      const pWins = roundHistory.filter((r) => r.winner === 'PLAYER').length;
      const aWins = roundHistory.filter((r) => r.winner === 'AI').length;
      const pPts = roundHistory.reduce((s, r) => s + r.playerScore, 0);
      const aPts = roundHistory.reduce((s, r) => s + r.aiScore, 0);

      const playerWonMatch =
        pWins > aWins || (pWins === aWins && pPts >= aPts);

      if (playerWonMatch) {
        soundFX.playMatchWin();
      }

      const baseReward = playerWonMatch
        ? selectedOpponent.rewardWinWatts
        : selectedOpponent.rewardLossWatts;

      const attackSuccessCount = roundHistory.filter(
        (r) => r.playerQuizMode === 'ATTACK' && r.playerQuizSuccess
      ).length;

      setMatchFinalReward(baseReward);
      onFinishDuel(
        currentMatchId,
        playerWonMatch,
        baseReward,
        playerDeckCards,
        attackSuccessCount
      );
      setDuelPhase('MATCH_OVER');
    } else {
      setCurrentRoundIdx((prev) => prev + 1);
      setChosenPlayerCard(null);
      setChosenAiCard(null);
      setActiveQuiz(null);
      setQuizRiskMode('SAFE');
      setSelectedOptionIdx(null);
      setLastRoundResult(null);
      setDuelPhase('SELECT_CARD');
    }
  };

  const playerWinsCount = roundHistory.filter(
    (r) => r.winner === 'PLAYER'
  ).length;
  const aiWinsCount = roundHistory.filter((r) => r.winner === 'AI').length;

  // Garde-fou Deck valide
  if (!deckValidity.valid) {
    return (
      React.createElement("div", { className: "rounded-3xl bg-slate-900 border border-amber-500/40 p-8 text-center space-y-4" }, React.createElement("div", { className: "w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400" }, React.createElement(ShieldIcon, { className: "w-6 h-6" })), React.createElement("h2", { className: "text-2xl font-black text-white" }, "Équipe non conforme pour le départ"), React.createElement("p", { className: "text-sm text-slate-300 max-w-lg mx-auto" }, (deckValidity.reason), " Ajustez votre sélection de 5 titulaires dans le respect du budget maximal de ", (MAX_DECK_ENERGY), " W d’énergie avant de prendre le départ."), React.createElement("button", { type: "button", onClick: (() => {
            soundFX.playClick();
            onGoToDeckBuilder();
          }), className: "px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg transition" }, "Ajuster mon Équipe (&le; ", (MAX_DECK_ENERGY), " W)"))
    );
  }

  // PHASE 1 : LOBBY
  if (duelPhase === 'LOBBY') {
    return (
      React.createElement("div", { className: "space-y-6" }, React.createElement("div", { className: "rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-xl bg-asphalt-grid" }, React.createElement("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-4" }, React.createElement("div", null, React.createElement("span", { className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-mono font-extrabold uppercase tracking-wider" }, React.createElement(DuelFlagIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, "ARÈNE TCG • 5 ÉTAPES DYNAMIQUES + QUIZ TACTIQUE")), React.createElement("h2", { className: "text-2xl font-black text-white mt-1.5 tracking-tight" }, "Affrontez les Directeurs Sportifs IA"), React.createElement("p", { className: "text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed" }, "Toutes les étapes et leurs modificateurs sont visibles dès le briefing. Gérez votre énergie par tour (3 → 7 W), activez vos mots-clés TCG (", React.createElement("em", null, "À la révélation, Continu, Sprint final, Échappée, Synergie"), ") et tentez l’", React.createElement("strong", null, "Attaque Risquée (Snap)"), " sur le Quiz !")), React.createElement("div", { className: "flex flex-col gap-1.5 shrink-0" }, React.createElement("div", { className: "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-xs font-bold font-mono tabular-nums" }, React.createElement(BoltWattIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, "Coût Deck : ", (deckValidity.totalEnergy), " / ", (MAX_DECK_ENERGY), " W")), (hasFullTeamSynergy && (
                React.createElement("div", { className: "px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold text-center" }, "SYNERGIE 4 DISCIPLINES (+5%)")
              ))))), React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-5" }, (AI_OPPONENTS.map((opp) => (
            React.createElement("div", { key: (opp.id), className: "rounded-2xl bg-slate-900 border border-slate-700 p-5 flex flex-col justify-between hover:border-amber-400 transition shadow-lg" }, React.createElement("div", null, React.createElement("div", { className: "flex items-center justify-between mb-3" }, React.createElement("span", { className: "px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono font-black tracking-widest text-amber-400" }, (opp.codeBadge)), React.createElement("span", { className: (`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                      opp.difficulty === 'Souple'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : opp.difficulty === 'Tactique'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'uci-rainbow-badge text-slate-950 font-black'
                    }`) }, (opp.difficulty), " • Budget ", (opp.maxBudget), " W")), React.createElement("h3", { className: "text-lg font-black text-white" }, (opp.name)), React.createElement("p", { className: "text-xs text-amber-400 font-semibold" }, (opp.title)), React.createElement("p", { className: "text-xs text-slate-300 mt-2 leading-relaxed" }, (opp.description))), React.createElement("div", { className: "mt-5 pt-3 border-t border-slate-800 space-y-3" }, React.createElement("div", { className: "flex items-center justify-between text-xs" }, React.createElement("span", { className: "text-slate-400" }, "Prime de Victoire :"), React.createElement("span", { className: "font-mono font-black text-amber-400 tabular-nums" }, "+", (opp.rewardWinWatts), " W (+ Quiz live)")), React.createElement("button", { type: "button", onClick: (() => startNewMatch(opp)), className: "w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow transition" }, "Prendre le Départ (5 Manches)")))
          )))), React.createElement("div", { className: "rounded-2xl bg-slate-900 border border-slate-800 p-4" }, React.createElement("div", { className: "flex items-center justify-between mb-3" }, React.createElement("h4", { className: "text-sm font-black text-slate-200 uppercase tracking-wider" }, "5 Majeur aligné au départ (", (deckValidity.totalEnergy), "/", (MAX_DECK_ENERGY), " W)"), React.createElement("button", { type: "button", onClick: (() => {
                soundFX.playClick();
                onGoToDeckBuilder();
              }), className: "text-xs text-amber-400 hover:underline font-bold" }, "Modifier l’équipe")), React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3" }, (playerDeckCards.map((c) => {
              const star = cardStars[c.id] || 0;
              const starAdd =
                star === 3 ? 9 : star === 2 ? 5 : star === 1 ? 2 : 0;
              return (
                React.createElement("div", { key: (c.id), className: "rounded-xl bg-slate-950 border border-slate-800 p-2.5 flex items-center justify-between gap-2" }, React.createElement("div", { className: "min-w-0" }, React.createElement("div", { className: "text-xs font-extrabold text-white truncate flex items-center gap-1" }, React.createElement("span", { className: "truncate" }, (c.title)), (star > 0 && (
                        React.createElement(StarIcon, { className: "w-3 h-3 text-amber-300 shrink-0" })
                      ))), React.createElement("div", { className: "text-[10px] font-mono text-amber-400 truncate" }, (c.energyCost), " W • ", (c.discipline), " • ", (c.keyword))), React.createElement("span", { className: "px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-black text-xs tabular-nums shrink-0" }, (c.stats.overall + starAdd)))
              );
            })))))
    );
  }

  // PHASE FINALE : BROADCAST POST-RACE SUMMARY PODIUM
  if (duelPhase === 'MATCH_OVER') {
    const playerTotalPts = roundHistory.reduce((s, r) => s + r.playerScore, 0);
    const aiTotalPts = roundHistory.reduce((s, r) => s + r.aiScore, 0);
    const playerWon =
      playerWinsCount > aiWinsCount ||
      (playerWinsCount === aiWinsCount && playerTotalPts >= aiTotalPts);

    const mvpRound = roundHistory.reduce                         (
      (best, item) => {
        if (!best || item.playerScore > best.playerScore) return item;
        return best;
      },
      null
    );

    const quizOkCount = roundHistory.filter((r) => r.playerQuizSuccess).length;

    const handleCopyPalmares = () => {
      const lines = [
        playerWon
          ? `VICTOIRE VELOLEGENDS TCG vs ${selectedOpponent.name} (${selectedOpponent.codeBadge})`
          : `DUEL VELOLEGENDS TCG vs ${selectedOpponent.name} (${selectedOpponent.codeBadge})`,
        `Score des étapes : ${playerWinsCount} - ${aiWinsCount} (${playerTotalPts} vs ${aiTotalPts} pts)`,
        `MVP du match : ${mvpRound?.playerCard.title || ''} (${mvpRound?.playerScore || 0} pts sur ${mvpRound?.stage.name || ''})`,
        `Précision Quiz : ${quizOkCount}/5 • Gains : +${matchFinalReward + matchQuizWatts} Watts`
      ];
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
        }
      } catch {
        // Ignore in headless sandbox
      }
      soundFX.playClick();
      setCopiedRecap(true);
      setTimeout(() => setCopiedRecap(false), 2600);
    };

    return (
      React.createElement("div", { className: "space-y-6" }, React.createElement("div", { className: (`rounded-3xl border-2 p-4 sm:p-6 shadow-2xl bg-asphalt-grid ${
            playerWon
              ? 'bg-gradient-to-b from-amber-950/60 via-slate-900 to-slate-950 border-amber-400'
              : 'bg-slate-900 border-slate-700'
          }`) }, React.createElement("div", { className: "text-center space-y-2" }, React.createElement("div", { className: "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-700 text-[10px] font-mono font-black uppercase tracking-widest text-amber-400" }, React.createElement(TrophyIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, "CLASSEMENT DE L’ÉPREUVE • FIN DE MATCH")), React.createElement("h2", { className: "text-2xl sm:text-3xl font-black text-white tracking-tight" }, (playerWon
                ? 'VICTOIRE AU CLASSEMENT GÉNÉRAL !'
                : 'DÉFAITE AU SPRINT FINAL')), React.createElement("p", { className: "text-sm text-slate-300" }, "Étapes : ", React.createElement("strong", { className: "font-mono text-amber-400" }, (playerWinsCount)), " à", (' '), React.createElement("strong", { className: "font-mono text-rose-400" }, (aiWinsCount)), " face à", (' '), React.createElement("strong", null, (selectedOpponent.name)), " (", (selectedOpponent.codeBadge), ") • Cumul :", (' '), React.createElement("strong", { className: "font-mono text-emerald-400" }, (playerTotalPts)), " vs", (' '), React.createElement("strong", { className: "font-mono text-rose-400" }, (aiTotalPts)), " pts")), React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3 mt-5" }, React.createElement("div", { className: "rounded-2xl bg-slate-950 border border-amber-500/40 p-4 text-center" }, React.createElement("div", { className: "text-[10px] font-mono uppercase text-slate-400" }, "TOTAL GAINS WATTS"), React.createElement("div", { className: "text-xl font-mono font-black text-amber-400 mt-1 tabular-nums" }, "+", (matchFinalReward + matchQuizWatts), " W"), React.createElement("div", { className: "text-[11px] text-slate-400 mt-0.5" }, "Prime ", (matchFinalReward), " W + Quiz ", (matchQuizWatts), " W")), React.createElement("div", { className: "rounded-2xl bg-slate-950 border border-cyan-500/40 p-4 text-center" }, React.createElement("div", { className: "text-[10px] font-mono uppercase text-cyan-300" }, "CARTE MVP DU MATCH"), React.createElement("div", { className: "text-base font-black text-white mt-1 truncate" }, (mvpRound?.playerCard.title || 'N/A')), React.createElement("div", { className: "text-[11px] font-mono text-emerald-300 mt-0.5" }, (mvpRound ? `${mvpRound.playerScore} pts • ${mvpRound.stage.shortName}` : ''))), React.createElement("div", { className: "rounded-2xl bg-slate-950 border border-emerald-500/40 p-4 text-center" }, React.createElement("div", { className: "text-[10px] font-mono uppercase text-slate-400" }, "PRÉCISION QUIZ CULTURE VÉLO"), React.createElement("div", { className: "text-xl font-mono font-black text-emerald-400 mt-1 tabular-nums" }, (quizOkCount), " / 5"), React.createElement("div", { className: "text-[11px] text-slate-400 mt-0.5" }, (Math.round((quizOkCount / 5) * 100)), "% de réussite tactique"))), React.createElement("div", { className: "flex flex-col sm:flex-row sm:flex-wrap justify-center gap-2.5 sm:gap-3 mt-6" }, React.createElement("button", { type: "button", onClick: (() => startNewMatch(selectedOpponent)), className: "min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition" }, "Revanche Immédiate"), React.createElement("button", { type: "button", onClick: (handleCopyPalmares), className: "min-h-[44px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow transition" }, React.createElement(ShareIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, (copiedRecap
                  ? 'Palmarès copié !'
                  : 'Copier le Palmarès (Twitch / Discord)'))), React.createElement("button", { type: "button", onClick: (() => {
                soundFX.playClick();
                setDuelPhase('LOBBY');
              }), className: "min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs border border-slate-700 transition" }, "Changer d’Adversaire IA"))), React.createElement("div", { className: "rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3" }, React.createElement("h3", { className: "text-sm font-black uppercase tracking-wider text-white" }, "Feuille de Route des 5 Étapes"), React.createElement("div", { className: "space-y-2.5" }, (roundHistory.map((item) => (
              React.createElement("div", { key: (item.roundNumber), className: "rounded-xl bg-slate-950 border border-slate-800 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs" }, React.createElement("div", null, React.createElement("span", { className: "font-mono font-bold text-amber-400" }, "Étape ", (item.roundNumber), "/5 • ", (item.stage.name)), React.createElement("span", { className: "ml-2 px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]" }, (item.stage.favoredDiscipline), " • ", (item.stage.modifierTitle))), React.createElement("div", { className: "flex flex-wrap items-center gap-3 font-mono tabular-nums" }, React.createElement("span", { className: "text-emerald-300 font-bold" }, "Vous : ", (item.playerCard.title), " (", (item.playerScore), " pts", (item.playerQuizSuccess
                      ? item.playerQuizMode === 'ATTACK'
                        ? ' [SNAP]'
                        : ' [QUIZ]'
                      : ''), ")"), React.createElement("span", { className: "text-slate-500" }, "vs"), React.createElement("span", { className: "text-rose-300 font-bold" }, "IA : ", (item.aiCard.title), " (", (item.aiScore), " pts)"), React.createElement("span", { className: (`px-2 py-0.5 rounded font-black ${
                      item.winner === 'PLAYER'
                        ? 'bg-emerald-500 text-slate-950'
                        : item.winner === 'AI'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-700 text-white'
                    }`) }, (item.winner === 'PLAYER'
                      ? 'GAGNÉ'
                      : item.winner === 'AI'
                      ? 'PERDU'
                      : 'ÉGALITÉ'))))
            ))))))
    );
  }

  if (!currentStage) return null;
  const stageDiscInfo = DISCIPLINE_CONFIG[currentStage.favoredDiscipline];

  return (
    React.createElement("div", { className: "space-y-4 sm:space-y-5" }, React.createElement("div", { className: "flex sm:grid sm:grid-cols-5 gap-2 overflow-x-auto no-scrollbar snap-x pb-1" }, (stages.map((st, idx) => {
          const hist = roundHistory.find((r) => r.roundNumber === idx + 1);
          const isCurrent = idx === currentRoundIdx;
          const dConf = DISCIPLINE_CONFIG[st.favoredDiscipline];

          return (
            React.createElement("div", { key: (`${st.id}-${idx}`), className: (`min-w-[140px] sm:min-w-0 shrink-0 snap-center rounded-xl p-2.5 border text-left transition ${
                isCurrent
                  ? 'bg-slate-900 border-amber-400 shadow-lg'
                  : hist
                  ? hist.winner === 'PLAYER'
                    ? 'bg-emerald-950/35 border-emerald-500/40'
                    : hist.winner === 'AI'
                    ? 'bg-rose-950/35 border-rose-500/40'
                    : 'bg-slate-900 border-slate-700'
                  : 'bg-slate-900/60 border-slate-800 opacity-85'
              }`) }, React.createElement("div", { className: "flex items-center justify-between text-[10px] font-mono font-black" }, React.createElement("span", { className: (isCurrent ? 'text-amber-400' : 'text-slate-400') }, "ÉTAPE ", (idx + 1)), React.createElement("span", { className: (dConf.color) }, (st.favoredDiscipline))), React.createElement("div", { className: "text-[11px] font-bold text-white truncate mt-0.5" }, (st.modifierTitle)), (hist ? (
                React.createElement("div", { className: "text-[10px] font-mono mt-1 font-bold tabular-nums" }, React.createElement("span", { className: (
                      hist.winner === 'PLAYER'
                        ? 'text-emerald-400'
                        : hist.winner === 'AI'
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    ) }, (hist.playerScore), " - ", (hist.aiScore), " (", (hist.winner === 'PLAYER'
                      ? 'V'
                      : hist.winner === 'AI'
                      ? 'D'
                      : '='), ")"))
              ) : (
                React.createElement("div", { className: "text-[10px] font-mono text-slate-400 truncate mt-0.5" }, (isCurrent ? 'EN COURS' : `Énergie : ${2 + idx + 1} W`))
              )))
          );
        }))), React.createElement("div", { className: "rounded-3xl bg-slate-900 border border-slate-700 p-4 sm:p-5 shadow-xl space-y-3 bg-asphalt-grid" }, React.createElement("div", { className: "flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 border-b border-slate-800 pb-3" }, React.createElement("div", { className: "flex items-center gap-2.5 sm:gap-3 min-w-0" }, React.createElement("span", { className: "px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-mono font-black text-xs shrink-0" }, "ÉTAPE ", (roundNumber), " / 5"), React.createElement("div", { className: "min-w-0" }, React.createElement("h2", { className: "text-base sm:text-xl font-black text-white tracking-tight truncate" }, (currentStage.name)), React.createElement("p", { className: "text-xs text-slate-400 truncate" }, (currentStage.subtitle)))), React.createElement("div", { className: "flex items-center justify-between sm:justify-end gap-2 sm:gap-3" }, React.createElement("div", { className: "px-3.5 py-2 rounded-2xl bg-cyan-500/15 border border-cyan-400/50 text-center" }, React.createElement("div", { className: "text-[10px] font-mono text-cyan-300 uppercase font-bold" }, "Énergie Tour"), React.createElement("div", { className: "text-base font-black text-white font-mono tabular-nums" }, (energyAvailable), " W")), React.createElement("div", { className: "flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800" }, React.createElement("div", { className: "text-center" }, React.createElement("div", { className: "text-[10px] font-mono text-slate-400 uppercase font-bold" }, "Vous"), React.createElement("div", { className: "text-xl font-black text-emerald-400 font-mono tabular-nums" }, (playerWinsCount))), React.createElement("div", { className: "text-xs font-mono font-bold text-slate-500" }, "VS"), React.createElement("div", { className: "text-center" }, React.createElement("div", { className: "text-[10px] font-mono text-slate-400 uppercase font-bold" }, (selectedOpponent.codeBadge)), React.createElement("div", { className: "text-xl font-black text-rose-400 font-mono tabular-nums" }, (aiWinsCount)))))), React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-12 gap-4 items-center" }, React.createElement("div", { className: "md:col-span-7 space-y-2" }, React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, React.createElement("span", { className: (`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${stageDiscInfo.bgSoft} ${stageDiscInfo.color} ${stageDiscInfo.borderSoft}`) }, React.createElement(DisciplineIcon, { discipline: (currentStage.favoredDiscipline), className: "w-3 h-3" }), React.createElement("span", null, "Discipline : ", (currentStage.favoredDiscipline), " (+", (currentStage.terrainBonusPct), "%)")), React.createElement("span", { className: "px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-200 text-xs font-bold" }, "Règle : ", (currentStage.modifierTitle))), React.createElement("p", { className: "text-xs text-amber-200 font-semibold" }, "Modificateur d’étape : ", (currentStage.modifierRule)), (playerCarryBonus > 0 && duelPhase === 'SELECT_CARD' && (
              React.createElement("div", { className: "inline-block px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold" }, "Relais activé : +", (playerCarryBonus), " pts transmis à votre prochaine carte !")
            ))), React.createElement("div", { className: "md:col-span-5 grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center text-xs" }, React.createElement("div", null, React.createElement("span", { className: "text-amber-300 font-mono font-bold block" }, "PUI"), React.createElement("span", { className: "font-mono font-black text-white tabular-nums" }, (Math.round(currentStage.statWeights.power * 100)), "%")), React.createElement("div", null, React.createElement("span", { className: "text-cyan-300 font-mono font-bold block" }, "TEC"), React.createElement("span", { className: "font-mono font-black text-white tabular-nums" }, (Math.round(currentStage.statWeights.technique * 100)), "%")), React.createElement("div", null, React.createElement("span", { className: "text-emerald-300 font-mono font-bold block" }, "END"), React.createElement("span", { className: "font-mono font-black text-white tabular-nums" }, (Math.round(currentStage.statWeights.endurance * 100)), "%"))))), (duelPhase === 'SELECT_CARD' && (
        React.createElement("div", { className: "space-y-3" }, React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" }, React.createElement("h3", { className: "text-base font-black text-white" }, "Choisissez votre carte pour l’Étape ", (roundNumber), " (Plafond tour : ", (energyAvailable), " W)"), React.createElement("span", { className: "text-xs text-emerald-400 font-semibold" }, "Économiser de l’énergie accorde +2 pts d’Élan par W non dépensé")), React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4" }, (playerHand.map((card) => {
              const isPlayable = playableCardIds.has(card.id);
              const bonusPct = getCardTerrainBonusPct(card, currentStage);
              const cached = card.wikiSlug ? wikiCache[card.wikiSlug] : undefined;
              const energySaved = Math.max(0, energyAvailable - card.energyCost);

              return (
                React.createElement(CyclingCard, { key: (card.id), card: (card), liveImageUrl: (cached?.thumbnailUrl), starLevel: (cardStars[card.id] || 0), terrainBonusPct: (bonusPct), isEnergyBlocked: (!isPlayable), onClick: (() => handleChooseCardForRound(card)), actionButton: ({
                    label: !isPlayable
                      ? `Requis ${card.energyCost} W (Dispo ${energyAvailable} W)`
                      : bonusPct > 0
                      ? `Engager (+${bonusPct}% Terrain)`
                      : energySaved > 0
                      ? `Engager (+${energySaved * 2} pts Élan)`
                      : 'Engager cette carte',
                    variant: bonusPct > 0 ? 'amber' : 'primary',
                    disabled: !isPlayable,
                    onAction: (e     ) => {
                      e.stopPropagation();
                      handleChooseCardForRound(card);
                    }
                  }) })
              );
            }))))
      )), (duelPhase === 'QUIZ_ATTACK' &&
        chosenPlayerCard &&
        chosenAiCard &&
        activeQuiz && (
          React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start" }, React.createElement("div", { className: "lg:col-span-5 grid grid-cols-2 gap-2.5 sm:gap-3" }, React.createElement("div", null, React.createElement("div", { className: "text-xs font-mono font-extrabold text-emerald-400 uppercase mb-1.5 text-center" }, "Votre Carte Engagée"), React.createElement(CyclingCard, { card: (chosenPlayerCard), liveImageUrl: (
                    chosenPlayerCard.wikiSlug
                      ? wikiCache[chosenPlayerCard.wikiSlug]?.thumbnailUrl
                      : undefined
                  ), starLevel: (cardStars[chosenPlayerCard.id] || 0), terrainBonusPct: (getCardTerrainBonusPct(
                    chosenPlayerCard,
                    currentStage
                  )), compact: (true) })), React.createElement("div", null, React.createElement("div", { className: "text-xs font-mono font-extrabold text-rose-400 uppercase mb-1.5 text-center" }, "Adversaire (", (selectedOpponent.codeBadge), ")"), React.createElement(CyclingCard, { card: (chosenAiCard), liveImageUrl: (
                    chosenAiCard.wikiSlug
                      ? wikiCache[chosenAiCard.wikiSlug]?.thumbnailUrl
                      : undefined
                  ), terrainBonusPct: (getCardTerrainBonusPct(
                    chosenAiCard,
                    currentStage
                  )), compact: (true) }))), React.createElement("div", { className: "lg:col-span-7 rounded-3xl bg-slate-900 border-2 border-amber-400/80 p-4 sm:p-5 shadow-2xl space-y-4" }, React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] sm:text-xs uppercase tracking-wider" }, React.createElement(BrainQuizIcon, { className: "w-3.5 h-3.5 shrink-0" }), React.createElement("span", null, "QUIZ TACTIQUE • PRISE DE RISQUE")), React.createElement("span", { className: "text-xs font-mono text-slate-400" }, "Étape ", (roundNumber), "/5")), React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5" }, React.createElement("button", { type: "button", onClick: (() => {
                    soundFX.playClick();
                    setQuizRiskMode('SAFE');
                  }), className: (`min-h-[46px] p-3 rounded-xl border text-left active:scale-95 transition ${
                    quizRiskMode === 'SAFE'
                      ? 'bg-emerald-950/60 border-emerald-400 shadow'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                  }`) }, React.createElement("div", { className: "text-xs font-black text-emerald-300" }, "Allure Contrôlée (Sûre)"), React.createElement("div", { className: "text-[11px] text-slate-300 mt-0.5" }, "Bonne réponse : ", React.createElement("strong", null, "+15% Score & +", (ECONOMY_CONFIG.DUEL_QUIZ_REWARD_SAFE), " W"), " • Erreur : 0 pénalité")), React.createElement("button", { type: "button", onClick: (() => {
                    soundFX.playClick();
                    setQuizRiskMode('ATTACK');
                  }), className: (`min-h-[46px] p-3 rounded-xl border text-left active:scale-95 transition ${
                    quizRiskMode === 'ATTACK'
                      ? 'bg-amber-950/70 border-amber-400 shadow-lg'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                  }`) }, React.createElement("div", { className: "text-xs font-black text-amber-300" }, "Attaque / Coup de Bordure (Snap)"), React.createElement("div", { className: "text-[11px] text-slate-300 mt-0.5" }, "Bonne réponse : ", React.createElement("strong", null, "+30% Score, +", (ECONOMY_CONFIG.DUEL_QUIZ_REWARD_ATTACK), " W & Effet ×1.5"), " • Erreur : -10%"))), React.createElement("h3", { className: "text-base sm:text-lg font-extrabold text-white leading-snug pt-1" }, (activeQuiz.questionText)), (activeQuiz.contextExcerpt && (
                React.createElement("div", { className: "p-3 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed italic" }, (activeQuiz.contextExcerpt))
              )), React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5" }, (activeQuiz.options.map((opt, idx) => (
                  React.createElement("button", { key: (idx), type: "button", onClick: (() => handleAnswerRoundQuiz(idx)), className: "min-h-[46px] p-3.5 rounded-xl border bg-slate-800 hover:bg-slate-700 hover:border-amber-400 active:scale-95 border-slate-700 text-white text-left text-xs font-bold transition" }, React.createElement("span", { className: "font-mono text-amber-300 mr-2" }, (String.fromCharCode(65 + idx)), "."), (opt))
                ))))))
        )), (duelPhase === 'ROUND_RESULT' && lastRoundResult && activeQuiz && (
        React.createElement("div", { className: "rounded-3xl bg-slate-900 border-2 border-slate-700 p-4 sm:p-6 shadow-2xl space-y-5 animate-fadeIn" }, React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4" }, React.createElement("div", null, React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, React.createElement("span", { className: (`px-3 py-1 rounded-lg text-xs font-mono font-black ${
                    lastRoundResult.winner === 'PLAYER'
                      ? 'bg-emerald-500 text-slate-950'
                      : lastRoundResult.winner === 'AI'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-700 text-white'
                  }`) }, (lastRoundResult.winner === 'PLAYER'
                    ? `ÉTAPE ${lastRoundResult.roundNumber} REMPORTÉE`
                    : lastRoundResult.winner === 'AI'
                    ? `ÉTAPE ${lastRoundResult.roundNumber} CONCÉDÉE`
                    : `PHOTO-FINISH SUR L’ÉTAPE ${lastRoundResult.roundNumber}`)), React.createElement("span", { className: (`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    lastRoundResult.playerQuizSuccess
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`) }, (lastRoundResult.playerQuizSuccess
                    ? lastRoundResult.playerQuizMode === 'ATTACK'
                      ? `Attaque Risquée Réussie (+${ECONOMY_CONFIG.DUEL_QUIZ_REWARD_ATTACK} W & Effet ×1.5)`
                      : `Quiz Réussi (+${ECONOMY_CONFIG.DUEL_QUIZ_REWARD_SAFE} W)`
                    : lastRoundResult.playerQuizMode === 'ATTACK'
                    ? 'Attaque Risquée Manquée (-10%)'
                    : 'Quiz Manqué (0 pénalité)'))), React.createElement("p", { className: "text-xs text-slate-300 mt-2" }, (activeQuiz.explanation))), React.createElement("button", { type: "button", onClick: (handleProceedAfterRound), className: "w-full sm:w-auto min-h-[46px] px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm shadow-lg transition shrink-0" }, (currentRoundIdx + 1 >= 5
                ? 'Voir le Podium Final'
                : `Étape ${currentRoundIdx + 2} / 5`))), React.createElement("div", { className: "space-y-1.5" }, React.createElement("div", { className: "flex justify-between text-xs font-black font-mono tabular-nums" }, React.createElement("span", { className: "text-emerald-400" }, "VOUS : ", (lastRoundResult.playerScore), " pts"), React.createElement("span", { className: "text-rose-400" }, (selectedOpponent.codeBadge), " : ", (lastRoundResult.aiScore), " pts")), React.createElement("div", { className: "w-full h-3 bg-rose-600/80 rounded-full overflow-hidden flex" }, React.createElement("div", { className: "h-full bg-emerald-400 transition-all duration-500", style: ({
                  width: `${Math.round(
                    (lastRoundResult.playerScore /
                      Math.max(
                        1,
                        lastRoundResult.playerScore + lastRoundResult.aiScore
                      )) *
                      100
                  )}%`
                }) }))), React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, React.createElement("div", { className: "rounded-2xl bg-slate-950 border border-emerald-500/40 p-4 space-y-2" }, React.createElement("div", { className: "flex items-center justify-between border-b border-slate-800 pb-2" }, React.createElement("span", { className: "text-sm font-black text-white" }, (lastRoundResult.playerCard.title), " (Vous)"), React.createElement("span", { className: "text-lg font-black text-emerald-400 font-mono tabular-nums" }, (lastRoundResult.playerScore), " pts")), React.createElement("div", { className: "space-y-1 text-xs" }, (lastRoundResult.playerLines.map((line, i) => (
                  React.createElement("div", { key: (i), className: "flex items-center justify-between" }, React.createElement("span", { className: "text-slate-300" }, (line.label)), React.createElement("span", { className: (`font-mono font-bold tabular-nums ${
                        line.tone === 'positive'
                          ? 'text-emerald-400'
                          : line.tone === 'special'
                          ? 'text-amber-300'
                          : line.tone === 'negative'
                          ? 'text-rose-400'
                          : 'text-slate-200'
                      }`) }, (line.value > 0 && line.tone !== 'neutral'
                        ? `+${line.value}`
                        : line.value)))
                )))), (lastRoundResult.playerNextAllyBonus > 0 && (
                React.createElement("div", { className: "pt-2 border-t border-slate-800 text-[11px] font-bold text-emerald-300" }, "Relais activé : +", (lastRoundResult.playerNextAllyBonus), " pts transmis à votre prochaine carte")
              )), (lastRoundResult.playerDebuffInflicted > 0 && (
                React.createElement("div", { className: "pt-1 text-[11px] font-bold text-amber-300" }, "Attaque infligée : -", (lastRoundResult.playerDebuffInflicted), " pts retirés à l’adversaire")
              ))), React.createElement("div", { className: "rounded-2xl bg-slate-950 border border-rose-500/40 p-4 space-y-2" }, React.createElement("div", { className: "flex items-center justify-between border-b border-slate-800 pb-2" }, React.createElement("span", { className: "text-sm font-black text-white" }, (lastRoundResult.aiCard.title), " (", (selectedOpponent.name), ")"), React.createElement("span", { className: "text-lg font-black text-rose-400 font-mono tabular-nums" }, (lastRoundResult.aiScore), " pts")), React.createElement("div", { className: "space-y-1 text-xs" }, (lastRoundResult.aiLines.map((line, i) => (
                  React.createElement("div", { key: (i), className: "flex items-center justify-between" }, React.createElement("span", { className: "text-slate-300" }, (line.label)), React.createElement("span", { className: (`font-mono font-bold tabular-nums ${
                        line.tone === 'positive'
                          ? 'text-emerald-400'
                          : line.tone === 'special'
                          ? 'text-amber-300'
                          : line.tone === 'negative'
                          ? 'text-rose-400'
                          : 'text-slate-200'
                      }`) }, (line.value > 0 && line.tone !== 'neutral'
                        ? `+${line.value}`
                        : line.value)))
                )))))))
      )))
  );
}


// === FILE: src/App.tsx ===
















const STORAGE_KEY = 'velolegends_tcg_save_v4';
const BIDON_COOLDOWN_SEC = ECONOMY_CONFIG.BIDON_COOLDOWN_SEC;

function createInitialQuestsState()                     {
  return {
    activeQuestIds: [QUEST_POOL[0].id, QUEST_POOL[4].id, QUEST_POOL[6].id],
    progress: {},
    completedQuestIds: []
  };
}

function createInitialSaveState()                  {
  const starterCardIds = [
    'poly-pidcock',
    'route-alaphilippe',
    'route-bordure',
    'route-patin-braquet',
    'vtt-bunnyhop',
    'vtt-dropper',
    'piste-surplace',
    'piste-pignon-fixe',
    'cx-saut-planches',
    'cx-poste-depannage'
  ];

  const initialInventory                           = {};
  for (const id of starterCardIds) {
    initialInventory[id] = 1;
  }
  initialInventory['vtt-bunnyhop'] = 2;
  initialInventory['piste-pignon-fixe'] = 2;

  return {
    watts: ECONOMY_CONFIG.STARTER_WATTS,
    bidons: ECONOMY_CONFIG.STARTER_BIDONS,
    maxBidons: ECONOMY_CONFIG.MAX_PASSIVE_BIDONS,
    lastBidonTimestamp: Date.now(),
    pityEpicCounter: 0,
    pityLegendaryCounter: 0,
    expressQuizStreak: 0,
    soundEnabled: true,
    wikiSyncEnabled: true,
    inventory: initialInventory,
    cardStars: {},
    deck: [
      'poly-pidcock',
      'route-alaphilippe',
      'vtt-bunnyhop',
      'piste-surplace',
      'cx-saut-planches'
    ],
    customCards: [],
    quests: createInitialQuestsState(),
    unlockedAchievements: [],
    redeemedPromoCodes: [],
    stats: {
      boostersOpened: 0,
      godPacksOpened: 0,
      duelsPlayed: 0,
      duelsWon: 0,
      quizAnswered: 0,
      quizCorrect: 0,
      attackQuizSuccess: 0,
      cardsRecycled: 0,
      cardsUpgraded: 0,
      wattsEarnedTotal: ECONOMY_CONFIG.STARTER_WATTS,
      legendariesPulled: 0
    },
    wikiCache: {}
  };
}

const BASE_CARD_ID_SET = new Set(INITIAL_CARDS_DATABASE.map((c) => c.id));
const VALID_QUEST_ID_SET = new Set(QUEST_POOL.map((q) => q.id));
const VALID_ACHIEVEMENT_ID_SET = new Set(ACHIEVEMENT_POOL.map((a) => a.id));
const VALID_PROMO_SET = new Set(Object.keys(PROMO_CODES_CATALOG));
const CARD_COST_BY_ID = new Map(
  INITIAL_CARDS_DATABASE.map((c) => [c.id, c.energyCost])
);

function loadSaveState()                  {
  const fallback = createInitialSaveState();
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('velolegends_tcg_save_v3');
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return sanitizeSaveState(
      parsed,
      fallback,
      BASE_CARD_ID_SET,
      VALID_QUEST_ID_SET,
      VALID_ACHIEVEMENT_ID_SET,
      VALID_PROMO_SET,
      new Map(CARD_COST_BY_ID)
    );
  } catch {
    return fallback;
  }
}

function rollStandardSlotRarity()         {
  const order           = [
    'Commune',
    'Peu commune',
    'Rare',
    'Épique',
    'Légendaire'
  ];
  const totalWeight = order.reduce(
    (sum, r) => sum + RARITY_CONFIG[r].dropWeight,
    0
  );
  let roll = Math.random() * totalWeight;
  for (const r of order) {
    roll -= RARITY_CONFIG[r].dropWeight;
    if (roll <= 0) return r;
  }
  return 'Commune';
}

function rollSlot5Rarity(minRarity        )         {
  const highOrder                                          = [
    'Rare',
    'Épique',
    'Légendaire'
  ];
  const minIdx = Math.max(0, highOrder.indexOf(minRarity       ));
  const eligible = highOrder.slice(minIdx);
  const weightFor = (r        ) =>
    SLOT5_DROP_WEIGHTS.find((w) => w.rarity === r)?.weight || 0;
  const totalWeight = eligible.reduce((sum, r) => sum + weightFor(r), 0);
  let roll = Math.random() * totalWeight;
  for (const r of eligible) {
    roll -= weightFor(r);
    if (roll <= 0) return r;
  }
  return eligible[0];
}

function applyQuestProgressUpdates(
  quests                    ,
  increments                                         
)                     {
  const nextProgress = { ...quests.progress };
  for (const qId of quests.activeQuestIds) {
    const qDef = QUEST_POOL.find((q) => q.id === qId);
    if (!qDef) continue;
    const delta = increments[qDef.metric];
    if (delta && delta > 0) {
      nextProgress[qId] = Math.min(qDef.target, (nextProgress[qId] || 0) + delta);
    }
  }
  return {
    ...quests,
    progress: nextProgress
  };
}

function evaluateUnlockedAchievements(
  state                 ,
  totalCardsCount        
)                                                                                   {
  const newlyUnlockedIds           = [];
  const newlyUnlockedNames           = [];
  let bonusWatts = 0;

  for (const ach of ACHIEVEMENT_POOL) {
    if (state.unlockedAchievements.includes(ach.id)) continue;
    if (ach.check(state, totalCardsCount)) {
      newlyUnlockedIds.push(ach.id);
      newlyUnlockedNames.push(ach.title);
      bonusWatts += ach.rewardWatts;
    }
  }

  if (newlyUnlockedIds.length === 0) {
    return { nextState: state, newlyUnlockedNames: [], bonusWatts: 0 };
  }

  return {
    nextState: {
      ...state,
      watts: state.watts + bonusWatts,
      unlockedAchievements: [...state.unlockedAchievements, ...newlyUnlockedIds],
      stats: {
        ...state.stats,
        wattsEarnedTotal: state.stats.wattsEarnedTotal + bonusWatts
      }
    },
    newlyUnlockedNames,
    bonusWatts
  };
}
function App() {
  const [saveState, setSaveState] = useState                 (() =>
    loadSaveState()
  );
  const [activeTab, setActiveTab] = useState 
                                      
   ('SHOP');
  const [inspectedCard, setInspectedCard] = useState                 (null);
  const [legalModalTab, setLegalModalTab] = useState                     (null);
  const [toastMessage, setToastMessage] = useState               (null);
  const [secondsToNextBidon, setSecondsToNextBidon] =
    useState        (BIDON_COOLDOWN_SEC);

  const wikiCacheRef = useRef(saveState.wikiCache);
  wikiCacheRef.current = saveState.wikiCache;
  const wikiSyncRef = useRef(saveState.wikiSyncEnabled);
  wikiSyncRef.current = saveState.wikiSyncEnabled;
  const saveStateRef = useRef(saveState);
  saveStateRef.current = saveState;

  const packLockUntilRef = useRef        (0);
  const forgeInFlightRef = useRef         (false);
  const pendingExpressQuizIdRef = useRef               (null);
  const lastExpressQuizAnsweredAtRef = useRef        (0);
  const finishedMatchIdsRef = useRef             (new Set());

  const allCards             = useMemo(
    () => [...INITIAL_CARDS_DATABASE, ...saveState.customCards],
    [saveState.customCards]
  );

  useEffect(() => {
    soundFX.setEnabled(saveState.soundEnabled);
  }, [saveState.soundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
    } catch {
      // Ignore quota errors
    }
  }, [saveState]);

  useEffect(() => {
    const syncBidons = () => {
      const now = Date.now();
      setSaveState((prev) => {
        if (prev.bidons >= prev.maxBidons) {
          setSecondsToNextBidon(BIDON_COOLDOWN_SEC);
          if (now - prev.lastBidonTimestamp > 5000) {
            return { ...prev, lastBidonTimestamp: now };
          }
          return prev;
        }
        const elapsedSec = Math.floor((now - prev.lastBidonTimestamp) / 1000);
        // Garde-fou horloge reculée (anti-NaN / anti-exploitation négative)
        if (!Number.isFinite(elapsedSec) || elapsedSec < 0) {
          setSecondsToNextBidon(BIDON_COOLDOWN_SEC);
          return { ...prev, lastBidonTimestamp: now };
        }
        if (elapsedSec >= BIDON_COOLDOWN_SEC) {
          const gained = Math.floor(elapsedSec / BIDON_COOLDOWN_SEC);
          const nextBidons = Math.min(prev.maxBidons, prev.bidons + gained);
          const remainderSec = elapsedSec % BIDON_COOLDOWN_SEC;
          const nextLastTs =
            nextBidons >= prev.maxBidons ? now : now - remainderSec * 1000;
          setSecondsToNextBidon(
            nextBidons >= prev.maxBidons
              ? BIDON_COOLDOWN_SEC
              : Math.max(1, BIDON_COOLDOWN_SEC - remainderSec)
          );
          return {
            ...prev,
            bidons: nextBidons,
            lastBidonTimestamp: nextLastTs
          };
        } else {
          setSecondsToNextBidon(Math.max(1, BIDON_COOLDOWN_SEC - elapsedSec));
          return prev;
        }
      });
    };

    syncBidons();
    const interval = setInterval(syncBidons, 1000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg        ) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3800);
  };

  const triggerOptionalWikiSync = (cardsToSync            ) => {
    if (!wikiSyncRef.current) return;
    cardsToSync.forEach(async (card) => {
      if (!wikiSyncRef.current || !card.wikiSlug) return;
      const slug = card.wikiSlug;
      if (wikiCacheRef.current[slug]) return;
      const summary = await fetchWikiSummary(slug, wikiCacheRef.current);
      if (summary && (summary.thumbnailUrl || summary.extract)) {
        setSaveState((prev) => ({
          ...prev,
          wikiCache: {
            ...prev.wikiCache,
            [slug]: {
              thumbnailUrl: summary.thumbnailUrl,
              extract: summary.extract,
              pageUrl: summary.pageUrl,
              attribution: summary.attribution,
              fetchedAt: Date.now()
            }
          }
        }));
      }
    });
  };

  useEffect(() => {
    const deckCards = saveState.deck
      .map((id) => allCards.find((c) => c.id === id))
      .filter((c)                => Boolean(c));
    triggerOptionalWikiSync(deckCards);
  }, []);

  const handleInspectCard = (card          ) => {
    setInspectedCard(card);
    triggerOptionalWikiSync([card]);
  };

  // Ouverture de Booster avec Table Réaliste + verrou anti-double-clic
  const handleOpenPack = (
    pack             ,
    useBidon         
  )                           => {
    const now = Date.now();
    if (now < packLockUntilRef.current) return null;

    const currentSnap = saveStateRef.current;
    if (useBidon) {
      if (!pack.allowFreeBidon || currentSnap.bidons <= 0) return null;
    } else {
      if (currentSnap.watts < pack.costWatts || pack.costWatts <= 0) return null;
    }

    packLockUntilRef.current = now + 200;

    const eligiblePool =
      pack.targetDiscipline === 'ALL'
        ? allCards
        : allCards.filter(
            (c) =>
              c.discipline === pack.targetDiscipline ||
              c.discipline === 'Polyvalent' ||
              c.linkedDisciplines.includes(
                pack.targetDiscipline                  
              )
          );

    const poolToUse = eligiblePool.length >= 8 ? eligiblePool : allCards;
    const isGodPack = Math.random() < GOD_PACK_CHANCE;
    const drawnSlots                  = [];
    const nextInventory = { ...currentSnap.inventory };
    const pickedInPack = new Set        ();

    const nextEpicStep = currentSnap.pityEpicCounter + 1;
    const nextLegStep = currentSnap.pityLegendaryCounter + 1;
    let triggeredPityLegendary = false;
    let triggeredPityEpic = false;

    for (let i = 0; i < 5; i++) {
      let targetRarity        ;
      if (isGodPack) {
        targetRarity = Math.random() < 0.3 ? 'Légendaire' : 'Épique';
      } else if (i < 4) {
        targetRarity = rollStandardSlotRarity();
      } else {
        const alreadyHasLeg = drawnSlots.some(
          (s) => s.card.rarity === 'Légendaire'
        );
        const alreadyHasEpicPlus = drawnSlots.some(
          (s) =>
            s.card.rarity === 'Épique' || s.card.rarity === 'Légendaire'
        );

        if (!alreadyHasLeg && nextLegStep >= PITY_LEGENDARY_THRESHOLD) {
          targetRarity = 'Légendaire';
          triggeredPityLegendary = true;
        } else if (!alreadyHasEpicPlus && nextEpicStep >= PITY_EPIC_THRESHOLD) {
          targetRarity = Math.random() < 0.15 ? 'Légendaire' : 'Épique';
          triggeredPityEpic = true;
        } else {
          targetRarity = rollSlot5Rarity(pack.guaranteedMinRarity);
        }
      }

      const matchingRarity = poolToUse.filter((c) => c.rarity === targetRarity);
      const uniqueMatches = matchingRarity.filter((c) => !pickedInPack.has(c.id));
      let sourceList =
        uniqueMatches.length > 0
          ? uniqueMatches
          : matchingRarity.length > 0
          ? matchingRarity
          : allCards.filter((c) => c.rarity === targetRarity);
      if (sourceList.length === 0) sourceList = poolToUse;

      const pickedCard =
        sourceList[Math.floor(Math.random() * sourceList.length)];
      pickedInPack.add(pickedCard.id);

      const prevCount = nextInventory[pickedCard.id] || 0;
      const newCount = prevCount + 1;
      nextInventory[pickedCard.id] = newCount;

      drawnSlots.push({
        card: pickedCard,
        isNew: prevCount === 0,
        newCount,
        revealed: false
      });
    }

    const pulledLegendaryCount = drawnSlots.filter(
      (s) => s.card.rarity === 'Légendaire'
    ).length;
    const pulledEpicCount = drawnSlots.filter(
      (s) => s.card.rarity === 'Épique'
    ).length;

    const updatedBase                  = {
      ...currentSnap,
      watts: useBidon
        ? currentSnap.watts
        : Math.max(0, currentSnap.watts - pack.costWatts),
      bidons: useBidon ? Math.max(0, currentSnap.bidons - 1) : currentSnap.bidons,
      lastBidonTimestamp:
        useBidon && currentSnap.bidons >= currentSnap.maxBidons
          ? Date.now()
          : currentSnap.lastBidonTimestamp,
      pityEpicCounter:
        pulledLegendaryCount > 0 || pulledEpicCount > 0
          ? 0
          : currentSnap.pityEpicCounter + 1,
      pityLegendaryCounter:
        pulledLegendaryCount > 0 ? 0 : currentSnap.pityLegendaryCounter + 1,
      inventory: nextInventory,
      quests: applyQuestProgressUpdates(currentSnap.quests, {
        boostersOpened: 1
      }),
      stats: {
        ...currentSnap.stats,
        boostersOpened: currentSnap.stats.boostersOpened + 1,
        godPacksOpened: currentSnap.stats.godPacksOpened + (isGodPack ? 1 : 0),
        legendariesPulled:
          currentSnap.stats.legendariesPulled + pulledLegendaryCount
      }
    };

    const checked = evaluateUnlockedAchievements(updatedBase, allCards.length);
    saveStateRef.current = checked.nextState;
    setSaveState(checked.nextState);

    if (checked.newlyUnlockedNames.length > 0) {
      showToast(
        `Trophée débloqué : ${checked.newlyUnlockedNames[0]} (+${checked.bonusWatts} W)`
      );
    } else if (isGodPack) {
      showToast('GOD PACK ARC-EN-CIEL LÉGENDAIRE DÉBLOQUÉ !');
    }

    triggerOptionalWikiSync(drawnSlots.map((s) => s.card));
    return {
      slots: drawnSlots,
      isGodPack,
      triggeredPityLegendary,
      triggeredPityEpic
    };
  };

  // Fusion / Amélioration Étoile par doublons (vérification atomique)
  const handleUpgradeStar = (cardId        ) => {
    const card = allCards.find((c) => c.id === cardId);
    if (!card) return;

    let toastMsg = '';
    setSaveState((prev) => {
      const currentStar = prev.cardStars[cardId] || 0;
      const nextConfig = STAR_UPGRADE_CONFIG.find(
        (s) => s.targetStar === currentStar + 1
      );
      if (!nextConfig) return prev;

      const count = prev.inventory[cardId] || 0;
      const duplicates = Math.max(0, count - 1);
      if (
        duplicates < nextConfig.duplicatesNeeded ||
        prev.watts < nextConfig.wattsCost
      ) {
        toastMsg = 'Doublons ou Watts insuffisants pour cette évolution.';
        return prev;
      }

      const updatedState                  = {
        ...prev,
        watts: prev.watts - nextConfig.wattsCost,
        inventory: {
          ...prev.inventory,
          [cardId]: count - nextConfig.duplicatesNeeded
        },
        cardStars: {
          ...prev.cardStars,
          [cardId]: nextConfig.targetStar
        },
        quests: applyQuestProgressUpdates(prev.quests, { cardsUpgraded: 1 }),
        stats: {
          ...prev.stats,
          cardsUpgraded: prev.stats.cardsUpgraded + 1
        }
      };
      const checked = evaluateUnlockedAchievements(updatedState, allCards.length);
      saveStateRef.current = checked.nextState;
      toastMsg =
        checked.newlyUnlockedNames.length > 0
          ? `Trophée débloqué : ${checked.newlyUnlockedNames[0]} (+${checked.bonusWatts} W)`
          : `"${card.title}" promue au rang ${nextConfig.label} (+${nextConfig.statBonus} stats) !`;
      return checked.nextState;
    });

    if (toastMsg) showToast(toastMsg);
  };

  // Recyclage strict : doublons uniquement (count > 1) — l'exemplaire principal reste toujours protégé
  const handleRecycleOne = (cardId        ) => {
    const card = allCards.find((c) => c.id === cardId);
    if (!card) return;
    const wattsGain = RECYCLE_WATTS_BY_RARITY[card.rarity];
    if (!Number.isFinite(wattsGain) || wattsGain <= 0) return;

    let recycled = false;
    setSaveState((prev) => {
      const count = prev.inventory[cardId] || 0;
      if (count <= 1) return prev;
      recycled = true;
      const updatedState                  = {
        ...prev,
        watts: prev.watts + wattsGain,
        inventory: {
          ...prev.inventory,
          [cardId]: count - 1
        },
        stats: {
          ...prev.stats,
          cardsRecycled: prev.stats.cardsRecycled + 1,
          wattsEarnedTotal: prev.stats.wattsEarnedTotal + wattsGain
        }
      };
      const checked = evaluateUnlockedAchievements(updatedState, allCards.length);
      saveStateRef.current = checked.nextState;
      return checked.nextState;
    });

    if (recycled) {
      showToast(`Doublon "${card.title}" recyclé : +${wattsGain} Watts !`);
    } else {
      showToast('Impossible de recycler : l’exemplaire principal reste protégé.');
    }
  };

  const handleRecycleAllDuplicates = ()         => {
    let totalWattsGained = 0;
    let totalCardsRecycled = 0;

    setSaveState((prev) => {
      const nextInv = { ...prev.inventory };
      let gained = 0;
      let countRecycled = 0;
      for (const card of allCards) {
        const count = nextInv[card.id] || 0;
        if (count > 1) {
          const extra = count - 1;
          countRecycled += extra;
          gained += extra * RECYCLE_WATTS_BY_RARITY[card.rarity];
          nextInv[card.id] = 1; // Toujours garder 1 exemplaire
        }
      }
      if (countRecycled === 0 || gained <= 0) return prev;
      totalWattsGained = gained;
      totalCardsRecycled = countRecycled;

      const updatedState                  = {
        ...prev,
        watts: prev.watts + gained,
        inventory: nextInv,
        stats: {
          ...prev.stats,
          cardsRecycled: prev.stats.cardsRecycled + countRecycled,
          wattsEarnedTotal: prev.stats.wattsEarnedTotal + gained
        }
      };
      const checked = evaluateUnlockedAchievements(updatedState, allCards.length);
      saveStateRef.current = checked.nextState;
      return checked.nextState;
    });

    if (totalCardsRecycled > 0) {
      showToast(
        `${totalCardsRecycled} doublon(s) recyclé(s) : +${totalWattsGained} Watts !`
      );
    }
    return totalWattsGained;
  };

  const handleToggleCardInDeck = (cardId        ) => {
    const targetCard = allCards.find((c) => c.id === cardId);
    if (!targetCard) return;

    setSaveState((prev) => {
      const exists = prev.deck.includes(cardId);
      if (exists) {
        return {
          ...prev,
          deck: prev.deck.filter((id) => id !== cardId)
        };
      }
      if (prev.deck.length >= 5) {
        showToast(
          'Votre équipe compte déjà 5 titulaires. Retirez une carte d’abord.'
        );
        return prev;
      }
      const currentDeckCards = prev.deck
        .map((id) => allCards.find((c) => c.id === id))
        .filter((c)                => Boolean(c));
      const newCost = getDeckEnergyCost(currentDeckCards) + targetCard.energyCost;
      if (newCost > MAX_DECK_ENERGY) {
        showToast(
          `Budget énergie dépassé (${newCost}/${MAX_DECK_ENERGY} W). Choisissez une carte plus sobre.`
        );
        return prev;
      }
      return {
        ...prev,
        deck: [...prev.deck, cardId]
      };
    });
  };

  const handleAutoBuildBalancedDeck = () => {
    const owned = allCards.filter((c) => (saveState.inventory[c.id] || 0) > 0);
    const chosen = buildBalancedBudgetDeck(owned, saveState.cardStars);
    const cost = getDeckEnergyCost(chosen);

    setSaveState((prev) => ({
      ...prev,
      deck: chosen.map((c) => c.id)
    }));
    showToast(
      `Deck équilibré composé automatiquement (${cost}/${MAX_DECK_ENERGY} W) !`
    );
  };

  const handleForgeCustomCard = async (
    title        ,
    discipline            ,
    category              
  )                           => {
    const forgeCost = ECONOMY_CONFIG.FORGE_CARD_COST;
    if (forgeInFlightRef.current || saveStateRef.current.watts < forgeCost) {
      return null;
    }
    forgeInFlightRef.current = true;
    try {
      const forged = await forgeCustomTcgCard(
        title,
        discipline,
        category,
        allCards.length + 1
      );

      let paid = false;
      setSaveState((prev) => {
        if (prev.watts < forgeCost) return prev;
        paid = true;
        const existing = [...INITIAL_CARDS_DATABASE, ...prev.customCards].find(
          (c) => c.title.toLowerCase() === forged.title.toLowerCase()
        );
        const targetId = existing ? existing.id : forged.id;

        const updatedState                  = {
          ...prev,
          watts: prev.watts - forgeCost,
          customCards: existing
            ? prev.customCards
            : [...prev.customCards, forged],
          inventory: {
            ...prev.inventory,
            [targetId]: (prev.inventory[targetId] || 0) + 1
          }
        };
        const checked = evaluateUnlockedAchievements(
          updatedState,
          allCards.length + (existing ? 0 : 1)
        );
        saveStateRef.current = checked.nextState;
        return checked.nextState;
      });

      return paid ? forged : null;
    } finally {
      forgeInFlightRef.current = false;
    }
  };

  const handleStartExpressQuiz = ()               => {
    const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
    const q = generateCardQuizQuestion(randomCard, allCards);
    pendingExpressQuizIdRef.current = q.id;
    return q;
  };

  const handleCompleteExpressQuiz = (quizId        , correct         ) => {
    if (!quizId || pendingExpressQuizIdRef.current !== quizId) {
      return;
    }
    pendingExpressQuizIdRef.current = null;
    const now = Date.now();
    lastExpressQuizAnsweredAtRef.current = now;

    setSaveState((prev) => {
      const nextStreak = correct ? prev.expressQuizStreak + 1 : 0;
      const streakBonus =
        correct && nextStreak >= 3 ? ECONOMY_CONFIG.EXPRESS_QUIZ_STREAK_BONUS : 0;
      const reward = correct
        ? ECONOMY_CONFIG.EXPRESS_QUIZ_REWARD_CORRECT + streakBonus
        : ECONOMY_CONFIG.EXPRESS_QUIZ_REWARD_WRONG;

      const updatedState                  = {
        ...prev,
        watts: prev.watts + reward,
        expressQuizStreak: nextStreak,
        quests: correct
          ? applyQuestProgressUpdates(prev.quests, { quizCorrect: 1 })
          : prev.quests,
        stats: {
          ...prev.stats,
          quizAnswered: prev.stats.quizAnswered + 1,
          quizCorrect: prev.stats.quizCorrect + (correct ? 1 : 0),
          wattsEarnedTotal: prev.stats.wattsEarnedTotal + reward
        }
      };
      const checked = evaluateUnlockedAchievements(updatedState, allCards.length);
      saveStateRef.current = checked.nextState;
      return checked.nextState;
    });
  };

  const handleRecordDuelQuizAnswer = (
    correct         ,
    mode              ,
    wattsEarned        
  ) => {
    const safeEarned = Number.isFinite(wattsEarned) ? Math.max(0, wattsEarned) : 0;
    const isAttackWin = correct && mode === 'ATTACK';
    setSaveState((prev) => {
      const updatedState                  = {
        ...prev,
        watts: prev.watts + safeEarned,
        quests: correct
          ? applyQuestProgressUpdates(prev.quests, {
              quizCorrect: 1,
              attackQuizSuccess: isAttackWin ? 1 : 0
            })
          : prev.quests,
        stats: {
          ...prev.stats,
          quizAnswered: prev.stats.quizAnswered + 1,
          quizCorrect: prev.stats.quizCorrect + (correct ? 1 : 0),
          attackQuizSuccess:
            prev.stats.attackQuizSuccess + (isAttackWin ? 1 : 0),
          wattsEarnedTotal: prev.stats.wattsEarnedTotal + safeEarned
        }
      };
      const checked = evaluateUnlockedAchievements(updatedState, allCards.length);
      saveStateRef.current = checked.nextState;
      return checked.nextState;
    });
  };

  const handleFinishDuel = (
    matchId        ,
    won         ,
    wattsReward        ,
    deckCards            
  ) => {
    if (!matchId || finishedMatchIdsRef.current.has(matchId)) {
      return;
    }
    finishedMatchIdsRef.current.add(matchId);

    const safeReward = Number.isFinite(wattsReward) ? Math.max(0, wattsReward) : 0;
    const countDisc = (d                ) =>
      deckCards.filter((c) => c.linkedDisciplines.includes(d)).length;

    const questIncrements                                          = won
      ? {
          duelsWon: 1,
          duelsWonVTT: countDisc('VTT') >= 2 ? 1 : 0,
          duelsWonRoute: countDisc('Route') >= 2 ? 1 : 0,
          duelsWonPiste: countDisc('Piste') >= 2 ? 1 : 0,
          duelsWonCX: countDisc('Cyclo-cross') >= 2 ? 1 : 0
        }
      : {};

    let achMsg                = null;
    setSaveState((prev) => {
      const updatedState                  = {
        ...prev,
        watts: prev.watts + safeReward,
        quests: applyQuestProgressUpdates(prev.quests, questIncrements),
        stats: {
          ...prev.stats,
          duelsPlayed: prev.stats.duelsPlayed + 1,
          duelsWon: prev.stats.duelsWon + (won ? 1 : 0),
          wattsEarnedTotal: prev.stats.wattsEarnedTotal + safeReward
        }
      };
      const checked = evaluateUnlockedAchievements(updatedState, allCards.length);
      if (checked.newlyUnlockedNames.length > 0) {
        achMsg = `Trophée débloqué : ${checked.newlyUnlockedNames[0]} (+${checked.bonusWatts} W)`;
      }
      saveStateRef.current = checked.nextState;
      return checked.nextState;
    });

    showToast(
      achMsg ||
        (won
          ? `Victoire en Duel ! +${safeReward} Watts remportés !`
          : `Duel terminé : prime d’arrivée +${safeReward} Watts.`)
    );
  };

  const handleClaimQuestReward = (questId        ) => {
    const qDef = QUEST_POOL.find((q) => q.id === questId);
    if (!qDef) return;

    let claimed = false;
    setSaveState((prev) => {
      if (!prev.quests.activeQuestIds.includes(questId)) return prev;
      const progress = prev.quests.progress[questId] || 0;
      if (progress < qDef.target) return prev;
      claimed = true;

      const remainingPool = QUEST_POOL.filter(
        (q) =>
          q.id !== questId && !prev.quests.activeQuestIds.includes(q.id)
      );
      const nextQuest =
        remainingPool[Math.floor(Math.random() * remainingPool.length)] ||
        QUEST_POOL.find((q) => q.id === questId) ;

      const nextActiveIds = prev.quests.activeQuestIds
        .filter((id) => id !== questId)
        .concat(nextQuest.id);

      const nextProgress = { ...prev.quests.progress };
      delete nextProgress[questId];
      nextProgress[nextQuest.id] = 0;

      const updatedState                  = {
        ...prev,
        watts: prev.watts + qDef.rewardWatts,
        bidons: Math.min(
          prev.maxBidons + 2,
          prev.bidons + (qDef.rewardBidons || 0)
        ),
        quests: {
          activeQuestIds: nextActiveIds,
          progress: nextProgress,
          completedQuestIds: [...prev.quests.completedQuestIds, questId]
        },
        stats: {
          ...prev.stats,
          wattsEarnedTotal: prev.stats.wattsEarnedTotal + qDef.rewardWatts
        }
      };
      const checked = evaluateUnlockedAchievements(updatedState, allCards.length);
      saveStateRef.current = checked.nextState;
      return checked.nextState;
    });

    if (claimed) {
      showToast(
        `Quête "${qDef.title}" validée : +${qDef.rewardWatts} Watts${
          qDef.rewardBidons ? ` + ${qDef.rewardBidons} Bidon` : ''
        } !`
      );
    }
  };

  const handleRedeemPromoCode = (
    rawCode        
  )                                   => {
    const cleanCode = rawCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode) {
      return { ok: false, message: 'Veuillez saisir un code cadeau valide.' };
    }
    const promoDef = PROMO_CODES_CATALOG[cleanCode];
    if (!promoDef) {
      return { ok: false, message: `Code "${cleanCode}" inconnu ou expiré.` };
    }
    if (saveStateRef.current.redeemedPromoCodes.includes(cleanCode)) {
      return {
        ok: false,
        message: `Le code "${cleanCode}" a déjà été utilisé sur votre compte.`
      };
    }

    let redeemed = false;
    setSaveState((prev) => {
      if (prev.redeemedPromoCodes.includes(cleanCode)) return prev;
      redeemed = true;
      const updatedState                  = {
        ...prev,
        watts: prev.watts + promoDef.rewardWatts,
        bidons: Math.min(
          prev.maxBidons + 2,
          prev.bidons + promoDef.rewardBidons
        ),
        redeemedPromoCodes: [...prev.redeemedPromoCodes, cleanCode],
        stats: {
          ...prev.stats,
          wattsEarnedTotal: prev.stats.wattsEarnedTotal + promoDef.rewardWatts
        }
      };
      const checked = evaluateUnlockedAchievements(updatedState, allCards.length);
      saveStateRef.current = checked.nextState;
      return checked.nextState;
    });

    if (!redeemed) {
      return { ok: false, message: `Code "${cleanCode}" déjà utilisé.` };
    }
    const bonusTxt = `+${promoDef.rewardWatts} W${
      promoDef.rewardBidons > 0 ? ` et +${promoDef.rewardBidons} Bidon` : ''
    }`;
    showToast(`Code ${cleanCode} activé : ${bonusTxt} !`);
    return {
      ok: true,
      message: `${promoDef.label} débloqué : ${bonusTxt} crédités !`
    };
  };

  const toggleSound = () => {
    const nextVal = !saveState.soundEnabled;
    soundFX.setEnabled(nextVal);
    if (nextVal) soundFX.playClick();
    setSaveState((prev) => ({
      ...prev,
      soundEnabled: nextVal
    }));
  };

  const unlockedTotal = useMemo(
    () => allCards.filter((c) => (saveState.inventory[c.id] || 0) > 0).length,
    [allCards, saveState.inventory]
  );

  const readyQuestsCount = useMemo(() => {
    return saveState.quests.activeQuestIds.filter((qId) => {
      const qDef = QUEST_POOL.find((q) => q.id === qId);
      return qDef && (saveState.quests.progress[qId] || 0) >= qDef.target;
    }).length;
  }, [saveState.quests]);

  setExternalMediaAllowed(saveState.wikiSyncEnabled);

  return (
    React.createElement("div", { className: "min-h-dvh bg-slate-950 text-slate-100 flex flex-col overflow-x-hidden" }, React.createElement("div", { className: "uci-rainbow-stripe h-1.5 sm:h-2 w-full" }), React.createElement("header", { className: "sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 pt-safe" }, React.createElement("div", { className: "max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-3" }, React.createElement("div", { className: "flex items-center gap-2 sm:gap-3 min-w-0" }, React.createElement("div", { className: "w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl uci-rainbow-badge p-0.5 shadow-lg shrink-0" }, React.createElement("div", { className: "w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400" }, React.createElement(WheelLogoIcon, { className: "w-5 h-5 sm:w-6 sm:h-6" }))), React.createElement("div", { className: "min-w-0" }, React.createElement("div", { className: "flex items-center gap-1.5 sm:gap-2" }, React.createElement("h1", { className: "text-base sm:text-xl font-black tracking-tight text-white truncate" }, "VELOLEGENDS ", React.createElement("span", { className: "text-amber-400" }, "TCG")), React.createElement("span", { className: "hidden sm:inline-block px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-slate-300 border border-slate-700 tabular-nums shrink-0" }, (allCards.length), " CARTES")), React.createElement("p", { className: "hidden sm:block text-[11px] font-mono uppercase tracking-wider text-slate-400" }, "Route • VTT • Piste • Cyclo-cross"))), React.createElement("nav", { className: "hidden md:flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800" }, React.createElement("button", { type: "button", onClick: (() => {
                soundFX.playClick();
                setActiveTab('SHOP');
              }), className: (`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeTab === 'SHOP'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`) }, React.createElement(BoosterPackIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, "Boosters & Quêtes"), ((saveState.bidons > 0 || readyQuestsCount > 0) && (
                React.createElement("span", { className: "px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-mono font-black" }, (saveState.bidons + readyQuestsCount))
              ))), React.createElement("button", { type: "button", onClick: (() => {
                soundFX.playClick();
                setActiveTab('ALBUM');
              }), className: (`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeTab === 'ALBUM'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`) }, React.createElement(BookAlbumIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, "Album (", (unlockedTotal), "/", (allCards.length), ")")), React.createElement("button", { type: "button", onClick: (() => {
                soundFX.playClick();
                setActiveTab('DECK');
              }), className: (`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeTab === 'DECK'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`) }, React.createElement(SquadDeckIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, "Équipe (", (saveState.deck.length), "/5)")), React.createElement("button", { type: "button", onClick: (() => {
                soundFX.playClick();
                setActiveTab('DUEL');
              }), className: (`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeTab === 'DUEL'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`) }, React.createElement(DuelFlagIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, "Mode Duel & Quiz"))), React.createElement("div", { className: "flex items-center gap-1.5 sm:gap-2 shrink-0" }, React.createElement("div", { className: "px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center gap-1 sm:gap-1.5" }, React.createElement(BoltWattIcon, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" }), React.createElement("div", null, React.createElement("div", { className: "hidden sm:block text-[9px] uppercase font-mono font-bold text-amber-300/80 leading-none" }, "Puissance"), React.createElement("div", { className: "text-xs font-black text-amber-400 font-mono tabular-nums" }, (saveState.watts), " W"))), React.createElement("div", { className: "px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-1 sm:gap-1.5" }, React.createElement(BidonIcon, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" }), React.createElement("div", null, React.createElement("div", { className: "hidden sm:block text-[9px] uppercase font-mono font-bold text-emerald-300/80 leading-none" }, "Bidons"), React.createElement("div", { className: "text-xs font-black text-emerald-400 font-mono tabular-nums" }, (saveState.bidons), "/", (saveState.maxBidons)))), React.createElement("div", { className: "hidden sm:flex px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 items-center gap-2 text-xs font-mono tabular-nums" }, React.createElement("span", { className: "inline-flex items-center gap-1 text-amber-300 font-bold" }, React.createElement(TrophyIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, (saveState.stats.duelsWon), "V")), React.createElement("span", { className: "text-slate-600" }, "|"), React.createElement("span", { className: "inline-flex items-center gap-1 text-sky-400 font-bold" }, React.createElement(BrainQuizIcon, { className: "w-3.5 h-3.5" }), React.createElement("span", null, (saveState.stats.quizAnswered > 0
                    ? Math.round(
                        (saveState.stats.quizCorrect /
                          saveState.stats.quizAnswered) *
                          100
                      )
                    : 100), "%"))), React.createElement("button", { type: "button", onClick: (toggleSound), title: (saveState.soundEnabled ? 'Couper les effets sonores' : 'Activer les effets sonores'), className: (`min-h-[40px] min-w-[40px] p-2 rounded-xl border transition flex items-center justify-center active:scale-95 ${
                saveState.soundEnabled
                  ? 'bg-slate-900 border-slate-700 text-cyan-300 hover:border-cyan-400'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`) }, React.createElement(SpeakerIcon, { enabled: (saveState.soundEnabled), className: "w-4 h-4" }))))), React.createElement("main", { className: "flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 md:pb-6" }, (activeTab === 'SHOP' && (
          React.createElement(BoosterShopView, { key: "view-shop", watts: (saveState.watts), bidons: (saveState.bidons), maxBidons: (saveState.maxBidons), secondsToNextBidon: (secondsToNextBidon), pityEpicCounter: (saveState.pityEpicCounter), pityLegendaryCounter: (saveState.pityLegendaryCounter), expressQuizStreak: (saveState.expressQuizStreak), unlockedAchievements: (saveState.unlockedAchievements), playerState: (saveState), totalCardsCount: (allCards.length), inventory: (saveState.inventory), cardStars: (saveState.cardStars), deck: (saveState.deck), wikiCache: (saveState.wikiCache), quests: (saveState.quests), onOpenPack: (handleOpenPack), onSelectCardForDetail: (handleInspectCard), onStartExpressQuiz: (handleStartExpressQuiz), onCompleteExpressQuiz: (handleCompleteExpressQuiz), onClaimQuestReward: (handleClaimQuestReward), onRedeemPromoCode: (handleRedeemPromoCode) })
        )), (activeTab === 'ALBUM' && (
          React.createElement(CollectionAlbumView, { allCards: (allCards), inventory: (saveState.inventory), cardStars: (saveState.cardStars), deck: (saveState.deck), watts: (saveState.watts), wikiCache: (saveState.wikiCache), onSelectCard: (handleInspectCard), onRecycleAllDuplicates: (handleRecycleAllDuplicates), onForgeCustomCard: (handleForgeCustomCard) })
        )), (activeTab === 'DECK' && (
          React.createElement(DeckBuilderView, { allCards: (allCards), inventory: (saveState.inventory), cardStars: (saveState.cardStars), deck: (saveState.deck), wikiCache: (saveState.wikiCache), onToggleCardInDeck: (handleToggleCardInDeck), onAutoBuildBalancedDeck: (handleAutoBuildBalancedDeck), onSelectCardDetail: (handleInspectCard), onGoToDuel: (() => setActiveTab('DUEL')) })
        )), (activeTab === 'DUEL' && (
          React.createElement(DuelArenaView, { allCards: (allCards), deckIds: (saveState.deck), cardStars: (saveState.cardStars), wikiCache: (saveState.wikiCache), onGoToDeckBuilder: (() => setActiveTab('DECK')), onRecordQuizAnswer: (handleRecordDuelQuizAnswer), onFinishDuel: (handleFinishDuel) })
        ))), React.createElement(CardDetailModal, { card: (inspectedCard), count: (inspectedCard ? saveState.inventory[inspectedCard.id] || 0 : 0), starLevel: (
          inspectedCard ? saveState.cardStars[inspectedCard.id] || 0 : 0
        ), watts: (saveState.watts), isInDeck: (
          inspectedCard ? saveState.deck.includes(inspectedCard.id) : false
        ), liveImageUrl: (
          inspectedCard && inspectedCard.wikiSlug
            ? saveState.wikiCache[inspectedCard.wikiSlug]?.thumbnailUrl
            : undefined
        ), liveExtract: (
          inspectedCard && inspectedCard.wikiSlug
            ? saveState.wikiCache[inspectedCard.wikiSlug]?.extract
            : undefined
        ), liveAttribution: (
          inspectedCard && inspectedCard.wikiSlug
            ? saveState.wikiCache[inspectedCard.wikiSlug]?.attribution
            : undefined
        ), onClose: (() => setInspectedCard(null)), onToggleDeck: (handleToggleCardInDeck), onRecycleOne: (handleRecycleOne), onUpgradeStar: (handleUpgradeStar) }), React.createElement(LegalModal, { isOpen: (legalModalTab !== null), initialTab: (legalModalTab || 'MENTIONS'), saveState: (saveState), allCards: (allCards), wikiCache: (saveState.wikiCache), onClose: (() => setLegalModalTab(null)), onToggleWikiSync: ((enabled) =>
          setSaveState((prev) => ({ ...prev, wikiSyncEnabled: enabled }))
        ), onClearWikiCache: (() =>
          setSaveState((prev) => ({ ...prev, wikiCache: {} }))
        ), onImportSaveJson: ((rawJson) => {
          try {
            const parsed = JSON.parse(rawJson);
            const candidate =
              parsed && parsed.app === 'VeloLegends-TCG' && parsed.data
                ? parsed.data
                : parsed;
            if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
              return { ok: false, message: 'Format de sauvegarde JSON invalide.' };
            }
            const clean = sanitizeSaveState(
              candidate,
              createInitialSaveState(),
              BASE_CARD_ID_SET,
              VALID_QUEST_ID_SET,
              VALID_ACHIEVEMENT_ID_SET,
              VALID_PROMO_SET,
              new Map(CARD_COST_BY_ID)
            );
            setSaveState(clean);
            showToast('Sauvegarde importée et validée.');
            return { ok: true, message: 'Sauvegarde importée et vérifiée avec succès.' };
          } catch {
            return { ok: false, message: 'Erreur de lecture JSON : fichier invalide ou corrompu.' };
          }
        }), onEraseAllUserData: (() => {
          try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('velolegends_tcg_save_v3');
          } catch {
            // Ignore storage errors
          }
          setSaveState(createInitialSaveState());
          showToast('Données locales supprimées (RGPD).');
        }) }), React.createElement("footer", { className: "border-t border-slate-900 bg-slate-950 py-5 px-4 pb-24 md:pb-6 text-center text-[11px] text-slate-400" }, React.createElement("div", { className: "max-w-7xl mx-auto space-y-3" }, React.createElement("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-2" }, React.createElement("span", null, React.createElement("strong", null, "VeloLegends TCG"), " • ", (allCards.length), " Cartes Sur Mesure (Route, VTT, Piste, Cyclo-cross) • Illustrations SVG locales & Wikimedia Commons libre"), React.createElement("div", { className: "flex flex-wrap items-center justify-center gap-4 font-mono" }, React.createElement("span", null, "Boosters : ", React.createElement("strong", null, (saveState.stats.boostersOpened))), React.createElement("span", null, "Légendaires : ", React.createElement("strong", null, (saveState.stats.legendariesPulled))), React.createElement("span", null, "God Packs : ", React.createElement("strong", null, (saveState.stats.godPacksOpened))), React.createElement("span", null, "Cartes ★ : ", React.createElement("strong", null, (saveState.stats.cardsUpgraded))))), React.createElement("div", { className: "pt-2 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px]" }, React.createElement("p", { className: "text-slate-500" }, "Jeu de fans indépendant et gratuit, sans aucune affiliation avec les organisateurs, fédérations, constructeurs ou équipes cyclistes."), React.createElement("div", { className: "flex flex-wrap items-center justify-center gap-4" }, React.createElement("button", { type: "button", onClick: (() => setLegalModalTab('MENTIONS')), className: "text-slate-300 hover:text-amber-400 underline" }, "Mentions Légales"), React.createElement("button", { type: "button", onClick: (() => setLegalModalTab('CREDITS')), className: "text-slate-300 hover:text-amber-400 underline" }, "Crédits & Licences"), React.createElement("button", { type: "button", onClick: (() => setLegalModalTab('PRIVACY')), className: "text-slate-300 hover:text-amber-400 underline" }, "Confidentialité / RGPD"), React.createElement("button", { type: "button", onClick: (() => {
                  if (
                    window.confirm(
                      'Voulez-vous réinitialiser votre carrière VeloLegends TCG aux valeurs de départ ?'
                    )
                  ) {
                    const fresh = createInitialSaveState();
                    setSaveState(fresh);
                    showToast('Carrière réinitialisée.');
                  }
                }), className: "text-rose-400/80 hover:text-rose-300 underline" }, "Réinitialiser"))))), (toastMessage && (
        React.createElement("div", { className: "fixed bottom-20 md:bottom-5 left-3 right-3 sm:left-auto sm:right-5 z-50 px-4 sm:px-5 py-3 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs text-center shadow-2xl border-2 border-white animate-fadeIn" }, (toastMessage))
      )), React.createElement("nav", { "aria-label": "Navigation mobile", className: "md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 pb-safe" }, React.createElement("div", { className: "grid grid-cols-4 gap-1 px-1.5 pt-1.5 pb-1" }, React.createElement("button", { type: "button", onClick: (() => {
              soundFX.playClick();
              setActiveTab('SHOP');
            }), className: (`min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-1 px-1 text-[10px] font-black transition active:scale-95 ${
              activeTab === 'SHOP'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300'
            }`) }, React.createElement(BoosterPackIcon, { className: "w-4 h-4" }), React.createElement("span", { className: "truncate max-w-full" }, "Boutique")), React.createElement("button", { type: "button", onClick: (() => {
              soundFX.playClick();
              setActiveTab('ALBUM');
            }), className: (`min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-1 px-1 text-[10px] font-black transition active:scale-95 ${
              activeTab === 'ALBUM'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300'
            }`) }, React.createElement(BookAlbumIcon, { className: "w-4 h-4" }), React.createElement("span", { className: "truncate max-w-full tabular-nums" }, "Album (", (unlockedTotal), ")")), React.createElement("button", { type: "button", onClick: (() => {
              soundFX.playClick();
              setActiveTab('DECK');
            }), className: (`min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-1 px-1 text-[10px] font-black transition active:scale-95 ${
              activeTab === 'DECK'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300'
            }`) }, React.createElement(SquadDeckIcon, { className: "w-4 h-4" }), React.createElement("span", { className: "truncate max-w-full tabular-nums" }, "Équipe (", (saveState.deck.length), "/5)")), React.createElement("button", { type: "button", onClick: (() => {
              soundFX.playClick();
              setActiveTab('DUEL');
            }), className: (`min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-1 px-1 text-[10px] font-black transition active:scale-95 ${
              activeTab === 'DUEL'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300'
            }`) }, React.createElement(DuelFlagIcon, { className: "w-4 h-4" }), React.createElement("span", { className: "truncate max-w-full" }, "Duel & Quiz")))))
  );
}


// === FILE: src/main.tsx ===




const handleEmergencyReset = () => {
  try {
    localStorage.removeItem('velolegends_tcg_save_v4');
    localStorage.removeItem('velolegends_tcg_save_v3');
  } catch {
    // Ignore storage errors
  }
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    React.createElement(ErrorBoundary, { onResetSave: (handleEmergencyReset) }, React.createElement(App, null))
  );
}


})();
