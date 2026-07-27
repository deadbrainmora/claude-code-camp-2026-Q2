#!/Users/karolmoralesmaureira/Documents/claude-code-camp-2026-Q/claude-code-camp-2026-Q2/week0_explore/explore_architecture/03b_subagent_sdk/.venv/bin/python3
"""Fast MUD player agent - minimal prompt for quick responses."""

import asyncio
import sys
from pathlib import Path

from claude_agent_sdk import AgentDefinition, ClaudeAgentOptions, query

PROJECT_ROOT = Path(__file__).parent.resolve()

# Minimal fast prompt
FAST_PROMPT = """You are a MUD player agent. Use bash to run: cd .claude/agents/scripts && node mud_cli.js <action>

Available actions: connect, send <command>, status, look, disconnect"""

FAST_AGENT = AgentDefinition(
    description="Play MUD game on localhost:4000",
    prompt=FAST_PROMPT,
    tools=["Bash"],
    model="claude-haiku-4-5-20251001",
)

AGENTS = {"play-mud": FAST_AGENT}

DEFAULT_PROMPT = "Use the play-mud agent to connect and check status."


async def main() -> None:
    prompt = " ".join(sys.argv[1:]) or DEFAULT_PROMPT

    options = ClaudeAgentOptions(
        agents=AGENTS,
        allowed_tools=["Agent"],
        setting_sources=[],
        cwd=PROJECT_ROOT,
    )

    async for message in query(prompt=prompt, options=options):
        result = getattr(message, "result", None)
        if result is not None:
            print(result)


if __name__ == "__main__":
    asyncio.run(main())
