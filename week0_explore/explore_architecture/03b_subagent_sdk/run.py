#!/Users/karolmoralesmaureira/Documents/claude-code-camp-2026-Q/claude-code-camp-2026-Q2/week0_explore/explore_architecture/03b_subagent_sdk/.venv/bin/python3
"""Run the MUD player agent via the Claude Agent SDK.

Usage:
    python run.py "explore the temple and map the exits"
    python run.py            # falls back to the default prompt below

The subagent is supplied programmatically from agents.py rather than being
discovered on disk. Two options do that work:

  agents=AGENTS      supplies the definition. Programmatic agents also take
                         precedence over a filesystem agent of the same name.
  setting_sources=[]     stops user/project/local settings being read at all,
                         so `.claude/agents/play-mud.md` is never loaded.

"Agent" must be in allowed_tools, or subagent invocations hit a permission
prompt instead of running.
"""

import asyncio
import sys
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, query

from agents import AGENTS, PLAY_MUD_TOOLS

PROJECT_ROOT = Path(__file__).parent.resolve()

DEFAULT_PROMPT = (
    "Use the play-mud agent to connect, check status, and look around. "
    "Report what you find."
)


async def main() -> None:
    prompt = " ".join(sys.argv[1:]) or DEFAULT_PROMPT

    options = ClaudeAgentOptions(
        agents=AGENTS,
        # "Agent" auto-approves subagent invocation; the rest mirror the tools
        # the subagent itself is allowed to use.
        allowed_tools=["Agent", *PLAY_MUD_TOOLS],
        setting_sources=[],
        cwd=PROJECT_ROOT,
    )

    async for message in query(prompt=prompt, options=options):
        result = getattr(message, "result", None)
        if result is not None:
            print(result)


if __name__ == "__main__":
    asyncio.run(main())
