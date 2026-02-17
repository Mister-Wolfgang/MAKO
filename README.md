![MAKO](logo.jpg)

# Mako AI Agents

> *"Le pouvoir n'est rien sans contrôle."* — Rufus Shinra

Système multi-agents pour **Claude Code** incarné par le personnel de la Shinra Electric Power Company. Conçu pour transformer un développeur solo en une équipe d'ingénierie complète.

**Repository** : `mako-claude-agent-kit`
**Marketplace** : [Claude Code Shinra Marketplace](https://github.com/Mister-Wolfgang/claude-code-shinra-marketplace)

---

## 👥 Les Agents Shinra

| Agent | Personnage | Rôle & Spécialité | Modèle |
| --- | --- | --- | --- |
| **Rufus Shinra** | Président | **Orchestrateur** — Commande, délègue, coordonne. | -- |
| **Tseng** | Chef des Turks | **Analyzer** — Scan de projet et `project-context.md`. | Sonnet |
| **Scarlet** | Dir. Armement | **Discovery** — Analyse des besoins et Quality Tiering. | Sonnet |
| **Genesis** | SOLDAT 1ère Cl. | **UX/Design Lead** — Interfaces et Design Systems. | Sonnet |
| **Reeve** | Ingénieur | **Architect** — Épopées (Epics), Stories et ADRs. | Sonnet |
| **Heidegger** | Dir. Sécurité | **Scaffold** — Structure de fichiers et boilerplate. | Haiku |
| **Lazard** | Dir. SOLDAT | **DevOps/CI-CD** — Pipelines, Docker, Infrastructure. | Haiku |
| **Hojo** | Chef Sciences | **Implementor** — Code en TDD (Red -> Green -> Refactor). | Opus |
| **Reno** | Turk | **Tester (Speed)** — Tests unitaires et intégration. | Sonnet |
| **Elena** | Turk (Rookie) | **Tester (Deep)** — Sécurité, Edge cases, Stress tests. | Sonnet |
| **Palmer** | Dir. Spatial | **Documenter** — Documentation technique et API. | Sonnet |
| **Rude** | Turk | **Reviewer** — Review adverse et validation de specs. | Sonnet |
| **Sephiroth** | L'Ange Unique | **Debugger** — Diagnostic critique (Verrouillé par défaut). | Opus |
| **Lucrecia** | Scientifique | **Meta-learning** — Gardienne du plugin et des prompts. | Opus |

---

## 🛠 Commandes (/skills)

| Commande | Usage |
| --- | --- |
| `/mako:create-project` | Pipeline complet de la conception à la doc pour nouveau projet. |
| `/mako:modify-project` | Analyse d'impact (Tseng) et modification sécurisée. |
| `/mako:add-feature` | Ajout de fonctionnalité avec validation d'alignement. |
| `/mako:fix-bug` | Diagnostic Sephiroth et correction itérative. |
| `/mako:refactor` | Restructuration architecturale via Reeve & Hojo. |
| `/mako:brainstorm` | Débat multi-perspectives (Party Mode). |
| `/mako:onboard` | Scan profond (Brownfield) et initialisation de sprint. |
| `/mako:qa-audit` | Audit complet de couverture et tests de régression. |

---

## ⚙️ Core Logic

### Quality Tiers

Adaptation automatique de la rigueur selon le tier choisi :

* **Essential** : Structure + Linter + Tests unitaires basiques.
* **Standard** : CI + Pre-commit + Scénarios d'erreurs.
* **Comprehensive** : Docker + Coverage + E2E + ADRs.
* **Production-Ready** : Audit Sécurité + Chaos Engineering + Runbooks.

### Definition of Done Gate

6 catégories adaptées au quality tier : **Code**, **Tests** (coverage 50-90% selon tier), **Review**, **Docs**, **Regression**, **Runtime** (linter strict, smoke test, vérification visuelle).

### TDD Protocol (Hojo)

Implémentation stricte :

1. **Red** : Écriture du test échouant.
2. **Green** : Code minimal pour passer le test.
3. **Refactor** : Optimisation sous surveillance de Rude.

---

## 📂 Structure du Repo

```text
mako-claude-agent-kit/
├── .claude-plugin/     # Configuration plugin.json
├── agents/             # Définitions Markdown des 13 agents
├── context/            # Logique de l'orchestrateur Rufus
├── contracts/          # Schémas JSON (I/O, Telemetry)
├── hooks/              # Event hooks JS & Tests Vitest
├── skills/             # Logique des Slash Commands
├── storage/            # mcp-memory-service (SQLite-Vec)
├── package.json        # Dépendances (Vitest, etc.)
└── README.md

```

---

## 📦 Installation

```bash
# Via la marketplace SHINRA
/plugin marketplace add git@github.com:Mister-Wolfgang/claude-code-shinra-marketplace.git
/plugin install MAKO@shinra-marketplace

```

---

## 📜 Changelog

### v6.2.0 — "Runtime Reckoning"

* **Runtime DoD Gate** : Nouvelle 6ème catégorie (Runtime) — bloque le pipeline si l'application n'a jamais été vérifiée en exécution.
* **Hojo: Pre-commit checklist** : `clippy -D warnings` + `fmt` + test + vérification runtime obligatoires avant chaque commit.
* **Hojo: YAGNI strict** : Élimination stricte du dead code — pas de variants, fields ou fonctions inutilisés.
* **Hojo: Integration tests** : Apps GUI/game doivent avoir au moins 1 test d'intégration avec le vrai stack par batch.
* **Reno: 2-layer testing** : Smoke test obligatoire avec le vrai plugin stack (pas MinimalPlugins).
* **Elena: Smoke test backup** : Si Reno oublie le smoke test, Elena le couvre. Dead code = finding sécurité.
* **Rude: Compiler output mandatory** : Output clippy/linter manquant = finding CRITICAL.
* **Rude: Wiring verification** : Trace la chaîne main() → feature. Code orphelin = CRITICAL.
* **Rude: System-scope review** : Review du système entier après chaque sub-workflow.
* **Heidegger: Lint day 1** : Scaffold inclut `-D warnings` dès le premier commit.
* **Heidegger: Walking skeleton** : Scaffold produit une application EXÉCUTABLE, pas juste une structure de fichiers.
* **Reeve: Runtime preconditions** : L'architecture doit lister les préconditions runtime (caméra, fenêtre, etc.).
* **Reeve: ST-0 Walking Skeleton** : Première story = l'app démarre + entités critiques existent + pas de panic.
* **Reeve: Integration test contracts** : L'architecture définit des contrats de test que Hojo doit respecter.

### v6.1.0 — "Lucrecia's Awakening"

* **Multi-repo Separation** : Extraction de MAKO en repository autonome.
* **Meta-Agent Rename** : JENOVA devient **Lucrecia Crescent**.
* **Scale-Adaptive Routing** : Ajustement dynamique du workflow selon la taille du projet.
* **Version Enforcement** : Synchronisation stricte entre `plugin.json` et Git tags.

---
