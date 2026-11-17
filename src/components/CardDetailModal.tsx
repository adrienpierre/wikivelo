import React from 'react';
import { WikiCard, MediaAttribution } from '../types/game';
import {
  RARITY_CONFIG,
  DISCIPLINE_CONFIG,
  RECYCLE_WATTS_BY_RARITY,
  STAR_UPGRADE_CONFIG
} from '../data/cardsDatabase';
import { getEffectiveCardStats } from '../utils/cardEffects';
import { soundFX } from '../services/soundService';
import { CyclingCard } from './CyclingCard';
import { getExternalMediaAllowed } from './CardVisualArt';
import { BoltWattIcon, StarIcon, DisciplineIcon } from './SportIcons';

interface CardDetailModalProps {
  card: WikiCard | null;
  count: number;
  starLevel: number;
  watts: number;
  isInDeck: boolean;
  liveImageUrl?: string;
  liveExtract?: string;
  liveAttribution?: MediaAttribution;
  onClose: () => void;
  onToggleDeck: (cardId: string) => void;
  onRecycleOne: (cardId: string) => void;
  onUpgradeStar: (cardId: string) => void;
}

export function CardDetailModal({
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
}: CardDetailModalProps) {
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
    <div
      onClick={() => {
        soundFX.playClick();
        onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e: any) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden animate-fadeIn my-2 sm:my-auto max-h-[92dvh] flex flex-col"
      >
        <div
          className={`h-2 w-full shrink-0 ${
            card.rarity === 'Légendaire' ? 'uci-rainbow-stripe' : ''
          }`}
          style={
            card.rarity === 'Légendaire'
              ? undefined
              : { backgroundColor: discInfo.accentHex }
          }
        />

        {/* Barre supérieure fixe sur mobile/desktop pour fermer facilement au pouce */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-[10px] font-mono font-bold text-slate-300 shrink-0">
              #{String(card.cardNumber).padStart(3, '0')}
            </span>
            <span className="text-xs sm:text-sm font-black text-white truncate">
              {card.title}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs shrink-0"
          >
            Fermer
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Card Visual Column */}
          <div className="md:col-span-5 flex flex-col items-center gap-3">
            <div className="w-full max-w-[260px] sm:max-w-[290px]">
              <CyclingCard
                card={card}
                liveImageUrl={liveImageUrl}
                count={count}
                starLevel={starLevel}
                isLocked={!isUnlocked}
                isInDeck={isInDeck}
              />
            </div>

            {isUnlocked && (
              <div className="w-full max-w-[260px] sm:max-w-[290px] rounded-2xl bg-slate-950 border border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <StarIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Évolution Prisme</span>
                  </span>
                  <span className="font-mono font-black text-amber-400">
                    Rang {starLevel}/3 ({effStats.starBonusLabel})
                  </span>
                </div>

                {nextUpgrade ? (
                  <button
                    type="button"
                    disabled={!canUpgrade}
                    onClick={() => {
                      soundFX.playUpgradeStar();
                      onUpgradeStar(card.id);
                    }}
                    className={`w-full min-h-[40px] py-2 px-3 rounded-xl font-black text-xs active:scale-95 transition ${
                      canUpgrade
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Passer au rang ★{nextUpgrade.targetStar} ({nextUpgrade.duplicatesNeeded} doublon + {nextUpgrade.wattsCost} W)
                  </button>
                ) : (
                  <div className="text-center text-[11px] font-bold text-amber-300 py-1">
                    Carte au rang maximal ★★★ Prisme
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info & Telemetry Column */}
          <div className="md:col-span-7 space-y-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${discInfo.bgSoft} ${discInfo.borderSoft} ${discInfo.color}`}
                  >
                    <DisciplineIcon discipline={card.discipline} className="w-3 h-3" />
                    <span>{card.discipline}</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${rarityInfo.borderClass} ${rarityInfo.textColor} bg-slate-950`}
                  >
                    {card.rarity}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-800 text-cyan-300 inline-flex items-center gap-1">
                    <span>Coût {card.energyCost}</span>
                    <BoltWattIcon className="w-3 h-3" />
                  </span>
                  {card.roleTag && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-950 border border-slate-700 text-slate-300">
                      {card.roleTag}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight break-words">
                  {card.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  {card.subtitle} {card.countryCode ? `• ${card.countryCode}` : ''}{' '}
                  {card.keyYear ? `• ${card.keyYear}` : ''}
                </p>
              </div>
            </div>

            {/* Power / Spec Box */}
            <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black uppercase tracking-wider text-amber-300">
                  Pouvoir TCG [{card.keyword}] : {card.specialTrait}
                </span>
                <span className="font-mono font-bold text-slate-400">
                  #{String(card.cardNumber).padStart(3, '0')}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {card.effectDescription}
              </p>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                Affinité terrain :{' '}
                <strong className="text-emerald-300">
                  {card.linkedDisciplines.join(' • ')}
                </strong>
              </div>
            </div>

            {/* Lore & Factual Extract */}
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Fiche Technique & Culture Vélo
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {liveExtract || card.summary}
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-amber-300">
                Fait marquant :{' '}
                <span className="text-slate-200">{card.keyFact}</span>
              </div>
              {card.wikiSlug && (
                <div className="pt-1">
                  <a
                    href={`https://fr.wikipedia.org/wiki/${encodeURIComponent(card.wikiSlug)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 underline"
                  >
                    Lire la fiche Wikipédia FR ({card.wikiSlug.replace(/_/g, ' ')})
                  </a>
                </div>
              )}

              {(card.imageAttribution || liveAttribution) &&
                getExternalMediaAllowed() &&
                (card.imageUrl || liveImageUrl) && (
                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 break-words">
                    Crédit photo (libre) :{' '}
                    <strong className="text-slate-200">
                      {(card.imageUrl && card.imageAttribution
                        ? card.imageAttribution
                        : liveAttribution || card.imageAttribution
                      )?.author}
                    </strong>{' '}
                    (
                    {(card.imageUrl && card.imageAttribution
                      ? card.imageAttribution
                      : liveAttribution || card.imageAttribution
                    )?.licenseShortName}
                    )
                  </span>
                  <a
                    href={
                      (card.imageUrl && card.imageAttribution
                        ? card.imageAttribution
                        : liveAttribution || card.imageAttribution
                      )?.commonsUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline font-semibold"
                  >
                    Source Wikimedia Commons
                  </a>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
              {isUnlocked ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      onToggleDeck(card.id);
                    }}
                    className={`flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-black text-xs active:scale-95 transition ${
                      isInDeck
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {isInDeck ? 'Retirer du Deck (5 cartes)' : 'Aligner dans le Deck'}
                  </button>

                  {duplicatesAvailable > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playClick();
                        onRecycleOne(card.id);
                      }}
                      className="min-h-[44px] py-2.5 px-4 rounded-xl font-black text-xs bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 border border-amber-500/30 transition"
                    >
                      Recycler 1 doublon (+{recycleValue} W)
                    </button>
                  ) : (
                    <span className="py-2.5 px-3 rounded-xl text-[11px] font-semibold text-center bg-slate-950 text-slate-400 border border-slate-800">
                      Exemplaire unique protégé (Deck / Album)
                    </span>
                  )}
                </>
              ) : (
                <div className="w-full rounded-xl bg-slate-800/70 border border-slate-700 p-3 text-center text-xs text-slate-300">
                  Carte non encore débloquée. Ouvrez des boosters <strong>{card.discipline}</strong> ou Peloton pour l'obtenir !
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
