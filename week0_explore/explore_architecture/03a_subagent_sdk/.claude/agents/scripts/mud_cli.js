#!/usr/bin/env node

const MUDConnection = require('./mud_connection');
const MUDParser = require('./mud_parser');
const fs = require('fs');
const path = require('path');

class MUDClient {
  constructor() {
    this.mud = new MUDConnection();
    this.parser = new MUDParser();
    this.sessionFile = path.join(__dirname, '.mud_session.json');
  }

  loadSession() {
    try {
      if (fs.existsSync(this.sessionFile)) {
        const data = JSON.parse(fs.readFileSync(this.sessionFile, 'utf-8'));
        return data;
      }
    } catch (err) {
      console.error(`Warning: Could not load session: ${err.message}`);
    }
    return null;
  }

  saveSession(data) {
    try {
      fs.writeFileSync(this.sessionFile, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Warning: Could not save session: ${err.message}`);
    }
  }

  async connect() {
    try {
      await this.mud.connect();
      this.saveSession({ connected: true, timestamp: new Date().toISOString() });
      return { success: true, message: 'Connected to MUD and logged in' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async sendCommand(command) {
    if (!this.mud.isConnected()) {
      try {
        await this.mud.connect();
      } catch (err) {
        return { success: false, error: `Connection failed: ${err.message}` };
      }
    }

    try {
      const response = await this.mud.send(command);
      const parsed = this.parser.parseFullResponse(response);

      return {
        success: true,
        command: command,
        response: this.parser.formatResponse(parsed),
        parsed: parsed,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async disconnect() {
    try {
      await this.mud.disconnect();
      this.saveSession({ connected: false, timestamp: new Date().toISOString() });
      return { success: true, message: 'Disconnected from MUD' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async runSequence(commands) {
    const results = [];

    for (const cmd of commands) {
      const result = await this.sendCommand(cmd);
      results.push(result);

      if (!result.success) {
        results.push({ message: 'Stopping sequence due to error', stopped_at: cmd });
        break;
      }
    }

    return results;
  }
}

// Main CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const action = args[0];
  const params = args.slice(1);

  const client = new MUDClient();

  (async () => {
    try {
      let result;

      switch (action) {
        case 'connect':
          result = await client.connect();
          console.log(JSON.stringify(result, null, 2));
          break;

        case 'send':
          const command = params.join(' ');
          if (!command) {
            console.error('Error: No command provided');
            process.exit(1);
          }
          result = await client.sendCommand(command);
          console.log(JSON.stringify(result, null, 2));
          break;

        case 'sequence':
          const commands = params;
          if (!commands.length) {
            console.error('Error: No commands provided');
            process.exit(1);
          }
          result = await client.runSequence(commands);
          console.log(JSON.stringify(result, null, 2));
          break;

        case 'disconnect':
          result = await client.disconnect();
          console.log(JSON.stringify(result, null, 2));
          break;

        case 'interactive':
          await client.connect();
          console.log('Connected to MUD. Type commands or "quit" to exit.');

          const readline = require('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const prompt = () => {
            rl.question('> ', async (input) => {
              if (input.toLowerCase() === 'quit') {
                await client.disconnect();
                rl.close();
                process.exit(0);
              }

              result = await client.sendCommand(input);
              console.log(result.response);
              prompt();
            });
          };

          prompt();
          break;

        default:
          console.log('MUD Client CLI');
          console.log('');
          console.log('Usage:');
          console.log('  mud_cli.js connect                   - Connect to MUD');
          console.log('  mud_cli.js send "<command>"          - Send a single command');
          console.log('  mud_cli.js sequence <cmd1> <cmd2> .. - Send multiple commands');
          console.log('  mud_cli.js disconnect                - Disconnect from MUD');
          console.log('  mud_cli.js interactive               - Start interactive session');
          console.log('');
          console.log('Examples:');
          console.log('  node mud_cli.js connect');
          console.log('  node mud_cli.js send "look"');
          console.log('  node mud_cli.js send "kill goblin"');
          console.log('  node mud_cli.js sequence "north" "look" "take sword"');
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  })();
}

module.exports = MUDClient;
