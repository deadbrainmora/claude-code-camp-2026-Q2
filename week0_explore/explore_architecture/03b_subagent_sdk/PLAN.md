# Plan: Replace filesystem subagent loading with programmatic `AgentDefinition`

**Status:** implemented. Code changes are done; the install + smoke test at the
bottom are left for you to run.

## Decisions

The first draft of this plan proposed TypeScript, deleting `play-mud.md`, and
relocating the scripts and data. Three of those four were overridden:

| Question | Draft default | **Chosen** |
|---|---|---|
| Runner language | TypeScript | **Python** |
| `.claude/agents/play-mud.md` | delete | **keep as documentation** |
| Tool restriction | restrict | **restrict** (unchanged) |
| Move `scripts/` + `data/` | move to `src/mud/` + `data/` | **leave in place** |

Everything below reflects the chosen options.

## What existed before

```
03b_subagent_sdk/
└── .claude/agents/
    ├── play-mud.md              # subagent definition, loaded off disk by Claude Code
    ├── scripts/                 # 4 Node scripts: connection, parser, CLI, debug
    └── data/                    # player.md, world.md
```

The subagent was defined **only** as a markdown file, discovered by Claude Code
watching `.claude/agents/`. Nothing called the Agent SDK — there was no runner.

Two of the frontmatter keys were never real subagent fields (`scripts:`, `data:`,
plus `type:`); Claude Code silently ignored them even while the file was loaded.

## What the change does

```
03b_subagent_sdk/
├── PLAN.md
├── requirements.txt             # NEW — claude-agent-sdk
├── agents.py                    # NEW — the AgentDefinition (source of truth)
├── run.py                       # NEW — query() runner
└── .claude/agents/
    ├── play-mud.md              # KEPT, banner added: documentation only
    ├── scripts/                 # unchanged, in place
    └── data/                    # unchanged, in place
```

### 1. `agents.py` — the `AgentDefinition`

The markdown body became the `prompt` string. Frontmatter mapped onto real
fields:

| `play-mud.md` frontmatter | `AgentDefinition` field |
|---|---|
| `name: play-mud` | the **dict key** — `AGENTS["play-mud"]` |
| `description:` | `description`, verbatim — this is what Claude matches on |
| `model: claude-haiku-4-5-20251001` | `model`, full ID kept |
| `type: agent` | dropped — not a real field |
| `scripts:` / `data:` | dropped as frontmatter; now `PLAY_MUD_SCRIPTS_DIR` / `PLAY_MUD_DATA_DIR` constants interpolated into the prompt |
| markdown body | `prompt` |
| *(new)* | `tools=PLAY_MUD_TOOLS` |

Because the scripts and data stayed put, those constants still point at
`.claude/agents/scripts` and `.claude/agents/data`. They are interpolated into
the prompt from single definitions, so the paths can't drift apart across the 13
places the prompt mentions them.

### Naming

Our own constants use one scheme: everything describing this agent is
`PLAY_MUD_*` (`PLAY_MUD_SCRIPTS_DIR`, `PLAY_MUD_DATA_DIR`, `PLAY_MUD_PROMPT`,
`PLAY_MUD_TOOLS`, `PLAY_MUD_AGENT`), with `AGENTS` as the registry — named to
match the `agents=` option it gets passed to. Adding a second agent later means a
parallel `SECOND_AGENT_*` set rather than guessing which generic name belongs to
which agent.

The SDK's own split is **not** something we can normalize, verified by
introspecting claude-agent-sdk 0.2.128 rather than trusting the docs:

- `ClaudeAgentOptions` — entirely snake_case, zero camelCase fields
  (`allowed_tools`, `setting_sources`, `permission_mode`)
- `AgentDefinition` — camelCase for multi-word fields (`disallowedTools`,
  `maxTurns`, `permissionMode`, `mcpServers`, `initialPrompt`)

Passing `allowedTools=` to `ClaudeAgentOptions` is a `TypeError`. In practice
this never surfaces here: the only `AgentDefinition` fields we set are
single-word (`description`, `prompt`, `tools`, `model`), so no camelCase appears
in our code at all. It would start to matter the moment anyone adds
`maxTurns` or `disallowedTools`.

### 2. Tool restriction

`PLAY_MUD_TOOLS = ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]`

Previously the filesystem agent had no `tools:` key, so it inherited every tool
available to subagents. Now:

- `Bash` — run `node mud_cli.js <action>`
- `Read`, `Write`, `Edit` — maintain `data/player.md` and `data/world.md`
- `Glob`, `Grep` — locate scripts and data
- **omitted:** `WebFetch`, `WebSearch`, `Agent` — no use for them here

A tool left out isn't in the subagent's session at all: no permission prompt, no
error, Claude just works without it.

### 3. `run.py` — the SDK runner

Two options carry the weight of this task:

- **`agents=AGENTS`** — supplies the definition. Programmatic agents also
  take precedence over a filesystem agent of the same name.
- **`setting_sources=[]`** — stops user/project/local settings being read at all,
  so `.claude/agents/play-mud.md` is never loaded. Without this, the directory is
  still scanned even though the programmatic definition wins the name collision.

`"Agent"` is in `allowed_tools`, or subagent invocations would hit a permission
prompt instead of running. `cwd` is pinned to the project root so the prompt's
relative `cd .claude/agents/scripts` resolves.

### 4. `play-mud.md` kept, marked inert

The file stays as a readable reference, with a banner at the top stating it is
not loaded at runtime and pointing at `agents.py`. The three fake frontmatter
keys were removed so the file doesn't teach a format that was never real.

The risk in keeping it is drift: two descriptions of one agent, only one of which
takes effect. The banner is the mitigation — if you later find them disagreeing,
`agents.py` is authoritative.

## What this buys

| | Filesystem (`.md`) | Programmatic (`AgentDefinition`) |
|---|---|---|
| Tool restriction | possible but unset | `tools` / `disallowedTools` |
| Dynamic config | impossible | factory functions per run |
| Path consistency | repeated string literals | one constant, interpolated |
| Discovery | new dirs need a session restart | immediate |
| Testing | can't import a markdown file | importable object |
| Fake fields | silently ignored | nowhere to put them |

## Fields available but unused

`AgentDefinition` also supports `disallowedTools`, `skills`, `memory`,
`mcpServers`, `initialPrompt`, `maxTurns`, `background`, `effort`, and
`permissionMode`. Two worth revisiting:

- **`memory="project"`** — could eventually replace the hand-rolled
  `data/player.md` + `data/world.md` state files.
- **`maxTurns`** — a safety cap for autonomous grinding, which is currently
  unbounded.

Out of scope here.

## Environment

The system Python is **3.9.6**, but `claude-agent-sdk` requires **>=3.10** — that
was the whole reason the first install attempt failed with the misleading
`No matching distribution found` (PyPI was reachable the entire time; pip was
filtering on `requires_python`).

Resolved with `uv`, which fetches a standalone interpreter without touching
system state:

```bash
uv venv --python 3.12                                    # downloads CPython 3.12.13
uv pip install --python "$PWD/.venv/bin/python" -r requirements.txt
```

The explicit `--python` matters: plain `uv pip install` picked up the outer
repo's 3.9 venv via `VIRTUAL_ENV` and failed to resolve again.

## Verification status

- ✅ Python 3.12.13 venv created; `claude-agent-sdk 0.2.128` installed
- ✅ `AgentDefinition` **constructed for real** — key `play-mud`, model, tools,
  and a 7355-char prompt all present
- ✅ Field names confirmed by introspecting the installed dataclasses, not the docs
- ✅ All 13 path interpolations resolved; no unescaped braces left in the prompt
- ⬜ **Not run:** live end-to-end run — needs the MUD listening on `localhost:4000`

```bash
# Constructor check — catches any field-name mismatch immediately
.venv/bin/python -c "from agents import AGENTS; print(AGENTS['play-mud'].description)"

# Live run (needs the MUD up on localhost:4000)
.venv/bin/python run.py "connect, check status, and look around"
```
