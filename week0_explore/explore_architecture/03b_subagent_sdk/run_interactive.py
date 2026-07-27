#!/Users/karolmoralesmaureira/Documents/claude-code-camp-2026-Q/claude-code-camp-2026-Q2/week0_explore/explore_architecture/03b_subagent_sdk/.venv/bin/python3
"""Interactive MUD player - persistent connection."""

import asyncio
from pathlib import Path

from claude_agent_sdk import AgentDefinition, ClaudeAgentOptions, query

PROJECT_ROOT = Path(__file__).parent.resolve()

FAST_PROMPT = """You are a MUD player agent. Use bash to run: cd .claude/agents/scripts && node mud_cli.js <action>

Available actions: connect, send <command>, status, look, disconnect"""

FAST_AGENT = AgentDefinition(
    description="Play MUD game on localhost:4000",
    prompt=FAST_PROMPT,
    tools=["Bash"],
    model="claude-haiku-4-5-20251001",
)

AGENTS = {"play-mud": FAST_AGENT}


async def run_query(user_input: str) -> None:
    options = ClaudeAgentOptions(
        agents=AGENTS,
        allowed_tools=["Agent"],
        setting_sources=[],
        cwd=PROJECT_ROOT,
    )

    async for message in query(prompt=user_input, options=options):
        result = getattr(message, "result", None)
        if result is not None:
            print(result)


async def main() -> None:
    print("🎮 MUD Player - Interactive Mode")
    print("Type commands. Examples: 'connect', 'look', 'status', 'quit'\n")

    while True:
        try:
            user_input = input("You: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["quit", "exit", "q"]:
                print("Goodbye!")
                break

            print("\n⏳ Processing...\n")
            await run_query(user_input)
            print()
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break


if __name__ == "__main__":
    asyncio.run(main())
