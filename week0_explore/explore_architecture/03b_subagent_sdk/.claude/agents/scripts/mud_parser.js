#!/usr/bin/env node

class MUDParser {
  constructor() {
    this.ansiRegex = /\x1B\[[0-9;]*m/g;
  }

  stripAnsi(text) {
    return text.replace(this.ansiRegex, '');
  }

  parseStatus(output) {
    const clean = this.stripAnsi(output);
    const status = {
      name: null,
      level: null,
      health: { current: null, max: null },
      mana: { current: null, max: null },
      experience: null,
      location: null,
    };

    // Name pattern: typically in prompt or character line
    const nameMatch = clean.match(/^(\w+)\s+(?:the|lv|lvl|level)/im);
    if (nameMatch) status.name = nameMatch[1];

    // Level patterns
    const levelMatch = clean.match(/(?:level|lvl).*?(\d+)/i);
    if (levelMatch) status.level = parseInt(levelMatch[1]);

    // Health patterns (HP: 30/30, Health: 30/30, etc.)
    const hpMatch = clean.match(/(?:hp|health).*?(\d+)\s*\/\s*(\d+)/i);
    if (hpMatch) {
      status.health.current = parseInt(hpMatch[1]);
      status.health.max = parseInt(hpMatch[2]);
    }

    // Mana patterns (Mana: 20/20, M: 20/20, etc.)
    const manaMatch = clean.match(/(?:mana|mp|m).*?(\d+)\s*\/\s*(\d+)/i);
    if (manaMatch) {
      status.mana.current = parseInt(manaMatch[1]);
      status.mana.max = parseInt(manaMatch[2]);
    }

    // Experience
    const expMatch = clean.match(/(?:exp|experience).*?(\d+)/i);
    if (expMatch) status.experience = parseInt(expMatch[1]);

    return status;
  }

  parseInventory(output) {
    const clean = this.stripAnsi(output);
    const inventory = [];

    // Look for inventory section
    const invMatch = clean.match(/(?:you are carrying|inventory)[\s\S]*?(?:\n\n|you are)/i);
    if (invMatch) {
      const invText = invMatch[0];
      // Extract item lines (usually indented or bullet-pointed)
      const items = invText.match(/^\s{2,}.*$/gm) || [];
      items.forEach((item) => {
        const trimmed = item.trim();
        if (trimmed && !trimmed.match(/^(?:nothing|empty)/i)) {
          inventory.push(trimmed);
        }
      });
    }

    return inventory;
  }

  parseEquipment(output) {
    const clean = this.stripAnsi(output);
    const equipment = {};

    const slots = ['head', 'neck', 'body', 'back', 'waist', 'hands', 'fingers', 'feet', 'legs', 'right hand', 'left hand'];

    slots.forEach((slot) => {
      const regex = new RegExp(`<${slot}>\\s*(.*?)(?=<|$)`, 'i');
      const match = clean.match(regex);
      if (match) {
        equipment[slot] = match[1].trim() || '(empty)';
      }
    });

    return equipment;
  }

  parseRoom(output) {
    const clean = this.stripAnsi(output);
    const room = {
      name: null,
      description: null,
      exits: [],
      npcs: [],
      players: [],
    };

    // Room name (usually at top, capitalized line)
    const nameMatch = clean.match(/^([A-Z][^(\n]*)/m);
    if (nameMatch) room.name = nameMatch[1].trim();

    // Description (before "Exits" line)
    const descMatch = clean.match(/^[A-Z][^\n]*\n([\s\S]*?)(?=Exits|exits|\n\n|$)/i);
    if (descMatch) {
      room.description = descMatch[1].trim();
    }

    // Exits pattern
    const exitsMatch = clean.match(/(?:Exits|exits):\s*(.*?)(?:\n|$)/i);
    if (exitsMatch) {
      const exitStr = exitsMatch[1];
      room.exits = exitStr.split(/[,\s]+/).filter((e) => e.length > 0 && !e.match(/^to$/i));
    }

    // NPCs and players (usually listed as "[NPC]" or "[Player]")
    const npcMatches = clean.match(/\[([^\]]*npc[^\]]*)\]/gi) || [];
    room.npcs = npcMatches.map((m) => m.replace(/\[|\]|\(npc\)/gi, '').trim());

    const playerMatches = clean.match(/\[([^\]]*player[^\]]*)\]/gi) || [];
    room.players = playerMatches.map((m) => m.replace(/\[|\]|\(player\)/gi, '').trim());

    return room;
  }

  parseCombatMessage(output) {
    const clean = this.stripAnsi(output);

    const messages = {
      attack: null,
      damage: null,
      heal: null,
      spell: null,
      miss: false,
      death: false,
    };

    // Attack message
    if (clean.match(/(?:hit|strike|slash|pierce|punch|kick)/i)) {
      messages.attack = true;
    }

    // Damage number
    const damageMatch = clean.match(/(\d+)\s*(?:damage|damage points|hp?)/i);
    if (damageMatch) messages.damage = parseInt(damageMatch[1]);

    // Miss
    if (clean.match(/miss(?:es)?/i)) messages.miss = true;

    // Spell cast
    if (clean.match(/(?:cast|spell|magic)/i)) messages.spell = true;

    // Death
    if (clean.match(/(?:dies|death|killed)/i)) messages.death = true;

    // Heal
    const healMatch = clean.match(/heal(?:ed|ing)?.*?(\d+)/i);
    if (healMatch) messages.heal = parseInt(healMatch[1]);

    return messages;
  }

  formatStatus(status) {
    let output = 'STATUS:\n';
    if (status.name) output += `  Name: ${status.name}\n`;
    if (status.level) output += `  Level: ${status.level}\n`;
    if (status.health.current !== null) {
      output += `  Health: ${status.health.current}/${status.health.max}\n`;
    }
    if (status.mana.current !== null) {
      output += `  Mana: ${status.mana.current}/${status.mana.max}\n`;
    }
    if (status.experience) output += `  Experience: ${status.experience}\n`;
    return output;
  }

  formatRoom(room) {
    let output = 'ROOM:\n';
    if (room.name) output += `  Name: ${room.name}\n`;
    if (room.description) output += `  Description: ${room.description.substring(0, 200)}...\n`;
    if (room.exits.length) output += `  Exits: ${room.exits.join(', ')}\n`;
    if (room.npcs.length) output += `  NPCs: ${room.npcs.join(', ')}\n`;
    if (room.players.length) output += `  Players: ${room.players.join(', ')}\n`;
    return output;
  }

  formatInventory(inventory) {
    if (!inventory.length) return 'INVENTORY: (empty)\n';
    return `INVENTORY:\n${inventory.map((i) => `  - ${i}`).join('\n')}\n`;
  }

  parseFullResponse(output) {
    const parsed = {
      rawOutput: this.stripAnsi(output),
      status: this.parseStatus(output),
      inventory: this.parseInventory(output),
      equipment: this.parseEquipment(output),
      room: this.parseRoom(output),
      combatMessage: this.parseCombatMessage(output),
    };

    return parsed;
  }

  formatResponse(parsed) {
    let result = '';
    result += this.formatStatus(parsed.status);
    result += this.formatInventory(parsed.inventory);
    result += this.formatRoom(parsed.room);

    if (Object.values(parsed.combatMessage).some((v) => v)) {
      result += '\nCOMBAT:\n';
      if (parsed.combatMessage.attack) result += '  Action: Attack\n';
      if (parsed.combatMessage.miss) result += '  Result: MISS\n';
      if (parsed.combatMessage.damage) result += `  Damage: ${parsed.combatMessage.damage}\n`;
      if (parsed.combatMessage.spell) result += '  Action: Spell Cast\n';
      if (parsed.combatMessage.death) result += '  Result: TARGET DEFEATED\n';
      if (parsed.combatMessage.heal) result += `  Healing: ${parsed.combatMessage.heal}\n`;
    }

    return result;
  }
}

// CLI mode
if (require.main === module) {
  const args = process.argv.slice(2);
  const parser = new MUDParser();

  const stdin = fs.readFileSync(0, 'utf-8');

  try {
    const parsed = parser.parseFullResponse(stdin);
    console.log(JSON.stringify(parsed, null, 2));
  } catch (err) {
    console.error(`Parse error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = MUDParser;
