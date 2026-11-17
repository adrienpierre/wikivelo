import React from 'react';
import { Discipline } from '../types/game';

interface IconProps {
  className?: string;
}

export function WheelLogoIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <line x1="12" y1="3" x2="12" y2="9.5" />
      <line x1="12" y1="14.5" x2="12" y2="21" />
      <line x1="4.2" y1="7.5" x2="9.8" y2="10.7" />
      <line x1="14.2" y1="13.3" x2="19.8" y2="16.5" />
      <line x1="19.8" y1="7.5" x2="14.2" y2="10.7" />
      <line x1="9.8" y1="13.3" x2="4.2" y2="16.5" />
    </svg>
  );
}

export function BoltWattIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13 2L4 14h6.5l-1.5 8L19 10h-6.5L13 2z" />
    </svg>
  );
}

export function BidonIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 3h4v2l2 2v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V7l2-2V3z" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="11" y1="1.5" x2="13" y2="1.5" />
    </svg>
  );
}

export function TrophyIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 4h12v5a6 6 0 0 1-12 0V4z" />
      <path d="M6 6H3v2a3 3 0 0 0 3 3" />
      <path d="M18 6h3v2a3 3 0 0 1-3 3" />
      <line x1="12" y1="15" x2="12" y2="19" />
      <path d="M8 21h8" />
    </svg>
  );
}

export function BoosterPackIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3h12l-1 3 1 15H6l1-15-1-3z" />
      <line x1="6.5" y1="7" x2="17.5" y2="7" />
      <polygon points="12,10 13.8,13.5 17.5,14 14.8,16.5 15.5,20 12,18.2 8.5,20 9.2,16.5 6.5,14 10.2,13.5" />
    </svg>
  );
}

export function BookAlbumIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="3" x2="8" y2="21" />
      <rect x="11" y="7" width="6" height="4" rx="0.5" />
      <line x1="11" y1="14" x2="17" y2="14" />
      <line x1="11" y1="17" x2="15" y2="17" />
    </svg>
  );
}

export function SquadDeckIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="7" width="11" height="14" rx="2" />
      <path d="M9 5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-1" />
      <line x1="6" y1="12" x2="11" y2="12" />
      <line x1="6" y1="15" x2="10" y2="15" />
    </svg>
  );
}

export function DuelFlagIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 21V4" />
      <path d="M4 5h12l-2 4 2 4H4" />
      <circle cx="17" cy="17" r="4" />
      <polyline points="17 15 17 17 18.5 18" />
    </svg>
  );
}

export function BrainQuizIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 .8c0 1.7-2.5 2.2-2.5 3.7" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function SpeakerIcon({ enabled, className = 'w-4 h-4' }: { enabled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {enabled ? (
        <>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      ) : (
        <>
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </>
      )}
    </svg>
  );
}

export function ShieldIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
    </svg>
  );
}

export function StarIcon({ className = 'w-3.5 h-3.5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function ShareIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function DisciplineIcon({
  discipline,
  className = 'w-4 h-4'
}: {
  discipline: Discipline;
  className?: string;
}) {
  if (discipline === 'Route') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 19l6-11 4 6 3-5 5 10H3z" />
      </svg>
    );
  }
  if (discipline === 'VTT') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="12 3 6 13 18 13" />
        <polygon points="12 9 4 19 20 19" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    );
  }
  if (discipline === 'Piste') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <ellipse cx="12" cy="12" rx="9" ry="5.5" />
        <ellipse cx="12" cy="12" rx="4.5" ry="2.2" />
      </svg>
    );
  }
  if (discipline === 'Cyclo-cross') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 17l4-4 3 2 4-5 5 7" />
        <path d="M3 20h18" />
        <circle cx="7" cy="7" r="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M6 12h12" />
      <path d="M12 6v12" />
    </svg>
  );
}
