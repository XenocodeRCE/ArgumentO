# ArguMap

Application web pour construire une argumentation avec une structure inspiree du modele de Toulmin.

## Fonctionnalites

- Construction d'une carte d'arguments (these, pour, contre)
- Edition pas a pas dans un modal guide
- Resume dynamique de l'argument
- Score de qualite de l'argumentation
- Vue globale des resumes
- Partage via UID avec page publique en lecture seule
- Export / import en JSON
- Suppression rapide d'un argument depuis sa card
- Profondeur de l'arbre illimitee

## Structure du projet

- `index.html` : page principale (edition)
- `script.js` : logique front principale
- `styles.css` : styles UI et responsive
- `api.php` : API de sauvegarde/lecture JSON
- `view.html` : page de consultation publique (lecture seule)
- `view.js` : logique de la page view
- `data/` : stockage des maps au format JSON

## Prerequis

- PHP 8+ recommande (pour `random_bytes`)
- Un navigateur moderne

## Lancer en local

Depuis le dossier du projet, lancer un serveur PHP :

```bash
php -S localhost:8000
```

Puis ouvrir :

- Edition : `http://localhost:8000/index.html`
- View publique : `http://localhost:8000/view.html?uid=<UID>`

## Partage

1. Construire une map dans la page principale.
2. Cliquer sur **Partager**.
3. La map est enregistree dans `data/<uid>.json` via `api.php?action=save`.
4. Un lien public est genere vers `view.html?uid=<uid>`.

## Import / Export JSON

- **Exporter** : telecharge un fichier JSON de la map courante.
- **Importer** : charge une map depuis un fichier JSON.

Formats acceptes a l'import :

- objet enveloppe : `{ "version": 1, "tree": { ... } }`
- objet arbre direct : `{ ... }`

## API

### `POST /api.php?action=save`

Body JSON :

```json
{
  "tree": { "id": "n1", "type": "thesis", "children": [] }
}
```

Reponse :

```json
{
  "ok": true,
  "uid": "<uid_hex_32>",
  "url": "http://localhost:8000/view.html?uid=<uid_hex_32>"
}
```

### `GET /api.php?action=get&uid=<uid_hex_32>`

Reponse :

```json
{
  "ok": true,
  "uid": "<uid_hex_32>",
  "createdAt": "2026-05-07T17:00:00+00:00",
  "tree": { ... }
}
```

## Notes

- La page `view.html` est en lecture seule (pas d'edition ni suppression).
- Le dossier `data/` doit etre accessible en ecriture par le serveur PHP.
