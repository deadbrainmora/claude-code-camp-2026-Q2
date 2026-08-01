# N8N MUD Tool - Python Examples

How to use the MUD tool in n8n's Python beta parameter.

## Setup

1. Copy `mud_n8n_tool.py` to your n8n working directory or n8n data directory
2. In your n8n Python node, import and use the tool

## Basic Examples

### Example 1: Simple Command

```python
from mud_n8n_tool import MUDClient

client = MUDClient()
result = client.send_command("look")

# Access the parsed data
if result['success']:
    print(result['parsed'])  # Contains: status, inventory, equipment, room
else:
    print(f"Error: {result['error']}")
```

### Example 2: Get Formatted Status

```python
from mud_n8n_tool import MUDClient

client = MUDClient()
status_result = client.status()

if status_result['success']:
    formatted = client.format_status(status_result['parsed'])
    print(formatted)
```

### Example 3: Execute Multiple Commands

```python
from mud_n8n_tool import MUDClient

client = MUDClient()

# Move north, look around, check inventory
commands = ["north", "look", "inventory"]
result = client.sequence(commands)

if result['success']:
    # result['parsed'] contains the final state after all commands
    print(result['parsed'])
```

### Example 4: Combat Sequence

```python
from mud_n8n_tool import MUDClient

client = MUDClient()

# Attack a goblin
attack_result = client.attack("goblin")

if attack_result['success']:
    # Check if we're still in combat
    status = client.status()
    health = status['parsed']['status']['health']
    max_health = status['parsed']['status']['max_health']
    
    print(f"Health: {health}/{max_health}")
    
    # If health is low, flee
    if health < max_health * 0.3:
        client.send_command("flee")
```

### Example 5: Conditional Movement

```python
from mud_n8n_tool import MUDClient

client = MUDClient()

# Look around
look_result = client.look()

if look_result['success']:
    room = look_result['parsed']['room']
    exits = room.get('exits', [])
    
    # Move north if available
    if 'north' in exits:
        move_result = client.move("north")
        print(f"Moved north: {move_result['success']}")
    else:
        print(f"Can't go north. Available exits: {exits}")
```

### Example 6: With N8N Input Items

```python
from mud_n8n_tool import MUDClient
import json

# Access n8n input items
client = MUDClient()

# Assuming you have n8n items passed in
# items[0].json.command = "look"
# items[0].json.action_type = "movement"

action = "{{ $item(0).json.command }}"  # n8n template syntax

if action == "look":
    result = client.look()
elif action.startswith("go "):
    result = client.send_command(action)
elif action == "status":
    result = client.status()
else:
    result = client.send_command(action)

# Return as n8n output
print(json.dumps(result))
```

### Example 7: Auto-Explore Pattern

```python
from mud_n8n_tool import MUDClient

client = MUDClient()
visited_rooms = set()

def explore_area():
    look_result = client.look()
    
    if not look_result['success']:
        return False
    
    room = look_result['parsed']['room']
    room_name = room.get('name')
    
    if room_name in visited_rooms:
        return True  # Already been here
    
    visited_rooms.add(room_name)
    print(f"Exploring: {room_name}")
    
    # Move in the first available direction
    exits = room.get('exits', [])
    if exits:
        client.move(exits[0])
        return True
    
    return False

# Explore 5 rooms
for _ in range(5):
    if not explore_area():
        break

print(f"Visited {len(visited_rooms)} rooms")
```

## Response Structure

All methods return a dict with this structure:

```python
{
    "success": bool,           # True if command succeeded
    "command": str,            # The command that was run
    "response": str,           # Raw MUD output
    "parsed": {                # Structured data extracted from response
        "status": {
            "name": str,
            "level": int,
            "health": int,
            "max_health": int,
            "mana": int,
            "max_mana": int,
            "experience": int,
            "location": str
        },
        "inventory": [str, ...],  # List of items
        "equipment": {             # Equipped items by slot
            "head": str,
            "body": str,
            "hands": str,
            "feet": str,
            "right_hand": str,
            "left_hand": str
        },
        "room": {
            "name": str,
            "description": str,
            "exits": [str, ...],
            "npcs": [str, ...],
            "players": [str, ...]
        },
        "combatMessage": str       # Combat output if applicable
    },
    "error": str               # Error message if success=False
}
```

## Available Methods

- `send_command(command: str)` - Send any single MUD command
- `sequence(commands: List[str])` - Execute multiple commands
- `status()` - Get character status
- `look()` - Get room description
- `inventory()` - Check inventory
- `equipment()` - Check equipped items
- `move(direction: str)` - Move in a direction
- `attack(target: str)` - Attack a target
- `cast_spell(spell: str, target: str = None)` - Cast a spell
- `emote(action: str)` - Perform an action
- `say(message: str)` - Say something
- `rest()` - Rest to recover health/mana
- `connect(username, password)` - Connect and login
- `disconnect()` - Close connection
- `format_status(parsed_data)` - Pretty-print status data

## Using in N8N Workflow

### 1. Add Python Node

In your n8n workflow, add a **Python** node (with beta enabled).

### 2. Import and Initialize

```python
from mud_n8n_tool import MUDClient

client = MUDClient()
```

### 3. Access Previous Node Data

```python
# Access data from previous n8n nodes
# Use n8n's template syntax: {{ $node.NodeName.json.fieldName }}
command_to_run = "{{ $item(0).json.command }}"

result = client.send_command(command_to_run)
```

### 4. Pass to Next Node

```python
# n8n automatically handles the return value
# Whatever you return or print will be available to the next node
return result

# Or return specific fields
return {
    "status": result['parsed']['status'] if result['success'] else None,
    "error": result['error'] if not result['success'] else None
}
```

## Tips

- Keep the MUD server running on `localhost:4000`
- The Node.js scripts directory must exist at `.claude/agents/scripts/`
- Responses are cached for the same location, so repeated `look` commands may be instant
- Use `format_status()` for human-readable output in logs
- Check `result['success']` before accessing `result['parsed']`
