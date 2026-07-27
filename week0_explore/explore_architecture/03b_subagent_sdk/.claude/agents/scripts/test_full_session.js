#!/usr/bin/env node

const net = require('net');

const socket = net.createConnection({
  host: 'localhost',
  port: 4000,
});

let buffer = '';
let gameStarted = false;

console.log('=== MUD SESSION TEST ===\n');

socket.on('connect', () => {
  console.log('[CONNECT] Connected to localhost:4000\n');
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

// Login sequence
setTimeout(() => {
  console.log('[ACTION 1] Sending username: dummy');
  socket.write('dummy\n');
}, 3000);

setTimeout(() => {
  console.log('[ACTION 2] Sending password: helloworld');
  socket.write('helloworld\n');
}, 6500);

setTimeout(() => {
  console.log('[ACTION 3] Sending "status" command');
  socket.write('status\n');
}, 9000);

setTimeout(() => {
  console.log('[ACTION 4] Sending "look" command');
  socket.write('look\n');
}, 11000);

setTimeout(() => {
  console.log('[ACTION 5] Sending "inventory" command');
  socket.write('inventory\n');
}, 13000);

setTimeout(() => {
  console.log('[ACTION 6] Sending "equipment" command');
  socket.write('equipment\n');
}, 15000);

// Collect all output
setTimeout(() => {
  console.log('\n=== FULL SESSION OUTPUT ===\n');
  console.log(buffer);
  console.log('\n=== END SESSION ===\n');
  socket.destroy();
  process.exit(0);
}, 17000);
