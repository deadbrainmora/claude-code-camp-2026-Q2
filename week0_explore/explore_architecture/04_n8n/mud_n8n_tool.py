"""
N8N MUD Interaction Tool

This module provides a Python interface to interact with a tbaMUD/circleMUD
game running on localhost:4000. Designed to work with n8n's Python beta parameter.

Usage in n8n Python node:
    from mud_n8n_tool import MUDClient

    client = MUDClient()
    result = client.send_command("look")
    # result contains: success, command, response, parsed
"""

import json
import subprocess
import os
from typing import Dict, Any, List, Optional
from pathlib import Path


class MUDClient:
    """Interface for interacting with MUD through Node.js CLI scripts."""

    def __init__(self, scripts_dir: str = ".claude/agents/scripts"):
        """
        Initialize MUD client.

        Args:
            scripts_dir: Path to the scripts directory containing mud_cli.js
        """
        self.scripts_dir = Path(scripts_dir)
        self.mud_cli = self.scripts_dir / "mud_cli.js"

        if not self.mud_cli.exists():
            raise FileNotFoundError(f"mud_cli.js not found at {self.mud_cli}")

    def _run_command(self, action: str, params: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Execute a mud_cli.js command and return parsed JSON response.

        Args:
            action: The action to perform (send, sequence, status, look, etc.)
            params: Additional parameters for the action

        Returns:
            Dict with keys: success, command, response, parsed
        """
        try:
            cmd = ["node", str(self.mud_cli), action]
            if params:
                cmd.extend(params)

            result = subprocess.run(
                cmd,
                cwd=str(self.scripts_dir),
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                return {
                    "success": False,
                    "error": result.stderr or "Command failed",
                    "command": action,
                    "response": None,
                    "parsed": None
                }

            try:
                data = json.loads(result.stdout)
                return data
            except json.JSONDecodeError:
                return {
                    "success": False,
                    "error": "Invalid JSON response",
                    "command": action,
                    "response": result.stdout,
                    "parsed": None
                }

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Command timeout",
                "command": action,
                "response": None,
                "parsed": None
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "command": action,
                "response": None,
                "parsed": None
            }

    def send_command(self, command: str) -> Dict[str, Any]:
        """
        Send a single command to the MUD.

        Examples:
            client.send_command("look")
            client.send_command("north")
            client.send_command("kill goblin")
            client.send_command("cast magic missile")
        """
        return self._run_command("send", [command])

    def sequence(self, commands: List[str]) -> Dict[str, Any]:
        """
        Execute a sequence of commands in order.

        Example:
            client.sequence(["north", "look", "kill goblin"])
        """
        return self._run_command("sequence", commands)

    def status(self) -> Dict[str, Any]:
        """Get current character status (health, mana, level, location)."""
        return self._run_command("status")

    def look(self) -> Dict[str, Any]:
        """Get current room description and occupants."""
        return self._run_command("look")

    def connect(self, username: str, password: str) -> Dict[str, Any]:
        """Establish connection and login."""
        return self._run_command("connect", [username, password])

    def disconnect(self) -> Dict[str, Any]:
        """Close the MUD connection."""
        return self._run_command("disconnect")

    def inventory(self) -> Dict[str, Any]:
        """Check character inventory."""
        return self.send_command("inventory")

    def equipment(self) -> Dict[str, Any]:
        """Check equipped items."""
        return self.send_command("equipment")

    def move(self, direction: str) -> Dict[str, Any]:
        """
        Move in a direction.

        Args:
            direction: north, south, east, west, up, down
        """
        return self.send_command(direction)

    def attack(self, target: str) -> Dict[str, Any]:
        """Attack a target."""
        return self.send_command(f"kill {target}")

    def cast_spell(self, spell: str, target: Optional[str] = None) -> Dict[str, Any]:
        """
        Cast a spell.

        Args:
            spell: Name of the spell
            target: Optional target for the spell
        """
        cmd = f"cast {spell}"
        if target:
            cmd += f" {target}"
        return self.send_command(cmd)

    def emote(self, action: str) -> Dict[str, Any]:
        """Perform an emote/action visible to other players."""
        return self.send_command(f"emote {action}")

    def say(self, message: str) -> Dict[str, Any]:
        """Say something (visible to other players in the room)."""
        return self.send_command(f"say {message}")

    def rest(self) -> Dict[str, Any]:
        """Rest to recover health and mana."""
        return self.send_command("rest")

    def format_status(self, parsed_data: Optional[Dict[str, Any]]) -> str:
        """
        Format parsed status data into readable text for n8n workflows.

        Args:
            parsed_data: The 'parsed' field from a MUD response

        Returns:
            Formatted status string
        """
        if not parsed_data:
            return "No status data available"

        lines = []

        if "status" in parsed_data:
            s = parsed_data["status"]
            lines.append("STATUS:")
            lines.append(f"  Name: {s.get('name', 'Unknown')}")
            lines.append(f"  Level: {s.get('level', '?')}")
            lines.append(f"  Health: {s.get('health', '?')}/{s.get('max_health', '?')}")
            lines.append(f"  Mana: {s.get('mana', '?')}/{s.get('max_mana', '?')}")
            lines.append(f"  Experience: {s.get('experience', '?')}")
            lines.append(f"  Location: {s.get('location', 'Unknown')}")

        if "inventory" in parsed_data and parsed_data["inventory"]:
            lines.append("\nINVENTORY:")
            for item in parsed_data["inventory"]:
                lines.append(f"  - {item}")

        if "equipment" in parsed_data:
            eq = parsed_data["equipment"]
            lines.append("\nEQUIPMENT:")
            for slot, item in eq.items():
                status = item if item else "(empty)"
                lines.append(f"  {slot}: {status}")

        if "room" in parsed_data:
            room = parsed_data["room"]
            lines.append("\nROOM:")
            lines.append(f"  Name: {room.get('name', 'Unknown')}")
            if room.get('description'):
                lines.append(f"  Description: {room['description']}")
            if room.get('exits'):
                lines.append(f"  Exits: {', '.join(room['exits'])}")
            if room.get('npcs'):
                lines.append(f"  NPCs: {', '.join(room['npcs'])}")

        return "\n".join(lines)


def main():
    """
    Example usage for n8n Python node.
    Uncomment and modify based on your n8n input items.
    """
    try:
        client = MUDClient()

        # Example 1: Send a simple command
        result = client.send_command("look")
        if result['success']:
            print(client.format_status(result.get('parsed')))
        else:
            print(f"Error: {result['error']}")

        # Example 2: Get status
        status_result = client.status()
        if status_result['success']:
            print("\n" + client.format_status(status_result.get('parsed')))

        return result

    except Exception as e:
        print(f"Exception: {e}")
        return {"success": False, "error": str(e)}


# For n8n: this allows the script to be imported and used directly
if __name__ == "__main__":
    main()
