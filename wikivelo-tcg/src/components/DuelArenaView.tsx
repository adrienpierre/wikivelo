import React, { useState, useMemo } from 'react';
import {
  WikiCard,
  TerrainStage,
  AIOpponent,
  QuizQuestion,
  QuizRiskMode,
  WikiLiveCacheMap,
  CardStarsMap,
  CoreDiscipline
} from '../types/game';
import {
  TERRAIN_STAGES,
  AI_OPPONENTS,
  DISCIPLINE_CONFIG,
  MAX_DECK_ENERGY,
  ECONOMY_CONFIG
} from '../data/cardsDatabase';
import {
  getCardTerrainBonusPct,
  checkAllFourDisciplinesCovered,
  isDeckValid,
  buildAIDeckWithinBudget,
  evaluateStageSide,
  ScoreBreakdownLine
} from '../utils/cardEffects';
import { generateCardQuizQuestion } from '../utils/quizGenerator';
import { soundFX } from '../services/soundService';
import { CyclingCard } from './CyclingCard';
import {
  DuelFlagIcon,
  BoltWattIcon,
  BrainQuizIcon,
  TrophyIcon,
  ShieldIcon,
  DisciplineIcon,
  ShareIcon,
  StarIcon
} from './SportIcons';

interface RoundHistoryItem {
  roundNumber: number;
  stage: TerrainStage;
  playerCard: WikiCard;
  aiCard: WikiCard;
  playerScore: number;
  aiScore: number;
  playerTerrainBonusPct: number;
  aiTerrainBonusPct: number;
  playerQuizSuccess: boolean;
  playerQuizMode: QuizRiskMode;
  aiQuizSuccess: boolean;
  playerLines: ScoreBreakdownLine[];
  aiLines: ScoreBreakdownLine[];
  playerDebuffInflicted: number;
  aiDebuffInflicted: number;
  playerNextAllyBonus: number;
  winner: 'PLAYER' | 'AI' | 'DRAW';
}

interface DuelArenaViewProps {
  allCards: WikiCard[];
  deckIds: string[];
  cardStars: CardStarsMap;
  wikiCache: WikiLiveCacheMap;
  onGoToDeckBuilder: () => void;
  onRecordQuizAnswer: (
    correct: boolean,
    mode: QuizRiskMode,
    wattsEarned: number
  ) => void;
  onFinishDuel: (
    matchId: string,
    won: boolean,
    wattsReward: number,
    deckCards: WikiCard[],
    attackQuizSuccesses: number
  ) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function DuelArenaView({
  allCards,
  deckIds,
  cardStars,
  wikiCache,
  onGoToDeckBuilder,
  onRecordQuizAnswer,
  onFinishDuel
}: DuelArenaViewProps) {
  const [selectedOpponent, setSelectedOpponent] = useState<AIOpponent>(
    AI_OPPONENTS[0]
  );
  const [duelPhase, setDuelPhase] = useState<
    'LOBBY' | 'SELECT_CARD' | 'QUIZ_ATTACK' | 'ROUND_RESULT' | 'MATCH_OVER'
  >('LOBBY');

  const [stages, setStages] = useState<TerrainStage[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [playerHand, setPlayerHand] = useState<WikiCard[]>([]);
  const [aiHand, setAiHand] = useState<WikiCard[]>([]);
  const [playedPlayerCards, setPlayedPlayerCards] = useState<WikiCard[]>([]);
  const [playedAiCards, setPlayedAiCards] = useState<WikiCard[]>([]);
  const [playerCarryBonus, setPlayerCarryBonus] = useState(0);
  const [aiCarryBonus, setAiCarryBonus] = useState(0);
  const [usedQuizCardIds, setUsedQuizCardIds] = useState<string[]>([]);

  const [chosenPlayerCard, setChosenPlayerCard] = useState<WikiCard | null>(null);
  const [chosenAiCard, setChosenAiCard] = useState<WikiCard | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion | null>(null);
  const [quizRiskMode, setQuizRiskMode] = useState<QuizRiskMode>('SAFE');
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);

  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([]);
  const [lastRoundResult, setLastRoundResult] =
    useState<RoundHistoryItem | null>(null);
  const [matchQuizWatts, setMatchQuizWatts] = useState(0);
  const [matchFinalReward, setMatchFinalReward] = useState(0);
  const [copiedRecap, setCopiedRecap] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState<string>('');
  const [matchSubmitted, setMatchSubmitted] = useState<boolean>(false);

  const playerDeckCards = useMemo(
    () =>
      deckIds
        .map((id) => allCards.find((c) => c.id === id))
        .filter((c): c is WikiCard => Boolean(c)),
    [deckIds, allCards]
  );

  const deckValidity = useMemo(
    () => isDeckValid(playerDeckCards),
    [playerDeckCards]
  );

  const hasFullTeamSynergy = useMemo(
    () => checkAllFourDisciplinesCovered(playerDeckCards),
    [playerDeckCards]
  );

  const startNewMatch = (opponent: AIOpponent) => {
    if (!deckValidity.valid) return;
    soundFX.playClick();

    const coreStages: TerrainStage[] = [];
    const disciplines: CoreDiscipline[] = [
      'Route',
      'VTT',
      'Piste',
      'Cyclo-cross'
    ];
    for (const d of disciplines) {
      const candidates = TERRAIN_STAGES.filter((s) => s.favoredDiscipline === d);
      const picked = shuffle(candidates)[0];
      if (picked) coreStages.push(picked);
    }
    const remainingStages = TERRAIN_STAGES.filter(
      (s) => !coreStages.some((cs) => cs.id === s.id)
    );
    const fifthStage = shuffle(remainingStages)[0] || TERRAIN_STAGES[0];
    const fiveStages = shuffle([...coreStages, fifthStage]);

    const aiPool = allCards.filter((c) =>
      opponent.minRarityPool.includes(c.rarity)
    );
    const pickedAiHand = buildAIDeckWithinBudget(
      aiPool,
      allCards,
      opponent.maxBudget
    );

    setSelectedOpponent(opponent);
    setStages(fiveStages);
    setCurrentRoundIdx(0);
    setPlayerHand([...playerDeckCards]);
    setAiHand(pickedAiHand);
    setPlayedPlayerCards([]);
    setPlayedAiCards([]);
    setPlayerCarryBonus(0);
    setAiCarryBonus(0);
    setUsedQuizCardIds([]);
    setRoundHistory([]);
    setChosenPlayerCard(null);
    setChosenAiCard(null);
    setActiveQuiz(null);
    setQuizRiskMode('SAFE');
    setSelectedOptionIdx(null);
    setLastRoundResult(null);
    setMatchQuizWatts(0);
    setMatchFinalReward(0);
    setCopiedRecap(false);
    setCurrentMatchId(
      `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    );
    setMatchSubmitted(false);
    setDuelPhase('SELECT_CARD');
  };

  const currentStage = stages[currentRoundIdx];
  const roundNumber = currentRoundIdx + 1;
  const energyAvailable = 2 + roundNumber; // 3, 4, 5, 6, 7

  const playableCardIds = useMemo(() => {
    const affordable = playerHand.filter((c) => c.energyCost <= energyAvailable);
    if (affordable.length > 0) {
      return new Set(affordable.map((c) => c.id));
    }
    const minCost = Math.min(...playerHand.map((c) => c.energyCost));
    return new Set(
      playerHand.filter((c) => c.energyCost === minCost).map((c) => c.id)
    );
  }, [playerHand, energyAvailable]);

  const handleChooseCardForRound = (card: WikiCard) => {
    if (!currentStage || !playableCardIds.has(card.id)) return;
    soundFX.playClick();

    const affordableAi = aiHand.filter((c) => c.energyCost <= energyAvailable);
    const aiCandidates =
      affordableAi.length > 0
        ? affordableAi
        : [...aiHand].sort((a, b) => a.energyCost - b.energyCost).slice(0, 1);

    let aiPick = aiCandidates[0];
    if (selectedOpponent.difficulty === 'Souple') {
      aiPick = shuffle(aiCandidates)[0];
    } else {
      const aiFullSynergy = checkAllFourDisciplinesCovered([
        ...playedAiCards,
        ...aiHand
      ]);
      const scored = [...aiCandidates].sort((a, b) => {
        const evalA = evaluateStageSide({
          card: a,
          starLevel: 0,
          stage: currentStage,
          roundNumber,
          playedBefore: playedAiCards,
          carriedAllyBonus: aiCarryBonus,
          hasFullTeamSynergy: aiFullSynergy,
          energyAvailable,
          quizMode: 'SAFE',
          quizSuccess: false,
          skipQuiz: true
        });
        const evalB = evaluateStageSide({
          card: b,
          starLevel: 0,
          stage: currentStage,
          roundNumber,
          playedBefore: playedAiCards,
          carriedAllyBonus: aiCarryBonus,
          hasFullTeamSynergy: aiFullSynergy,
          energyAvailable,
          quizMode: 'SAFE',
          quizSuccess: false,
          skipQuiz: true
        });
        return evalB.rawScoreBeforeDebuff - evalA.rawScoreBeforeDebuff;
      });
      aiPick = scored[0];
    }

    const focusCandidate =
      !usedQuizCardIds.includes(card.id)
        ? card
        : !usedQuizCardIds.includes(aiPick.id)
        ? aiPick
        : card;

    const question = generateCardQuizQuestion(focusCandidate, allCards, {
      excludeCardIds: usedQuizCardIds,
      preferredMode: currentRoundIdx
    });

    setUsedQuizCardIds((prev) => [...prev, question.relatedCardId]);
    setChosenPlayerCard(card);
    setChosenAiCard(aiPick);
    setActiveQuiz(question);
    setQuizRiskMode('SAFE');
    setSelectedOptionIdx(null);
    setDuelPhase('QUIZ_ATTACK');
  };

  const handleAnswerRoundQuiz = (optIndex: number) => {
    if (
      selectedOptionIdx !== null ||
      !activeQuiz ||
      !chosenPlayerCard ||
      !chosenAiCard ||
      !currentStage
    ) {
      return;
    }

    setSelectedOptionIdx(optIndex);
    const playerQuizSuccess = optIndex === activeQuiz.correctIndex;
    const instantQuizWatts = playerQuizSuccess
      ? quizRiskMode === 'ATTACK'
        ? ECONOMY_CONFIG.DUEL_QUIZ_REWARD_ATTACK
        : ECONOMY_CONFIG.DUEL_QUIZ_REWARD_SAFE
      : ECONOMY_CONFIG.DUEL_QUIZ_REWARD_WRONG;

    if (playerQuizSuccess) {
      soundFX.playQuizSuccess(quizRiskMode === 'ATTACK');
    } else {
      soundFX.playQuizFail();
    }

    onRecordQuizAnswer(playerQuizSuccess, quizRiskMode, instantQuizWatts);
    setMatchQuizWatts((prev) => prev + instantQuizWatts);

    const aiQuizSuccess = Math.random() < selectedOpponent.aiQuizAccuracy;
    const aiFullSynergy = checkAllFourDisciplinesCovered([
      ...playedAiCards,
      ...aiHand
    ]);

    const playerEval = evaluateStageSide({
      card: chosenPlayerCard,
      starLevel: cardStars[chosenPlayerCard.id] || 0,
      stage: currentStage,
      roundNumber,
      playedBefore: playedPlayerCards,
      carriedAllyBonus: playerCarryBonus,
      hasFullTeamSynergy,
      energyAvailable,
      quizMode: quizRiskMode,
      quizSuccess: playerQuizSuccess
    });

    const aiEval = evaluateStageSide({
      card: chosenAiCard,
      starLevel: 0,
      stage: currentStage,
      roundNumber,
      playedBefore: playedAiCards,
      carriedAllyBonus: aiCarryBonus,
      hasFullTeamSynergy: aiFullSynergy,
      energyAvailable,
      quizMode: 'SAFE',
      quizSuccess: aiQuizSuccess
    });

    const pLines = [...playerEval.lines];
    const aLines = [...aiEval.lines];

    if (aiEval.debuffInflicted > 0) {
      pLines.push({
        label: `Attaque adverse subie (${chosenAiCard.title})`,
        value: -aiEval.debuffInflicted,
        tone: 'negative'
      });
    }
    if (playerEval.debuffInflicted > 0) {
      aLines.push({
        label: `Attaque subie (${chosenPlayerCard.title})`,
        value: -playerEval.debuffInflicted,
        tone: 'negative'
      });
    }

    const playerFinalScore = Math.max(
      10,
      playerEval.rawScoreBeforeDebuff - aiEval.debuffInflicted
    );
    const aiFinalScore = Math.max(
      10,
      aiEval.rawScoreBeforeDebuff - playerEval.debuffInflicted
    );

    let winner: 'PLAYER' | 'AI' | 'DRAW' = 'DRAW';
    if (playerFinalScore > aiFinalScore) {
      winner = 'PLAYER';
      setTimeout(() => soundFX.playRoundWin(), 180);
    } else if (aiFinalScore > playerFinalScore) {
      winner = 'AI';
    }

    const resultItem: RoundHistoryItem = {
      roundNumber,
      stage: currentStage,
      playerCard: chosenPlayerCard,
      aiCard: chosenAiCard,
      playerScore: playerFinalScore,
      aiScore: aiFinalScore,
      playerTerrainBonusPct: playerEval.terrainBonusPct,
      aiTerrainBonusPct: aiEval.terrainBonusPct,
      playerQuizSuccess,
      playerQuizMode: quizRiskMode,
      aiQuizSuccess,
      playerLines: pLines,
      aiLines: aLines,
      playerDebuffInflicted: playerEval.debuffInflicted,
      aiDebuffInflicted: aiEval.debuffInflicted,
      playerNextAllyBonus: playerEval.nextAllyBonusToCarry,
      winner
    };

    setLastRoundResult(resultItem);
    setRoundHistory((prev) => [...prev, resultItem]);
    setPlayedPlayerCards((prev) => [...prev, chosenPlayerCard]);
    setPlayedAiCards((prev) => [...prev, chosenAiCard]);
    setPlayerCarryBonus(playerEval.nextAllyBonusToCarry);
    setAiCarryBonus(aiEval.nextAllyBonusToCarry);
    setPlayerHand((prev) => prev.filter((c) => c.id !== chosenPlayerCard.id));
    setAiHand((prev) => prev.filter((c) => c.id !== chosenAiCard.id));
    setDuelPhase('ROUND_RESULT');
  };

  const handleProceedAfterRound = () => {
    soundFX.playClick();
    if (currentRoundIdx + 1 >= 5) {
      if (matchSubmitted) return;
      setMatchSubmitted(true);
      const pWins = roundHistory.filter((r) => r.winner === 'PLAYER').length;
      const aWins = roundHistory.filter((r) => r.winner === 'AI').length;
      const pPts = roundHistory.reduce((s, r) => s + r.playerScore, 0);
      const aPts = roundHistory.reduce((s, r) => s + r.aiScore, 0);

      const playerWonMatch =
        pWins > aWins || (pWins === aWins && pPts >= aPts);

      if (playerWonMatch) {
        soundFX.playMatchWin();
      }

      const baseReward = playerWonMatch
        ? selectedOpponent.rewardWinWatts
        : selectedOpponent.rewardLossWatts;

      const attackSuccessCount = roundHistory.filter(
        (r) => r.playerQuizMode === 'ATTACK' && r.playerQuizSuccess
      ).length;

      setMatchFinalReward(baseReward);
      onFinishDuel(
        currentMatchId,
        playerWonMatch,
        baseReward,
        playerDeckCards,
        attackSuccessCount
      );
      setDuelPhase('MATCH_OVER');
    } else {
      setCurrentRoundIdx((prev) => prev + 1);
      setChosenPlayerCard(null);
      setChosenAiCard(null);
      setActiveQuiz(null);
      setQuizRiskMode('SAFE');
      setSelectedOptionIdx(null);
      setLastRoundResult(null);
      setDuelPhase('SELECT_CARD');
    }
  };

  const playerWinsCount = roundHistory.filter(
    (r) => r.winner === 'PLAYER'
  ).length;
  const aiWinsCount = roundHistory.filter((r) => r.winner === 'AI').length;

  // Garde-fou Deck valide
  if (!deckValidity.valid) {
    return (
      <div className="rounded-3xl bg-slate-900 border border-amber-500/40 p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400">
          <ShieldIcon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-white">
          Équipe non conforme pour le départ
        </h2>
        <p className="text-sm text-slate-300 max-w-lg mx-auto">
          {deckValidity.reason} Ajustez votre sélection de 5 titulaires dans le respect du budget maximal de {MAX_DECK_ENERGY} W d’énergie avant de prendre le départ.
        </p>
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            onGoToDeckBuilder();
          }}
          className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg transition"
        >
          Ajuster mon Équipe (&le; {MAX_DECK_ENERGY} W)
        </button>
      </div>
    );
  }

  // PHASE 1 : LOBBY
  if (duelPhase === 'LOBBY') {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-xl bg-asphalt-grid">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-mono font-extrabold uppercase tracking-wider">
                <DuelFlagIcon className="w-3.5 h-3.5" />
                <span>ARÈNE TCG • 5 ÉTAPES DYNAMIQUES + QUIZ TACTIQUE</span>
              </span>
              <h2 className="text-2xl font-black text-white mt-1.5 tracking-tight">
                Affrontez les Directeurs Sportifs IA
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Toutes les étapes et leurs modificateurs sont visibles dès le briefing. Gérez votre énergie par tour (3 → 7 W), activez vos mots-clés TCG (<em>À la révélation, Continu, Sprint final, Échappée, Synergie</em>) et tentez l’<strong>Attaque Risquée (Snap)</strong> sur le Quiz !
              </p>
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-xs font-bold font-mono tabular-nums">
                <BoltWattIcon className="w-3.5 h-3.5" />
                <span>Coût Deck : {deckValidity.totalEnergy} / {MAX_DECK_ENERGY} W</span>
              </div>
              {hasFullTeamSynergy && (
                <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold text-center">
                  SYNERGIE 4 DISCIPLINES (+5%)
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {AI_OPPONENTS.map((opp) => (
            <div
              key={opp.id}
              className="rounded-2xl bg-slate-900 border border-slate-700 p-5 flex flex-col justify-between hover:border-amber-400 transition shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono font-black tracking-widest text-amber-400">
                    {opp.codeBadge}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                      opp.difficulty === 'Souple'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : opp.difficulty === 'Tactique'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'uci-rainbow-badge text-slate-950 font-black'
                    }`}
                  >
                    {opp.difficulty} • Budget {opp.maxBudget} W
                  </span>
                </div>

                <h3 className="text-lg font-black text-white">{opp.name}</h3>
                <p className="text-xs text-amber-400 font-semibold">{opp.title}</p>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {opp.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Prime de Victoire :</span>
                  <span className="font-mono font-black text-amber-400 tabular-nums">
                    +{opp.rewardWinWatts} W (+ Quiz live)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => startNewMatch(opp)}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow transition"
                >
                  Prendre le Départ (5 Manches)
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Aperçu du 5 Majeur */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-black text-slate-200 uppercase tracking-wider">
              5 Majeur aligné au départ ({deckValidity.totalEnergy}/{MAX_DECK_ENERGY} W)
            </h4>
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onGoToDeckBuilder();
              }}
              className="text-xs text-amber-400 hover:underline font-bold"
            >
              Modifier l’équipe
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {playerDeckCards.map((c) => {
              const star = cardStars[c.id] || 0;
              const starAdd =
                star === 3 ? 9 : star === 2 ? 5 : star === 1 ? 2 : 0;
              return (
                <div
                  key={c.id}
                  className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white truncate flex items-center gap-1">
                      <span className="truncate">{c.title}</span>
                      {star > 0 && (
                        <StarIcon className="w-3 h-3 text-amber-300 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-amber-400 truncate">
                      {c.energyCost} W • {c.discipline} • {c.keyword}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-black text-xs tabular-nums shrink-0">
                    {c.stats.overall + starAdd}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // PHASE FINALE : BROADCAST POST-RACE SUMMARY PODIUM
  if (duelPhase === 'MATCH_OVER') {
    const playerTotalPts = roundHistory.reduce((s, r) => s + r.playerScore, 0);
    const aiTotalPts = roundHistory.reduce((s, r) => s + r.aiScore, 0);
    const playerWon =
      playerWinsCount > aiWinsCount ||
      (playerWinsCount === aiWinsCount && playerTotalPts >= aiTotalPts);

    const mvpRound = roundHistory.reduce<RoundHistoryItem | null>(
      (best, item) => {
        if (!best || item.playerScore > best.playerScore) return item;
        return best;
      },
      null
    );

    const quizOkCount = roundHistory.filter((r) => r.playerQuizSuccess).length;

    const handleCopyPalmares = () => {
      const lines = [
        playerWon
          ? `VICTOIRE VELOLEGENDS TCG vs ${selectedOpponent.name} (${selectedOpponent.codeBadge})`
          : `DUEL VELOLEGENDS TCG vs ${selectedOpponent.name} (${selectedOpponent.codeBadge})`,
        `Score des étapes : ${playerWinsCount} - ${aiWinsCount} (${playerTotalPts} vs ${aiTotalPts} pts)`,
        `MVP du match : ${mvpRound?.playerCard.title || ''} (${mvpRound?.playerScore || 0} pts sur ${mvpRound?.stage.name || ''})`,
        `Précision Quiz : ${quizOkCount}/5 • Gains : +${matchFinalReward + matchQuizWatts} Watts`
      ];
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
        }
      } catch {
        // Ignore in headless sandbox
      }
      soundFX.playClick();
      setCopiedRecap(true);
      setTimeout(() => setCopiedRecap(false), 2600);
    };

    return (
      <div className="space-y-6">
        <div
          className={`rounded-3xl border-2 p-4 sm:p-6 shadow-2xl bg-asphalt-grid ${
            playerWon
              ? 'bg-gradient-to-b from-amber-950/60 via-slate-900 to-slate-950 border-amber-400'
              : 'bg-slate-900 border-slate-700'
          }`}
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-700 text-[10px] font-mono font-black uppercase tracking-widest text-amber-400">
              <TrophyIcon className="w-3.5 h-3.5" />
              <span>CLASSEMENT DE L’ÉPREUVE • FIN DE MATCH</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {playerWon
                ? 'VICTOIRE AU CLASSEMENT GÉNÉRAL !'
                : 'DÉFAITE AU SPRINT FINAL'}
            </h2>
            <p className="text-sm text-slate-300">
              Étapes : <strong className="font-mono text-amber-400">{playerWinsCount}</strong> à{' '}
              <strong className="font-mono text-rose-400">{aiWinsCount}</strong> face à{' '}
              <strong>{selectedOpponent.name}</strong> ({selectedOpponent.codeBadge}) • Cumul :{' '}
              <strong className="font-mono text-emerald-400">{playerTotalPts}</strong> vs{' '}
              <strong className="font-mono text-rose-400">{aiTotalPts}</strong> pts
            </p>
          </div>

          {/* Broadcast Post-Race Cards: Gains + MVP + Quiz Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            <div className="rounded-2xl bg-slate-950 border border-amber-500/40 p-4 text-center">
              <div className="text-[10px] font-mono uppercase text-slate-400">
                TOTAL GAINS WATTS
              </div>
              <div className="text-xl font-mono font-black text-amber-400 mt-1 tabular-nums">
                +{matchFinalReward + matchQuizWatts} W
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Prime {matchFinalReward} W + Quiz {matchQuizWatts} W
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950 border border-cyan-500/40 p-4 text-center">
              <div className="text-[10px] font-mono uppercase text-cyan-300">
                CARTE MVP DU MATCH
              </div>
              <div className="text-base font-black text-white mt-1 truncate">
                {mvpRound?.playerCard.title || 'N/A'}
              </div>
              <div className="text-[11px] font-mono text-emerald-300 mt-0.5">
                {mvpRound ? `${mvpRound.playerScore} pts • ${mvpRound.stage.shortName}` : ''}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950 border border-emerald-500/40 p-4 text-center">
              <div className="text-[10px] font-mono uppercase text-slate-400">
                PRÉCISION QUIZ CULTURE VÉLO
              </div>
              <div className="text-xl font-mono font-black text-emerald-400 mt-1 tabular-nums">
                {quizOkCount} / 5
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {Math.round((quizOkCount / 5) * 100)}% de réussite tactique
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-2.5 sm:gap-3 mt-6">
            <button
              type="button"
              onClick={() => startNewMatch(selectedOpponent)}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition"
            >
              Revanche Immédiate
            </button>
            <button
              type="button"
              onClick={handleCopyPalmares}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow transition"
            >
              <ShareIcon className="w-3.5 h-3.5" />
              <span>
                {copiedRecap
                  ? 'Palmarès copié !'
                  : 'Copier le Palmarès (Twitch / Discord)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setDuelPhase('LOBBY');
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs border border-slate-700 transition"
            >
              Changer d’Adversaire IA
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            Feuille de Route des 5 Étapes
          </h3>
          <div className="space-y-2.5">
            {roundHistory.map((item) => (
              <div
                key={item.roundNumber}
                className="rounded-xl bg-slate-950 border border-slate-800 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-amber-400">
                    Étape {item.roundNumber}/5 • {item.stage.name}
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                    {item.stage.favoredDiscipline} • {item.stage.modifierTitle}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
                  <span className="text-emerald-300 font-bold">
                    Vous : {item.playerCard.title} ({item.playerScore} pts
                    {item.playerQuizSuccess
                      ? item.playerQuizMode === 'ATTACK'
                        ? ' [SNAP]'
                        : ' [QUIZ]'
                      : ''}
                    )
                  </span>
                  <span className="text-slate-500">vs</span>
                  <span className="text-rose-300 font-bold">
                    IA : {item.aiCard.title} ({item.aiScore} pts)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-black ${
                      item.winner === 'PLAYER'
                        ? 'bg-emerald-500 text-slate-950'
                        : item.winner === 'AI'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {item.winner === 'PLAYER'
                      ? 'GAGNÉ'
                      : item.winner === 'AI'
                      ? 'PERDU'
                      : 'ÉGALITÉ'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentStage) return null;
  const stageDiscInfo = DISCIPLINE_CONFIG[currentStage.favoredDiscipline];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Roadbook des 5 Étapes (bandeau snap scrollable sur téléphone) */}
      <div className="flex sm:grid sm:grid-cols-5 gap-2 overflow-x-auto no-scrollbar snap-x pb-1">
        {stages.map((st, idx) => {
          const hist = roundHistory.find((r) => r.roundNumber === idx + 1);
          const isCurrent = idx === currentRoundIdx;
          const dConf = DISCIPLINE_CONFIG[st.favoredDiscipline];

          return (
            <div
              key={`${st.id}-${idx}`}
              className={`min-w-[140px] sm:min-w-0 shrink-0 snap-center rounded-xl p-2.5 border text-left transition ${
                isCurrent
                  ? 'bg-slate-900 border-amber-400 shadow-lg'
                  : hist
                  ? hist.winner === 'PLAYER'
                    ? 'bg-emerald-950/35 border-emerald-500/40'
                    : hist.winner === 'AI'
                    ? 'bg-rose-950/35 border-rose-500/40'
                    : 'bg-slate-900 border-slate-700'
                  : 'bg-slate-900/60 border-slate-800 opacity-85'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono font-black">
                <span className={isCurrent ? 'text-amber-400' : 'text-slate-400'}>
                  ÉTAPE {idx + 1}
                </span>
                <span className={dConf.color}>{st.favoredDiscipline}</span>
              </div>
              <div className="text-[11px] font-bold text-white truncate mt-0.5">
                {st.modifierTitle}
              </div>
              {hist ? (
                <div className="text-[10px] font-mono mt-1 font-bold tabular-nums">
                  <span
                    className={
                      hist.winner === 'PLAYER'
                        ? 'text-emerald-400'
                        : hist.winner === 'AI'
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }
                  >
                    {hist.playerScore} - {hist.aiScore} (
                    {hist.winner === 'PLAYER'
                      ? 'V'
                      : hist.winner === 'AI'
                      ? 'D'
                      : '='}
                    )
                  </span>
                </div>
              ) : (
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  {isCurrent ? 'EN COURS' : `Énergie : ${2 + idx + 1} W`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tableau d'affichage Broadcast TV */}
      <div className="rounded-3xl bg-slate-900 border border-slate-700 p-4 sm:p-5 shadow-xl space-y-3 bg-asphalt-grid">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-mono font-black text-xs shrink-0">
              ÉTAPE {roundNumber} / 5
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-black text-white tracking-tight truncate">
                {currentStage.name}
              </h2>
              <p className="text-xs text-slate-400 truncate">{currentStage.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
            <div className="px-3.5 py-2 rounded-2xl bg-cyan-500/15 border border-cyan-400/50 text-center">
              <div className="text-[10px] font-mono text-cyan-300 uppercase font-bold">
                Énergie Tour
              </div>
              <div className="text-base font-black text-white font-mono tabular-nums">
                {energyAvailable} W
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
              <div className="text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  Vous
                </div>
                <div className="text-xl font-black text-emerald-400 font-mono tabular-nums">
                  {playerWinsCount}
                </div>
              </div>
              <div className="text-xs font-mono font-bold text-slate-500">VS</div>
              <div className="text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  {selectedOpponent.codeBadge}
                </div>
                <div className="text-xl font-black text-rose-400 font-mono tabular-nums">
                  {aiWinsCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-7 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${stageDiscInfo.bgSoft} ${stageDiscInfo.color} ${stageDiscInfo.borderSoft}`}
              >
                <DisciplineIcon
                  discipline={currentStage.favoredDiscipline}
                  className="w-3 h-3"
                />
                <span>
                  Discipline : {currentStage.favoredDiscipline} (+
                  {currentStage.terrainBonusPct}%)
                </span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-200 text-xs font-bold">
                Règle : {currentStage.modifierTitle}
              </span>
            </div>
            <p className="text-xs text-amber-200 font-semibold">
              Modificateur d’étape : {currentStage.modifierRule}
            </p>
            {playerCarryBonus > 0 && duelPhase === 'SELECT_CARD' && (
              <div className="inline-block px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold">
                Relais activé : +{playerCarryBonus} pts transmis à votre prochaine carte !
              </div>
            )}
          </div>

          <div className="md:col-span-5 grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center text-xs">
            <div>
              <span className="text-amber-300 font-mono font-bold block">PUI</span>
              <span className="font-mono font-black text-white tabular-nums">
                {Math.round(currentStage.statWeights.power * 100)}%
              </span>
            </div>
            <div>
              <span className="text-cyan-300 font-mono font-bold block">TEC</span>
              <span className="font-mono font-black text-white tabular-nums">
                {Math.round(currentStage.statWeights.technique * 100)}%
              </span>
            </div>
            <div>
              <span className="text-emerald-300 font-mono font-bold block">END</span>
              <span className="font-mono font-black text-white tabular-nums">
                {Math.round(currentStage.statWeights.endurance * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SOUS-PHASE A : CHOIX DE LA CARTE */}
      {duelPhase === 'SELECT_CARD' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-black text-white">
              Choisissez votre carte pour l’Étape {roundNumber} (Plafond tour : {energyAvailable} W)
            </h3>
            <span className="text-xs text-emerald-400 font-semibold">
              Économiser de l’énergie accorde +2 pts d’Élan par W non dépensé
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
            {playerHand.map((card) => {
              const isPlayable = playableCardIds.has(card.id);
              const bonusPct = getCardTerrainBonusPct(card, currentStage);
              const cached = card.wikiSlug ? wikiCache[card.wikiSlug] : undefined;
              const energySaved = Math.max(0, energyAvailable - card.energyCost);

              return (
                <CyclingCard
                  key={card.id}
                  card={card}
                  liveImageUrl={cached?.thumbnailUrl}
                  starLevel={cardStars[card.id] || 0}
                  terrainBonusPct={bonusPct}
                  isEnergyBlocked={!isPlayable}
                  onClick={() => handleChooseCardForRound(card)}
                  actionButton={{
                    label: !isPlayable
                      ? `Requis ${card.energyCost} W (Dispo ${energyAvailable} W)`
                      : bonusPct > 0
                      ? `Engager (+${bonusPct}% Terrain)`
                      : energySaved > 0
                      ? `Engager (+${energySaved * 2} pts Élan)`
                      : 'Engager cette carte',
                    variant: bonusPct > 0 ? 'amber' : 'primary',
                    disabled: !isPlayable,
                    onAction: (e: any) => {
                      e.stopPropagation();
                      handleChooseCardForRound(card);
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* SOUS-PHASE B : FACE-À-FACE + QUIZ */}
      {duelPhase === 'QUIZ_ATTACK' &&
        chosenPlayerCard &&
        chosenAiCard &&
        activeQuiz && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            <div className="lg:col-span-5 grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <div className="text-xs font-mono font-extrabold text-emerald-400 uppercase mb-1.5 text-center">
                  Votre Carte Engagée
                </div>
                <CyclingCard
                  card={chosenPlayerCard}
                  liveImageUrl={
                    chosenPlayerCard.wikiSlug
                      ? wikiCache[chosenPlayerCard.wikiSlug]?.thumbnailUrl
                      : undefined
                  }
                  starLevel={cardStars[chosenPlayerCard.id] || 0}
                  terrainBonusPct={getCardTerrainBonusPct(
                    chosenPlayerCard,
                    currentStage
                  )}
                  compact={true}
                />
              </div>

              <div>
                <div className="text-xs font-mono font-extrabold text-rose-400 uppercase mb-1.5 text-center">
                  Adversaire ({selectedOpponent.codeBadge})
                </div>
                <CyclingCard
                  card={chosenAiCard}
                  liveImageUrl={
                    chosenAiCard.wikiSlug
                      ? wikiCache[chosenAiCard.wikiSlug]?.thumbnailUrl
                      : undefined
                  }
                  terrainBonusPct={getCardTerrainBonusPct(
                    chosenAiCard,
                    currentStage
                  )}
                  compact={true}
                />
              </div>
            </div>

            <div className="lg:col-span-7 rounded-3xl bg-slate-900 border-2 border-amber-400/80 p-4 sm:p-5 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] sm:text-xs uppercase tracking-wider">
                  <BrainQuizIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>QUIZ TACTIQUE • PRISE DE RISQUE</span>
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Étape {roundNumber}/5
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setQuizRiskMode('SAFE');
                  }}
                  className={`min-h-[46px] p-3 rounded-xl border text-left active:scale-95 transition ${
                    quizRiskMode === 'SAFE'
                      ? 'bg-emerald-950/60 border-emerald-400 shadow'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-black text-emerald-300">
                    Allure Contrôlée (Sûre)
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Bonne réponse : <strong>+15% Score &amp; +{ECONOMY_CONFIG.DUEL_QUIZ_REWARD_SAFE} W</strong> • Erreur : 0 pénalité
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setQuizRiskMode('ATTACK');
                  }}
                  className={`min-h-[46px] p-3 rounded-xl border text-left active:scale-95 transition ${
                    quizRiskMode === 'ATTACK'
                      ? 'bg-amber-950/70 border-amber-400 shadow-lg'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-black text-amber-300">
                    Attaque / Coup de Bordure (Snap)
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Bonne réponse : <strong>+30% Score, +{ECONOMY_CONFIG.DUEL_QUIZ_REWARD_ATTACK} W &amp; Effet ×1.5</strong> • Erreur : -10%
                  </div>
                </button>
              </div>

              <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug pt-1">
                {activeQuiz.questionText}
              </h3>

              {activeQuiz.contextExcerpt && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed italic">
                  {activeQuiz.contextExcerpt}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeQuiz.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAnswerRoundQuiz(idx)}
                    className="min-h-[46px] p-3.5 rounded-xl border bg-slate-800 hover:bg-slate-700 hover:border-amber-400 active:scale-95 border-slate-700 text-white text-left text-xs font-bold transition"
                  >
                    <span className="font-mono text-amber-300 mr-2">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      {/* SOUS-PHASE C : RÉSULTAT DÉTAILLÉ DE LA MANCHE */}
      {duelPhase === 'ROUND_RESULT' && lastRoundResult && activeQuiz && (
        <div className="rounded-3xl bg-slate-900 border-2 border-slate-700 p-4 sm:p-6 shadow-2xl space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-black ${
                    lastRoundResult.winner === 'PLAYER'
                      ? 'bg-emerald-500 text-slate-950'
                      : lastRoundResult.winner === 'AI'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-700 text-white'
                  }`}
                >
                  {lastRoundResult.winner === 'PLAYER'
                    ? `ÉTAPE ${lastRoundResult.roundNumber} REMPORTÉE`
                    : lastRoundResult.winner === 'AI'
                    ? `ÉTAPE ${lastRoundResult.roundNumber} CONCÉDÉE`
                    : `PHOTO-FINISH SUR L’ÉTAPE ${lastRoundResult.roundNumber}`}
                </span>

                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    lastRoundResult.playerQuizSuccess
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {lastRoundResult.playerQuizSuccess
                    ? lastRoundResult.playerQuizMode === 'ATTACK'
                      ? `Attaque Risquée Réussie (+${ECONOMY_CONFIG.DUEL_QUIZ_REWARD_ATTACK} W & Effet ×1.5)`
                      : `Quiz Réussi (+${ECONOMY_CONFIG.DUEL_QUIZ_REWARD_SAFE} W)`
                    : lastRoundResult.playerQuizMode === 'ATTACK'
                    ? 'Attaque Risquée Manquée (-10%)'
                    : 'Quiz Manqué (0 pénalité)'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2">{activeQuiz.explanation}</p>
            </div>

            <button
              type="button"
              onClick={handleProceedAfterRound}
              className="w-full sm:w-auto min-h-[46px] px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm shadow-lg transition shrink-0"
            >
              {currentRoundIdx + 1 >= 5
                ? 'Voir le Podium Final'
                : `Étape ${currentRoundIdx + 2} / 5`}
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-black font-mono tabular-nums">
              <span className="text-emerald-400">
                VOUS : {lastRoundResult.playerScore} pts
              </span>
              <span className="text-rose-400">
                {selectedOpponent.codeBadge} : {lastRoundResult.aiScore} pts
              </span>
            </div>
            <div className="w-full h-3 bg-rose-600/80 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-400 transition-all duration-500"
                style={{
                  width: `${Math.round(
                    (lastRoundResult.playerScore /
                      Math.max(
                        1,
                        lastRoundResult.playerScore + lastRoundResult.aiScore
                      )) *
                      100
                  )}%`
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-slate-950 border border-emerald-500/40 p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-sm font-black text-white">
                  {lastRoundResult.playerCard.title} (Vous)
                </span>
                <span className="text-lg font-black text-emerald-400 font-mono tabular-nums">
                  {lastRoundResult.playerScore} pts
                </span>
              </div>
              <div className="space-y-1 text-xs">
                {lastRoundResult.playerLines.map((line, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-slate-300">{line.label}</span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        line.tone === 'positive'
                          ? 'text-emerald-400'
                          : line.tone === 'special'
                          ? 'text-amber-300'
                          : line.tone === 'negative'
                          ? 'text-rose-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {line.value > 0 && line.tone !== 'neutral'
                        ? `+${line.value}`
                        : line.value}
                    </span>
                  </div>
                ))}
              </div>
              {lastRoundResult.playerNextAllyBonus > 0 && (
                <div className="pt-2 border-t border-slate-800 text-[11px] font-bold text-emerald-300">
                  Relais activé : +{lastRoundResult.playerNextAllyBonus} pts transmis à votre prochaine carte
                </div>
              )}
              {lastRoundResult.playerDebuffInflicted > 0 && (
                <div className="pt-1 text-[11px] font-bold text-amber-300">
                  Attaque infligée : -{lastRoundResult.playerDebuffInflicted} pts retirés à l’adversaire
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-slate-950 border border-rose-500/40 p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-sm font-black text-white">
                  {lastRoundResult.aiCard.title} ({selectedOpponent.name})
                </span>
                <span className="text-lg font-black text-rose-400 font-mono tabular-nums">
                  {lastRoundResult.aiScore} pts
                </span>
              </div>
              <div className="space-y-1 text-xs">
                {lastRoundResult.aiLines.map((line, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-slate-300">{line.label}</span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        line.tone === 'positive'
                          ? 'text-emerald-400'
                          : line.tone === 'special'
                          ? 'text-amber-300'
                          : line.tone === 'negative'
                          ? 'text-rose-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {line.value > 0 && line.tone !== 'neutral'
                        ? `+${line.value}`
                        : line.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
