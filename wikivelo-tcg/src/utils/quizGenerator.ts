import { WikiCard, QuizQuestion, CoreDiscipline, CardCategory } from '../types/game';

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

const STOP_WORDS = new Set([
  'les', 'des', 'une', 'sur', 'par', 'aux', 'qui', 'que', 'est', 'son', 'ses',
  'dans', 'avec', 'pour', 'sans', 'sous', 'vers', 'plus', 'très', 'entre',
  'dont', 'tout', 'tous', 'elle', 'être', 'avoir', 'faire', 'tour', 'coupe',
  'vélo', 'piste', 'route', 'mont', 'côte', 'grand', 'petit', 'deux', 'trois',
  'quatre', 'cinq', 'mois', 'ans', 'monde', 'équipe', 'france', 'belgique',
  'italie', 'suisse', 'pays', 'bas', 'record', 'heure', 'sable', 'boue',
  'mur', 'dalle', 'col', 'virage', 'virages', 'fosse', 'dévers', 'course',
  'finale', 'saut', 'planches', 'portage', 'relais', 'train', 'sprint',
  'roue', 'freins', 'pignon', 'fixe', 'boyaux', 'crampons', 'tige', 'selle',
  'double', 'triple', 'champion', 'championne', 'reine', 'roi', 'maître',
  'sir', 'jean', 'julian', 'tom', 'pauline', 'chris', 'mark', 'peter',
  'sven', 'erik', 'eli', 'fem', 'lars', 'niels', 'marco', 'fausto',
  'jacques', 'bernard', 'eddy', 'tadej', 'jonas', 'remco', 'thibaut',
  'julien', 'nino', 'loïc', 'nicolas', 'myriam', 'amaury', 'victor',
  'cécile', 'rachel', 'jolanda', 'julie', 'greg', 'harrie', 'florian',
  'félicia', 'benjamin', 'filippo', 'françois', 'grégory', 'mathilde',
  'laura', 'marianne', 'wout', 'mathieu', 'lotte', 'jeannie', 'puck', 'matej',
  'van', 'der', 'de', 'la', 'du', 'le', 'en', 'au', 'et', 'ou', 'à'
]);

export function maskCardTitleInText(text: string, title: string): string {
  let masked = text;
  const escapedFull = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  masked = masked.replace(new RegExp(escapedFull, 'gi'), '[ █████ ]');

  // Extraire les mots significatifs (y compris noms courts comme Nys, Hoy, Vos, et sous-racines comme Koppenberg)
  const rawTokens = title
    .replace(/[()'’«»".,:/-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const tokensToMask = new Set<string>();
  for (const tok of rawTokens) {
    const clean = tok.trim();
    const lower = clean.toLowerCase();
    if (clean.length >= 3 && !STOP_WORDS.has(lower)) {
      tokensToMask.add(clean);
      // Gérer les mots composés type "Koppenbergcross" -> masquer aussi "Koppenberg"
      if (lower.endsWith('cross') && clean.length > 8) {
        tokensToMask.add(clean.slice(0, -5));
      }
    }
  }

  // Trier par longueur décroissante pour éviter les remplacements partiels
  const sortedTokens = Array.from(tokensToMask).sort(
    (a, b) => b.length - a.length
  );

  for (const part of sortedTokens) {
    const escapedPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    masked = masked.replace(new RegExp(`\\b${escapedPart}\\b`, 'gi'), '[ █████ ]');
  }

  return masked;
}

export interface QuizGenOptions {
  excludeCardIds?: string[];
  preferredMode?: number;
}

/**
 * Génère une question de Quiz Culture Vélo & Tactique TCG fiable, sans fuite d'indice
 * et sans répétition au sein d'un même match.
 */
export function generateCardQuizQuestion(
  focusCard: WikiCard,
  allCards: WikiCard[],
  optionsOrMode?: QuizGenOptions | number
): QuizQuestion {
  const opts: QuizGenOptions =
    typeof optionsOrMode === 'number'
      ? { preferredMode: optionsOrMode }
      : optionsOrMode || {};

  const excludeSet = new Set(opts.excludeCardIds || []);

  // Si la focusCard a déjà été questionnée dans ce match, choisir une autre carte non utilisée si possible
  let targetCard = focusCard;
  if (excludeSet.has(focusCard.id)) {
    const unusedSameDisc = allCards.filter(
      (c) => !excludeSet.has(c.id) && c.discipline === focusCard.discipline
    );
    const unusedAny = allCards.filter((c) => !excludeSet.has(c.id));
    const pool = unusedSameDisc.length > 0 ? unusedSameDisc : unusedAny;
    if (pool.length > 0) {
      targetCard = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  const otherCards = allCards.filter((c) => c.id !== targetCard.id);
  const sameCategoryPool = otherCards.filter(
    (c) => c.category === targetCard.category
  );
  const distractorSource =
    sameCategoryPool.length >= 4 ? sameCategoryPool : otherCards;

  // Vérifier si le mode Discipline/Catégorie est adapté (carte mono-discipline pour la question discipline)
  const canAskDiscipline =
    targetCard.discipline !== 'Polyvalent' &&
    targetCard.linkedDisciplines.length === 1;

  const roll =
    opts.preferredMode !== undefined
      ? opts.preferredMode % 4
      : Math.floor(Math.random() * 4);

  // Mode 0 : Texte à trous sur le Lore / Description cycliste de la carte
  if (roll === 0) {
    const distractors = shuffleArray(distractorSource)
      .slice(0, 3)
      .map((c) => c.title);
    const options = shuffleArray([targetCard.title, ...distractors]);
    const correctIndex = options.indexOf(targetCard.title);
    const clozeExcerpt = maskCardTitleInText(
      targetCard.summary,
      targetCard.title
    );

    return {
      id: `quiz-cloze-${targetCard.id}-${Date.now()}`,
      type: 'cloze',
      questionText:
        'À quelle carte du cyclisme (Athlète, Épreuve, Secteur ou Technique) correspond cette description ?',
      contextExcerpt: `« ${clozeExcerpt} »`,
      options,
      correctIndex,
      explanation: `Il s’agit de « ${targetCard.title} » (${targetCard.discipline} • ${targetCard.category}).`,
      relatedCardId: targetCard.id,
      relatedCardTitle: targetCard.title,
      relatedDiscipline: targetCard.discipline
    };
  }

  // Mode 1 : Règle technique, fait marquant ou culture vélo
  if (roll === 1) {
    const distractors = shuffleArray(distractorSource)
      .slice(0, 3)
      .map((c) => c.title);
    const options = shuffleArray([targetCard.title, ...distractors]);
    const correctIndex = options.indexOf(targetCard.title);

    return {
      id: `quiz-fact-${targetCard.id}-${Date.now()}`,
      type: 'fact',
      questionText:
        'Quel élément de l’univers du cyclisme est directement lié à ce fait ou cette règle technique ?',
      contextExcerpt: `« ${maskCardTitleInText(
        targetCard.keyFact,
        targetCard.title
      )} »`,
      options,
      correctIndex,
      explanation: `${targetCard.title} : ${targetCard.keyFact}`,
      relatedCardId: targetCard.id,
      relatedCardTitle: targetCard.title,
      relatedDiscipline: targetCard.discipline
    };
  }

  // Mode 2 : Capacité Spéciale TCG & Tactique de Course (sans fuite dans le contexte)
  if (roll === 2) {
    const distractors = shuffleArray(distractorSource)
      .slice(0, 3)
      .map((c) => c.title);
    const options = shuffleArray([targetCard.title, ...distractors]);
    const correctIndex = options.indexOf(targetCard.title);

    const maskedFact = maskCardTitleInText(targetCard.keyFact, targetCard.title);

    return {
      id: `quiz-tech-${targetCard.id}-${Date.now()}`,
      type: 'technique',
      questionText: `Dans le deck « ${targetCard.discipline} », quelle carte porte la signature « ${targetCard.specialTrait} » ?`,
      contextExcerpt: `Indice (${targetCard.category}) : ${maskedFact}`,
      options,
      correctIndex,
      explanation: `La signature « ${targetCard.specialTrait} » caractérise « ${targetCard.title} » !`,
      relatedCardId: targetCard.id,
      relatedCardTitle: targetCard.title,
      relatedDiscipline: targetCard.discipline
    };
  }

  // Mode 3 : Discipline principale ou Catégorie de la carte (100% Culture Vélo pure !)
  if (canAskDiscipline) {
    const allDiscs: CoreDiscipline[] = ['Route', 'VTT', 'Piste', 'Cyclo-cross'];
    const options = shuffleArray(allDiscs);
    const correctIndex = options.indexOf(targetCard.discipline as CoreDiscipline);

    return {
      id: `quiz-disc-${targetCard.id}-${Date.now()}`,
      type: 'matchup',
      questionText: `À quelle discipline majeure du cyclisme est rattachée la carte « ${targetCard.title} » ?`,
      contextExcerpt: `Catégorie : ${targetCard.category} • Repère : ${targetCard.keyYear}`,
      options,
      correctIndex,
      explanation: `« ${targetCard.title} » appartient à l’univers ${targetCard.discipline} (${targetCard.subtitle}).`,
      relatedCardId: targetCard.id,
      relatedCardTitle: targetCard.title,
      relatedDiscipline: targetCard.discipline
    };
  }

  // Sinon, poser la question sur la Catégorie ou le texte à trous du sous-titre/fait
  const allCats: CardCategory[] = [
    'Athlète / Légende',
    'Épreuve / Monument',
    'Terrain / Secteur',
    'Matériel & Technique'
  ];
  const options = shuffleArray(allCats);
  const correctIndex = options.indexOf(targetCard.category);

  return {
    id: `quiz-cat-${targetCard.id}-${Date.now()}`,
    type: 'matchup',
    questionText: `Dans quelle catégorie TCG classe-t-on « ${targetCard.title} » (${targetCard.discipline}) ?`,
    contextExcerpt: `Fait clé : ${maskCardTitleInText(targetCard.keyFact, targetCard.title)}`,
    options,
    correctIndex,
    explanation: `« ${targetCard.title} » est classé(e) dans « ${targetCard.category} » (${targetCard.subtitle}).`,
    relatedCardId: targetCard.id,
    relatedCardTitle: targetCard.title,
    relatedDiscipline: targetCard.discipline
  };
}
