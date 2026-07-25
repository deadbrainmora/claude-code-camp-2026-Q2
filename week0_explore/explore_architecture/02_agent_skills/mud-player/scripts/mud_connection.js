#!/usr/bin/env node

const net = require('net');
const fs = require('fs');
const path = require('path');

class MUDConnection {
  constructor(host = 'localhost', port = 4000, stateFile = null) {
    this.host = host;
    this.port = port;
    this.socket = null;
    this.connected = false;
    this.loggedIn = false;
    this.buffer = '';
    this.responseBuffer = [];
    this.stateFile = stateFile || path.join(__dirname, '.mud_state.json');
    this.commandQueue = [];
    this.isProcessing = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection({
        host: this.host,
        port: this.port,
      });

      this.socket.setTimeout(5000);

      this.socket.on('connect', () => {
        this.connected = true;
        console.log(`Connected to ${this.host}:${this.port}`);
        this.login().then(resolve).catch(reject);
      });

      this.socket.on('data', (data) => {
        this.buffer += data.toString();
        this.responseBuffer.push(data.toString());
      });

      this.socket.on('error', (err) => {
        this.connected = false;
        reject(new Error(`Connection error: ${err.message}`));
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.loggedIn = false;
      });

      this.socket.on('timeout', () => {
        this.socket.destroy();
        reject(new Error('Connection timeout'));
      });
    });
  }

  login(username = 'dummy', password = 'helloworld') {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Login timeout'));
      }, 25000);

      // Careful timing based on observed MUD behavior:
      // ~3.5s: handshake + banner + "By what name"
      // ~4s: send username
      // ~5.5s: confirm name with 'y'
      // ~6.5s: send password
      // ~7.5s: menu appears
      // ~15s: enough time for the first command to handle the menu

      setTimeout(() => { this.socket.write(`${username}\n`); console.log('→ username'); }, 4000);
      setTimeout(() => { this.socket.write('y\n'); console.log('→ confirm'); }, 5500);
      setTimeout(() => { this.socket.write(`${password}\n`); console.log('→ password'); }, 6500);

      setTimeout(() => {
        clearTimeout(timeout);
        this.loggedIn = true;
        // Don't clear buffer - the menu data will be there for send() to handle
        console.log('✓ login complete (at menu)');
        resolve(true);
      }, 8000);
    });
  }

  send(command) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to MUD'));
        return;
      }

      try {
        // Wait for menu to appear before sending choice
        // The menu appears ~7-9 seconds after connection start, login completes at ~8 seconds
        // So we need to wait 3-5 more seconds from when send() is called
        setTimeout(() => {
          console.log('→ sending menu choice 1');
          this.socket.write('1\n');

          // Wait for game to load after menu selection
          setTimeout(() => {
            console.log(`→ sending command: ${command}`);
            this.responseBuffer = [];
            this.socket.write(`${command}\n`);
            this.waitForMUDResponse(resolve, reject);
          }, 2000);
        }, 5000);
      } catch (err) {
        reject(new Error(`Failed to send command: ${err.message}`));
      }
    });
  }

  waitForMUDResponse(resolve, reject) {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max

    const waitForResponse = setInterval(() => {
      attempts++;

      if (this.responseBuffer.length > 0 || attempts > maxAttempts) {
        clearInterval(waitForResponse);

        const response = this.responseBuffer.join('');
        this.responseBuffer = [];

        if (response.trim()) {
          resolve(response);
        } else if (attempts > maxAttempts) {
          reject(new Error('No response from MUD'));
        }
      }
    }, 100);
  }

  disconnect() {
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.end();
        this.connected = false;
        this.loggedIn = false;
      }
      resolve(true);
    });
  }

  isConnected() {
    return this.connected && this.loggedIn;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const action = args[0];
  const param = args[1];

  const mud = new MUDConnection();

  (async () => {
    try {
      switch (action) {
        case 'connect':
          await mud.connect();
          console.log('Connected and logged in successfully');
          console.log('Enter "quit" to exit');

          // Interactive mode
          const readline = require('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const prompt = () => {
            rl.question('> ', async (input) => {
              if (input === 'quit') {
                await mud.disconnect();
                rl.close();
                process.exit(0);
              }

              try {
                const response = await mud.send(input);
                console.log(response);
              } catch (err) {
                console.error(`Error: ${err.message}`);
              }

              prompt();
            });
          };

          prompt();
          break;

        case 'send':
          await mud.connect();
          const response = await mud.send(param);
          console.log(JSON.stringify({ success: true, response }, null, 2));
          await mud.disconnect();
          break;

        default:
          console.log('Usage:');
          console.log('  node mud_connection.js connect              - Interactive connection');
          console.log('  node mud_connection.js send "<command>"    - Send single command');
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  })();
}

module.exports = MUDConnection;
