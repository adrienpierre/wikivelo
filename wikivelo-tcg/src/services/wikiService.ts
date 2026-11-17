import {
  WikiCard,
  Discipline,
  CoreDiscipline,
  CardCategory,
  Rarity,
  CardKeyword,
  CardEffectCode,
  WikiLiveCacheMap,
  MediaAttribution
} from '../types/game';
import { RARITY_CONFIG } from '../data/cardsDatabase';
import {
  stripHtmlTags,
  sanitizeText,
  sanitizeHttpsUrl,
  isAllowedFreeLicense
} from '../utils/saveSecurity';

export interface WikiSummaryResult {
  thumbnailUrl?: string;
  extract?: string;
  pageUrl?: string;
  attribution?: MediaAttribution;
}

const FAILED_SLUG_BACKOFF = new Map<string, number>();
let lastApiCallMs = 0;

const SECRET_TCG_BLUEPRINTS: Array<{
  title: string;
  subtitle: string;
  discipline: Discipline;
  linkedDisciplines: CoreDiscipline[];
  category: CardCategory;
  rarity: Rarity;
  energyCost: number;
  power: number;
  technique: number;
  endurance: number;
  keyword: CardKeyword;
  effectCode: CardEffectCode;
  effectValue: number;
  effectDescription: string;
  summary: string;
  nationality: string;
  countryCode: string;
  keyYear: string;
  keyFact: string;
  specialTrait: string;
  wikiSlug?: string;
}> = [
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

function extractWikimediaFileName(imageUrl: string): string | null {
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
  fileName: string,
  candidateThumbUrl: string
): Promise<{ safeUrl: string; attribution: MediaAttribution } | null> {
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
    const firstPage = Object.values(pages)[0] as Record<string, any> | undefined;
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

export async function fetchWikiSummary(
  wikiSlug: string | undefined,
  cache: WikiLiveCacheMap
): Promise<WikiSummaryResult | null> {
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

    let thumbnailUrl: string | undefined;
    let attribution: MediaAttribution | undefined;

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

export async function forgeCustomTcgCard(
  inputTitle: string,
  chosenDiscipline: Discipline,
  chosenCategory: CardCategory,
  nextCardNumber: number
): Promise<WikiCard> {
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

  const linkedDisciplines: CoreDiscipline[] =
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

  let rarity: Rarity = 'Rare';
  if (overall >= 91) rarity = 'Légendaire';
  else if (overall >= 86) rarity = 'Épique';
  else if (overall <= 79) rarity = 'Peu commune';

  const energyCost = RARITY_CONFIG[rarity].defaultCost;

  const templates: Array<{
    keyword: CardKeyword;
    effectCode: CardEffectCode;
    effectValue: number;
    effectDescription: string;
  }> = [
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
