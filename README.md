# Yah.IA.LeTurfiste

Application open source d’analyse des courses hippiques françaises. Elle combine un client React/Vite, une API Express, les services PMU déjà utilisés par l’application et un importeur historique vers SQLite.

## Fonctionnalités

- Consultation du programme, des courses, des partants et des archives chevaux exposés par l’application.
- Import historique reprenable des réunions, courses, partants et arrivées disponibles auprès de l’API REST PMU.
- API de lecture pour l’état de l’archive, les courses et les performances d’un cheval.
- Vues de fiches séparées pour le trot attelé/monté et le plat/obstacle.
- Conservation facultative des réponses JSON brutes pour contrôler les champs et améliorer le schéma.

## Prérequis

- Node.js 22.12 ou supérieur et npm.
- Python 3.10 ou supérieur pour l’import historique. Le script Python n’utilise que la bibliothèque standard.
- Un projet Firebase configuré pour les fonctions qui lisent les profils Firestore. Gemini est facultatif : aucune clé Gemini n’est nécessaire pour démarrer l’application ou importer l’archive PMU.

## Installation et démarrage

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Renseignez les paramètres de votre propre projet Firebase dans `.env.local` si vous utilisez les fonctions Firestore (voir `.env.example`). Gemini reste désactivé tant que `GEMINI_API_KEY` n’est pas défini; ses routes indiquent alors qu’il n’est pas configuré. Le fichier de configuration Firebase local n’est pas versionné. Ne publiez jamais de secrets. `npm run start` lance le serveur Express, qui sert aussi le build du frontend ; construisez-le d’abord avec `npm run build`.

Les règles Firestore du dépôt autorisent la lecture publique des courses et chevaux, mais bloquent les écritures. Gardez cette protection tant que les écritures ne passent pas par un backend authentifié.

## Importer l’archive historique

L’importeur crée `data/pmu_archive.sqlite3`, reprend les journées interrompues et ignore les journées déjà complètes. Un premier essai court permet de vérifier l’accès et la structure de la réponse :

```powershell
python scripts/import_pmu_archive.py --start 2018-01-01 --end 2018-01-07
```

Pour poursuivre ensuite sur toute la période :

```powershell
python scripts/import_pmu_archive.py --start 2018-01-01 --end 2026-10-16
```

La base est locale et ignorée par Git. Une archive complète depuis 2018 n’est pas garantie : les anciennes journées peuvent être absentes de la source. Les historiques antérieurs transmis dans les profils des partants sont également conservés quand la source les fournit. Pour changer le chemin, définir `PMU_ARCHIVE_DB`. Ajouter `--max-days 7` pour plafonner une exécution ou `--omit-raw` pour ne pas enregistrer les réponses brutes.

## API d’archive

Le serveur expose les routes suivantes sous `/api/archive` :

- `GET /status` : compteurs et couverture temporelle de la base.
- `GET /races?from=2018-01-01&to=2026-10-16&discipline=PLAT&final=true&limit=50&offset=0` : liste paginée et filtrable des courses.
- `GET /races/{raceId}` : détails d’une course, partants et arrivée.
- `GET /horses/{horseIdOuNom}/performances?from=2018-01-01&discipline=ATTELÉ&limit=50` : fiches antérieures d’un cheval.

Les dates sont au format `AAAA-MM-JJ`; `limit` est plafonné à 250. L’archive doit exister avant les appels; sinon `/status` et les routes de lecture répondent `503` avec la commande d’import à lancer.

Les colonnes SQLite sont consultables dans `horse_performances`. Les vues `horse_performance_cards` (attelé/monté) et `horse_performance_cards_galop` (plat/obstacle) gardent l’ordre de champs demandé dans les fiches. Une donnée non fournie par la source reste `NULL`.

## Sources et réutilisation des données

L’importeur utilise l’API REST PMU `https://online.turfinfo.api.pmu.fr/rest/client/7`, qui n’a pas de contrat public documenté et peut changer, limiter l’accès ou ne pas couvrir tout l’historique. Le dépôt GitHub [french-horse-racing](https://github.com/chris-alex-p/french-horse-racing) décrit une collecte historique au moyen de l’API PMU; [pmu-archives-exporter](https://github.com/Issou83/pmu-archives-exporter) documente aussi le format PMU JSON et ses limites. Ce projet implémente son propre importeur et n’intègre pas de code copié de ces dépôts.

L’API communautaire [open-pmu-api](https://github.com/open-pmu-api/open-pmu-api) peut servir de source de comparaison ponctuelle pour des arrivées. Sa documentation n’annonce ni pagination, ni limite de débit, ni garantie de disponibilité, et son dépôt précise que sa licence MIT couvre le code, pas les données. Elle n’est donc pas interrogée automatiquement en masse.

Les données de course, marques, noms de chevaux et réponses PMU ne sont pas couvertes par la licence MIT de ce code. Respectez les conditions du fournisseur, le droit applicable, les règles d’accès et les limites de débit. L’accès public d’une API ou d’une page ne vaut pas autorisation de réutilisation en masse. Cette application ne contourne pas les restrictions d’accès et ne garantit ni l’exactitude des données ni la fiabilité d’un pronostic.

## Développement

```powershell
npm run lint
npm run build
```

Les dépendances JavaScript exactes sont verrouillées dans `package-lock.json`. Le projet ne vend pas, n’embarque pas et ne redistribue pas de base de courses.

## Licence

Le code original du projet est distribué sous licence MIT. Cette licence ne s’étend pas aux données tierces ni aux marques. Voir [LICENSE](LICENSE).
