import fs from 'node:fs';
import path from 'node:path';
import module from 'node:module';

const ROOT_DIR = path.resolve(import.meta.dirname || '.');

/**
 * Transforme le JSX (<Tag attr={val}>...</Tag> et <>...</>) en appels React.createElement(...)
 * tout en préservant les génériques TypeScript (useState<T>, Array<T>) et les comparaisons (a < b).
 */
function transformJSXToTS(source) {
  let i = 0;
  const len = source.length;

  function isIdentChar(ch) {
    return /[A-Za-z0-9_$]/.test(ch);
  }

  function isTagStartChar(ch) {
    return /[A-Za-z_]/.test(ch);
  }

  function skipWhitespace() {
    while (i < len && /\s/.test(source[i])) i++;
  }

  function readBalancedExpr(stopChar) {
    let out = '';
    let depthBrace = 0;
    let depthParen = 0;
    let depthBracket = 0;

    while (i < len) {
      const ch = source[i];
      if (
        depthBrace === 0 &&
        depthParen === 0 &&
        depthBracket === 0 &&
        ch === stopChar
      ) {
        return out;
      }

      if (ch === "'" || ch === '"' || ch === '`') {
        out += readStringOrTemplate();
        continue;
      }
      if (ch === '/' && source[i + 1] === '/') {
        while (i < len && source[i] !== '\n') {
          out += source[i++];
        }
        continue;
      }
      if (ch === '/' && source[i + 1] === '*') {
        out += source[i++];
        out += source[i++];
        while (i < len && !(source[i] === '*' && source[i + 1] === '/')) {
          out += source[i++];
        }
        if (i < len) {
          out += source[i++];
          out += source[i++];
        }
        continue;
      }

      if (ch === '<' && isJSXAt(i, out)) {
        out += parseJSXElement();
        continue;
      }

      if (ch === '{') depthBrace++;
      else if (ch === '}') depthBrace--;
      else if (ch === '(') depthParen++;
      else if (ch === ')') depthParen--;
      else if (ch === '[') depthBracket++;
      else if (ch === ']') depthBracket--;

      out += source[i++];
    }
    return out;
  }

  function readStringOrTemplate() {
    const quote = source[i++];
    let str = quote;
    while (i < len) {
      const c = source[i++];
      str += c;
      if (c === '\\' && i < len) {
        str += source[i++];
        continue;
      }
      if (quote === '`' && c === '$' && source[i] === '{') {
        str += source[i++];
        str += readBalancedExpr('}');
        if (i < len) str += source[i++];
        continue;
      }
      if (c === quote) break;
    }
    return str;
  }

  function isJSXAt(pos, prevContext) {
    if (source[pos] !== '<') return false;
    const nextCh = source[pos + 1] || '';
    if (!isTagStartChar(nextCh) && nextCh !== '>') return false;

    const trimmedPrev = prevContext.trimEnd();
    if (trimmedPrev.length > 0) {
      const lastChar = trimmedPrev[trimmedPrev.length - 1];
      const rawPrevChar = pos > 0 ? source[pos - 1] : '';
      if (isIdentChar(rawPrevChar)) {
        if (!trimmedPrev.endsWith('return')) {
          return false;
        }
      }
      if (
        isIdentChar(lastChar) &&
        !trimmedPrev.endsWith('return') &&
        !trimmedPrev.endsWith('case')
      ) {
        return false;
      }
      if (lastChar === '>' || lastChar === ']') {
        return false;
      }
    }
    return true;
  }

  function parseJSXElement() {
    i++; // '<'
    if (source[i] === '>') {
      i++; // '>'
      const children = parseJSXChildren('');
      return `React.createElement(React.Fragment, null${
        children.length ? ', ' + children.join(', ') : ''
      })`;
    }

    let tagName = '';
    while (i < len && /[A-Za-z0-9_$.-]/.test(source[i])) {
      tagName += source[i++];
    }

    const isComponent = /^[A-Z]/.test(tagName);
    const tagExpr = isComponent ? tagName : JSON.stringify(tagName);

    const propsEntries = [];
    while (i < len) {
      skipWhitespace();
      if (source[i] === '/' && source[i + 1] === '>') {
        i += 2;
        const propsCode =
          propsEntries.length === 0 ? 'null' : `{ ${propsEntries.join(', ')} }`;
        return `React.createElement(${tagExpr}, ${propsCode})`;
      }
      if (source[i] === '>') {
        i++;
        break;
      }

      if (
        source[i] === '{' &&
        source[i + 1] === '.' &&
        source[i + 2] === '.' &&
        source[i + 3] === '.'
      ) {
        i += 4;
        const spreadExpr = readBalancedExpr('}');
        if (source[i] === '}') i++;
        propsEntries.push(`...(${spreadExpr})`);
        continue;
      }

      let attrName = '';
      while (i < len && /[A-Za-z0-9_:-]/.test(source[i])) {
        attrName += source[i++];
      }
      if (!attrName) {
        i++;
        continue;
      }

      const propKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(attrName)
        ? attrName
        : JSON.stringify(attrName);

      skipWhitespace();
      if (source[i] !== '=') {
        propsEntries.push(`${propKey}: true`);
        continue;
      }
      i++; // '='
      skipWhitespace();

      if (source[i] === "'" || source[i] === '"') {
        const strVal = readStringOrTemplate();
        propsEntries.push(`${propKey}: ${strVal}`);
      } else if (source[i] === '{') {
        i++;
        const exprVal = readBalancedExpr('}');
        if (source[i] === '}') i++;
        propsEntries.push(`${propKey}: (${exprVal})`);
      }
    }

    const children = parseJSXChildren(tagName);
    const propsCode =
      propsEntries.length === 0 ? 'null' : `{ ${propsEntries.join(', ')} }`;
    return `React.createElement(${tagExpr}, ${propsCode}${
      children.length ? ', ' + children.join(', ') : ''
    })`;
  }

  function decodeHtmlEntities(str) {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, '\u00A0');
  }

  function cleanJSXText(rawText) {
    const lines = rawText.split(/\r?\n/);
    if (lines.length === 1) {
      return rawText ? decodeHtmlEntities(rawText) : '';
    }
    const cleanedLines = lines
      .map((line, idx) => {
        let l = line;
        if (idx > 0) l = l.replace(/^\s+/, '');
        if (idx < lines.length - 1) l = l.replace(/\s+$/, '');
        return l;
      })
      .filter((l) => l.length > 0);

    if (cleanedLines.length === 0) return '';
    return decodeHtmlEntities(cleanedLines.join(' '));
  }

  function parseJSXChildren() {
    const children = [];
    let textBuf = '';

    function flushText() {
      const cleaned = cleanJSXText(textBuf);
      textBuf = '';
      if (cleaned.length > 0) {
        children.push(JSON.stringify(cleaned));
      }
    }

    while (i < len) {
      if (source[i] === '<' && source[i + 1] === '/') {
        flushText();
        i += 2;
        while (i < len && source[i] !== '>') i++;
        if (source[i] === '>') i++;
        return children;
      }

      if (
        source[i] === '<' &&
        (isTagStartChar(source[i + 1] || '') || source[i + 1] === '>')
      ) {
        flushText();
        children.push(parseJSXElement());
        continue;
      }

      if (source[i] === '{') {
        flushText();
        i++;
        const expr = readBalancedExpr('}').trim();
        if (source[i] === '}') i++;
        const withoutComments = expr
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .trim();
        if (withoutComments.length > 0) {
          children.push(`(${expr})`);
        }
        continue;
      }

      textBuf += source[i++];
    }

    flushText();
    return children;
  }

  let output = '';
  while (i < len) {
    const ch = source[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      output += readStringOrTemplate();
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      while (i < len && source[i] !== '\n') output += source[i++];
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      output += source[i++];
      output += source[i++];
      while (i < len && !(source[i] === '*' && source[i + 1] === '/')) {
        output += source[i++];
      }
      if (i < len) {
        output += source[i++];
        output += source[i++];
      }
      continue;
    }
    if (ch === '<' && isJSXAt(i, output)) {
      output += parseJSXElement();
      continue;
    }
    output += source[i++];
  }

  return output;
}

function compileFile(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const isTSX = relPath.endsWith('.tsx');
  const tsCode = isTSX ? transformJSXToTS(raw) : raw;

  let jsCode;
  try {
    jsCode = module.stripTypeScriptTypes(tsCode);
  } catch (err) {
    console.error(`Error stripping TS types in ${relPath}:`, err.message);
    fs.writeFileSync(path.join(ROOT_DIR, 'dist', 'debug_failed.ts'), tsCode);
    throw err;
  }

  jsCode = jsCode
    .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+\{[^}]*\};?\s*$/gm, '')
    .replace(/^\s*export\s+(const|let|var|function|async\s+function|class)\s+/gm, '$1 ');

  return `\n// === FILE: ${relPath} ===\n${jsCode}\n`;
}

// Runtime React 18 léger intégré (Hooks isolés par instance de composant)
const REACT_RUNTIME_SHIM = `
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
`;

const FILES_ORDER = [
  'src/types/game.ts',
  'src/utils/saveSecurity.ts',
  'src/data/extraCards.ts',
  'src/data/expansionCards.ts',
  'src/data/verifiedMediaCatalog.ts',
  'src/data/cardsDatabase.ts',
  'src/utils/cardEffects.ts',
  'src/services/wikiService.ts',
  'src/services/soundService.ts',
  'src/utils/quizGenerator.ts',
  'src/components/SportIcons.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/CardVisualArt.tsx',
  'src/components/CyclingCard.tsx',
  'src/components/CardDetailModal.tsx',
  'src/components/LegalModal.tsx',
  'src/components/BoosterShopView.tsx',
  'src/components/CollectionAlbumView.tsx',
  'src/components/DeckBuilderView.tsx',
  'src/components/DuelArenaView.tsx',
  'src/App.tsx',
  'src/main.tsx'
];

// Palette de couleurs Tailwind utilisée dans le projet
const TW_COLORS = {
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  'slate-50': '#f8fafc',
  'slate-100': '#f1f5f9',
  'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1',
  'slate-400': '#94a3b8',
  'slate-500': '#64748b',
  'slate-600': '#475569',
  'slate-700': '#334155',
  'slate-800': '#1e293b',
  'slate-900': '#0f172a',
  'slate-950': '#020617',
  'amber-200': '#fde68a',
  'amber-300': '#fcd34d',
  'amber-400': '#fbbf24',
  'amber-500': '#f59e0b',
  'amber-600': '#d97706',
  'amber-950': '#451a03',
  'yellow-200': '#fef08a',
  'yellow-300': '#fde047',
  'yellow-400': '#facc15',
  'emerald-50': '#ecfdf5',
  'emerald-200': '#a7f3d0',
  'emerald-300': '#6ee7b7',
  'emerald-400': '#34d399',
  'emerald-500': '#10b981',
  'emerald-600': '#059669',
  'emerald-950': '#022c22',
  'green-700': '#15803d',
  'teal-500': '#14b8a6',
  'sky-50': '#f0f9ff',
  'sky-300': '#7dd3fc',
  'sky-400': '#38bdf8',
  'sky-500': '#0ea5e9',
  'sky-600': '#0284c7',
  'blue-700': '#1d4ed8',
  'cyan-200': '#a5f3fc',
  'cyan-300': '#67e8f9',
  'cyan-400': '#22d3ee',
  'cyan-500': '#06b6d4',
  'indigo-200': '#c7d2fe',
  'indigo-300': '#a5b4fc',
  'indigo-400': '#818cf8',
  'indigo-500': '#6366f1',
  'indigo-600': '#4f46e5',
  'indigo-950': '#1e1b4b',
  'fuchsia-300': '#f0abfc',
  'fuchsia-400': '#e879f9',
  'fuchsia-500': '#d946ef',
  'rose-200': '#fecdd3',
  'rose-300': '#fda4af',
  'rose-400': '#fb7185',
  'rose-500': '#f43f5e',
  'rose-600': '#e11d48',
  'rose-950': '#4c0519',
  'red-700': '#b91c1c',
  'orange-400': '#fb923c',
  'orange-500': '#f97316',
  'orange-600': '#ea580c'
};

function hexToRgba(hex, alphaPct) {
  if (!hex || !hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${(alphaPct / 100).toFixed(2)})`;
}

function resolveTwColor(token) {
  const [name, alphaStr] = token.split('/');
  const baseHex = TW_COLORS[name];
  if (!baseHex) return null;
  if (alphaStr !== undefined) {
    return hexToRgba(baseHex, parseFloat(alphaStr));
  }
  return baseHex;
}

function escapeSelector(cls) {
  return cls.replace(/([!:\/.\[\]%#(),])/g, '\\$1');
}

function generateRuleBody(baseClass) {
  // Spacing helpers
  const spacingScale = (v) => `${parseFloat(v) * 0.25}rem`;

  if (baseClass === 'block') return 'display: block;';
  if (baseClass === 'inline') return 'display: inline;';
  if (baseClass === 'inline-block') return 'display: inline-block;';
  if (baseClass === 'inline-flex') return 'display: inline-flex;';
  if (baseClass === 'flex') return 'display: flex;';
  if (baseClass === 'grid') return 'display: grid;';
  if (baseClass === 'hidden') return 'display: none;';
  if (baseClass === 'flex-col') return 'flex-direction: column;';
  if (baseClass === 'flex-row') return 'flex-direction: row;';
  if (baseClass === 'flex-wrap') return 'flex-wrap: wrap;';
  if (baseClass === 'flex-nowrap') return 'flex-wrap: nowrap;';
  if (baseClass === 'flex-1') return 'flex: 1 1 0%;';
  if (baseClass === 'flex-none') return 'flex: none;';
  if (baseClass === 'shrink-0') return 'flex-shrink: 0;';
  if (baseClass === 'items-center') return 'align-items: center;';
  if (baseClass === 'items-start') return 'align-items: flex-start;';
  if (baseClass === 'items-end') return 'align-items: flex-end;';
  if (baseClass === 'items-stretch') return 'align-items: stretch;';
  if (baseClass === 'self-start') return 'align-self: flex-start;';
  if (baseClass === 'justify-center') return 'justify-content: center;';
  if (baseClass === 'justify-end') return 'justify-content: flex-end;';
  if (baseClass === 'justify-between') return 'justify-content: space-between;';
  if (baseClass === 'justify-around') return 'justify-content: space-around;';
  if (baseClass === 'justify-evenly') return 'justify-content: space-evenly;';
  if (baseClass === 'relative') return 'position: relative;';
  if (baseClass === 'absolute') return 'position: absolute;';
  if (baseClass === 'fixed') return 'position: fixed;';
  if (baseClass === 'sticky') return 'position: sticky;';
  if (baseClass === 'inset-0') return 'top: 0; right: 0; bottom: 0; left: 0;';
  if (baseClass === 'top-auto') return 'top: auto;';
  if (baseClass === 'right-auto') return 'right: auto;';
  if (baseClass === 'bottom-auto') return 'bottom: auto;';
  if (baseClass === 'left-auto') return 'left: auto;';
  const edgePosMatch = baseClass.match(/^(top|right|bottom|left)-(\d+(?:\.\d+)?)$/);
  if (edgePosMatch) {
    return `${edgePosMatch[1]}: ${spacingScale(edgePosMatch[2])};`;
  }
  if (baseClass === 'z-10') return 'z-index: 10;';
  if (baseClass === 'z-20') return 'z-index: 20;';
  if (baseClass === 'z-30') return 'z-index: 30;';
  if (baseClass === 'z-40') return 'z-index: 40;';
  if (baseClass === 'z-50') return 'z-index: 50;';
  if (baseClass === 'overflow-hidden') return 'overflow: hidden;';
  if (baseClass === 'overflow-x-hidden') return 'overflow-x: hidden;';
  if (baseClass === 'overflow-x-auto') return 'overflow-x: auto;';
  if (baseClass === 'overflow-y-auto') return 'overflow-y: auto;';
  if (baseClass === 'snap-x') return 'scroll-snap-type: x mandatory;';
  if (baseClass === 'snap-mandatory') return 'scroll-snap-type: x mandatory;';
  if (baseClass === 'snap-center') return 'scroll-snap-align: center;';
  if (baseClass === 'touch-manipulation') return 'touch-action: manipulation;';
  if (baseClass === 'select-none') return 'user-select: none;';
  if (baseClass === 'pointer-events-none') return 'pointer-events: none;';
  if (baseClass === 'cursor-pointer') return 'cursor: pointer;';
  if (baseClass === 'cursor-not-allowed') return 'cursor: not-allowed;';
  if (baseClass === 'min-h-screen') return 'min-height: 100vh;';
  if (baseClass === 'min-h-dvh') return 'min-height: 100vh; min-height: 100dvh;';
  if (baseClass === 'max-h-[92dvh]') return 'max-height: 92vh; max-height: 92dvh;';
  if (baseClass === 'max-h-[90dvh]') return 'max-height: 90vh; max-height: 90dvh;';
  const minHMatch = baseClass.match(/^min-h-\[(\d+)px\]$/);
  if (minHMatch) return `min-height: ${minHMatch[1]}px;`;
  const minWMatch = baseClass.match(/^min-w-\[(\d+)px\]$/);
  if (minWMatch) return `min-width: ${minWMatch[1]}px;`;
  if (baseClass === 'min-h-0') return 'min-height: 0px;';
  if (baseClass === 'min-w-0') return 'min-width: 0px;';
  if (baseClass === 'w-auto') return 'width: auto;';
  if (baseClass === 'w-full') return 'width: 100%;';
  if (baseClass === 'h-full') return 'height: 100%;';
  if (baseClass === 'mx-auto') return 'margin-left: auto; margin-right: auto;';
  if (baseClass === 'my-auto') return 'margin-top: auto; margin-bottom: auto;';
  if (baseClass === 'mt-auto') return 'margin-top: auto;';
  if (baseClass === '-mt-0.5') return 'margin-top: -0.125rem;';
  if (baseClass === 'max-w-7xl') return 'max-width: 80rem;';
  if (baseClass === 'max-w-4xl') return 'max-width: 56rem;';
  if (baseClass === 'max-w-2xl') return 'max-width: 42rem;';
  if (baseClass === 'max-w-lg') return 'max-width: 32rem;';
  if (baseClass === 'max-w-md') return 'max-width: 28rem;';
  if (baseClass === 'max-w-full') return 'max-width: 100%;';
  const maxWMatch = baseClass.match(/^max-w-\[(\d+)px\]$/);
  if (maxWMatch) return `max-width: ${maxWMatch[1]}px;`;
  if (baseClass === 'max-w-[68%]') return 'max-width: 68%;';
  if (baseClass === 'max-w-[64%]') return 'max-width: 64%;';
  if (baseClass === 'max-h-56') return 'max-height: 14rem;';
  if (baseClass === 'list-disc') return 'list-style-type: disc;';
  const hPxMatch = baseClass.match(/^h-\[(\d+)px\]$/);
  if (hPxMatch) return `height: ${hPxMatch[1]}px;`;
  if (baseClass === 'rounded-[14px]') return 'border-radius: 14px;';
  if (baseClass === 'rounded') return 'border-radius: 0.25rem;';
  if (baseClass === 'rounded-md') return 'border-radius: 0.375rem;';
  if (baseClass === 'rounded-lg') return 'border-radius: 0.5rem;';
  if (baseClass === 'rounded-xl') return 'border-radius: 0.75rem;';
  if (baseClass === 'rounded-2xl') return 'border-radius: 1rem;';
  if (baseClass === 'rounded-3xl') return 'border-radius: 1.5rem;';
  if (baseClass === 'rounded-full') return 'border-radius: 9999px;';
  if (baseClass === 'border') return 'border-width: 1px; border-style: solid;';
  if (baseClass === 'border-2') return 'border-width: 2px; border-style: solid;';
  if (baseClass === 'border-t') return 'border-top-width: 1px; border-top-style: solid;';
  if (baseClass === 'border-b') return 'border-bottom-width: 1px; border-bottom-style: solid;';
  if (baseClass === 'border-dashed') return 'border-style: dashed;';
  if (baseClass === 'ring-2') return 'box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.8);';
  if (baseClass === 'ring-amber-400') return 'box-shadow: 0 0 0 2px #fbbf24;';
  if (baseClass === 'truncate') return 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
  if (baseClass === 'break-words') return 'overflow-wrap: anywhere; word-break: break-word;';
  if (baseClass === 'whitespace-nowrap') return 'white-space: nowrap;';
  if (baseClass === 'line-clamp-1') return 'display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;';
  if (baseClass === 'line-clamp-2') return 'display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;';
  if (baseClass === 'italic') return 'font-style: italic;';
  if (baseClass === 'underline') return 'text-decoration: underline;';
  if (baseClass === 'uppercase') return 'text-transform: uppercase;';
  if (baseClass === 'text-left') return 'text-align: left;';
  if (baseClass === 'text-center') return 'text-align: center;';
  if (baseClass === 'text-right') return 'text-align: right;';
  if (baseClass === 'font-sans') return 'font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
  if (baseClass === 'font-mono') return 'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;';
  if (baseClass === 'tabular-nums') return 'font-variant-numeric: tabular-nums;';
  if (baseClass === 'font-medium') return 'font-weight: 500;';
  if (baseClass === 'font-semibold') return 'font-weight: 600;';
  if (baseClass === 'font-bold') return 'font-weight: 700;';
  if (baseClass === 'font-extrabold') return 'font-weight: 800;';
  if (baseClass === 'font-black') return 'font-weight: 900;';
  if (baseClass === 'leading-none') return 'line-height: 1;';
  if (baseClass === 'leading-tight') return 'line-height: 1.25;';
  if (baseClass === 'leading-snug') return 'line-height: 1.375;';
  if (baseClass === 'leading-normal') return 'line-height: 1.5;';
  if (baseClass === 'leading-relaxed') return 'line-height: 1.625;';
  if (baseClass === 'tracking-tight') return 'letter-spacing: -0.025em;';
  if (baseClass === 'tracking-wide') return 'letter-spacing: 0.025em;';
  if (baseClass === 'tracking-wider') return 'letter-spacing: 0.05em;';
  if (baseClass === 'tracking-widest') return 'letter-spacing: 0.12em;';
  if (baseClass === 'object-cover') return 'object-fit: cover;';
  if (baseClass === 'object-top') return 'object-position: top;';
  if (baseClass === 'shadow') return 'box-shadow: 0 4px 6px -1px rgba(0,0,0,0.35);';
  if (baseClass === 'shadow-lg') return 'box-shadow: 0 10px 15px -3px rgba(0,0,0,0.45);';
  if (baseClass === 'shadow-xl') return 'box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);';
  if (baseClass === 'shadow-2xl') return 'box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);';
  if (baseClass === 'shadow-inner') return 'box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.45);';
  if (baseClass === 'drop-shadow') return 'filter: drop-shadow(0 2px 4px rgba(0,0,0,0.7));';
  if (baseClass === 'backdrop-blur-sm') return 'backdrop-filter: blur(4px);';
  if (baseClass === 'backdrop-blur-md') return 'backdrop-filter: blur(12px);';
  if (baseClass === 'mix-blend-screen') return 'mix-blend-mode: screen;';
  if (baseClass === 'transition') return 'transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);';
  if (baseClass === 'transition-all') return 'transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);';
  if (baseClass === 'transition-opacity') return 'transition-property: opacity;';
  if (baseClass === 'duration-150') return 'transition-duration: 150ms;';
  if (baseClass === 'duration-200') return 'transition-duration: 200ms;';
  if (baseClass === 'duration-300') return 'transition-duration: 300ms;';
  if (baseClass === 'duration-500') return 'transition-duration: 500ms;';
  if (baseClass === 'opacity-55') return 'opacity: 0.55;';
  if (baseClass === 'opacity-60') return 'opacity: 0.6;';
  if (baseClass === 'opacity-65') return 'opacity: 0.65;';
  if (baseClass === 'opacity-75') return 'opacity: 0.75;';
  if (baseClass === 'opacity-85') return 'opacity: 0.85;';
  if (baseClass === 'opacity-90') return 'opacity: 0.9;';
  if (baseClass === 'opacity-100') return 'opacity: 1;';
  if (baseClass === 'scale-95') return 'transform: scale(0.95);';
  if (baseClass === 'scale-100') return 'transform: scale(1);';
  if (baseClass === 'scale-[1.02]') return 'transform: scale(1.02);';
  if (baseClass === 'scale-105') return 'transform: scale(1.05);';
  if (baseClass === '-translate-y-2') return 'transform: translateY(-0.5rem);';
  if (baseClass === 'rotate-12') return 'transform: rotate(12deg);';
  if (baseClass === 'outline-none') return 'outline: none;';

  // Font sizes
  const textSizes = {
    'text-[8px]': 'font-size: 8px; line-height: 1.2;',
    'text-[9px]': 'font-size: 9px; line-height: 1.2;',
    'text-[10px]': 'font-size: 10px; line-height: 1.3;',
    'text-[11px]': 'font-size: 11px; line-height: 1.35;',
    'text-xs': 'font-size: 0.75rem; line-height: 1rem;',
    'text-sm': 'font-size: 0.875rem; line-height: 1.25rem;',
    'text-base': 'font-size: 1rem; line-height: 1.5rem;',
    'text-lg': 'font-size: 1.125rem; line-height: 1.75rem;',
    'text-xl': 'font-size: 1.25rem; line-height: 1.75rem;',
    'text-2xl': 'font-size: 1.5rem; line-height: 2rem;',
    'text-3xl': 'font-size: 1.875rem; line-height: 2.25rem;',
    'text-4xl': 'font-size: 2.25rem; line-height: 2.5rem;',
    'text-5xl': 'font-size: 3rem; line-height: 1;'
  };
  if (textSizes[baseClass]) return textSizes[baseClass];

  // Grid columns & spans
  const gridColsMatch = baseClass.match(/^grid-cols-(\d+)$/);
  if (gridColsMatch) {
    return `grid-template-columns: repeat(${gridColsMatch[1]}, minmax(0, 1fr));`;
  }
  const colSpanMatch = baseClass.match(/^col-span-(\d+)$/);
  if (colSpanMatch) {
    return `grid-column: span ${colSpanMatch[1]} / span ${colSpanMatch[1]};`;
  }

  // Gaps
  const gapMatch = baseClass.match(/^gap-(\d+(?:\.\d+)?)$/);
  if (gapMatch) return `gap: ${spacingScale(gapMatch[1])};`;

  // Width & Height numeric
  const wMatch = baseClass.match(/^w-(\d+(?:\.\d+)?)$/);
  if (wMatch) return `width: ${spacingScale(wMatch[1])};`;
  const hMatch = baseClass.match(/^h-(\d+(?:\.\d+)?)$/);
  if (hMatch) return `height: ${spacingScale(hMatch[1])};`;

  // Padding & Margin
  const padMatch = baseClass.match(/^(p|px|py|pt|pb|pl|pr)-(\d+(?:\.\d+)?)$/);
  if (padMatch) {
    const [, dir, val] = padMatch;
    const s = spacingScale(val);
    if (dir === 'p') return `padding: ${s};`;
    if (dir === 'px') return `padding-left: ${s}; padding-right: ${s};`;
    if (dir === 'py') return `padding-top: ${s}; padding-bottom: ${s};`;
    if (dir === 'pt') return `padding-top: ${s};`;
    if (dir === 'pb') return `padding-bottom: ${s};`;
    if (dir === 'pl') return `padding-left: ${s};`;
    if (dir === 'pr') return `padding-right: ${s};`;
  }

  const marMatch = baseClass.match(/^(m|mx|my|mt|mb|ml|mr)-(\d+(?:\.\d+)?)$/);
  if (marMatch) {
    const [, dir, val] = marMatch;
    const s = spacingScale(val);
    if (dir === 'm') return `margin: ${s};`;
    if (dir === 'mx') return `margin-left: ${s}; margin-right: ${s};`;
    if (dir === 'my') return `margin-top: ${s}; margin-bottom: ${s};`;
    if (dir === 'mt') return `margin-top: ${s};`;
    if (dir === 'mb') return `margin-bottom: ${s};`;
    if (dir === 'ml') return `margin-left: ${s};`;
    if (dir === 'mr') return `margin-right: ${s};`;
  }

  // Colors: bg-*, text-*, border-*
  if (baseClass.startsWith('bg-gradient-to-')) {
    const dirMap = {
      r: 'to right',
      l: 'to left',
      t: 'to top',
      b: 'to bottom',
      br: 'to bottom right',
      tr: 'to top right'
    };
    const d = baseClass.replace('bg-gradient-to-', '');
    if (dirMap[d]) {
      return `background-image: linear-gradient(${dirMap[d]}, var(--tw-gradient-stops));`;
    }
  }
  if (baseClass.startsWith('from-')) {
    const c = resolveTwColor(baseClass.slice(5));
    if (c) {
      return `--tw-gradient-from: ${c}; --tw-gradient-to: rgba(15, 23, 42, 0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);`;
    }
  }
  if (baseClass.startsWith('via-')) {
    const c = resolveTwColor(baseClass.slice(4));
    if (c) {
      return `--tw-gradient-stops: var(--tw-gradient-from), ${c}, var(--tw-gradient-to);`;
    }
  }
  if (baseClass.startsWith('to-')) {
    const c = resolveTwColor(baseClass.slice(3));
    if (c) {
      return `--tw-gradient-to: ${c};`;
    }
  }

  if (baseClass.startsWith('bg-')) {
    const c = resolveTwColor(baseClass.slice(3));
    if (c) return `background-color: ${c};`;
  }
  if (baseClass === 'text-') return null;
  if (baseClass.startsWith('placeholder-')) {
    const c = resolveTwColor(baseClass.slice(12));
    if (c) return `color: ${c};`;
  }
  if (baseClass.startsWith('text-')) {
    const c = resolveTwColor(baseClass.slice(5));
    if (c) return `color: ${c};`;
  }
  if (baseClass.startsWith('border-')) {
    const c = resolveTwColor(baseClass.slice(7));
    if (c) return `border-color: ${c};`;
  }

  return null;
}

function buildStylesCSS() {
  const tokenSet = new Set();
  for (const rel of FILES_ORDER) {
    const content = fs.readFileSync(path.join(ROOT_DIR, rel), 'utf-8');
    const matches = content.match(/[A-Za-z0-9_:/\-\[\].%]+/g) || [];
    for (const m of matches) tokenSet.add(m);
  }

  let css = `/* WikiVelo TCG - Compiled Stylesheet */\n
*, *::before, *::after { box-sizing: border-box; border-color: #1e293b; }
html, body {
  margin: 0;
  padding: 0;
  background-color: #020617;
  color: #f1f5f9;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
  overflow-x: hidden;
  touch-action: manipulation;
}
button, input, select, textarea, a {
  font: inherit;
  touch-action: manipulation;
}
@media (max-width: 767px) {
  input, select, textarea { font-size: 16px !important; }
}
.pb-safe { padding-bottom: max(0.5rem, env(safe-area-inset-bottom)); }
.pt-safe { padding-top: env(safe-area-inset-top); }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.no-scrollbar::-webkit-scrollbar { display: none; }

/* Maillot Arc-en-Ciel UCI Officiel */
.uci-rainbow-stripe {
  background: linear-gradient(
    90deg,
    #0055A4 0%, #0055A4 20%,
    #EF4135 20%, #EF4135 40%,
    #111827 40%, #111827 60%,
    #FACC15 60%, #FACC15 80%,
    #16A34A 80%, #16A34A 100%
  );
}
.uci-rainbow-badge {
  background: linear-gradient(90deg, #38bdf8, #fb7185, #facc15, #4ade80);
}
.uci-rainbow-border {
  border-color: #facc15 !important;
  box-shadow: 0 0 0 1px #ec4899, 0 12px 30px -6px rgba(250, 204, 21, 0.55);
}

/* Espacements verticaux space-y-* */
.space-y-1 > * + * { margin-top: 0.25rem; }
.space-y-1\\.5 > * + * { margin-top: 0.375rem; }
.space-y-2 > * + * { margin-top: 0.5rem; }
.space-y-2\\.5 > * + * { margin-top: 0.625rem; }
.space-y-3 > * + * { margin-top: 0.75rem; }
.space-y-4 > * + * { margin-top: 1rem; }
.space-y-5 > * + * { margin-top: 1.25rem; }
.space-y-6 > * + * { margin-top: 1.5rem; }

/* Textures & Foil Broadcast TV */
.bg-asphalt-grid {
  background-image:
    radial-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
    linear-gradient(135deg, rgba(255, 255, 255, 0.02) 25%, transparent 25%);
  background-size: 16px 16px, 32px 32px;
}

.foil-prism-sheen {
  background: linear-gradient(
    115deg,
    transparent 20%,
    rgba(255, 255, 255, 0.14) 38%,
    rgba(56, 189, 248, 0.16) 46%,
    rgba(250, 204, 21, 0.18) 54%,
    transparent 72%
  );
  background-size: 220% 220%;
  animation: foilShimmer 4.5s ease-in-out infinite;
  mix-blend-mode: screen;
}

/* Animations */
@keyframes foilShimmer {
  0%, 100% { background-position: 0% 50%; opacity: 0.55; }
  50% { background-position: 100% 50%; opacity: 0.9; }
}
@keyframes packRip {
  0% { transform: scale(1) rotate(0deg); opacity: 1; filter: brightness(1); }
  40% { transform: scale(1.06) rotate(-2deg); opacity: 1; filter: brightness(1.5); }
  100% { transform: scale(1.2) translateY(-14px); opacity: 0; filter: brightness(2); }
}
@keyframes cardRevealPop {
  0% { opacity: 0; transform: perspective(700px) rotateY(85deg) scale(0.92); }
  65% { opacity: 1; transform: perspective(700px) rotateY(-6deg) scale(1.03); }
  100% { opacity: 1; transform: perspective(700px) rotateY(0deg) scale(1); }
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
@keyframes bounce {
  0%, 100% { transform: translateY(-6%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
  50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1); }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.animate-bounce { animation: bounce 1.1s infinite; }
.animate-fadeIn { animation: fadeIn 240ms ease-out forwards; }
.animate-packRip { animation: packRip 440ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
.card-flip-in { animation: cardRevealPop 380ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
\n`;

  const mediaBuckets = {
    sm: [],
    md: [],
    lg: [],
    xl: []
  };
  const hoverRules = [];

  for (const token of tokenSet) {
    const parts = token.split(':');
    const base = parts[parts.length - 1];
    const prefix = parts.length > 1 ? parts[0] : null;

    const body = generateRuleBody(base);
    if (!body) continue;

    const escaped = escapeSelector(token);
    if (!prefix) {
      css += `.${escaped} { ${body} }\n`;
    } else if (prefix === 'hover') {
      hoverRules.push(`  .${escaped}:hover { ${body} }`);
    } else if (prefix === 'active') {
      css += `.${escaped}:active { ${body} }\n`;
    } else if (prefix === 'focus') {
      css += `.${escaped}:focus { ${body} }\n`;
    } else if (prefix === 'group-hover') {
      hoverRules.push(`  .group:hover .${escaped} { ${body} }`);
    } else if (mediaBuckets[prefix]) {
      mediaBuckets[prefix].push(`  .${escaped} { ${body} }`);
    }
  }

  if (hoverRules.length > 0) {
    css += `@media (hover: hover) and (pointer: fine) {\n${hoverRules.join('\n')}\n}\n`;
  }

  const bpMap = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' };
  for (const [bp, rules] of Object.entries(mediaBuckets)) {
    if (rules.length > 0) {
      css += `@media (min-width: ${bpMap[bp]}) {\n${rules.join('\n')}\n}\n`;
    }
  }
  css += `@media (min-width: 640px) {\n  .sm\\:space-y-5 > * + * { margin-top: 1.25rem; }\n}\n`;

  const outPath = path.join(ROOT_DIR, 'dist', 'styles.css');
  fs.writeFileSync(outPath, css, 'utf-8');
  return outPath;
}

export function buildBundle() {
  const outDir = path.join(ROOT_DIR, 'dist');
  fs.mkdirSync(outDir, { recursive: true });

  let combined = '(function() {\n"use strict";\n' + REACT_RUNTIME_SHIM + '\n';
  for (const rel of FILES_ORDER) {
    combined += compileFile(rel);
  }
  combined += '\n})();\n';

  const outPath = path.join(outDir, 'bundle.js');
  fs.writeFileSync(outPath, combined, 'utf-8');
  buildStylesCSS();
  return outPath;
}

if (
  import.meta.url &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  const out = buildBundle();
  console.log('Successfully built bundle & styles:', out);
}
