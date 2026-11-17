import React, { useState, useEffect } from 'react';
import { WikiCard } from '../types/game';
import { RARITY_CONFIG, DISCIPLINE_CONFIG } from '../data/cardsDatabase';
import { getEffectiveCardStats } from '../utils/cardEffects';
import { CardVisualArt } from './CardVisualArt';
import {
  BoltWattIcon,
  StarIcon,
  ShieldIcon,
  DisciplineIcon
} from './SportIcons';

export interface CyclingCardProps {
  card: WikiCard;
  liveImageUrl?: string;
  count?: number;
  starLevel?: number;
  isLocked?: boolean;
  isNew?: boolean;
  isInDeck?: boolean;
  isSelected?: boolean;
  isEnergyBlocked?: boolean;
  terrainBonusPct?: number;
  compact?: boolean;
  onClick?: () => void;
  actionButton?: {
    label: string;
    onAction: (e: any) => void;
    variant?: 'primary' | 'danger' | 'amber';
    disabled?: boolean;
  };
}

export function CyclingCard({
  card,
  liveImageUrl,
  count = 1,
  starLevel = 0,
  isLocked = false,
  isNew = false,
  isInDeck = false,
  isSelected = false,
  isEnergyBlocked = false,
  terrainBonusPct = 0,
  compact = false,
  onClick,
  actionButton
}: CyclingCardProps) {
  const [tiltStyle, setTiltStyle] = useState<any>({});
  const [glareStyle, setGlareStyle] = useState<any>({ opacity: 0 });

  useEffect(() => {
    setTiltStyle({});
    setGlareStyle({ opacity: 0 });
  }, [card.id]);

  const rarityInfo = RARITY_CONFIG[card.rarity];
  const discInfo = DISCIPLINE_CONFIG[card.discipline];
  const effStats = getEffectiveCardStats(card, starLevel);
  const isHolo =
    !isLocked &&
    (starLevel >= 2 ||
      card.rarity === 'Légendaire' ||
      card.rarity === 'Épique' ||
      card.rarity === 'Rare');
  const isRainbow = card.rarity === 'Légendaire' && !isLocked;

  const handleMouseMove = (e: any) => {
    if (isLocked || compact) return;
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      !window.matchMedia('(hover: hover)').matches
    ) {
      return;
    }
    const rect = e.currentTarget?.getBoundingClientRect?.();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotY = (px - 0.5) * 14;
    const rotX = (0.5 - py) * 12;
    setTiltStyle({
      transform: `perspective(850px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) scale(1.02)`,
      transition: 'transform 80ms ease-out'
    });
    setGlareStyle({
      opacity: isHolo ? 0.55 : 0.25,
      background: `radial-gradient(circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(255,255,255,0.42) 0%, rgba(250,204,21,0.12) 32%, transparent 70%)`
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(850px) rotateX(0deg) rotateY(0deg) scale(1)',
      transition: 'transform 220ms ease-out'
    });
    setGlareStyle({ opacity: 0, transition: 'opacity 220ms ease-out' });
  };

  const renderStars = () => {
    if (starLevel <= 0) return null;
    const items = [];
    for (let i = 0; i < starLevel; i++) {
      items.push(<StarIcon key={i} className="w-2.5 h-2.5 text-amber-300" />);
    }
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-400/60">
        {items}
      </span>
    );
  };

  const btnBg =
    actionButton?.variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500 text-white'
      : actionButton?.variant === 'amber'
      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950';

  return (
    <div
      onClick={isEnergyBlocked ? undefined : onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...tiltStyle,
        boxShadow:
          !isLocked && !isRainbow
            ? `0 10px 26px -10px ${rarityInfo.glowColor}`
            : undefined
      }}
      className={`group relative rounded-2xl border-2 overflow-hidden flex flex-col justify-between select-none touch-manipulation transition duration-200 ${
        compact ? 'h-[280px] sm:h-[310px]' : 'h-[310px] sm:h-[370px]'
      } ${
        isRainbow
          ? 'uci-rainbow-border bg-slate-950'
          : `${rarityInfo.borderClass} bg-slate-900`
      } ${isLocked ? 'opacity-55' : ''} ${
        isSelected ? 'ring-2 ring-amber-400 scale-[1.02]' : ''
      } ${
        isEnergyBlocked
          ? 'opacity-55 cursor-not-allowed'
          : onClick
          ? 'cursor-pointer active:scale-95'
          : ''
      }`}
    >
      {/* Top UCI / Broadcast Accent Strip */}
      <div
        className={`h-1.5 w-full shrink-0 ${isRainbow ? 'uci-rainbow-stripe' : ''}`}
        style={isRainbow ? undefined : { backgroundColor: discInfo.accentHex }}
      />

      {/* Glare & Foil Prism Sheen Overlay */}
      {isHolo && (
        <div
          className="pointer-events-none absolute inset-0 z-20 foil-prism-sheen"
          aria-hidden="true"
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={glareStyle}
        aria-hidden="true"
      />

      {/* Card Body */}
      <div className="relative z-10 flex flex-col flex-1 min-h-0 p-2 sm:p-2.5 gap-1.5 sm:gap-2">
        {/* Header Bar: Card Number + Discipline + Energy + OVR */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-[10px] font-mono font-bold text-slate-300 tabular-nums">
              #{String(card.cardNumber).padStart(3, '0')}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate ${discInfo.bgSoft} ${discInfo.borderSoft} ${discInfo.color}`}
            >
              <DisciplineIcon discipline={card.discipline} className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{discInfo.shortLabel}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {renderStars()}
            <span
              title={`Coût : ${card.energyCost} Watts d'énergie`}
              className="inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded bg-slate-950 border border-cyan-500/40 text-cyan-300 font-mono font-black text-[10px] sm:text-[11px] tabular-nums"
            >
              <span>{card.energyCost}</span>
              <BoltWattIcon className="w-2.5 h-2.5" />
            </span>
            <span className="px-1 sm:px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-black text-[10px] sm:text-[11px] tabular-nums">
              {effStats.overall}
            </span>
          </div>
        </div>

        {/* Status Badges Overlay Row */}
        {(isNew || isInDeck || terrainBonusPct > 0 || count > 1 || isLocked) && (
          <div className="flex flex-wrap items-center gap-1 -mt-0.5">
            {isNew && (
              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[8px] sm:text-[9px] font-black uppercase tracking-wider">
                NOUVEAU
              </span>
            )}
            {isInDeck && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">
                TITULAIRE
              </span>
            )}
            {terrainBonusPct > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-[8px] sm:text-[9px] font-mono font-bold">
                +{terrainBonusPct}% TERRAIN
              </span>
            )}
            {count > 1 && (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-200 text-[8px] sm:text-[9px] font-mono font-bold">
                x{count}
              </span>
            )}
            {isLocked && (
              <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-400 text-[8px] sm:text-[9px] font-mono font-bold uppercase">
                VERROUILLÉE
              </span>
            )}
          </div>
        )}

        {/* Art Window */}
        <div className={`relative w-full rounded-xl overflow-hidden border border-slate-700/70 bg-slate-950 ${compact ? 'h-20 sm:h-24' : 'h-24 sm:h-32'} shrink-0`}>
          {isLocked ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/90 text-slate-600">
              <ShieldIcon className="w-6 h-6 sm:w-7 sm:h-7 mb-1" />
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest">
                CARTE À DÉBLOQUER
              </span>
            </div>
          ) : (
            <CardVisualArt card={card} liveImageUrl={liveImageUrl} />
          )}

          {/* Rarity Tag top-right inside art */}
          <span
            className={`absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded border text-[8px] sm:text-[9px] font-black uppercase tracking-wider backdrop-blur-sm bg-slate-950/80 ${rarityInfo.borderClass} ${rarityInfo.textColor}`}
          >
            {card.rarity}
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="min-w-0">
          <h3 className="text-xs sm:text-sm font-black text-white leading-tight truncate tracking-tight">
            {isLocked ? '??? (Profil Masqué)' : card.title}
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
            {isLocked ? `${card.discipline} • ${card.category}` : card.subtitle}
          </p>
        </div>

        {/* Keyword & Effect Strip */}
        <div className="rounded-lg bg-slate-950/85 border border-slate-800 px-1.5 sm:px-2 py-0.5 sm:py-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-amber-300 shrink-0">
              [{card.keyword}]
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-200 truncate">
              {isLocked ? 'Effet au déblocage' : card.specialTrait}
            </span>
          </div>
        </div>

        {/* Bottom 3-Stat Telemetry Bar */}
        <div className="grid grid-cols-3 gap-1 sm:gap-1.5 mt-auto">
          <div className="rounded-lg bg-slate-950 border border-slate-800 px-1 sm:px-1.5 py-1 text-center">
            <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">
              PUI
            </span>
            <span className="text-[11px] sm:text-xs font-mono font-black text-amber-300 tabular-nums">
              {isLocked ? '--' : effStats.power}
            </span>
          </div>
          <div className="rounded-lg bg-slate-950 border border-slate-800 px-1 sm:px-1.5 py-1 text-center">
            <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">
              TEC
            </span>
            <span className="text-[11px] sm:text-xs font-mono font-black text-cyan-300 tabular-nums">
              {isLocked ? '--' : effStats.technique}
            </span>
          </div>
          <div className="rounded-lg bg-slate-950 border border-slate-800 px-1 sm:px-1.5 py-1 text-center">
            <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">
              END
            </span>
            <span className="text-[11px] sm:text-xs font-mono font-black text-emerald-300 tabular-nums">
              {isLocked ? '--' : effStats.endurance}
            </span>
          </div>
        </div>

        {/* Optional Action Footer */}
        {actionButton && (
          <button
            type="button"
            disabled={actionButton.disabled}
            onClick={(e: any) => {
              e.stopPropagation();
              actionButton.onAction(e);
            }}
            className={`w-full min-h-[34px] py-1.5 px-1.5 sm:px-2 rounded-xl font-black text-[10px] sm:text-xs leading-tight active:scale-95 transition ${
              actionButton.disabled
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : btnBg
            }`}
          >
            {actionButton.label}
          </button>
        )}
      </div>
    </div>
  );
}
