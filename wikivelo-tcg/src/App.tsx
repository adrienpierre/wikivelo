import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  WikiCard,
  BoosterPack,
  PlayerSaveState,
  CoreDiscipline,
  Discipline,
  CardCategory,
  Rarity,
  QuizQuestion,
  QuizRiskMode,
  QuestMetricKey,
  QuestProgressState
} from './types/game';
import {
  INITIAL_CARDS_DATABASE,
  RARITY_CONFIG,
  SLOT5_DROP_WEIGHTS,
  PITY_EPIC_THRESHOLD,
  PITY_LEGENDARY_THRESHOLD,
  GOD_PACK_CHANCE,
  RECYCLE_WATTS_BY_RARITY,
  STAR_UPGRADE_CONFIG,
  MAX_DECK_ENERGY,
  ECONOMY_CONFIG,
  PROMO_CODES_CATALOG,
  QUEST_POOL,
  ACHIEVEMENT_POOL
} from './data/cardsDatabase';
import {
  fetchWikiSummary,
  forgeCustomTcgCard
} from './services/wikiService';
import { soundFX } from './services/soundService';
import {
  buildBalancedBudgetDeck,
  getDeckEnergyCost
} from './utils/cardEffects';
import { sanitizeSaveState } from './utils/saveSecurity';
import { generateCardQuizQuestion } from './utils/quizGenerator';
import {
  BoosterShopView,
  DrawnCardSlot,
  BoosterDrawResult
} from './components/BoosterShopView';
import { CollectionAlbumView } from './components/CollectionAlbumView';
import { DeckBuilderView } from './components/DeckBuilderView';
import { DuelArenaView } from './components/DuelArenaView';
import { CardDetailModal } from './components/CardDetailModal';
import { setExternalMediaAllowed } from './components/CardVisualArt';
import { LegalModal, LegalTabType } from './components/LegalModal';
import {
  WheelLogoIcon,
  BoosterPackIcon,
  BookAlbumIcon,
  SquadDeckIcon,
  DuelFlagIcon,
  BoltWattIcon,
  BidonIcon,
  TrophyIcon,
  BrainQuizIcon,
  SpeakerIcon
} from './components/SportIcons';

const STORAGE_KEY = 'velolegends_tcg_save_v4';
const BIDON_COOLDOWN_SEC = ECONOMY_CONFIG.BIDON_COOLDOWN_SEC;

function createInitialQuestsState(): QuestProgressState {
  return {
    activeQuestIds: [QUEST_POOL[0].id, QUEST_POOL[4].id, QUEST_POOL[6].id],
    progress: {},
    completedQuestIds: []
  };
}

function createInitialSaveState(): PlayerSaveState {
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

  const initialInventory: { [id: string]: number } = {};
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

function loadSaveState(): PlayerSaveState {
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

function rollStandardSlotRarity(): Rarity {
  const order: Rarity[] = [
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

function rollSlot5Rarity(minRarity: Rarity): Rarity {
  const highOrder: Array<'Rare' | 'Épique' | 'Légendaire'> = [
    'Rare',
    'Épique',
    'Légendaire'
  ];
  const minIdx = Math.max(0, highOrder.indexOf(minRarity as any));
  const eligible = highOrder.slice(minIdx);
  const weightFor = (r: Rarity) =>
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
  quests: QuestProgressState,
  increments: Partial<Record<QuestMetricKey, number>>
): QuestProgressState {
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
  state: PlayerSaveState,
  totalCardsCount: number
): { nextState: PlayerSaveState; newlyUnlockedNames: string[]; bonusWatts: number } {
  const newlyUnlockedIds: string[] = [];
  const newlyUnlockedNames: string[] = [];
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

export function App() {
  const [saveState, setSaveState] = useState<PlayerSaveState>(() =>
    loadSaveState()
  );
  const [activeTab, setActiveTab] = useState<
    'SHOP' | 'ALBUM' | 'DECK' | 'DUEL'
  >('SHOP');
  const [inspectedCard, setInspectedCard] = useState<WikiCard | null>(null);
  const [legalModalTab, setLegalModalTab] = useState<LegalTabType | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [secondsToNextBidon, setSecondsToNextBidon] =
    useState<number>(BIDON_COOLDOWN_SEC);

  const wikiCacheRef = useRef(saveState.wikiCache);
  wikiCacheRef.current = saveState.wikiCache;
  const wikiSyncRef = useRef(saveState.wikiSyncEnabled);
  wikiSyncRef.current = saveState.wikiSyncEnabled;
  const saveStateRef = useRef(saveState);
  saveStateRef.current = saveState;

  const packLockUntilRef = useRef<number>(0);
  const forgeInFlightRef = useRef<boolean>(false);
  const pendingExpressQuizIdRef = useRef<string | null>(null);
  const lastExpressQuizAnsweredAtRef = useRef<number>(0);
  const finishedMatchIdsRef = useRef<Set<string>>(new Set());

  const allCards: WikiCard[] = useMemo(
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3800);
  };

  const triggerOptionalWikiSync = (cardsToSync: WikiCard[]) => {
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
      .filter((c): c is WikiCard => Boolean(c));
    triggerOptionalWikiSync(deckCards);
  }, []);

  const handleInspectCard = (card: WikiCard) => {
    setInspectedCard(card);
    triggerOptionalWikiSync([card]);
  };

  // Ouverture de Booster avec Table Réaliste + verrou anti-double-clic
  const handleOpenPack = (
    pack: BoosterPack,
    useBidon: boolean
  ): BoosterDrawResult | null => {
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
                pack.targetDiscipline as CoreDiscipline
              )
          );

    const poolToUse = eligiblePool.length >= 8 ? eligiblePool : allCards;
    const isGodPack = Math.random() < GOD_PACK_CHANCE;
    const drawnSlots: DrawnCardSlot[] = [];
    const nextInventory = { ...currentSnap.inventory };
    const pickedInPack = new Set<string>();

    const nextEpicStep = currentSnap.pityEpicCounter + 1;
    const nextLegStep = currentSnap.pityLegendaryCounter + 1;
    let triggeredPityLegendary = false;
    let triggeredPityEpic = false;

    for (let i = 0; i < 5; i++) {
      let targetRarity: Rarity;
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

    const updatedBase: PlayerSaveState = {
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
  const handleUpgradeStar = (cardId: string) => {
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

      const updatedState: PlayerSaveState = {
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
  const handleRecycleOne = (cardId: string) => {
    const card = allCards.find((c) => c.id === cardId);
    if (!card) return;
    const wattsGain = RECYCLE_WATTS_BY_RARITY[card.rarity];
    if (!Number.isFinite(wattsGain) || wattsGain <= 0) return;

    let recycled = false;
    setSaveState((prev) => {
      const count = prev.inventory[cardId] || 0;
      if (count <= 1) return prev;
      recycled = true;
      const updatedState: PlayerSaveState = {
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

  const handleRecycleAllDuplicates = (): number => {
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

      const updatedState: PlayerSaveState = {
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

  const handleToggleCardInDeck = (cardId: string) => {
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
        .filter((c): c is WikiCard => Boolean(c));
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
    title: string,
    discipline: Discipline,
    category: CardCategory
  ): Promise<WikiCard | null> => {
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

        const updatedState: PlayerSaveState = {
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

  const handleStartExpressQuiz = (): QuizQuestion => {
    const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
    const q = generateCardQuizQuestion(randomCard, allCards);
    pendingExpressQuizIdRef.current = q.id;
    return q;
  };

  const handleCompleteExpressQuiz = (quizId: string, correct: boolean) => {
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

      const updatedState: PlayerSaveState = {
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
    correct: boolean,
    mode: QuizRiskMode,
    wattsEarned: number
  ) => {
    const safeEarned = Number.isFinite(wattsEarned) ? Math.max(0, wattsEarned) : 0;
    const isAttackWin = correct && mode === 'ATTACK';
    setSaveState((prev) => {
      const updatedState: PlayerSaveState = {
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
    matchId: string,
    won: boolean,
    wattsReward: number,
    deckCards: WikiCard[]
  ) => {
    if (!matchId || finishedMatchIdsRef.current.has(matchId)) {
      return;
    }
    finishedMatchIdsRef.current.add(matchId);

    const safeReward = Number.isFinite(wattsReward) ? Math.max(0, wattsReward) : 0;
    const countDisc = (d: CoreDiscipline) =>
      deckCards.filter((c) => c.linkedDisciplines.includes(d)).length;

    const questIncrements: Partial<Record<QuestMetricKey, number>> = won
      ? {
          duelsWon: 1,
          duelsWonVTT: countDisc('VTT') >= 2 ? 1 : 0,
          duelsWonRoute: countDisc('Route') >= 2 ? 1 : 0,
          duelsWonPiste: countDisc('Piste') >= 2 ? 1 : 0,
          duelsWonCX: countDisc('Cyclo-cross') >= 2 ? 1 : 0
        }
      : {};

    let achMsg: string | null = null;
    setSaveState((prev) => {
      const updatedState: PlayerSaveState = {
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

  const handleClaimQuestReward = (questId: string) => {
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
        QUEST_POOL.find((q) => q.id === questId)!;

      const nextActiveIds = prev.quests.activeQuestIds
        .filter((id) => id !== questId)
        .concat(nextQuest.id);

      const nextProgress = { ...prev.quests.progress };
      delete nextProgress[questId];
      nextProgress[nextQuest.id] = 0;

      const updatedState: PlayerSaveState = {
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
    rawCode: string
  ): { ok: boolean; message: string } => {
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
      const updatedState: PlayerSaveState = {
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
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col overflow-x-hidden">
      <div className="uci-rainbow-stripe h-1.5 sm:h-2 w-full" />

      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 pt-safe">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl uci-rainbow-badge p-0.5 shadow-lg shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
                <WheelLogoIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-xl font-black tracking-tight text-white truncate">
                  VELOLEGENDS <span className="text-amber-400">TCG</span>
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-slate-300 border border-slate-700 tabular-nums shrink-0">
                  {allCards.length} CARTES
                </span>
              </div>
              <p className="hidden sm:block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Route • VTT • Piste • Cyclo-cross
              </p>
            </div>
          </div>

          <nav className="hidden md:flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setActiveTab('SHOP');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeTab === 'SHOP'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <BoosterPackIcon className="w-3.5 h-3.5" />
              <span>Boosters & Quêtes</span>
              {(saveState.bidons > 0 || readyQuestsCount > 0) && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-mono font-black">
                  {saveState.bidons + readyQuestsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setActiveTab('ALBUM');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeTab === 'ALBUM'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <BookAlbumIcon className="w-3.5 h-3.5" />
              <span>Album ({unlockedTotal}/{allCards.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setActiveTab('DECK');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeTab === 'DECK'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <SquadDeckIcon className="w-3.5 h-3.5" />
              <span>Équipe ({saveState.deck.length}/5)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setActiveTab('DUEL');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeTab === 'DUEL'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <DuelFlagIcon className="w-3.5 h-3.5" />
              <span>Mode Duel & Quiz</span>
            </button>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center gap-1 sm:gap-1.5">
              <BoltWattIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <div>
                <div className="hidden sm:block text-[9px] uppercase font-mono font-bold text-amber-300/80 leading-none">
                  Puissance
                </div>
                <div className="text-xs font-black text-amber-400 font-mono tabular-nums">
                  {saveState.watts} W
                </div>
              </div>
            </div>

            <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-1 sm:gap-1.5">
              <BidonIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <div>
                <div className="hidden sm:block text-[9px] uppercase font-mono font-bold text-emerald-300/80 leading-none">
                  Bidons
                </div>
                <div className="text-xs font-black text-emerald-400 font-mono tabular-nums">
                  {saveState.bidons}/{saveState.maxBidons}
                </div>
              </div>
            </div>

            <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 items-center gap-2 text-xs font-mono tabular-nums">
              <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                <TrophyIcon className="w-3.5 h-3.5" />
                <span>{saveState.stats.duelsWon}V</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="inline-flex items-center gap-1 text-sky-400 font-bold">
                <BrainQuizIcon className="w-3.5 h-3.5" />
                <span>
                  {saveState.stats.quizAnswered > 0
                    ? Math.round(
                        (saveState.stats.quizCorrect /
                          saveState.stats.quizAnswered) *
                          100
                      )
                    : 100}
                  %
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={toggleSound}
              title={saveState.soundEnabled ? 'Couper les effets sonores' : 'Activer les effets sonores'}
              className={`min-h-[40px] min-w-[40px] p-2 rounded-xl border transition flex items-center justify-center active:scale-95 ${
                saveState.soundEnabled
                  ? 'bg-slate-900 border-slate-700 text-cyan-300 hover:border-cyan-400'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              <SpeakerIcon enabled={saveState.soundEnabled} className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 md:pb-6">
        {activeTab === 'SHOP' && (
          <BoosterShopView
            key="view-shop"
            watts={saveState.watts}
            bidons={saveState.bidons}
            maxBidons={saveState.maxBidons}
            secondsToNextBidon={secondsToNextBidon}
            pityEpicCounter={saveState.pityEpicCounter}
            pityLegendaryCounter={saveState.pityLegendaryCounter}
            expressQuizStreak={saveState.expressQuizStreak}
            unlockedAchievements={saveState.unlockedAchievements}
            playerState={saveState}
            totalCardsCount={allCards.length}
            inventory={saveState.inventory}
            cardStars={saveState.cardStars}
            deck={saveState.deck}
            wikiCache={saveState.wikiCache}
            quests={saveState.quests}
            onOpenPack={handleOpenPack}
            onSelectCardForDetail={handleInspectCard}
            onStartExpressQuiz={handleStartExpressQuiz}
            onCompleteExpressQuiz={handleCompleteExpressQuiz}
            onClaimQuestReward={handleClaimQuestReward}
            onRedeemPromoCode={handleRedeemPromoCode}
          />
        )}

        {activeTab === 'ALBUM' && (
          <CollectionAlbumView
            allCards={allCards}
            inventory={saveState.inventory}
            cardStars={saveState.cardStars}
            deck={saveState.deck}
            watts={saveState.watts}
            wikiCache={saveState.wikiCache}
            onSelectCard={handleInspectCard}
            onRecycleAllDuplicates={handleRecycleAllDuplicates}
            onForgeCustomCard={handleForgeCustomCard}
          />
        )}

        {activeTab === 'DECK' && (
          <DeckBuilderView
            allCards={allCards}
            inventory={saveState.inventory}
            cardStars={saveState.cardStars}
            deck={saveState.deck}
            wikiCache={saveState.wikiCache}
            onToggleCardInDeck={handleToggleCardInDeck}
            onAutoBuildBalancedDeck={handleAutoBuildBalancedDeck}
            onSelectCardDetail={handleInspectCard}
            onGoToDuel={() => setActiveTab('DUEL')}
          />
        )}

        {activeTab === 'DUEL' && (
          <DuelArenaView
            allCards={allCards}
            deckIds={saveState.deck}
            cardStars={saveState.cardStars}
            wikiCache={saveState.wikiCache}
            onGoToDeckBuilder={() => setActiveTab('DECK')}
            onRecordQuizAnswer={handleRecordDuelQuizAnswer}
            onFinishDuel={handleFinishDuel}
          />
        )}
      </main>

      <CardDetailModal
        card={inspectedCard}
        count={inspectedCard ? saveState.inventory[inspectedCard.id] || 0 : 0}
        starLevel={
          inspectedCard ? saveState.cardStars[inspectedCard.id] || 0 : 0
        }
        watts={saveState.watts}
        isInDeck={
          inspectedCard ? saveState.deck.includes(inspectedCard.id) : false
        }
        liveImageUrl={
          inspectedCard && inspectedCard.wikiSlug
            ? saveState.wikiCache[inspectedCard.wikiSlug]?.thumbnailUrl
            : undefined
        }
        liveExtract={
          inspectedCard && inspectedCard.wikiSlug
            ? saveState.wikiCache[inspectedCard.wikiSlug]?.extract
            : undefined
        }
        liveAttribution={
          inspectedCard && inspectedCard.wikiSlug
            ? saveState.wikiCache[inspectedCard.wikiSlug]?.attribution
            : undefined
        }
        onClose={() => setInspectedCard(null)}
        onToggleDeck={handleToggleCardInDeck}
        onRecycleOne={handleRecycleOne}
        onUpgradeStar={handleUpgradeStar}
      />

      <LegalModal
        isOpen={legalModalTab !== null}
        initialTab={legalModalTab || 'MENTIONS'}
        saveState={saveState}
        allCards={allCards}
        wikiCache={saveState.wikiCache}
        onClose={() => setLegalModalTab(null)}
        onToggleWikiSync={(enabled) =>
          setSaveState((prev) => ({ ...prev, wikiSyncEnabled: enabled }))
        }
        onClearWikiCache={() =>
          setSaveState((prev) => ({ ...prev, wikiCache: {} }))
        }
        onImportSaveJson={(rawJson) => {
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
        }}
        onEraseAllUserData={() => {
          try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('velolegends_tcg_save_v3');
          } catch {
            // Ignore storage errors
          }
          setSaveState(createInitialSaveState());
          showToast('Données locales supprimées (RGPD).');
        }}
      />

      <footer className="border-t border-slate-900 bg-slate-950 py-5 px-4 pb-24 md:pb-6 text-center text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              <strong>VeloLegends TCG</strong> • {allCards.length} Cartes Sur Mesure (Route, VTT, Piste, Cyclo-cross) • Illustrations SVG locales &amp; Wikimedia Commons libre
            </span>
            <div className="flex flex-wrap items-center justify-center gap-4 font-mono">
              <span>
                Boosters : <strong>{saveState.stats.boostersOpened}</strong>
              </span>
              <span>
                Légendaires : <strong>{saveState.stats.legendariesPulled}</strong>
              </span>
              <span>
                God Packs : <strong>{saveState.stats.godPacksOpened}</strong>
              </span>
              <span>
                Cartes ★ : <strong>{saveState.stats.cardsUpgraded}</strong>
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px]">
            <p className="text-slate-500">
              Jeu de fans indépendant et gratuit, sans aucune affiliation avec les organisateurs, fédérations, constructeurs ou équipes cyclistes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setLegalModalTab('MENTIONS')}
                className="text-slate-300 hover:text-amber-400 underline"
              >
                Mentions Légales
              </button>
              <button
                type="button"
                onClick={() => setLegalModalTab('CREDITS')}
                className="text-slate-300 hover:text-amber-400 underline"
              >
                Crédits &amp; Licences
              </button>
              <button
                type="button"
                onClick={() => setLegalModalTab('PRIVACY')}
                className="text-slate-300 hover:text-amber-400 underline"
              >
                Confidentialité / RGPD
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Voulez-vous réinitialiser votre carrière VeloLegends TCG aux valeurs de départ ?'
                    )
                  ) {
                    const fresh = createInitialSaveState();
                    setSaveState(fresh);
                    showToast('Carrière réinitialisée.');
                  }
                }}
                className="text-rose-400/80 hover:text-rose-300 underline"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </footer>

      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-5 left-3 right-3 sm:left-auto sm:right-5 z-50 px-4 sm:px-5 py-3 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs text-center shadow-2xl border-2 border-white animate-fadeIn">
          {toastMessage}
        </div>
      )}

      {/* Barre de navigation mobile fixe dans la zone du pouce */}
      <nav
        aria-label="Navigation mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-4 gap-1 px-1.5 pt-1.5 pb-1">
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              setActiveTab('SHOP');
            }}
            className={`min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-1 px-1 text-[10px] font-black transition active:scale-95 ${
              activeTab === 'SHOP'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300'
            }`}
          >
            <BoosterPackIcon className="w-4 h-4" />
            <span className="truncate max-w-full">Boutique</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              setActiveTab('ALBUM');
            }}
            className={`min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-1 px-1 text-[10px] font-black transition active:scale-95 ${
              activeTab === 'ALBUM'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300'
            }`}
          >
            <BookAlbumIcon className="w-4 h-4" />
            <span className="truncate max-w-full tabular-nums">
              Album ({unlockedTotal})
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              setActiveTab('DECK');
            }}
            className={`min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-1 px-1 text-[10px] font-black transition active:scale-95 ${
              activeTab === 'DECK'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300'
            }`}
          >
            <SquadDeckIcon className="w-4 h-4" />
            <span className="truncate max-w-full tabular-nums">
              Équipe ({saveState.deck.length}/5)
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              setActiveTab('DUEL');
            }}
            className={`min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-1 px-1 text-[10px] font-black transition active:scale-95 ${
              activeTab === 'DUEL'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300'
            }`}
          >
            <DuelFlagIcon className="w-4 h-4" />
            <span className="truncate max-w-full">Duel & Quiz</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
