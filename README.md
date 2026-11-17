# VeloLegends TCG — Jeu de Cartes à Collectionner & Quiz Cyclisme

Application web de jeu de cartes à collectionner (TCG / Gacha) et de quiz tactique dédiée aux **4 disciplines du cyclisme** (**Route**, **VTT**, **Cyclisme sur piste**, **Cyclo-cross**) ainsi qu'aux profils **Polyvalents**.

> *Avertissement : VeloLegends TCG est un projet indépendant et non officiel, sans affiliation ni partenariat avec l'UCI, ASO, Flanders Classics, les fédérations, les équipes ou les marques commerciales.*

---

## Lancement & Scripts

1. **Ouverture directe** : Ouvrez [`index.html`](./index.html) dans votre navigateur (le bundle pré-compilé dans `dist/` est 100 % autonome).
2. **Serveur local sécurisé** : Double-cliquez sur [`start-wikivelo.bat`](./start-wikivelo.bat) pour démarrer sur **`http://localhost:5173`** (en-têtes CSP, `nosniff`, `X-Frame-Options: DENY`).
3. **Commandes de build & vérification** (`node` ou Electron-as-Node) :
   - `npm run build` (`node build.mjs`) : compile `dist/bundle.js` et `dist/styles.css`.
   - `npm run lint` (`node scripts/check-project.mjs --lint`) : audit sécurité XSS, liens `noopener noreferrer`, marques et couverture CSS.
   - `npm run typecheck` (`node scripts/check-project.mjs --typecheck`) : vérification syntaxique / TS stripping de tous les modules.
   - `npm test` (`node scripts/check-project.mjs --all`) : suite complète (catalogue 284 cartes, 1 136 questions de quiz, filtre licences Wikimedia, `ErrorBoundary`, ergonomie mobile, parcours Duel & RGPD).

---

## Catalogue, Équilibrage & Mécaniques TCG

- **284 Cartes Uniques (Séries 1 + 2)** : **Route (80)**, **VTT (64)**, **Piste (57)**, **Cyclo-cross (53)** et **Polyvalent (30)** réparties sur 4 catégories (`Athlète / Légende` 132, `Matériel & Technique` 64, `Épreuve / Monument` 49, `Terrain / Secteur` 39) et 5 raretés (`Légendaire` strictement réservée aux 18 icônes historiques, `Épique` 61, `Rare` 80, `Peu commune` 66, `Commune` 59) — incluant Grand Tours (*Tour, Giro, Vuelta, Tour de France Femmes*), Monuments, Enduro, BMX Race/Freestyle, Gravel, Paracyclisme et Ultra-distance.
- **Table de drop transparente & Pity** :
  - Slots 1–4 : `62,0 % Commune` • `24,0 % Peu commune` • `9,5 % Rare` • `3,5 % Épique` • `1,0 % Légendaire`.
  - Slot 5 garanti **Rare+** : `84,0 % Rare` • `13,5 % Épique` • `2,5 % Légendaire`.
  - **Pity** garanti **Épique+** au 10ᵉ booster sans Épique+, **Légendaire** au 30ᵉ booster sans Légendaire, et **0,8 % God Pack Arc-en-Ciel**.
- **Deck-Building & Duel** : Budget d'énergie plafonné à **16 W** pour 5 titulaires, 5 manches avec règles de terrain dynamiques, mots-clés (`À la révélation`, `Continu`, `Sprint final`, `Échappée`, `Synergie`) et Quiz tactique à prise de risque (*Allure Contrôlée* vs *Attaque / Coup de Bordure*).

---

## Sécurité, Droits d'Auteur & Mise en Ligne

- **Images 100 % légales (224 photos Wikimedia Commons vérifiées + 60 SVG locaux)** : **224 cartes** intègrent de véritables photographies issues exclusivement de Wikimedia Commons sous licences libres vérifiées (`CC0`, `Public domain`, `No restrictions`, `CC BY`, `CC BY-SA` sans clauses `NC`/`ND`, sans `Fair use` et sans logos protégés `.svg`), avec attribution complète (auteur, licence exacte, lien source Wikimedia Commons) affichée dans chaque fiche détail (`CardDetailModal.tsx`) et centralisée dans l'onglet **Crédits & Licences** (`LegalModal.tsx`). Les 60 autres cartes (et le mode secours hors-ligne / erreur réseau) utilisent des illustrations vectorielles SVG locales originales.
- **Confidentialité RGPD stricte (zéro traceur tiers)** : Aucune police Google Fonts externe (polices système locales uniquement), zéro cookie traceur, export/effacement JSON en 1 clic, et interrupteur RGPD permettant à tout moment de désactiver les médias Wikimedia Commons pour passer en affichage **100 % SVG local sans requête externe**.
- **Marques & Droit à l'image** : Aucun nom commercial ni logo protégé conservé ; mention non officielle claire. *(Note juridique : pour une exploitation strictement gratuite / éducative / fan-game non commerciale, les licences libres Wikimedia et la citation encyclopédique s'appliquent ; toute monétisation commerciale directe nécessiterait l'autorisation de droit à l'image des athlètes vivants concernés.)*
- **Protection XSS & Données** : Sanitisation stricte de toute lecture `localStorage` et import JSON (`sanitizeSaveState`), en-têtes CSP durcis.
- **Déploiement Netlify & Sécurité** : Configurations d'en-têtes de sécurité incluses ([`netlify.toml`](./netlify.toml), [`vercel.json`](./vercel.json)), page [`404.html`](./404.html) et règles Netlify bloquant l'accès HTTP public aux sources (`src/`, `scripts/`, `build.mjs`). L’hébergeur **Netlify, Inc.** est pré-renseigné dans [`LegalModal.tsx`](./src/components/LegalModal.tsx) ; complétez simplement vos coordonnées d’éditeur (`[À compléter]`) avant diffusion publique.
