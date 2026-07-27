# Implementation Plan: Programmatic Subagent Loading with AgentDefinition

**Status:** Implementation completed. Code changes done. This document summarizes what was changed and how to verify it works.

## Overview

This project demonstrates migrating from filesystem-based subagent discovery to programmatic agent definitions using the Claude Agent SDK. The MUD player agent is now defined in Python code (`agents.py`) using `AgentDefinition` instead of being discovered as a markdown file in `.claude/agents/`.

## What Changed: Filesystem → Programmatic

### Before
```
.claude/agents/
└── play-mud.md          # Only place agent was defined
                         # Loaded by Claude Code file scanning
                         # No tool restrictions
                         # No runtime configuration
```

### After
```
├── agents.py            # ✅ AgentDefinition (source of truth)
├── run.py               # ✅ SDK query runner
├── requirements.txt     # ✅ claude-agent-sdk dependency
└── .claude/agents/
    └── play-mud.md      # ✅ Documentation only (not loaded at runtime)
```

## Key Implementation: agents.py

The agent is now defined using constants with a clear naming scheme:

```python
PLAY_MUD_SCRIPTS_DIR = ".claude/agents/scripts"        # Path constants
PLAY_MUD_DATA_DIR = ".claude/agents/data"

PLAY_MUD_TOOLS = ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]  # Restricted

PLAY_MUD_PROMPT = f"""..."""  # Agent instructions with interpolated paths

PLAY_MUD_AGENT = AgentDefinition(
    description="Play a tbaMUD/circleMUD variant game running on localhost:4000",
    prompt=PLAY_MUD_PROMPT,
    tools=PLAY_MUD_TOOLS,
    model="claude-haiku-4-5-20251001",
)

AGENTS = {
    "play-mud": PLAY_MUD_AGENT,  # Registry passed to ClaudeAgentOptions
}
```

**Why this works:**
- All 13 references to paths come from one constant — no drift possible
- Tool set is explicit: only 6 tools, no WebFetch/WebSearch/Agent
- Everything is importable and testable
- Naming scheme (`PLAY_MUD_*`) makes adding a second agent easy

## Key Implementation: run.py

The SDK runner supplies the programmatic definitions:

```python
from agents import AGENTS, PLAY_MUD_TOOLS

options = ClaudeAgentOptions(
    agents=AGENTS,                          # ← programmatic definitions
    allowed_tools=["Agent", *PLAY_MUD_TOOLS],
    setting_sources=[],                     # ← disables filesystem discovery
    cwd=PROJECT_ROOT,
)

async for message in query(prompt=prompt, options=options):
    print(message.result or "")
```

**Why this works:**
- `agents=AGENTS` supplies `AgentDefinition` objects
- `setting_sources=[]` disables `.claude/` directory scanning entirely
- `cwd=PROJECT_ROOT` makes relative paths in prompts work correctly
- Programmatic agents take precedence over filesystem

## Design Decisions Made

| Question | Choice | Why |
|----------|--------|-----|
| Language | Python | Lower setup friction; SDK mature in Python |
| Keep markdown? | Yes, as docs | Readable reference; mitigated by "docs only" banner |
| Tool set | Restricted to 6 | Clearer intent; unused tools don't cause permission prompts |
| Paths | One const per dir, interpolated | Single source of truth; no drift risk |
| Filesystem discovery | Disabled via `setting_sources=[]` | Prevents accidental fallback to stale `.md` |

## Verification Checklist

### ✅ Already Verified
- Python 3.12.13 venv created
- `claude-agent-sdk 0.2.128` installed
- `AgentDefinition` constructs successfully with all fields
- All 13 path interpolations in prompt resolved
- No unescaped `{` or `}` braces remain

### Quick Verification (no MUD required)
```bash
cd /Users/karolmoralesmaureira/Documents/claude-code-camp-2026-Q/claude-code-camp-2026-Q2/week0_explore/explore_architecture/03b_subagent_sdk

# Verify AgentDefinition constructs without errors
.venv/bin/python -c "from agents import AGENTS; print(AGENTS['play-mud'].description)"

# Expected output:
# Play a tbaMUD/circleMUD variant game running on localhost:4000
```

### Full End-to-End Test (requires MUD on localhost:4000)
```bash
.venv/bin/python run.py "connect, check status, and look around"

# Expected:
# - Agent invokes play-mud subagent
# - Subagent uses Bash to call node mud_cli.js
# - Output shows connection, status, room description
# - No permission prompts (tools pre-approved)
```

## Benefits

| Capability | Filesystem | Programmatic |
|-----------|------------|--------------|
| Type checking | ❌ | ✅ Full IDE support |
| Tool restriction | ⚠️ Ignored | ✅ Enforced by SDK |
| Import into code | ❌ | ✅ Can use in tests, factories |
| Dynamic config | ❌ | ✅ Factory functions possible |
| Path consistency | ⚠️ String literals | ✅ Single interpolation |
| Testing | ❌ Can't import markdown | ✅ Import & assert |
| Restart needed? | ✅ Yes | ❌ No, immediate |

## Execution Flow

```
User: python run.py "explore the temple"
    ↓
run.py creates ClaudeAgentOptions(agents=AGENTS, ...)
    ↓
AGENTS dict: {"play-mud": PLAY_MUD_AGENT}
    ↓
PLAY_MUD_AGENT: AgentDefinition with tools, prompt, model
    ↓
SDK query() invokes with agents=AGENTS
    ↓
Claude calls "play-mud" agent:
    ├─ SDK looks up AGENTS["play-mud"] (NOT filesystem)
    ├─ Loads AgentDefinition with restricted tools
    ├─ Paths interpolated correctly
    └─ Subagent runs with 6 allowed tools
```

**Key:** `setting_sources=[]` means SDK never scans `.claude/agents/`. Programmatic is the only source.

## File Structure

```
03b_subagent_sdk/
├── agents.py                    # Programmatic AgentDefinition registry
├── run.py                       # SDK query runner
├── requirements.txt             # claude-agent-sdk >= 0.2.128
├── PLAN.md                      # This file
└── .claude/agents/
    ├── play-mud.md              # Documentation only (not loaded)
    ├── scripts/                 # Node.js MUD CLI tools
    │   ├── mud_cli.js
    │   ├── mud_connection.js
    │   ├── mud_parser.js
    │   └── debug_telnet.js
    └── data/                    # Player state
        ├── player.md
        └── world.md
```

## Future Enhancements (Out of Scope)

`AgentDefinition` supports but doesn't use:
- **`memory="project"`** — could replace manual state files
- **`maxTurns`** — safety cap for autonomous grinding
- **Multiple agents** — add second/third using `*_AGENT` pattern

## Technical Notes

### SDK Field Naming (Verified)
- `ClaudeAgentOptions`: entirely snake_case (`allowed_tools`, `setting_sources`, `permission_mode`)
- `AgentDefinition`: camelCase for multi-word (`disallowedTools`, `maxTurns`, `permissionMode`)
- Passing `allowedTools=` to `ClaudeAgentOptions` raises `TypeError`
- Our code uses single-word fields only

### Python Version
- System Python 3.9.6, but SDK requires ≥3.10
- Solution: `uv venv --python 3.12` creates isolated 3.12.13 environment
- Command: `uv pip install --python "$PWD/.venv/bin/python" -r requirements.txt`

## Reference

| File | Purpose | Key Concepts |
|------|---------|--------------|
| agents.py (19-273) | AgentDefinition + registry | Tool restriction, path interpolation, naming |
| run.py (39-46) | ClaudeAgentOptions setup | agents=AGENTS, setting_sources=[], cwd |
| .claude/agents/play-mud.md | Documentation | Source of truth is agents.py |
| requirements.txt | Dependencies | claude-agent-sdk >= 0.2.128 |

## Adding a Second Agent

Follow the naming scheme to add new agents:

```python
# New agent constants
NEW_AGENT_PROMPT = "..."
NEW_AGENT_TOOLS = ["Bash", "Read"]
NEW_AGENT_AGENT = AgentDefinition(description="...", prompt=NEW_AGENT_PROMPT, tools=NEW_AGENT_TOOLS)

# Update registry
AGENTS = {
    "play-mud": PLAY_MUD_AGENT,
    "new-agent": NEW_AGENT_AGENT,  # ← new entry
}
```

Naming scheme (`*_PROMPT`, `*_TOOLS`, `*_AGENT`) keeps definitions parallel and avoids ambiguity.
