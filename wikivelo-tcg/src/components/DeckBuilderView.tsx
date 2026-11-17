import React, { useState, useMemo } from 'react';
import {
  WikiCard,
  Discipline,
  CoreDiscipline,
  InventoryMap,
  CardStarsMap,
  WikiLiveCacheMap
} from '../types/game';
import {
  DISCIPLINE_CONFIG,
  MAX_DECK_ENERGY
} from '../data/cardsDatabase';
import {
  getEffectiveCardStats,
  getDeckEnergyCost,
  isDeckValid,
  checkAllFourDisciplinesCovered
} from '../utils/cardEffects';
import { soundFX } from '../services/soundService';
import { CyclingCard } from './CyclingCard';
import {
  SquadDeckIcon,
  BoltWattIcon,
  DuelFlagIcon,
  DisciplineIcon,
  ShieldIcon
} from './SportIcons';

interface DeckBuilderViewProps {
  allCards: WikiCard[];
  inventory: InventoryMap;
  cardStars: CardStarsMap;
  deck: string[];
  wikiCache: WikiLiveCacheMap;
  onToggleCardInDeck: (cardId: string) => void;
  onAutoBuildBalancedDeck: () => void;
  onSelectCardDetail: (card: WikiCard) => void;
  onGoToDuel: () => void;
}

export function DeckBuilderView({
  allCards,
  inventory,
  cardStars,
  deck,
  wikiCache,
  onToggleCardInDeck,
  onAutoBuildBalancedDeck,
  onSelectCardDetail,
  onGoToDuel
}: DeckBuilderViewProps) {
  const [filterDisc, setFilterDisc] = useState<Discipline | 'ALL'>('ALL');
  const [filterCost, setFilterCost] = useState<number | 'ALL'>('ALL');

  const deckCards = useMemo(
    () =>
      deck
        .map((id) => allCards.find((c) => c.id === id))
        .filter((c): c is WikiCard => Boolean(c)),
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

  const coreDisciplines: CoreDiscipline[] = [
    'Route',
    'VTT',
    'Piste',
    'Cyclo-cross'
  ];

  const coverageMap = useMemo(() => {
    const result: { [key in CoreDiscipline]: number } = {
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
    <div className="space-y-6">
      {/* Tableau Tactique du Directeur Sportif */}
      <div className="rounded-3xl bg-slate-900 border border-slate-700 p-4 sm:p-5 shadow-xl space-y-5 bg-asphalt-grid">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-mono font-black uppercase tracking-wider">
                <SquadDeckIcon className="w-3.5 h-3.5" />
                <span>BUS DE L’ÉQUIPE • {deckCards.length} / 5 TITULAIRES</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black font-mono border tabular-nums ${
                  totalEnergy > MAX_DECK_ENERGY
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                    : 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                }`}
              >
                <BoltWattIcon className="w-3 h-3" />
                <span>Budget Énergie : {totalEnergy} / {MAX_DECK_ENERGY}</span>
              </span>
              {allFourCovered && deckCards.length === 5 && (
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[11px] font-mono font-extrabold">
                  SYNERGIE 4 DISCIPLINES (+5%)
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight">
              Composition Stratégique du Deck (Plafond {MAX_DECK_ENERGY} W Énergie)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Associez 1 ou 2 leaders (4-5 W) à des équipiers et matériels tactiques (1-3 W) sans dépasser {MAX_DECK_ENERGY} W d’énergie.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onAutoBuildBalancedDeck();
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-600 text-white font-bold text-xs shadow transition"
            >
              Auto-Deck Équilibré (&le; {MAX_DECK_ENERGY} W)
            </button>
            <button
              type="button"
              disabled={!deckCheck.valid}
              onClick={() => {
                soundFX.playClick();
                onGoToDuel();
              }}
              className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl font-black text-xs active:scale-95 transition shadow-lg ${
                deckCheck.valid
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <DuelFlagIcon className="w-4 h-4" />
              <span>Lancer un Duel ({deckCards.length}/5)</span>
            </button>
          </div>
        </div>

        {/* Barre de Budget Énergie */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">
              Jauge de Budget Énergie Peloton ({totalEnergy}/{MAX_DECK_ENERGY} W)
            </span>
            <span
              className={`font-mono font-bold tabular-nums ${
                remainingEnergy >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {remainingEnergy >= 0
                ? `${remainingEnergy} W disponible(s)`
                : `Dépassement de ${Math.abs(remainingEnergy)} W !`}
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                totalEnergy > MAX_DECK_ENERGY
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400'
              }`}
              style={{
                width: `${Math.min(100, (totalEnergy / MAX_DECK_ENERGY) * 100)}%`
              }}
            />
          </div>
        </div>

        {/* Couverture des 4 disciplines + Moyennes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-slate-800">
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {coreDisciplines.map((disc) => {
              const count = coverageMap[disc];
              const dConf = DISCIPLINE_CONFIG[disc];
              const isCovered = count > 0;

              return (
                <div
                  key={disc}
                  className={`rounded-xl p-2.5 border ${
                    isCovered
                      ? `${dConf.bgSoft} ${dConf.borderSoft}`
                      : 'bg-rose-950/30 border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 text-xs font-extrabold ${dConf.color}`}>
                      <DisciplineIcon discipline={disc} className="w-3.5 h-3.5" />
                      <span>{dConf.shortLabel}</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono font-black ${
                        isCovered ? 'text-emerald-300' : 'text-rose-400'
                      }`}
                    >
                      {isCovered ? 'OK' : 'MANQUE'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white mt-1">
                    {isCovered
                      ? `${count} carte${count > 1 ? 's' : ''}`
                      : 'Non couverte'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-5 grid grid-cols-4 gap-2 bg-slate-950 rounded-xl p-2.5 border border-slate-800 text-center">
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">Moy. OVR</div>
              <div className="text-base font-black text-amber-400 font-mono tabular-nums">
                {teamStats.overall}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-amber-300">PUI</div>
              <div className="text-base font-black text-white font-mono tabular-nums">
                {teamStats.power}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-cyan-300">TEC</div>
              <div className="text-base font-black text-white font-mono tabular-nums">
                {teamStats.technique}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-emerald-300">END</div>
              <div className="text-base font-black text-white font-mono tabular-nums">
                {teamStats.endurance}
              </div>
            </div>
          </div>
        </div>

        {/* Les 5 Emplacements Titulaires */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
          {[0, 1, 2, 3, 4].map((slotIdx) => {
            const card = deckCards[slotIdx];
            if (!card) {
              return (
                <div
                  key={`empty-${slotIdx}`}
                  className="h-[280px] sm:h-[310px] rounded-2xl border-2 border-dashed border-amber-500/40 bg-slate-950/60 flex flex-col items-center justify-center p-3 sm:p-4 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-black text-lg mb-2">
                    +{slotIdx + 1}
                  </div>
                  <p className="text-xs font-bold text-slate-300">
                    Titulaire #{slotIdx + 1} disponible
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 mt-1">
                    Budget restant : {Math.max(0, remainingEnergy)} W
                  </p>
                </div>
              );
            }

            const cached = card.wikiSlug ? wikiCache[card.wikiSlug] : undefined;
            return (
              <CyclingCard
                key={card.id}
                card={card}
                liveImageUrl={cached?.thumbnailUrl}
                count={inventory[card.id] || 1}
                starLevel={cardStars[card.id] || 0}
                isInDeck={true}
                compact={true}
                onClick={() => {
                  soundFX.playClick();
                  onSelectCardDetail(card);
                }}
                actionButton={{
                  label: `Retirer (${card.energyCost} W)`,
                  variant: 'danger',
                  onAction: (e: any) => {
                    e.stopPropagation();
                    soundFX.playClick();
                    onToggleCardInDeck(card.id);
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Réserve des cartes débloquées */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <ShieldIcon className="w-4 h-4 text-cyan-400" />
            <span>Effectif Débloqué ({unlockedCards.length} cartes disponibles)</span>
          </h3>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {(
                [
                  'ALL',
                  'Route',
                  'VTT',
                  'Piste',
                  'Cyclo-cross',
                  'Polyvalent'
                ] as Array<Discipline | 'ALL'>
              ).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setFilterDisc(d);
                  }}
                  className={`shrink-0 min-h-[36px] px-3 py-1 rounded-full text-xs font-bold active:scale-95 transition ${
                    filterDisc === d
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {d === 'ALL' ? 'Toutes' : d}
                </button>
              ))}
            </div>

            <select
              value={filterCost === 'ALL' ? 'ALL' : String(filterCost)}
              onChange={(e: any) =>
                setFilterCost(
                  e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                )
              }
              className="min-h-[42px] rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="ALL">Coût : Tous</option>
              <option value="1">1 W (Équipier)</option>
              <option value="2">2 W (Solide)</option>
              <option value="3">3 W (Lieutenant)</option>
              <option value="4">4 W (Leader)</option>
              <option value="5">5 W (Légende)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
          {filteredReserve.map((card) => {
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
              <CyclingCard
                key={card.id}
                card={card}
                liveImageUrl={cached?.thumbnailUrl}
                count={inventory[card.id] || 1}
                starLevel={cardStars[card.id] || 0}
                isInDeck={inDeck}
                compact={true}
                onClick={() => {
                  soundFX.playClick();
                  onSelectCardDetail(card);
                }}
                actionButton={{
                  label: btnLabel,
                  variant: inDeck ? 'danger' : 'amber',
                  disabled: wouldExceed,
                  onAction: (e: any) => {
                    e.stopPropagation();
                    soundFX.playClick();
                    onToggleCardInDeck(card.id);
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
