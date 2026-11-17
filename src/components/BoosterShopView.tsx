import React, { useState } from 'react';
import {
  BoosterPack,
  WikiCard,
  InventoryMap,
  CardStarsMap,
  WikiLiveCacheMap,
  QuizQuestion,
  QuestProgressState,
  PlayerSaveState
} from '../types/game';
import {
  BOOSTER_PACKS,
  RARITY_CONFIG,
  QUEST_POOL,
  ACHIEVEMENT_POOL,
  PITY_EPIC_THRESHOLD,
  PITY_LEGENDARY_THRESHOLD,
  GOD_PACK_CHANCE,
  ECONOMY_CONFIG
} from '../data/cardsDatabase';
import { soundFX } from '../services/soundService';
import { CyclingCard } from './CyclingCard';
import {
  BoosterPackIcon,
  BoltWattIcon,
  BidonIcon,
  BrainQuizIcon,
  TrophyIcon,
  ShareIcon,
  StarIcon,
  DisciplineIcon,
  ShieldIcon
} from './SportIcons';

export interface DrawnCardSlot {
  card: WikiCard;
  isNew: boolean;
  newCount: number;
  revealed: boolean;
}

export interface BoosterDrawResult {
  slots: DrawnCardSlot[];
  isGodPack: boolean;
  triggeredPityLegendary?: boolean;
  triggeredPityEpic?: boolean;
}

interface BoosterShopViewProps {
  watts: number;
  bidons: number;
  maxBidons: number;
  secondsToNextBidon: number;
  pityEpicCounter: number;
  pityLegendaryCounter: number;
  expressQuizStreak: number;
  unlockedAchievements: string[];
  playerState: PlayerSaveState;
  totalCardsCount: number;
  inventory: InventoryMap;
  cardStars: CardStarsMap;
  deck: string[];
  wikiCache: WikiLiveCacheMap;
  quests: QuestProgressState;
  onOpenPack: (pack: BoosterPack, useBidon: boolean) => BoosterDrawResult | null;
  onSelectCardForDetail: (card: WikiCard) => void;
  onStartExpressQuiz: () => QuizQuestion;
  onCompleteExpressQuiz: (quizId: string, correct: boolean) => void;
  onClaimQuestReward: (questId: string) => void;
  onRedeemPromoCode: (rawCode: string) => { ok: boolean; message: string };
}

type PackStage = 'IDLE' | 'SEALED' | 'RIPPING' | 'REVEAL';

export function BoosterShopView({
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
}: BoosterShopViewProps) {
  const [activePack, setActivePack] = useState<BoosterPack | null>(null);
  const [packStage, setPackStage] = useState<PackStage>('IDLE');
  const [drawnSlots, setDrawnSlots] = useState<DrawnCardSlot[]>([]);
  const [isGodPackDraw, setIsGodPackDraw] = useState(false);
  const [pityBanner, setPityBanner] = useState<string | null>(null);
  const [copiedPullToast, setCopiedPullToast] = useState(false);

  const [expressQuiz, setExpressQuiz] = useState<QuizQuestion | null>(null);
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promoFeedback, setPromoFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleTriggerPack = (pack: BoosterPack, useBidon: boolean) => {
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

  const handleRevealOne = (idx: number) => {
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

  const handleAnswerExpress = (idx: number) => {
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

  const handlePromoSubmit = (e: any) => {
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

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const allRevealed =
    drawnSlots.length > 0 && drawnSlots.every((slot) => slot.revealed);

  const bestPulledCard = drawnSlots.reduce<WikiCard | null>((best, slot) => {
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
      <div className="min-h-[520px] flex flex-col items-center justify-center py-6 space-y-6">
        <div className="text-center space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400">
            <BoosterPackIcon className="w-3.5 h-3.5" />
            <span>BOOSTER SCELLÉ • {activePack.ribbonLabel}</span>
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {activePack.name}
          </h2>
          {pityBanner && (
            <div className="inline-block mt-1 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400 text-xs font-black text-amber-300">
              {pityBanner}
            </div>
          )}
        </div>

        {/* Foil Wrapper Mockup */}
        <div
          onClick={handleRipSealedPack}
          style={{ borderColor: activePack.accentHex }}
          className={`relative w-full max-w-[290px] h-[386px] rounded-3xl border-2 bg-slate-900 shadow-2xl overflow-hidden cursor-pointer select-none touch-manipulation flex flex-col justify-between transition ${
            packStage === 'RIPPING'
              ? 'animate-packRip pointer-events-none'
              : 'hover:scale-105 active:scale-95'
          }`}
        >
          {/* Metallic Crimped Top Strip */}
          <div className="bg-slate-950 border-b border-dashed border-amber-400/70 px-4 py-3 flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300">
              PACK PRO SCELLÉ
            </span>
            <span
              style={{ color: activePack.accentHex }}
              className="text-[10px] font-mono font-black uppercase"
            >
              TIREZ ICI &gt;&gt;&gt;
            </span>
          </div>

          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: activePack.accentHex }}
          />

          {/* Center Foil Artwork */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative bg-asphalt-grid">
            <div className="foil-prism-sheen absolute inset-0 pointer-events-none" />
            <div
              style={{ borderColor: activePack.accentHex }}
              className="w-20 h-20 rounded-2xl bg-slate-950/90 border-2 flex items-center justify-center mb-4 shadow-xl"
            >
              <DisciplineIcon
                discipline={
                  activePack.targetDiscipline === 'ALL'
                    ? 'Polyvalent'
                    : activePack.targetDiscipline
                }
                className="w-10 h-10 text-white"
              />
            </div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-300 mb-1">
              {activePack.ribbonLabel}
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
              {activePack.name}
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-snug">
              {activePack.subtitle}
            </p>
            <div className="mt-4 px-3 py-1 rounded-full bg-slate-950 border border-slate-700 text-[10px] font-mono font-bold text-slate-300">
              5 CARTES • SLOT 5 {activePack.guaranteedMinRarity}+ GARANTI
            </div>
          </div>

          {/* Bottom Crimp */}
          <div className="bg-slate-950 border-t border-slate-800 px-4 py-3 text-center">
            <span className="inline-block px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow">
              {packStage === 'RIPPING'
                ? 'OUVERTURE EN COURS...'
                : 'DÉCHIRER LE PAQUET'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ETAPE 2 : RÉVÉLATION DES 5 CARTES
  if (activePack && drawnSlots.length > 0 && packStage === 'REVEAL') {
    const newCardsCount = drawnSlots.filter((s) => s.isNew).length;

    return (
      <div className="space-y-6">
        <div
          className={`rounded-3xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl ${
            isGodPackDraw
              ? 'bg-gradient-to-r from-amber-950 via-rose-950 to-indigo-950 border-amber-400'
              : 'bg-slate-900 border-slate-700'
          }`}
        >
          <div>
            {isGodPackDraw ? (
              <span className="px-3 py-1 rounded-full uci-rainbow-badge text-slate-950 text-xs font-black tracking-wider uppercase">
                GOD PACK ARC-EN-CIEL LÉGENDAIRE !
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-extrabold uppercase tracking-wider text-amber-400">
                <BoosterPackIcon className="w-3.5 h-3.5" />
                <span>Tirage • {activePack.name}</span>
              </span>
            )}
            <h2 className="text-2xl font-black text-white mt-1">
              {allRevealed
                ? `Tirage terminé (${newCardsCount} nouvelle${
                    newCardsCount > 1 ? 's' : ''
                  })`
                : isGodPackDraw
                ? '5 cartes exclusivement Épiques & Légendaires !'
                : 'Retournez chaque carte pour découvrir votre tirage'}
            </h2>
            {pityBanner ? (
              <p className="text-xs font-bold text-amber-300 mt-1">
                {pityBanner}
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">
                Le halo autour du dos d’une carte annonce son rang (Or = Épique, Arc-en-Ciel = Légendaire).
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {!allRevealed ? (
              <button
                type="button"
                onClick={handleRevealAll}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm shadow-lg transition"
              >
                Tout Révéler (5)
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    handleTriggerPack(
                      activePack,
                      Boolean(activePack.allowFreeBidon && bidons > 0)
                    )
                  }
                  disabled={
                    !(
                      (activePack.allowFreeBidon && bidons > 0) ||
                      watts >= activePack.costWatts
                    )
                  }
                  className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-sm shadow-lg transition"
                >
                  Ouvrir un autre
                </button>
                <button
                  type="button"
                  onClick={handleCloseReveal}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-sm border border-slate-600 transition"
                >
                  Retour Boutique
                </button>
              </>
            )}
          </div>
        </div>

        {/* Shareable Highlight Pull Box */}
        {isHighlightPull && bestPulledCard && (
          <div className="rounded-2xl bg-slate-900 border-2 border-amber-400/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl uci-rainbow-badge flex items-center justify-center text-slate-950 shrink-0">
                <TrophyIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-400">
                  {isGodPackDraw ? 'ÉDITION VIRALE • GOD PACK' : 'GROS TIRAGE DÉTECTÉ'}
                </div>
                <div className="text-sm font-black text-white">
                  Carte Star : {bestPulledCard.title} ({bestPulledCard.rarity} • OVR {bestPulledCard.overall})
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={copyPullRecap}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition shrink-0"
            >
              <ShareIcon className="w-4 h-4" />
              <span>
                {copiedPullToast
                  ? 'Récapitulatif copié !'
                  : 'Partager le Tirage du Siècle'}
              </span>
            </button>
          </div>
        )}

        {/* Grille des 5 Cartes */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
          {drawnSlots.map((slot, idx) => {
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
                <div
                  key={`${slot.card.id}_${idx}`}
                  onClick={() => handleRevealOne(idx)}
                  className={`h-[310px] sm:h-[370px] rounded-2xl border-2 cursor-pointer touch-manipulation active:scale-95 flex flex-col items-center justify-center p-4 sm:p-5 text-center transition duration-200 hover:scale-105 bg-slate-900 bg-asphalt-grid relative overflow-hidden ${
                    slot.card.rarity === 'Légendaire'
                      ? 'uci-rainbow-border animate-pulse'
                      : slot.card.rarity === 'Épique'
                      ? 'border-amber-400 shadow-xl'
                      : isHighRarity
                      ? 'border-sky-400 shadow-lg'
                      : 'border-slate-700 hover:border-amber-400'
                  }`}
                >
                  <div className="uci-rainbow-stripe h-1.5 w-full absolute top-0 left-0" />
                  <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-700 flex items-center justify-center mb-3 shadow-inner text-amber-400">
                    <BoosterPackIcon className="w-8 h-8" />
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
                    SLOT #{idx + 1}
                  </div>
                  <div className="text-sm font-black text-white uppercase tracking-wider">
                    Révéler la Carte
                  </div>
                  <span
                    className={`mt-3 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-700 ${rInfo.textColor}`}
                  >
                    Aura : {slot.card.rarity}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={`${slot.card.id}_${idx}_rev`}
                className="card-flip-in"
              >
                <CyclingCard
                  card={slot.card}
                  liveImageUrl={cached?.thumbnailUrl}
                  count={slot.newCount}
                  starLevel={star}
                  isNew={slot.isNew}
                  isInDeck={deck.includes(slot.card.id)}
                  onClick={() => onSelectCardForDetail(slot.card)}
                />
              </div>
            );
          })}
        </div>
      </div>
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
    <div className="space-y-6">
      {/* Broadcast Banner & Telemetry Pity/Drop Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Quiz Express */}
        <div className="lg:col-span-6 rounded-3xl bg-slate-900 border border-slate-700 p-5 flex flex-col justify-between gap-4 shadow-xl bg-asphalt-grid">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-black tracking-wider uppercase">
                CENTRE D’ENTRAÎNEMENT • QUIZ EXPRESS
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold">
                <BidonIcon className="w-3 h-3" />
                <span>
                  {bidons}/{maxBidons} Bidons
                  {bidons < maxBidons
                    ? ` (prochain dans ${formatTimer(secondsToNextBidon)})`
                    : ' (Réservoir plein)'}
                </span>
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Culture Cyclisme : Gagnez des Watts au mérite
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              +{ECONOMY_CONFIG.EXPRESS_QUIZ_REWARD_CORRECT} W par bonne réponse (+{ECONOMY_CONFIG.EXPRESS_QUIZ_STREAK_BONUS} W bonus en série de 3+, 0 W si erreur). Série actuelle :{' '}
              <strong className="text-amber-300 font-mono">
                {expressQuizStreak}
              </strong>
              .
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenExpressQuiz}
            className="w-full sm:w-auto min-h-[44px] self-start inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow transition"
          >
            <BrainQuizIcon className="w-4 h-4" />
            <span>
              Question Culture Vélo (+{ECONOMY_CONFIG.EXPRESS_QUIZ_REWARD_CORRECT} W)
            </span>
          </button>
        </div>

        {/* Drop Rates & Pity System Transparency */}
        <div className="lg:col-span-6 rounded-3xl bg-slate-900 border border-slate-700 p-5 flex flex-col justify-between gap-3 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-black uppercase tracking-wider text-cyan-300">
              PROBABILITÉS DE TIRAGE &amp; GARANTIE PITY
            </span>
            <span className="px-2 py-0.5 rounded uci-rainbow-badge text-slate-950 text-[10px] font-mono font-black">
              GOD PACK {godPackPct}%
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-center">
            {(
              ['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire'] as const
            ).map((rar) => {
              const rc = RARITY_CONFIG[rar];
              return (
                <div
                  key={rar}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-1.5 py-2"
                >
                  <div className={`text-[10px] font-bold truncate ${rc.textColor}`}>
                    {rar}
                  </div>
                  <div className="text-xs font-mono font-black text-white tabular-nums mt-0.5">
                    {rc.dropWeight}%
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-400">
            Slot 5 garanti <strong className="text-sky-300">Rare+</strong> (84% Rare / 13.5% Épique / 2.5% Légendaire).
          </div>

          {/* Pity Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="font-bold text-amber-300">Pity Épique+</span>
                <span className="font-mono font-black text-white tabular-nums">
                  {pityEpicCounter} / {PITY_EPIC_THRESHOLD}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (pityEpicCounter / PITY_EPIC_THRESHOLD) * 100
                    )}%`
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="font-bold text-cyan-300">Pity Légendaire</span>
                <span className="font-mono font-black text-white tabular-nums">
                  {pityLegendaryCounter} / {PITY_LEGENDARY_THRESHOLD}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full uci-rainbow-stripe transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (pityLegendaryCounter / PITY_LEGENDARY_THRESHOLD) * 100
                    )}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Express Quiz Modal */}
      {expressQuiz && (
        <div className="rounded-2xl bg-slate-900 border-2 border-amber-400/70 p-5 space-y-4 animate-fadeIn shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-black text-amber-300 uppercase tracking-wider">
              <BrainQuizIcon className="w-4 h-4" />
              <span>QUIZ EXPRESS ({expressQuiz.relatedCardTitle})</span>
            </span>
            <button
              type="button"
              onClick={() => setExpressQuiz(null)}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              Fermer
            </button>
          </div>
          <p className="text-base font-bold text-white leading-snug">
            {expressQuiz.questionText}
          </p>
          {expressQuiz.contextExcerpt && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 italic leading-relaxed">
              {expressQuiz.contextExcerpt}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {expressQuiz.options.map((opt, idx) => {
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
                <button
                  key={idx}
                  type="button"
                  disabled={answered}
                  onClick={() => handleAnswerExpress(idx)}
                  className={`min-h-[46px] text-left px-4 py-3 rounded-xl border text-xs font-semibold active:scale-95 transition ${btnClass}`}
                >
                  <span className="font-mono font-bold mr-2 opacity-75">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          {selectedQuizIndex !== null && (
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-300">
                {selectedQuizIndex === expressQuiz.correctIndex
                  ? `Bonne réponse ! +${
                      ECONOMY_CONFIG.EXPRESS_QUIZ_REWARD_CORRECT +
                      (expressQuizStreak >= 3
                        ? ECONOMY_CONFIG.EXPRESS_QUIZ_STREAK_BONUS
                        : 0)
                    } W crédités${
                      expressQuizStreak >= 3 ? ' (dont bonus série 3+ !)' : '.'
                    } `
                  : 'Manqué (0 W — la précision prime). '}
                {expressQuiz.explanation}
              </p>
              <button
                type="button"
                onClick={handleOpenExpressQuiz}
                className="shrink-0 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
              >
                Question Suivante
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quêtes Rapides Section */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrophyIcon className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Objectifs du Jour
            </h3>
            {unclaimedQuestsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black">
                {unclaimedQuestsCount} prête(s)
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Récompenses immédiates en Watts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quests.activeQuestIds.map((qId) => {
            const q = QUEST_POOL.find((item) => item.id === qId);
            if (!q) return null;
            const current = quests.progress[qId] || 0;
            const done = current >= q.target;
            const claimed = quests.completedQuestIds.includes(qId);
            const pct = Math.min(100, Math.round((current / q.target) * 100));

            return (
              <div
                key={qId}
                className={`rounded-xl border p-3 flex flex-col justify-between gap-2 ${
                  claimed
                    ? 'bg-slate-950/40 border-slate-800 opacity-60'
                    : done
                    ? 'bg-emerald-950/30 border-emerald-500/50'
                    : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-white">
                      {q.title}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-black text-amber-300 shrink-0">
                      +{q.rewardWatts}
                      <BoltWattIcon className="w-3 h-3" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {q.description}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>
                      {Math.min(current, q.target)} / {q.target}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        done ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {done && !claimed && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playUpgradeStar();
                        onClaimQuestReward(q.id);
                      }}
                      className="w-full mt-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition"
                    >
                      Récupérer +{q.rewardWatts} Watts
                    </button>
                  )}
                  {claimed && (
                    <div className="text-[10px] text-emerald-400 font-bold text-center">
                      Validée
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grille des 5 Boosters Disponibles */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <BoosterPackIcon className="w-4 h-4 text-amber-400" />
            <span>Boutique Peloton : Boosters (5 Cartes)</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Slot 5 garanti Rare+ • Pity 10 Épique / 30 Légendaire
          </span>
        </div>

        {/* Barre Code Cadeau Peloton (Usage Unique) */}
        <form
          onSubmit={handlePromoSubmit}
          className="mb-4 rounded-2xl bg-slate-900 border border-slate-800 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
        >
          <div className="text-xs text-slate-300">
            <strong className="text-amber-300 font-mono uppercase">
              Code Cadeau Peloton (usage unique) :
            </strong>{' '}
            essayez <code className="px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300 font-mono">PELOTON2026</code> ou{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300 font-mono">ECHAPPEE</code>.
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0">
            <input
              type="text"
              value={promoInput}
              onChange={(e: any) => setPromoInput(e.target.value)}
              placeholder="Saisir un code promo..."
              className="flex-1 min-w-0 min-h-[42px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs transition shrink-0"
            >
              Valider
            </button>
          </div>
        </form>
        {promoFeedback && (
          <div
            className={`mb-4 rounded-xl px-4 py-2 text-xs font-bold border ${
              promoFeedback.ok
                ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/35 border-rose-500/40 text-rose-300'
            }`}
          >
            {promoFeedback.message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BOOSTER_PACKS.map((pack) => {
            const canUseFreeBidon = pack.allowFreeBidon && bidons > 0;
            const canBuyWatts = watts >= pack.costWatts;

            return (
              <div
                key={pack.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col justify-between shadow-lg hover:border-slate-600 transition"
              >
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: pack.accentHex }}
                />

                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        style={{
                          color: pack.accentHex,
                          borderColor: pack.accentHex
                        }}
                        className="px-2.5 py-0.5 rounded bg-slate-950 border text-[10px] font-mono font-black tracking-widest uppercase"
                      >
                        {pack.ribbonLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-black text-amber-400">
                        <span>{pack.costWatts}</span>
                        <BoltWattIcon className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-white">
                      {pack.name}
                    </h4>
                    <p className="text-xs font-semibold text-slate-400">
                      {pack.subtitle}
                    </p>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {pack.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    {pack.allowFreeBidon && (
                      <button
                        type="button"
                        disabled={!canUseFreeBidon}
                        onClick={() => handleTriggerPack(pack, true)}
                        className={`w-full min-h-[44px] py-2.5 rounded-xl font-black text-xs active:scale-95 transition inline-flex items-center justify-center gap-1.5 ${
                          canUseFreeBidon
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow'
                            : 'bg-slate-800/70 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <BidonIcon className="w-3.5 h-3.5" />
                        <span>
                          {canUseFreeBidon
                            ? `Ouvrir avec 1 Bidon Gratuit (${bidons} dispo)`
                            : 'Aucun Bidon disponible'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!canBuyWatts}
                      onClick={() => handleTriggerPack(pack, false)}
                      className={`w-full min-h-[44px] py-2.5 rounded-xl font-black text-xs active:scale-95 transition inline-flex items-center justify-center gap-1.5 ${
                        canBuyWatts
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <BoltWattIcon className="w-3.5 h-3.5" />
                      <span>Ouvrir pour {pack.costWatts} Watts</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Palmarès & Trophées Débloquables */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldIcon className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Trophées & Distinctions Peloton ({unlockedAchievements.length}/{ACHIEVEMENT_POOL.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Déblocage automatique + bonus Watts
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          {ACHIEVEMENT_POOL.map((ach) => {
            const isUnlocked =
              unlockedAchievements.includes(ach.id) ||
              ach.check(playerState, totalCardsCount);

            return (
              <div
                key={ach.id}
                className={`rounded-xl border p-3 flex flex-col justify-between gap-1.5 ${
                  isUnlocked
                    ? 'bg-amber-950/25 border-amber-500/50'
                    : 'bg-slate-950/70 border-slate-800 opacity-65'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black ${
                      isUnlocked
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {ach.code}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-amber-300">
                    +{ach.rewardWatts} W
                  </span>
                </div>
                <div className="text-xs font-extrabold text-white leading-tight flex items-center gap-1">
                  {isUnlocked && <StarIcon className="w-3 h-3 text-amber-400 shrink-0" />}
                  <span>{ach.title}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  {ach.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
