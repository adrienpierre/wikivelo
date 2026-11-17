import {
  WikiCard,
  TerrainStage,
  CoreDiscipline,
  QuizRiskMode,
  CardStarsMap
} from '../types/game';
import {
  MAX_DECK_ENERGY,
  STAR_UPGRADE_CONFIG
} from '../data/cardsDatabase';

export interface ScoreBreakdownLine {
  label: string;
  value: number;
  tone: 'neutral' | 'positive' | 'negative' | 'special';
}

export interface SideEvaluationResult {
  finalScore: number;
  baseScore: number;
  terrainBonusPct: number;
  terrainBonusPts: number;
  modifierPts: number;
  keywordEffectPts: number;
  carriedAllyPts: number;
  teamSynergyPts: number;
  energyElanPts: number;
  quizPts: number;
  debuffInflicted: number;
  nextAllyBonusToCarry: number;
  debuffReceived: number;
  lines: ScoreBreakdownLine[];
}

export function getEffectiveCardStats(card: WikiCard, starLevel: number = 0) {
  const starConf = STAR_UPGRADE_CONFIG.find((s) => s.targetStar === starLevel);
  const bonus = starConf ? starConf.statBonus : 0;
  const power = card.stats.power + bonus;
  const technique = card.stats.technique + bonus;
  const endurance = card.stats.endurance + bonus;
  const overall = Math.round((power + technique + endurance) / 3);
  return { power, technique, endurance, overall, starBonus: bonus };
}

export function getDeckEnergyCost(cards: WikiCard[]): number {
  return cards.reduce((sum, c) => sum + c.energyCost, 0);
}

export function isDeckValid(cards: WikiCard[]): {
  valid: boolean;
  totalEnergy: number;
  reason?: string;
} {
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

export function getCardTerrainBonusPct(
  card: WikiCard,
  stage: TerrainStage
): number {
  if (card.discipline === stage.favoredDiscipline) {
    return stage.terrainBonusPct; // +25%
  }
  if (card.linkedDisciplines.includes(stage.favoredDiscipline)) {
    return 20; // +20% pour Polyvalent / bi-discipline compatible
  }
  return 0;
}

export function checkAllFourDisciplinesCovered(cards: WikiCard[]): boolean {
  const core: CoreDiscipline[] = ['Route', 'VTT', 'Piste', 'Cyclo-cross'];
  return core.every((d) =>
    cards.some((c) => c.linkedDisciplines.includes(d))
  );
}

export function buildBalancedBudgetDeck(
  ownedCards: WikiCard[],
  cardStars: CardStarsMap = {}
): WikiCard[] {
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

  const chosen: WikiCard[] = [];
  let currentCost = 0;
  const coreDisciplines: CoreDiscipline[] = [
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

export function buildAIDeckWithinBudget(
  pool: WikiCard[],
  allCards: WikiCard[],
  maxBudget: number
): WikiCard[] {
  const source = pool.length >= 8 ? pool : allCards;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const chosen: WikiCard[] = [];
  let cost = 0;

  // Tenter d'inclure 1 carte de chaque discipline
  const discs: CoreDiscipline[] = ['Route', 'VTT', 'Piste', 'Cyclo-cross'];
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

export function evaluateStageSide(params: {
  card: WikiCard;
  starLevel: number;
  stage: TerrainStage;
  roundNumber: number; // 1..5
  playedBefore: WikiCard[];
  carriedAllyBonus: number;
  hasFullTeamSynergy: boolean;
  energyAvailable: number;
  quizMode: QuizRiskMode;
  quizSuccess: boolean;
  skipQuiz?: boolean;
}): Omit<SideEvaluationResult, 'debuffReceived' | 'finalScore'> & {
  rawScoreBeforeDebuff: number;
} {
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
            c.linkedDisciplines.includes(card.discipline as CoreDiscipline))
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

  const lines: ScoreBreakdownLine[] = [
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
