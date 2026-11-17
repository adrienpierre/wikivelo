import {
  PlayerSaveState,
  WikiCard,
  CoreDiscipline,
  Discipline,
  CardCategory,
  Rarity,
  CardKeyword,
  CardEffectCode,
  MediaAttribution,
  WikiLiveCacheMap
} from '../types/game';

const VALID_CORE_DISCIPLINES: CoreDiscipline[] = [
  'Route',
  'VTT',
  'Piste',
  'Cyclo-cross'
];
const VALID_DISCIPLINES: Discipline[] = [...VALID_CORE_DISCIPLINES, 'Polyvalent'];
const VALID_CATEGORIES: CardCategory[] = [
  'Athlète / Légende',
  'Épreuve / Monument',
  'Terrain / Secteur',
  'Matériel & Technique'
];
const VALID_RARITIES: Rarity[] = [
  'Commune',
  'Peu commune',
  'Rare',
  'Épique',
  'Légendaire'
];
const VALID_KEYWORDS: CardKeyword[] = [
  'À la révélation',
  'Continu',
  'Sprint final',
  'Échappée',
  'Synergie'
];
const VALID_EFFECT_CODES: CardEffectCode[] = [
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

export function stripHtmlTags(raw: string): string {
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

export function sanitizeText(val: unknown, maxLen = 160, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  const cleaned = val
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.slice(0, maxLen) : fallback;
}

export function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

export function sanitizeHttpsUrl(
  raw: unknown,
  allowedHostSuffixes: string[]
): string | undefined {
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

export function isAllowedFreeLicense(licenseShortName: string): boolean {
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

export function sanitizeAttribution(raw: unknown): MediaAttribution | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
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

function sanitizeCustomCard(raw: unknown): WikiCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const id = sanitizeText(obj.id, 64);
  const title = sanitizeText(obj.title, 80);
  if (!id || !title || id === '__proto__' || id === 'constructor') return null;

  const discipline = VALID_DISCIPLINES.includes(obj.discipline as Discipline)
    ? (obj.discipline as Discipline)
    : 'Route';
  const rawLinked = Array.isArray(obj.linkedDisciplines)
    ? obj.linkedDisciplines.filter((d): d is CoreDiscipline =>
        VALID_CORE_DISCIPLINES.includes(d as CoreDiscipline)
      )
    : [];
  const linkedDisciplines: CoreDiscipline[] =
    rawLinked.length > 0
      ? rawLinked
      : discipline === 'Polyvalent'
      ? ['Route', 'VTT', 'Piste', 'Cyclo-cross']
      : [discipline as CoreDiscipline];

  const category = VALID_CATEGORIES.includes(obj.category as CardCategory)
    ? (obj.category as CardCategory)
    : 'Matériel & Technique';
  const rarity = VALID_RARITIES.includes(obj.rarity as Rarity)
    ? (obj.rarity as Rarity)
    : 'Rare';
  const keyword = VALID_KEYWORDS.includes(obj.keyword as CardKeyword)
    ? (obj.keyword as CardKeyword)
    : 'À la révélation';
  const effectCode = VALID_EFFECT_CODES.includes(
    obj.effectCode as CardEffectCode
  )
    ? (obj.effectCode as CardEffectCode)
    : 'REVEAL_TERRAIN_BOOST';

  const rawStats =
    obj.stats && typeof obj.stats === 'object'
      ? (obj.stats as Record<string, unknown>)
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

export function sanitizeSaveState(
  raw: unknown,
  fallback: PlayerSaveState,
  baseCardIds: Set<string>,
  validQuestIds: Set<string>,
  validAchievementIds: Set<string>,
  validPromoCodes: Set<string> = new Set(),
  cardCostById: Map<string, number> = new Map()
): PlayerSaveState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return fallback;
  }
  const parsed = raw as Record<string, unknown>;

  // Custom cards sanitisation
  const rawCustom = Array.isArray(parsed.customCards)
    ? parsed.customCards.slice(0, 40)
    : [];
  const customCards: WikiCard[] = [];
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
  const inventory: { [id: string]: number } = {};
  if (parsed.inventory && typeof parsed.inventory === 'object' && !Array.isArray(parsed.inventory)) {
    for (const [k, v] of Object.entries(parsed.inventory as Record<string, unknown>)) {
      if (Object.prototype.hasOwnProperty.call(parsed.inventory, k) && allValidIds.has(k)) {
        const count = clampInt(v, 0, 999, 0);
        if (count > 0) inventory[k] = count;
      }
    }
  }
  const hasAnyOwned = Object.keys(inventory).length > 0;
  const safeInventory = hasAnyOwned ? inventory : fallback.inventory;

  // Card stars sanitisation
  const cardStars: { [id: string]: number } = {};
  if (parsed.cardStars && typeof parsed.cardStars === 'object' && !Array.isArray(parsed.cardStars)) {
    for (const [k, v] of Object.entries(parsed.cardStars as Record<string, unknown>)) {
      if (allValidIds.has(k)) {
        const st = clampInt(v, 0, 3, 0);
        if (st > 0) cardStars[k] = st;
      }
    }
  }

  // Deck sanitisation (owned cards only, unique, <= 5 cards, <= 16 W budget)
  const rawDeck = Array.isArray(parsed.deck) ? parsed.deck : [];
  const cleanDeck: string[] = [];
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
      ? (parsed.quests as Record<string, unknown>)
      : {};
  const activeQuestIds = Array.isArray(rawQuests.activeQuestIds)
    ? rawQuests.activeQuestIds
        .filter((id): id is string => typeof id === 'string' && validQuestIds.has(id))
        .slice(0, 3)
    : [];
  const questProgress: { [id: string]: number } = {};
  if (rawQuests.progress && typeof rawQuests.progress === 'object') {
    for (const [k, v] of Object.entries(rawQuests.progress as Record<string, unknown>)) {
      if (validQuestIds.has(k)) {
        questProgress[k] = clampInt(v, 0, 1000, 0);
      }
    }
  }
  const completedQuestIds = Array.isArray(rawQuests.completedQuestIds)
    ? rawQuests.completedQuestIds
        .filter((id): id is string => typeof id === 'string' && validQuestIds.has(id))
        .slice(0, 100)
    : [];

  // Wiki cache sanitisation (strictly verified Wikimedia Commons only)
  const wikiCache: WikiLiveCacheMap = {};
  if (parsed.wikiCache && typeof parsed.wikiCache === 'object' && !Array.isArray(parsed.wikiCache)) {
    let entries = 0;
    for (const [slug, entry] of Object.entries(parsed.wikiCache as Record<string, unknown>)) {
      if (entries >= 120) break;
      const cleanSlug = sanitizeText(slug, 100);
      if (!cleanSlug || !entry || typeof entry !== 'object') continue;
      const eObj = entry as Record<string, unknown>;
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
      ? (parsed.stats as Record<string, unknown>)
      : {};

  const now = Date.now();
  const maxBidons = clampInt(parsed.maxBidons, 1, 3, fallback.maxBidons);

  const redeemedPromoCodes: string[] = [];
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
            (id): id is string =>
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

export function createBackupExportJson(state: PlayerSaveState): string {
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
