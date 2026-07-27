#!/usr/bin/env node

const net = require('net');

const socket = net.createConnection({
  host: 'localhost',
  port: 4000,
});

let buffer = '';
let responseCount = 0;

socket.on('connect', () => {
  console.log('Connecting...');
});

socket.on('data', (data) => {
  buffer += data.toString();
  responseCount++;
  console.log(`[Response ${responseCount}] ${data.length} bytes received`);
});

socket.on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

socket.on('close', () => {
  // Output only the last 2000 chars
  const output = buffer.substring(Math.max(0, buffer.length - 2000));
  console.log('\n=== LAST 2000 CHARS ===\n');
  console.log(output);
  process.exit(0);
});

// Login
setTimeout(() => socket.write('dummy\n'), 3000);
setTimeout(() => socket.write('helloworld\n'), 6500);

// Commands with more delay
setTimeout(() => { console.log('Sending: score'); socket.write('score\n'); }, 9500);
setTimeout(() => { console.log('Sending: who'); socket.write('who\n'); }, 11500);

setTimeout(() => {
  console.log('Closing...');
  socket.destroy();
}, 13500);
