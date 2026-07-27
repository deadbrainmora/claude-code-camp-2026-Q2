#!/usr/bin/env node

const net = require('net');

const socket = net.createConnection({
  host: 'localhost',
  port: 4000,
});

let buffer = '';
let commandResults = {};

console.log('=== FULL STATUS REPORT ===\n');

socket.on('connect', () => {
  console.log('[✓] Connected to MUD on localhost:4000\n');
});

socket.on('data', (data) => {
  buffer += data.toString();
});

socket.on('error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

socket.on('close', () => {
  process.exit(0);
});

// Login sequence - character already exists, so reconnect
setTimeout(() => socket.write('dummy\n'), 3000);
setTimeout(() => socket.write('helloworld\n'), 6000);

// Send commands to gather information
setTimeout(() => { 
  console.log('[*] Sending commands to gather information...\n');
  socket.write('look\n'); 
}, 9000);

setTimeout(() => socket.write('score\n'), 10500);
setTimeout(() => socket.write('inventory\n'), 12000);
setTimeout(() => socket.write('equipment\n'), 13500);
setTimeout(() => socket.write('affects\n'), 15000);
setTimeout(() => socket.write('exits\n'), 16500);

// Collect and display all output
setTimeout(() => {
  console.log('=== CHARACTER STATUS ===\n');
  
  // Parse the buffer to extract key information
  const lines = buffer.split('\n');
  let inStatusSection = false;
  
  lines.forEach((line) => {
    if (line.includes('H') && line.includes('M') && line.includes('V')) {
      // This is a status line
      console.log('Health/Mana/Movement: ' + line.trim());
    }
    if (line.includes('Dummy') || line.includes('level')) {
      console.log(line);
    }
  });
  
  console.log('\n=== FULL OUTPUT ===\n');
  console.log(buffer);
  
  socket.destroy();
  process.exit(0);
}, 19000);
