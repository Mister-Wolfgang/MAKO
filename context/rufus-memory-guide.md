# mcp-memory-service -- Guide complet

Service Python avec backend SQLite-Vec pour memoire persistante. Stocke dans `~/.shinra/memory.db`. Expose via MCP (stdio, pas de serveur HTTP).

## Outils MCP disponibles

| Outil | Usage | Quand |
|-------|-------|-------|
| `store_memory` | Stocker une information | Apres chaque phase, decision, pattern |
| `retrieve_memory` | Recherche semantique | Debut de workflow, "ou on en est" |
| `search_by_tag` | Filtrer par tags | Chercher par projet, par type |
| `list_memories` | Lister avec pagination | Explorer toutes les memoires |
| `delete_memory` | Supprimer par hash | Nettoyer les memoires obsoletes |
| `check_database_health` | Etat du service | Debug, verification |

## Types de memoire MAKO

Utiliser le champ `memory_type` :

| Type | Usage MAKO | Quand stocker |
|------|------------|---------------|
| `observation` | Etat du projet, features implementees | Apres chaque phase |
| `decision` | Choix d'architecture, stack, patterns | Apres Reeve/Scarlet |
| `learning` | Patterns appris, bonnes pratiques | Apres Sephiroth |
| `error` | Bugs trouves, causes racines | Apres fix-bug |
| `context` | Workflow en cours, progression | Debut/fin de workflow |
| `pattern` | Patterns recurrents cross-projets | Quand confirme |

## Stocker une memoire

```
store_memory(
  content: "<projet> | <agent>: <resume 1-2 lignes> | next: <prochaine etape>",
  memory_type: "observation",
  tags: ["project:<nom>", "phase:<agent>"]
)
```

## Rechercher en memoire

Recherche semantique (trouve du contenu conceptuellement proche) :
```
retrieve_memory(
  query: "<nom-du-projet> architecture decisions",
  n_results: 5
)
```

Recherche par tags (filtrage exact) :
```
search_by_tag(
  tags: ["project:<nom>"]
)
```

## Stocker une decision architecturale

```
store_memory(
  content: "<decision concise>",
  memory_type: "decision",
  tags: ["project:<nom>", "architecture"]
)
```

## Stocker un pattern ou une erreur apprise

```
store_memory(
  content: "<pattern ou erreur>",
  memory_type: "learning",
  tags: ["project:<nom>", "pattern"]
)
```

## Correspondance SHODH -> mcp-memory-service

| Ancien (SHODH) | Nouveau (mcp-memory-service) | Notes |
|-----------------|------------------------------|-------|
| `remember()` | `store_memory()` | `memory_type` remplace `type` |
| `recall()` | `retrieve_memory()` | Recherche semantique |
| `context_summary()` | `retrieve_memory(query: "<projet>")` | Pas d'equivalent direct |
| `proactive_context()` | `retrieve_memory()` | Pas d'equivalent direct |
| `memory_stats()` | `check_database_health()` | Stats du service |
| `list_memories()` | `list_memories()` | Nom identique |
| `verify_index()` | `check_database_health()` | Inclus dans health check |
| `list_todos()` | -- | Pas d'equivalent (utiliser tags) |
| `list_reminders()` | -- | Pas d'equivalent (utiliser tags) |
| `token_status()` | -- | Pas d'equivalent |
| -- | `search_by_tag()` | Nouveau, recherche par tags |
| -- | `delete_memory()` | Nouveau, suppression par hash |

## Regles memoire

1. **Jamais de prose** -- JSON ou phrases courtes uniquement
2. **Jamais de code** -- Stocker le "quoi" et le "pourquoi", pas le "comment"
3. **Max 200 tokens par store** -- Si c'est plus long, c'est trop
4. **Les subagents ne touchent pas la memoire** -- Seul Rufus store/retrieve
5. **Tags obligatoires** -- Toujours taguer avec `project:<nom>` au minimum
6. **Types stricts** -- Utiliser la taxonomie ci-dessus
7. **`retrieve_memory()`** -- Pour le recall de debut de session
8. **Ne pas retrieve a chaque message** -- Seulement en debut de workflow ou sur demande explicite
