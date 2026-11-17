export type CoreDiscipline = 'Route' | 'VTT' | 'Piste' | 'Cyclo-cross';

export type Discipline = CoreDiscipline | 'Polyvalent';

export type CardCategory =
  | 'Athlète / Légende'
  | 'Épreuve / Monument'
  | 'Terrain / Secteur'
  | 'Matériel & Technique';

export type Rarity =
  | 'Commune'
  | 'Peu commune'
  | 'Rare'
  | 'Épique'
  | 'Légendaire';

export type CardKeyword =
  | 'À la révélation'
  | 'Continu'
  | 'Sprint final'
  | 'Échappée'
  | 'Synergie';

export type CardEffectCode =
  | 'REVEAL_TERRAIN_BOOST'     // +X pts si jouée sur son terrain favori
  | 'REVEAL_NEXT_ALLY'         // +X pts à votre prochaine carte jouée
  | 'REVEAL_DEBUFF_FOE'        // -X pts à la carte adverse de la manche
  | 'REVEAL_PER_DISCIPLINE'    // +X pts par discipline distincte déjà jouée
  | 'ONGOING_DISC_AURA'        // +X pts par carte de la même discipline jouée avant ou maintenant
  | 'ONGOING_WEATHER_SHIELD'   // Annule les malus de terrain & +X pts
  | 'ONGOING_GEAR_SCALING'     // +X pts par carte Matériel & Technique jouée dans le match
  | 'SPRINT_FINAL_SURGE'       // +X pts en Étape 4 ou 5
  | 'BREAKAWAY_EARLY_SURGE'    // +X pts en Étape 1 ou 2
  | 'SYNERGY_MULTI_DISC';      // +X pts si la carte précédente était d'une autre discipline

export interface CardStats {
  power: number;      // Puissance / Explosivité (Sprint, Watts, Attaque)
  technique: number;  // Technique / Pilotage (Agilité, Tactique, Relance)
  endurance: number;  // Endurance / Mental (Fond, Résistance, Montagne)
  overall: number;    // Note globale TCG (OVR)
}

export interface MediaAttribution {
  author: string;
  licenseShortName: string;
  licenseUrl?: string;
  commonsUrl: string;
  sourceTitle?: string;
}

export interface WikiCard {
  id: string;
  cardNumber: number;
  title: string;
  subtitle: string;
  roleTag: string; // Ex: "Grimpeur", "Sprinteur", "Descendeur DH", "Monument", "Matériel"...
  discipline: Discipline;
  linkedDisciplines: CoreDiscipline[];
  category: CardCategory;
  rarity: Rarity;
  energyCost: number; // Coût d'énergie TCG (1 à 5)
  stats: CardStats;
  keyword: CardKeyword;
  effectCode: CardEffectCode;
  effectValue: number;
  effectDescription: string;
  summary: string;
  imageUrl?: string;
  imageAttribution?: MediaAttribution;
  nationality: string;
  countryCode: string;
  keyYear: string;
  keyFact: string;
  specialTrait: string;
  wikiSlug?: string;
  isCustomForged?: boolean;
}

export interface CustomCardSeed {
  id: string;
  title: string;
  subtitle: string;
  roleTag: string;
  discipline: Discipline;
  linkedDisciplines: CoreDiscipline[];
  category: CardCategory;
  rarity: Rarity;
  energyCost?: number;
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
}

export interface BoosterPack {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  costWatts: number;
  allowFreeBidon: boolean;
  targetDiscipline: Discipline | 'ALL';
  accentHex: string;
  ribbonLabel: string;
  guaranteedMinRarity: Rarity;
}

export type TerrainRuleType =
  | 'BOOST_DISCIPLINE'
  | 'PENALIZE_NON_FAVORED'
  | 'DOUBLE_FINAL_ROUND'
  | 'LOW_COST_SHELTER'
  | 'HIGH_COST_PRESTIGE'
  | 'GEAR_TECH_BONUS'
  | 'POWER_OVERDRIVE';

export interface TerrainStage {
  id: string;
  name: string;
  subtitle: string;
  favoredDiscipline: CoreDiscipline;
  description: string;
  weather: string;
  elevation: string;
  statWeights: {
    power: number;
    technique: number;
    endurance: number;
  };
  terrainBonusPct: number;
  modifierTitle: string;
  modifierRule: string;
  modifierType: TerrainRuleType;
  modifierValue: number;
}

export interface QuizQuestion {
  id: string;
  type: 'cloze' | 'fact' | 'technique' | 'matchup';
  questionText: string;
  contextExcerpt?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  relatedCardId: string;
  relatedCardTitle: string;
  relatedDiscipline: Discipline;
}

export type QuizRiskMode = 'SAFE' | 'ATTACK';

export interface AIOpponent {
  id: string;
  name: string;
  title: string;
  difficulty: 'Souple' | 'Tactique' | 'Hors Catégorie';
  codeBadge: string;
  description: string;
  rewardWinWatts: number;
  rewardLossWatts: number;
  minRarityPool: Rarity[];
  maxBudget: number;
  aiQuizAccuracy: number;
}

export type InventoryMap = { [cardId: string]: number };
export type CardStarsMap = { [cardId: string]: number };

export type WikiLiveCacheMap = {
  [wikiSlug: string]: {
    thumbnailUrl?: string;
    extract?: string;
    pageUrl?: string;
    attribution?: MediaAttribution;
    fetchedAt: number;
  };
};

export type QuestMetricKey =
  | 'duelsWon'
  | 'duelsWonVTT'
  | 'duelsWonRoute'
  | 'duelsWonPiste'
  | 'duelsWonCX'
  | 'quizCorrect'
  | 'attackQuizSuccess'
  | 'boostersOpened'
  | 'cardsUpgraded';

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  metric: QuestMetricKey;
  target: number;
  rewardWatts: number;
  rewardBidons?: number;
}

export interface QuestProgressState {
  activeQuestIds: string[];
  progress: { [questId: string]: number };
  completedQuestIds: string[];
}

export interface AchievementDefinition {
  id: string;
  code: string;
  title: string;
  description: string;
  rewardWatts: number;
  check: (state: PlayerSaveState, totalCardsCount: number) => boolean;
}

export interface PlayerStats {
  boostersOpened: number;
  godPacksOpened: number;
  duelsPlayed: number;
  duelsWon: number;
  quizAnswered: number;
  quizCorrect: number;
  attackQuizSuccess: number;
  cardsRecycled: number;
  cardsUpgraded: number;
  wattsEarnedTotal: number;
  legendariesPulled: number;
}

export interface PromoCodeDefinition {
  code: string;
  label: string;
  rewardWatts: number;
  rewardBidons: number;
}

export interface PlayerSaveState {
  watts: number;
  bidons: number;
  maxBidons: number;
  lastBidonTimestamp: number;
  pityEpicCounter: number;
  pityLegendaryCounter: number;
  expressQuizStreak: number;
  soundEnabled: boolean;
  wikiSyncEnabled: boolean;
  inventory: InventoryMap;
  cardStars: CardStarsMap;
  deck: string[];
  customCards: WikiCard[];
  quests: QuestProgressState;
  unlockedAchievements: string[];
  redeemedPromoCodes: string[];
  stats: PlayerStats;
  wikiCache: WikiLiveCacheMap;
}
