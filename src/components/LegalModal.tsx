import React, { useState, useRef } from 'react';
import { WikiCard, WikiLiveCacheMap, PlayerSaveState } from '../types/game';
import { createBackupExportJson } from '../utils/saveSecurity';
import { ShieldIcon, BookAlbumIcon, BoltWattIcon } from './SportIcons';

export type LegalTabType = 'MENTIONS' | 'CREDITS' | 'PRIVACY';

interface LegalModalProps {
  isOpen: boolean;
  initialTab: LegalTabType;
  saveState: PlayerSaveState;
  allCards: WikiCard[];
  wikiCache: WikiLiveCacheMap;
  onClose: () => void;
  onToggleWikiSync: (enabled: boolean) => void;
  onClearWikiCache: () => void;
  onImportSaveJson: (rawJson: string) => { ok: boolean; message: string };
  onEraseAllUserData: () => void;
}

export function LegalModal({
  isOpen,
  initialTab,
  saveState,
  allCards,
  wikiCache,
  onClose,
  onToggleWikiSync,
  onClearWikiCache,
  onImportSaveJson,
  onEraseAllUserData
}: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalTabType>(initialTab);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<any>(null);

  if (!isOpen) return null;

  const catalogAttributedEntries = allCards
    .filter((card) => Boolean(card.imageUrl && card.imageAttribution))
    .map((card) => ({
      key: `card:${card.id}`,
      cardTitle: card.title,
      commonsUrl: card.imageAttribution!.commonsUrl,
      attribution: card.imageAttribution!
    }));

  const seenCommonsUrls = new Set(
    catalogAttributedEntries.map((item) => item.commonsUrl)
  );

  const liveCacheAttributedEntries = Object.entries(wikiCache)
    .filter(
      ([, entry]) =>
        Boolean(entry.thumbnailUrl && entry.attribution) &&
        !seenCommonsUrls.has(entry.attribution!.commonsUrl)
    )
    .map(([slug, entry]) => {
      const card = allCards.find((c) => c.wikiSlug === slug);
      return {
        key: `wiki:${slug}`,
        cardTitle: card?.title || slug.replace(/_/g, ' '),
        commonsUrl: entry.attribution!.commonsUrl,
        attribution: entry.attribution!
      };
    });

  const attributedEntries = [
    ...catalogAttributedEntries,
    ...liveCacheAttributedEntries
  ];

  const handleExportBackup = () => {
    const json = createBackupExportJson(saveState);
    try {
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `velolegends-tcg-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusFeedback('Sauvegarde JSON exportée avec succès.');
    } catch {
      setStatusFeedback('Export préparé (téléchargement navigateur indisponible ici).');
    }
  };

  const handleFileChange = (e: any) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const res = onImportSaveJson(text);
      setStatusFeedback(res.message);
    };
    reader.readAsText(file);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e: any) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden animate-fadeIn my-2 sm:my-auto max-h-[92dvh] flex flex-col"
      >
        <div className="uci-rainbow-stripe h-1.5 w-full shrink-0" />

        {/* Header sticky de la modale */}
        <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-slate-800 shrink-0 space-y-3 bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
                <ShieldIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-black text-white truncate">
                  Légal, Crédits &amp; Confidentialité
                </h2>
                <p className="text-[11px] text-slate-400 truncate">
                  VeloLegends TCG • Jeu indépendant gratuit et non officiel
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs shrink-0"
            >
              Fermer
            </button>
          </div>

          {/* Sub-Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {(
              [
                { id: 'MENTIONS', label: 'Mentions Légales' },
                {
                  id: 'CREDITS',
                  label: `Crédits & Licences (${attributedEntries.length} média${
                    attributedEntries.length > 1 ? 's' : ''
                  })`
                },
                { id: 'PRIVACY', label: 'Confidentialité / RGPD' }
              ] as Array<{ id: LegalTabType; label: string }>
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id);
                  setStatusFeedback(null);
                }}
                className={`shrink-0 min-h-[38px] px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition active:scale-95 ${
                  activeTab === t.id
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0">

          {/* TAB 1: MENTIONS LEGALES */}
          {activeTab === 'MENTIONS' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                <h3 className="text-sm font-black text-white">
                  1. Éditeur du site (Application Web)
                </h3>
                <p>
                  <strong className="text-amber-300">Nom / Pseudonyme / Raison sociale :</strong>{' '}
                  [À compléter : Votre Nom, Prénom ou Dénomination]
                </p>
                <p>
                  <strong className="text-amber-300">Responsable de publication :</strong>{' '}
                  [À compléter : Nom du directeur de publication]
                </p>
                <p>
                  <strong className="text-amber-300">Contact électronique :</strong>{' '}
                  [À compléter : contact@votre-domaine.fr]
                </p>
                <p>
                  <strong className="text-amber-300">Statut :</strong> Projet ludique et éducatif indépendant (sans vente d’objets contre argent réel).
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                <h3 className="text-sm font-black text-white">
                  2. Hébergement technique
                </h3>
                <p>
                  <strong className="text-amber-300">Hébergeur :</strong>{' '}
                  Netlify, Inc.
                </p>
                <p>
                  <strong className="text-amber-300">Adresse &amp; Contact hébergeur :</strong>{' '}
                  512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis •{' '}
                  <a
                    href="https://www.netlify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:underline"
                  >
                    https://www.netlify.com
                  </a>
                </p>
              </div>

              <div className="rounded-2xl bg-amber-950/25 border border-amber-500/40 p-4 space-y-2">
                <h3 className="text-sm font-black text-amber-300">
                  3. Propriété Intellectuelle & Avertissement d’Indépendance
                </h3>
                <p>
                  <strong>VeloLegends TCG</strong> est une création de fan indépendante, gratuite et non officielle à vocation ludique et culturelle sur l’histoire du cyclisme (Route, VTT, Piste et Cyclo-cross).
                </p>
                <p>
                  Ce site n’est <strong>ni affilié, ni parrainé, ni approuvé</strong> par l’Union Cycliste Internationale (UCI), Amaury Sport Organisation (ASO), Flanders Classics, les fédérations nationales, ni par aucune équipe, marque commerciale de cycle ou personnalité mentionnée à titre encyclopédique dans le jeu et son quiz. Tous les scores, énergies et mécaniques de cartes sont des données fictives créées pour l’équilibrage ludique.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: CREDITS & LICENCES */}
          {activeTab === 'CREDITS' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <BookAlbumIcon className="w-4 h-4 text-amber-400" />
                  <span>Actifs Visuels, Audio & Code Source Intégrés</span>
                </h3>
                <ul className="space-y-1.5 list-disc pl-4">
                  <li>
                    <strong>Illustrations SVG des cartes & icônes UI</strong> (<code>CardVisualArt.tsx</code>, <code>SportIcons.tsx</code>, <code>favicon.svg</code>) : Visuels vectoriels originaux générés localement pour le projet (aucun logo protégé reproduit, zéro hotlink commercial).
                  </li>
                  <li>
                    <strong>Synthèse sonore Web Audio</strong> (<code>soundService.ts</code>) : Bruitages générés mathématiquement par oscillateurs navigateur (aucun fichier sonore tiers).
                  </li>
                  <li>
                    <strong>Typographies</strong> : Polices système locales natives (zéro appel serveur de polices externe, zéro transfert d’adresse IP tiers).
                  </li>
                  <li>
                    <strong>Moteur d’interface</strong> : Code TypeScript / React autonome compilé localement sans dépendance réseau d’exécution tierce.
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-white">
                    Photographies Wikimedia Commons Chargées (Licences Libres Vérifiées)
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                    FILTRE STRICT : CC0 / PD / CC BY / CC BY-SA
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Lorsque la synchronisation optionnelle est active, seules les images vérifiées sous licence libre (sans clause NC/ND ni Fair Use) via l’API Wikimedia Commons sont conservées avec leur attribution ci-dessous. En cas d’absence ou d’exclusion, le jeu affiche l’illustration SVG locale.
                </p>

                {attributedEntries.length === 0 ? (
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 text-center text-slate-400">
                    Aucune photographie externe chargée actuellement — affichage 100 % vectoriel SVG local actif.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {attributedEntries.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">
                            {item.cardTitle}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            Auteur : {item.attribution.author} • Licence :{' '}
                            <span className="text-emerald-300 font-semibold">
                              {item.attribution.licenseShortName}
                            </span>
                          </div>
                        </div>
                        <a
                          href={item.attribution.commonsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-[11px]"
                        >
                          Source Commons
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACY & RGPD */}
          {activeTab === 'PRIVACY' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                <h3 className="text-sm font-black text-white">
                  Politique de Confidentialité (Conforme RGPD)
                </h3>
                <ul className="space-y-1.5 list-disc pl-4">
                  <li>
                    <strong>Stockage 100 % local :</strong> Votre collection, vos Watts, votre deck et vos statistiques sont enregistrés uniquement dans le <code>localStorage</code> de votre navigateur (clé <code>velolegends_tcg_save_v4</code>). Aucune donnée n’est envoyée sur un serveur de jeu ou une base de données distante.
                  </li>
                  <li>
                    <strong>Zéro cookie traceur ni publicité :</strong> Ce site n’utilise aucun cookie analytique, publicitaire ou de pistage inter-sites.
                  </li>
                  <li>
                    <strong>Requêtes externes optionnelles :</strong> Si l’option Wikimedia ci-dessous est activée, votre navigateur interroge directement les API publiques de Wikipédia FR et Wikimedia Commons pour enrichir les résumés et images sous licence libre.
                  </li>
                </ul>
              </div>

              {/* Controls */}
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white">
                      Synchronisation optionnelle Wikipédia / Wikimedia Commons
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Désactivez pour jouer en mode 100 % hors-ligne / SVG local strict (zéro requête API externe).
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleWikiSync(!saveState.wikiSyncEnabled);
                      setStatusFeedback(
                        !saveState.wikiSyncEnabled
                          ? 'Synchronisation Wikimedia Commons activée.'
                          : 'Mode 100 % SVG local activé (requêtes Wikimedia désactivées).'
                      );
                    }}
                    className={`px-4 py-2 rounded-xl font-black text-xs transition ${
                      saveState.wikiSyncEnabled
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {saveState.wikiSyncEnabled ? 'Activée (ON)' : 'Désactivée (OFF)'}
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:flex sm:flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs transition"
                  >
                    <BoltWattIcon className="w-3.5 h-3.5" />
                    <span>Exporter mes données (.json)</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click?.()}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs border border-slate-700 transition"
                  >
                    Importer une sauvegarde (.json)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClearWikiCache();
                      setStatusFeedback('Cache d’images Wikimedia purgé.');
                    }}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs border border-slate-700 transition"
                  >
                    Purger le cache média
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          'Supprimer définitivement toutes vos données locales VeloLegends TCG ?'
                        )
                      ) {
                        onEraseAllUserData();
                        setStatusFeedback(
                          'Toutes vos données locales ont été supprimées.'
                        );
                      }
                    }}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs transition"
                  >
                    Supprimer toutes mes données (RGPD)
                  </button>
                </div>

                {statusFeedback && (
                  <p className="text-xs font-semibold text-emerald-400 pt-1">
                    {statusFeedback}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
