import React, { useState, useEffect } from 'react';
import { WikiCard } from '../types/game';

let externalMediaAllowedFlag = true;

export function setExternalMediaAllowed(allowed: boolean) {
  externalMediaAllowedFlag = Boolean(allowed);
}

export function getExternalMediaAllowed(): boolean {
  return externalMediaAllowedFlag;
}

interface CardVisualArtProps {
  card: WikiCard;
  liveImageUrl?: string;
  compact?: boolean;
}

export function CardVisualArt({
  card,
  liveImageUrl,
  compact
}: CardVisualArtProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [card.id, liveImageUrl, card.imageUrl]);

  const effectiveImg =
    externalMediaAllowedFlag && !imgFailed ? card.imageUrl || liveImageUrl : undefined;

  const getPalette = () => {
    switch (card.discipline) {
      case 'Route':
        return {
          bgFrom: '#291704',
          bgVia: '#4a2505',
          bgTo: '#0c0f16',
          accent: '#f59e0b',
          secondary: '#fde047',
          surfaceLabel: 'ASPHALTE'
        };
      case 'VTT':
        return {
          bgFrom: '#05291e',
          bgVia: '#094432',
          bgTo: '#090e12',
          accent: '#10b981',
          secondary: '#6ee7b7',
          surfaceLabel: 'SINGLETRACK'
        };
      case 'Piste':
        return {
          bgFrom: '#062634',
          bgVia: '#0c4154',
          bgTo: '#0a0e17',
          accent: '#06b6d4',
          secondary: '#67e8f9',
          surfaceLabel: 'PIN 250M'
        };
      case 'Cyclo-cross':
        return {
          bgFrom: '#2a1005',
          bgVia: '#511c08',
          bgTo: '#120e0d',
          accent: '#f97316',
          secondary: '#fdba74',
          surfaceLabel: 'LABOURS'
        };
      case 'Polyvalent':
      default:
        return {
          bgFrom: '#1f162d',
          bgVia: '#2c1d3d',
          bgTo: '#0c0f17',
          accent: '#f43f5e',
          secondary: '#facc15',
          surfaceLabel: 'POLYVALENT'
        };
    }
  };

  const palette = getPalette();

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background: `linear-gradient(150deg, ${palette.bgFrom} 0%, ${palette.bgVia} 48%, ${palette.bgTo} 100%)`
      }}
    >
      <svg
        viewBox="0 0 320 200"
        className="absolute inset-0 w-full h-full object-cover opacity-90"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id={`glow-${card.id}`} cx="50%" cy="40%" r="62%">
            <stop offset="0%" stopColor={palette.accent} stopOpacity="0.42" />
            <stop offset="100%" stopColor={palette.bgTo} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="320" height="200" fill={`url(#glow-${card.id})`} />

        {/* Trame télémétrique Broadcast TV */}
        <g stroke={palette.accent} strokeOpacity="0.1" strokeWidth="1">
          <line x1="0" y1="40" x2="320" y2="40" />
          <line x1="0" y1="80" x2="320" y2="80" />
          <line x1="0" y1="120" x2="320" y2="120" />
          <line x1="0" y1="160" x2="320" y2="160" />
          <line x1="80" y1="0" x2="80" y2="200" />
          <line x1="160" y1="0" x2="160" y2="200" />
          <line x1="240" y1="0" x2="240" y2="200" />
        </g>

        {/* Décors immersifs par discipline */}
        {card.discipline === 'Route' && (
          <g>
            <polygon
              points="0,178 70,84 140,136 225,52 320,162 320,200 0,200"
              fill="#0f172a"
              fillOpacity="0.78"
            />
            <polygon
              points="225,52 200,84 250,84"
              fill="#f8fafc"
              fillOpacity="0.65"
            />
            <path
              d="M 110 200 Q 185 174 148 150 Q 118 130 185 112 Q 232 95 225 58"
              fill="none"
              stroke={palette.accent}
              strokeWidth="3"
              strokeDasharray="5 3"
              strokeOpacity="0.85"
            />
          </g>
        )}

        {card.discipline === 'VTT' && (
          <g>
            <path
              d="M0,150 Q75,112 155,142 T320,120 L320,200 L0,200 Z"
              fill="#064e3b"
              fillOpacity="0.6"
            />
            <path
              d="M0,172 Q95,142 185,168 T320,152"
              fill="none"
              stroke={palette.secondary}
              strokeWidth="1.5"
              strokeOpacity="0.35"
            />
            <polygon points="34,180 46,125 58,180" fill="#047857" />
            <polygon points="256,180 270,118 284,180" fill="#047857" />
            <polygon points="280,185 294,132 308,185" fill="#065f46" />
          </g>
        )}

        {card.discipline === 'Piste' && (
          <g>
            {/* Lattes de pin & lignes réglementaires du vélodrome */}
            <path
              d="M -20 192 Q 160 88 340 192"
              fill="none"
              stroke="#92400e"
              strokeWidth="34"
              strokeOpacity="0.52"
            />
            <path
              d="M -20 198 Q 160 94 340 198"
              fill="none"
              stroke="#090d16"
              strokeWidth="2.5"
            />
            <path
              d="M -20 186 Q 160 82 340 186"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            />
            <path
              d="M -20 171 Q 160 67 340 171"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
            />
          </g>
        )}

        {card.discipline === 'Cyclo-cross' && (
          <g>
            <path
              d="M 0 156 Q 82 114 166 148 T 320 132 L 320 200 L 0 200 Z"
              fill="#78350f"
              fillOpacity="0.72"
            />
            {/* Traces de crampons & escalier */}
            <path
              d="M 20 188 L 115 162"
              stroke="#fb923c"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              strokeOpacity="0.55"
            />
            <polyline
              points="232,188 232,175 245,175 245,162 258,162 258,149 271,149 271,136"
              fill="none"
              stroke="#fed7aa"
              strokeWidth="2.5"
              strokeOpacity="0.7"
            />
          </g>
        )}

        {card.discipline === 'Polyvalent' && (
          <g transform="rotate(-12 160 100)" opacity="0.55">
            <rect x="-40" y="114" width="400" height="6" fill="#0055A4" />
            <rect x="-40" y="120" width="400" height="6" fill="#EF4135" />
            <rect x="-40" y="126" width="400" height="6" fill="#111827" />
            <rect x="-40" y="132" width="400" height="6" fill="#FACC15" />
            <rect x="-40" y="138" width="400" height="6" fill="#16A34A" />
          </g>
        )}

        {/* Illustration vectorielle centrale quand aucune miniature photo Wikipédia */}
        {!effectiveImg && (
          <g transform="translate(160, 96)">
            <circle
              cx="-32"
              cy="18"
              r="21"
              fill="none"
              stroke={palette.accent}
              strokeWidth="3.2"
            />
            <circle cx="-32" cy="18" r="3.5" fill="#f8fafc" />
            <circle
              cx="32"
              cy="18"
              r="21"
              fill="none"
              stroke={palette.accent}
              strokeWidth="3.2"
            />
            <circle cx="32" cy="18" r="3.5" fill="#f8fafc" />
            <polygon
              points="-32,18 -5,18 14,-8 -15,-8"
              fill="none"
              stroke="#f8fafc"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <line
              x1="14"
              y1="-8"
              x2="32"
              y2="18"
              stroke="#f8fafc"
              strokeWidth="3.2"
            />
            <line
              x1="-15"
              y1="-8"
              x2="-20"
              y2="-19"
              stroke="#f8fafc"
              strokeWidth="3.2"
            />

            {card.category === 'Athlète / Légende' ? (
              <g>
                <path
                  d="M -17 -18 Q -4 -35 16 -23 L 18 -9 L -5 4 Z"
                  fill={palette.accent}
                  fillOpacity="0.92"
                />
                <circle cx="19" cy="-29" r="8" fill="#f8fafc" />
                <path
                  d="M 12 -33 Q 22 -39 28 -29 Z"
                  fill={palette.secondary}
                />
              </g>
            ) : card.category === 'Épreuve / Monument' ? (
              <g transform="translate(0, -27)">
                <polygon
                  points="0,-16 4.5,-5 17,-5 7,2.5 11,14 0,7 -11,14 -7,2.5 -17,-5 -4.5,-5"
                  fill="#facc15"
                />
              </g>
            ) : card.category === 'Matériel & Technique' ? (
              <g transform="translate(0, -27)">
                <circle
                  cx="0"
                  cy="0"
                  r="13"
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="2.8"
                  strokeDasharray="4 3"
                />
                <polygon
                  points="-3,-9 5,-2 0,-2 3,9 -5,2 0,2"
                  fill="#f8fafc"
                />
              </g>
            ) : (
              <g transform="translate(0, -25)">
                <polygon
                  points="-16,10 0,-15 16,10"
                  fill={palette.accent}
                  fillOpacity="0.45"
                  stroke="#f8fafc"
                  strokeWidth="2"
                />
              </g>
            )}
          </g>
        )}
      </svg>

      {effectiveImg && (
        <div className="absolute inset-0 flex items-center justify-center p-1">
          <img
            src={effectiveImg}
            alt={card.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover object-top rounded-lg border border-white/15"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/15 to-transparent pointer-events-none" />
        </div>
      )}

      {/* Bandeau Dossard TV Broadcast inférieur : Rôle + Code Pays / Repère */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between text-[10px] font-bold tracking-wide text-slate-100 z-10">
        <span className="px-1.5 py-0.5 rounded bg-slate-950/85 border border-white/15 backdrop-blur-sm truncate max-w-[64%] uppercase">
          {card.roleTag || card.category}
        </span>
        {!compact && (
          <span className="px-1.5 py-0.5 rounded bg-slate-950/85 border border-white/15 backdrop-blur-sm font-mono text-amber-300">
            {card.countryCode} • {card.keyYear}
          </span>
        )}
      </div>
    </div>
  );
}
