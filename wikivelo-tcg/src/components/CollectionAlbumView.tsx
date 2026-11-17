import React, { useState, useMemo } from 'react';
import {
  WikiCard,
  Discipline,
  CardCategory,
  Rarity,
  InventoryMap,
  CardStarsMap,
  WikiLiveCacheMap
} from '../types/game';
import {
  RARITY_ORDER,
  RECYCLE_WATTS_BY_RARITY,
  DISCIPLINE_CONFIG,
  STAR_UPGRADE_CONFIG,
  ECONOMY_CONFIG
} from '../data/cardsDatabase';
import { getEffectiveCardStats } from '../utils/cardEffects';
import { soundFX } from '../services/soundService';
import { CyclingCard } from './CyclingCard';
import {
  BookAlbumIcon,
  BoltWattIcon,
  StarIcon,
  ShieldIcon,
  DisciplineIcon
} from './SportIcons';

interface CollectionAlbumViewProps {
  allCards: WikiCard[];
  inventory: InventoryMap;
  cardStars: CardStarsMap;
  deck: string[];
  watts: number;
  wikiCache: WikiLiveCacheMap;
  onSelectCard: (card: WikiCard) => void;
  onRecycleAllDuplicates: () => number;
  onForgeCustomCard: (
    title: string,
    discipline: Discipline,
    category: CardCategory
  ) => Promise<WikiCard | null>;
}

export function CollectionAlbumView({
  allCards,
  inventory,
  cardStars,
  deck,
  watts,
  wikiCache,
  onSelectCard,
  onRecycleAllDuplicates,
  onForgeCustomCard
}: CollectionAlbumViewProps) {
  const [selectedDiscipline, setSelectedDiscipline] = useState<
    Discipline | 'ALL'
  >('ALL');
  const [selectedCategory, setSelectedCategory] = useState<
    CardCategory | 'ALL'
  >('ALL');
  const [selectedRarity, setSelectedRarity] = useState<Rarity | 'ALL'>('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState<
    'ALL' | 'OWNED' | 'MISSING' | 'DUPLICATES' | 'UPGRADABLE'
  >('ALL');
  const [sortBy, setSortBy] = useState<
    'NUMBER' | 'OVR' | 'RARITY' | 'COST_ASC' | 'POWER' | 'TECH' | 'ENDU'
  >('NUMBER');
  const [searchQuery, setSearchQuery] = useState('');

  // Atelier de Forge TCG sur mesure
  const [forgeTitle, setForgeTitle] = useState('');
  const [forgeDiscipline, setForgeDiscipline] = useState<Discipline>('Route');
  const [forgeCategory, setForgeCategory] = useState<CardCategory>(
    'Matériel & Technique'
  );
  const [isForging, setIsForging] = useState(false);
  const [forgeMessage, setForgeMessage] = useState<string | null>(null);

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

  const handleForgeSubmit = async (e: any) => {
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

  const disciplinesList: Array<Discipline | 'ALL'> = [
    'ALL',
    'Route',
    'VTT',
    'Piste',
    'Cyclo-cross',
    'Polyvalent'
  ];

  const categoriesList: Array<CardCategory | 'ALL'> = [
    'ALL',
    'Athlète / Légende',
    'Épreuve / Monument',
    'Terrain / Secteur',
    'Matériel & Technique'
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between bg-asphalt-grid">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <BookAlbumIcon className="w-5 h-5 text-amber-400" />
                <span>Carnet &amp; Album VeloLegends TCG</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Fusionnez vos doublons pour monter vos cartes au rang ★1..★3 Prisme, ou recyclez le surplus en Watts.
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-amber-400 font-mono tabular-nums">
                {unlockedCount} / {allCards.length}
              </span>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Débloquées ({Math.round((unlockedCount / allCards.length) * 100)}%)
              </span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 transition-all duration-500"
              style={{ width: `${(unlockedCount / allCards.length) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(
              [
                'Route',
                'VTT',
                'Piste',
                'Cyclo-cross',
                'Polyvalent'
              ] as Discipline[]
            ).map((disc) => {
              const totalDisc = allCards.filter(
                (c) => c.discipline === disc
              ).length;
              const ownedDisc = allCards.filter(
                (c) => c.discipline === disc && (inventory[c.id] || 0) > 0
              ).length;
              const dConf = DISCIPLINE_CONFIG[disc];

              return (
                <div
                  key={disc}
                  onClick={() => {
                    soundFX.playClick();
                    setSelectedDiscipline(
                      selectedDiscipline === disc ? 'ALL' : disc
                    );
                  }}
                  className={`cursor-pointer rounded-xl px-2.5 py-2 border text-center transition ${
                    selectedDiscipline === disc
                      ? `${dConf.bgSoft} ${dConf.borderSoft}`
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`inline-flex items-center justify-center gap-1 text-[11px] font-bold ${dConf.color}`}>
                    <DisciplineIcon discipline={disc} className="w-3 h-3" />
                    <span>{dConf.shortLabel}</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white tabular-nums mt-0.5">
                    {ownedDisc}/{totalDisc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Atelier Recyclage & Atelier de Forge TCG */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="rounded-2xl bg-slate-900 border border-emerald-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <StarIcon className="w-4 h-4 text-emerald-400" />
                <span>
                  Recyclage & Fusion ({upgradableCount} améliorable{upgradableCount > 1 ? 's' : ''})
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {duplicateSummary.totalDupes > 0
                  ? `${duplicateSummary.totalDupes} doublon(s) disponible(s) (+${duplicateSummary.totalWatts} W). Seuls les doublons sont recyclables : 1 exemplaire reste toujours protégé.`
                  : 'Aucun doublon en surplus — vos exemplaires uniques restent protégés.'}
              </p>
            </div>
            <button
              type="button"
              disabled={duplicateSummary.totalDupes === 0}
              onClick={() => {
                soundFX.playUpgradeStar();
                onRecycleAllDuplicates();
              }}
              className={`w-full sm:w-auto min-h-[42px] shrink-0 px-3.5 py-2 rounded-xl font-black text-xs active:scale-95 transition ${
                duplicateSummary.totalDupes > 0
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Tout Recycler (+{duplicateSummary.totalWatts} W)
            </button>
          </div>

          <form
            onSubmit={handleForgeSubmit}
            className="rounded-2xl bg-slate-900 border border-cyan-500/35 p-4 space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-300">
                <ShieldIcon className="w-3.5 h-3.5" />
                <span>
                  Atelier de Forge TCG ({ECONOMY_CONFIG.FORGE_CARD_COST} W)
                </span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Création Libre + Plans Secrets
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={forgeDiscipline}
                onChange={(e: any) => setForgeDiscipline(e.target.value)}
                className="min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-2 text-xs text-slate-200"
              >
                <option value="Route">Discipline : Route</option>
                <option value="VTT">Discipline : VTT</option>
                <option value="Piste">Discipline : Piste</option>
                <option value="Cyclo-cross">Discipline : Cyclo-cross</option>
                <option value="Polyvalent">Discipline : Polyvalent</option>
              </select>

              <select
                value={forgeCategory}
                onChange={(e: any) => setForgeCategory(e.target.value)}
                className="min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-2 text-xs text-slate-200"
              >
                <option value="Matériel & Technique">Matériel & Technique</option>
                <option value="Terrain / Secteur">Terrain / Secteur</option>
                <option value="Athlète / Légende">Athlète / Légende</option>
                <option value="Épreuve / Monument">Épreuve / Monument</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={forgeTitle}
                onChange={(e: any) => setForgeTitle(e.target.value)}
                placeholder="Nom libre (ou vide pour Plan Secret)..."
                className="flex-1 min-w-0 min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={watts < ECONOMY_CONFIG.FORGE_CARD_COST || isForging}
                className={`min-h-[42px] px-3.5 py-2 rounded-xl font-black text-xs active:scale-95 transition shrink-0 inline-flex items-center justify-center gap-1 ${
                  watts >= ECONOMY_CONFIG.FORGE_CARD_COST && !isForging
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <BoltWattIcon className="w-3 h-3" />
                <span>
                  {isForging
                    ? 'Forge...'
                    : forgeTitle.trim()
                    ? `Forger (${ECONOMY_CONFIG.FORGE_CARD_COST} W)`
                    : `Plan Secret (${ECONOMY_CONFIG.FORGE_CARD_COST} W)`}
                </span>
              </button>
            </div>
            {forgeMessage && (
              <p className="text-[11px] text-emerald-400 font-semibold">
                {forgeMessage}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Barre de Filtres & Recherche */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="shrink-0 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mr-1">
            Discipline :
          </span>
          {disciplinesList.map((disc) => (
            <button
              key={disc}
              type="button"
              onClick={() => {
                soundFX.playClick();
                setSelectedDiscipline(disc);
              }}
              className={`shrink-0 min-h-[36px] px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition ${
                selectedDiscipline === disc
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {disc === 'ALL' ? 'Toutes (4 + Polyvalent)' : disc}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-800">
          <input
            type="text"
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            placeholder="Rechercher coureur, rôle, vélo..."
            className="min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />

          <select
            value={selectedCategory}
            onChange={(e: any) => setSelectedCategory(e.target.value)}
            className="min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-200"
          >
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'Catégorie : Toutes' : cat}
              </option>
            ))}
          </select>

          <select
            value={selectedRarity}
            onChange={(e: any) => setSelectedRarity(e.target.value)}
            className="min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-200"
          >
            <option value="ALL">Rareté : Toutes</option>
            {RARITY_ORDER.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={ownershipFilter}
            onChange={(e: any) => setOwnershipFilter(e.target.value)}
            className="min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-200"
          >
            <option value="ALL">Statut : Toutes ({allCards.length})</option>
            <option value="OWNED">
              Débloquées uniquement ({unlockedCount})
            </option>
            <option value="MISSING">
              Manquantes ({allCards.length - unlockedCount})
            </option>
            <option value="DUPLICATES">Doublons en surplus</option>
            <option value="UPGRADABLE">
              Améliorables en ★ ({upgradableCount})
            </option>
          </select>

          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-200"
          >
            <option value="NUMBER">Tri : Numéro (#001..)</option>
            <option value="OVR">Tri : Note Globale (OVR)</option>
            <option value="COST_ASC">Tri : Coût Énergie (1 → 5 W)</option>
            <option value="RARITY">Tri : Rareté</option>
            <option value="POWER">Tri : Puissance (PUI)</option>
            <option value="TECH">Tri : Technique (TEC)</option>
            <option value="ENDU">Tri : Endurance (END)</option>
          </select>
        </div>
      </div>

      {/* Grille des Cartes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
        {filteredCards.map((card) => {
          const count = inventory[card.id] || 0;
          const starLevel = cardStars[card.id] || 0;
          const cached = card.wikiSlug ? wikiCache[card.wikiSlug] : undefined;
          return (
            <CyclingCard
              key={card.id}
              card={card}
              liveImageUrl={cached?.thumbnailUrl}
              count={count}
              starLevel={starLevel}
              isLocked={count === 0}
              isInDeck={deck.includes(card.id)}
              onClick={() => {
                soundFX.playClick();
                onSelectCard(card);
              }}
            />
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-10 text-center text-slate-400">
          Aucune carte ne correspond à vos filtres actuels.
        </div>
      )}
    </div>
  );
}
