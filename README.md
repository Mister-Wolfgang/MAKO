![MAKO](logo.jpg)

# MAKO (Modular Agent Kit for Orchestration) v6.1

> *"Le pouvoir n'est rien sans controle."* -- Rufus Shinra

Plugin Claude Code -- systeme multi-agents incarne par le personnel de la Shinra Electric Power Company. Concu pour un dev solo qui veut la puissance d'une equipe complete.

**Repo** : [github.com/Mister-Wolfgang/MAKO](https://github.com/Mister-Wolfgang/MAKO)
**Marketplace** : [SHINRA](https://github.com/Mister-Wolfgang/SHINRA) (installe via git submodule)

## Agents

| Agent | Personnage | Role | Modele |
|-------|-----------|------|--------|
| Rufus Shinra | President Shinra | **Orchestrateur** -- commande, delegue, coordonne | -- |
| Tseng | Chef des Turks | **Analyzer** -- scanne les projets existants, produit `project-context.md` | Sonnet |
| Scarlet | Dir. Armement Avance | **Discovery** -- comprend les besoins, selectionne la quality tier | Sonnet |
| Genesis | SOLDAT 1ere Classe | **UX/Design Lead** -- concoit interfaces, user flows, design systems | Sonnet |
| Reeve | Ingenieur Shinra | **Architect** -- concoit l'architecture, decompose en Epics/Stories, ADRs | Sonnet |
| Heidegger | Dir. Securite Publique | **Scaffold** -- cree la structure, adapte a la quality tier | Haiku |
| Lazard | Directeur du SOLDAT | **DevOps/CI-CD** -- pipelines, Docker, monitoring, infra | Haiku |
| Hojo | Chef Dept. Science | **Implementor** -- code les features en TDD (Red->Green->Refactor) | Opus |
| Reno | Turk | **Tester** -- tests unitaires et integration, rapide et large | Sonnet |
| Elena | Turk (rookie) | **Tester** -- securite, edge cases, stress tests | Sonnet |
| Palmer | Dir. Programme Spatial | **Documenter** -- genere la doc, adaptee a la quality tier | Sonnet |
| Rude | Turk | **Reviewer** -- review adversarial + validation de specs (dual-mode) | Sonnet |
| Sephiroth | L'Ange Unique | **Debugger** -- diagnostic, correction, escalade meta-learning. **VERROUILLE** | Opus |
| Lucrecia | Scientifique Shinra | **Meta-learning + Plugin Guardian** -- modifie les prompts agents, gere les modifications du plugin. **VERROUILLEE** | Opus |

### Sephiroth -- VERROUILLE

Sephiroth est dormant par defaut. Il ne s'active que si :
- Un agent echoue 2+ fois
- Rude rejette + le fix echoue
- Bug complexe explicite

### Lucrecia -- VERROUILLEE

Lucrecia est dormante par defaut. Elle ne s'active que si :
- Sephiroth signale une erreur recurrente (meta-learning)
- L'utilisateur demande de modifier le plugin MAKO

### Duo Reno/Elena

Les tests sont repartis en duo complementaire :
- **Reno** ratisse large et vite (unit + integration)
- **Elena** creuse en profondeur (securite + edge cases + stress)

## Installation

```bash
# Via la marketplace SHINRA (recommande)
/plugin marketplace add git@github.com:Mister-Wolfgang/SHINRA.git
/plugin install MAKO@shinra-marketplace
```

## Utilisation

Parlez directement a Rufus -- il analyse votre demande et delegue automatiquement aux agents concernes.

### Slash Commands

| Commande | Pipeline | Usage |
|----------|----------|-------|
| `/mako:create-project` | [Brainstorm] -> Scarlet -> [Rude spec-validation] -> [Genesis UX] -> Reeve -> [Alignment Gate] -> [Story Enrichment] -> Heidegger -> [Lazard DevOps] -> Hojo (TDD) -> Reno -> Elena -> Palmer -> Rude -> [DoD Gate] -> [Retro] | Nouveau projet from scratch |
| `/mako:modify-project` | Tseng -> [Brainstorm] -> Scarlet -> [Rude spec-validation] -> Reeve -> [Alignment Gate] -> [Story Enrichment] -> Hojo (TDD) -> Reno -> Elena -> Rude -> [DoD Gate] -> [Retro] | Modifier un projet existant |
| `/mako:add-feature` | Tseng -> [Brainstorm] -> Scarlet (stories) -> [Story Enrichment] -> Hojo (TDD) -> Reno -> Elena -> Rude -> [DoD Gate] -> [Retro] | Ajouter une feature |
| `/mako:fix-bug` | Quick Fix + **auto-escalation** -> Tseng -> Sephiroth -> Hojo -> Reno + Elena -> Rude | Corriger un bug |
| `/mako:refactor` | Tseng -> [Brainstorm] -> Reeve (stories) -> [Alignment Gate] -> [Story Enrichment] -> Hojo (TDD) -> Reno -> Elena -> Rude -> [DoD Gate] -> [Retro] | Restructurer le code |
| `/mako:correct-course` | Tseng -> SCP -> Rufus (3 options) -> User -> Adjust/Rollback/Re-plan | Correction mid-implementation |
| `/mako:brainstorm` | Perspectives paralleles -> Debat cible -> [Party Mode] -> Spec validee | Brainstorming structure |
| `/mako:onboard` | Tseng (deep scan) -> Reeve (recovery) -> Palmer (docs) -> Sprint init | Onboarding projet brownfield |
| `/mako:qa-audit` | Tseng (scan) -> Reno (unit+integ) -> Elena (security+edge) -> Rude (coverage) | Audit QA + generation tests |
| `/mako:rust-security` | Tseng -> Rude (audit) -> Hojo (fix) -> Reno + Elena (tests) -> Rude | Audit securite Rust |

### Exemples

```
"Cree un jeu de snake en Python avec pygame"
"Ajoute le multiplayer en ligne"
"Le snake traverse les murs au lieu de mourir, corrige ca"
"Separe la logique du rendu"
```

## Features

### Alignment Gate

3 couches de validation avant implementation, scoring /10 :
1. **Spec -> Architecture** : Features de Scarlet couvrent les stories de Reeve ?
2. **Architecture interne** : Data model, API, contraintes, dependances ?
3. **Architecture -> Stories** : Chaque module a une story ? ACs coherents ?

PASS (10/10) | CONCERNS (7-9) | FAIL (<7)

### Quality Tiers

| Tier | Scaffold | Tests | Documentation |
|------|----------|-------|---------------|
| **Essential** | Structure + deps + linter | Unitaires + integration basique | README minimal |
| **Standard** | + CI + pre-commit hooks | + Edge cases + error scenarios | + Features + API docs |
| **Comprehensive** | + Dockerfile + coverage | + E2E + load tests basiques | + docs/ folder + CONTRIBUTING + ADRs |
| **Production-Ready** | + Docker multistage + deploy + monitoring | + Security audit + chaos tests | + Runbooks + ADRs + CHANGELOG |

### Scale-Adaptive Routing

| Scale | Stories | Adaptations |
|-------|---------|-------------|
| Micro | < 3 | Skip brainstorm, skip Palmer, Rude optionnel |
| Standard | 3-10 | Pipeline complet (defaut) |
| Large | 10-25 | Brainstorm obligatoire, checkpoints toutes les 3 stories |
| Epic | 25+ | Split en sub-workflows, user checkpoint entre chaque |

### Sprint Status Tracking

`sprint-status.yaml` au root du projet cible. State machine : backlog -> ready-for-dev -> in-progress -> review -> done.

### Definition of Done Gate

5 categories adaptees au quality tier : Code, Tests (coverage 50-90% selon tier), Review, Docs, Regression.

### TDD Protocol

Hojo implemente chaque story en TDD : test d'abord (Red), code minimal (Green), refactor. Reno complete avec tests d'integration, Elena avec securite et edge cases.

### Memoire Persistante (mcp-memory-service)

Service Python avec SQLite-Vec pour la memoire semantique persistante :
- Recherche hybride BM25 + Vector
- Knowledge graph avec visualisation D3.js
- Stockage local dans `~/.shinra/` (SQLite)
- Seul Rufus touche la memoire

## Structure

```
MAKO/
├── .claude-plugin/
│   └── plugin.json
├── agents/               # 13 agents Shinra (.md)
│   ├── elena.md
│   ├── genesis.md
│   ├── heidegger.md
│   ├── hojo.md
│   ├── lazard.md
│   ├── lucrecia.md
│   ├── palmer.md
│   ├── reeve.md
│   ├── reno.md
│   ├── rude.md
│   ├── scarlet.md
│   ├── sephiroth.md
│   └── tseng.md
├── context/              # Orchestrateur + references
│   ├── rufus.md
│   ├── rufus-memory-guide.md
│   └── elicitation-library.md
├── contracts/            # JSON Schema (hooks I/O, session state, telemetry)
├── docs/adr/             # Architecture Decision Records
├── hooks/                # Event hooks + tests
│   ├── __tests__/
│   ├── lib/
│   ├── hooks.json
│   └── *.js
├── scripts/              # Health check
├── skills/               # 10 Slash commands
│   ├── add-feature/
│   ├── brainstorm/
│   ├── correct-course/
│   ├── create-project/
│   ├── fix-bug/
│   ├── modify-project/
│   ├── onboard/
│   ├── qa-audit/
│   ├── refactor/
│   └── rust-security/
├── package.json
└── vitest.config.js
```

## Git Conventions

| Prefix | Agent | Description |
|--------|-------|-------------|
| `[scaffold]` | Heidegger | Structure initiale |
| `[impl] story: <ST-ID>` | Hojo | Implementation TDD par story |
| `[test]` | Reno | Tests unit + integration |
| `[test]` | Elena | Tests securite + edge cases |
| `[design]` | Genesis | Design UX |
| `[devops]` | Lazard | CI/CD et infrastructure |
| `[doc]` | Palmer | Documentation |
| `[fix]` | Hojo | Correction de bug |
| `[refactor]` | Hojo | Restructuration |
| `[meta]` | Lucrecia | Modification de prompt agent (branche + PR) |

## Changelog

### v6.1.0 -- "Lucrecia's Awakening"
- **Multi-repo** -- MAKO extrait dans son propre repo, inclus dans SHINRA via submodule
- **Rename JENOVA -> Lucrecia** -- L'agent meta-learning est renomme Lucrecia Crescent
- **Marketplace-only writes** -- Suppression du dual-write cache+marketplace
- **Version enforcement** -- Toute modification doit incrementer la version dans plugin.json + README en SemVer synchronise

### v6.0.0 -- "Phase A"
- MCP Memory Fallback (graceful degradation)
- Telemetry JSONL (hooks instrumentation)
- CI/CD pipeline avec Vitest + coverage thresholds
- ADRs (Vitest, CJS/ESM, JSONL telemetry, health-check, coverage threshold)
- Comprehensive test suite (unit, integration, security, contracts)

### v5.0.0 -- "Reunion Protocol"
- 12 agents (ajout Genesis + Lazard)
- 10 skills (ajout onboard + qa-audit)
- Alignment Gate, Spec Validation, Story Enrichment
- Sprint Status Tracking, DoD Gate, Review Quota
- Scale-Adaptive Routing, Elicitation Library
- Party Mode brainstorm, Palmer commandes continues
- Retrospective structuree

### v4.1.0
- Quality Tiers (Essential/Standard/Comprehensive/Production-Ready)

### v4.0.0
- Migration memoire SHODH -> mcp-memory-service (SQLite-Vec)

### v3.0.0
- Systeme multi-agents initial (10 agents)
- TDD Protocol, Epic/Story Decomposition

---

*Built with Claude Code + Shinra Electric Power Company*
