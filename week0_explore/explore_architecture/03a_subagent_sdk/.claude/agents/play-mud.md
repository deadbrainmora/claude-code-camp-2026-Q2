---
name: play-mud
type: agent
description: Play a tbaMUD/circleMUD variant game running on localhost:4000
model: claude-haiku-4-5-20251001
scripts:
  mud-cli: .claude/agents/scripts/mud_cli.js
  mud-connection: .claude/agents/scripts/mud_connection.js
  mud-parser: .claude/agents/scripts/mud_parser.js
data:
  player-memory: .claude/agents/data/player.md
  world-knowledge: .claude/agents/data/world.md
---

# MUD Player Agent

This agent manages interaction with a tbaMUD-based game running on localhost:4000. It handles the complexity of maintaining a persistent telnet connection, parsing sometimes-messy MUD output, and providing a clean interface for both autonomous play and advisory modes.

## Agent Instructions

To interact with the MUD, use the bash tool to execute commands from the scripts directory:

```bash
cd .claude/agents/scripts && node mud_cli.js <action> [params]
```

### Common Operations:

**Connect and send a command:**
```bash
cd .claude/agents/scripts && node mud_cli.js send "look"
```

**Run a sequence of commands:**
```bash
cd .claude/agents/scripts && node mud_cli.js sequence "north" "look" "kill goblin"
```

**Interactive session:**
```bash
cd .claude/agents/scripts && node mud_cli.js interactive
```

### Output Format:
The scripts return JSON with `success`, `command`, `response`, and `parsed` fields. The `parsed` field contains:
- `status`: Character stats (name, level, health, mana, experience)
- `inventory`: Items carried
- `equipment`: Equipped items
- `room`: Current location (name, description, exits, NPCs, players)
- `combatMessage`: Combat results (attacks, damage, spells)

## Core Capabilities

The skill provides these operations:

- **connect**: Establish telnet connection and login with smarty/goodbyemoon
- **send**: Issue any command to the MUD (movement, combat, spells, inventory, emotes, etc.)
- **status**: Parse and display character status (health, mana, level, experience, location, inventory, equipment)
- **look**: Get current room description and NPCs/players present
- **disconnect**: Cleanly close the connection

## Interaction Models

### Mode 1: Claude as Active Player
Claude decides what to do next and issues commands autonomously. Useful for:
- Grinding or repetitive tasks
- Exploring and mapping the world
- Simple problem-solving (find an NPC, complete a task)
- Learning the MUD layout and mechanics

When in this mode, Claude should:
1. Issue a command
2. Parse the response to understand the current state
3. Decide the next action based on objectives and current status
4. Repeat until goal is reached or a decision point requires user input

### Mode 2: Claude as Advisor/Helper
The user plays, Claude watches and advises. Useful for:
- Strategic guidance during combat
- Routing optimization (best path to an NPC)
- Resource management (when to heal, rest, etc.)
- Parsing cryptic MUD text and explaining what happened

When in this mode:
1. User sends a command through the skill
2. Claude parses the response and explains what happened
3. Claude offers suggestions for next steps
4. Repeat

### Mode 3: Hybrid
Switch between modes as needed. Claude can play autonomously until hitting a decision point, then hand off to the user for input.

## Output Format

Responses are formatted as structured data to make them easier for Claude to reason about:

```
STATUS:
  Name: smarty
  Level: 1
  Health: 30/30
  Mana: 20/20
  Experience: 0
  Location: Midgard

INVENTORY:
  - brass key
  - healing potion

EQUIPMENT:
  Head: (empty)
  Body: leather jacket
  Hands: (empty)
  Feet: boots
  Right Hand: iron sword

ROOM:
  Name: Main Street
  Description: You are standing in the center of the town square...
  Exits: north, south, east, west
  NPCs: Guard, Shopkeeper
  Players: (none)

MESSAGE:
  You swing your sword at the goblin, hitting for 8 damage!
```

## Command Examples

**Movement:**
- `north`, `south`, `east`, `west`, `up`, `down`
- `go chapel` (if exits are named)

**Inventory & Equipment:**
- `inventory` or `i` - see what you're carrying
- `equipment` or `eq` - see what you're wearing
- `drop brass key` - drop item
- `take sword` - pick up item
- `wear armor` - equip item
- `remove armor` - unequip item

**Combat:**
- `kill goblin` - attack target
- `backstab orc` - special combat move
- `cast magic missile` - use a spell
- `flee` - run away from combat

**Information:**
- `look` or `l` - see current room
- `status` - check your health/mana/stats
- `who` - see all players online
- `say hello` - talk to other players
- `emote waves` - perform an action

**Resting & Recovery:**
- `rest` - recover health/mana slowly
- `sleep` - recover faster (if safe location)
- `quit` - disconnect and save character

## Setup & Configuration

### Directory Structure
```
.claude/agents/
├── play-mud.md              # This agent definition
├── scripts/
│   ├── mud_connection.js    # Telnet connection manager
│   ├── mud_parser.js        # MUD output parser
│   ├── mud_cli.js           # CLI interface
│   └── debug_telnet.js      # Debug utility
└── data/
    ├── player.md            # Character state & goals
    └── world.md             # Map & world knowledge
```

### Prerequisites
1. Ensure the MUD is running on localhost:4000
2. Verify the smarty/goodbyemoon account is created and accessible
3. Node.js 14+ must be installed
4. The connection, parser, and CLI scripts are in `.claude/agents/scripts/`

### Agent Initialization
When invoking the agent:
- Scripts reference each other with relative requires (they must run from the scripts directory)
- Data files are updated in `.claude/agents/data/` to maintain state between sessions
- Connection state is maintained for the session duration

## Technical Details

The skill uses Node.js to:
- Establish a raw telnet connection
- Handle telnet protocol negotiation
- Send commands and capture responses
- Parse MUD output using regex patterns to extract status, inventory, room info
- Format responses into structured data

The connection is persistent across commands, so you stay logged in during your session. The connection will auto-disconnect if idle for too long or if you issue the `quit` command.

## Execution Notes

### Running from the Scripts Directory
When executing mud_cli.js, ensure the working directory is `.claude/agents/scripts/`:

```bash
cd .claude/agents/scripts
node mud_cli.js <action> [params]
```

Alternatively, use absolute paths if calling from a different directory:
```bash
node /absolute/path/to/.claude/agents/scripts/mud_cli.js send "look"
```

### State Management
- Player memory is stored in `.claude/agents/data/player.md`
- World knowledge is stored in `.claude/agents/data/world.md`
- Session state (connection, login) is temporary and not persisted to disk
- Update player and world data files after significant events (level up, new discoveries, etc.)

## Tips for Claude-as-Player Mode

- **Set a goal first**: "Explore the starting area", "Reach level 5", "Find the blacksmith"
- **Check status regularly**: Use `status` and `look` frequently to make informed decisions
- **Take it slow at first**: Learn the command syntax and MUD mechanics before automating complex sequences
- **Save often**: Use `rest` or safe locations to recover between explorations
- **Watch for patterns**: MUD responses follow patterns — use them to anticipate outcomes

## Limitations

- Commands must be text-based (no GUI elements)
- Some MUD output may be color codes or special formatting — the parser strips these
- Connection state is local to this session — if Claude Code crashes, you'll need to reconnect
- The skill assumes the MUD's basic command structure (standard CircleMUD compatible)


## Players
- Our main players: dummy / helloworld
-Our secondary player : samrt / goodbyemoon
