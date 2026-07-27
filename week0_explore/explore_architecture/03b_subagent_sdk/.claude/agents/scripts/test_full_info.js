#!/usr/bin/env node

const net = require('net');

const socket = net.createConnection({
  host: 'localhost',
  port: 4000,
});

let buffer = '';

console.log('=== DETAILED MUD INFO TEST ===\n');

socket.on('connect', () => {
  console.log('[CONNECT] Connected\n');
});

socket.on('data', (data) => {
  buffer += data.toString();
});

socket.on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

socket.on('close', () => {
  process.exit(0);
});

// Login
setTimeout(() => socket.write('dummy\n'), 3000);
setTimeout(() => socket.write('helloworld\n'), 6500);

// Get detailed information
setTimeout(() => { console.log('[CMD] who'); socket.write('who\n'); }, 9000);
setTimeout(() => { console.log('[CMD] score'); socket.write('score\n'); }, 10500);
setTimeout(() => { console.log('[CMD] affects'); socket.write('affects\n'); }, 12000);
setTimeout(() => { console.log('[CMD] exits'); socket.write('exits\n'); }, 13500);
setTimeout(() => { console.log('[CMD] room'); socket.write('room\n'); }, 15000);

setTimeout(() => {
  console.log('\n=== COMPLETE OUTPUT ===\n');
  console.log(buffer);
  socket.destroy();
  process.exit(0);
}, 17000);
