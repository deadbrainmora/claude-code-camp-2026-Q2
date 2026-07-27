#!/usr/bin/env node

const net = require('net');

const socket = net.createConnection({
  host: 'localhost',
  port: 4000,
});

let buffer = '';

console.log('Starting detailed login test (attempt 2)...\n');

socket.on('connect', () => {
  console.log('[CONNECT] Connected to localhost:4000\n');
});

socket.on('data', (data) => {
  buffer += data.toString();
  const decoded = data.toString();
  console.log(`[DATA] Received ${data.length} bytes`);
  console.log(decoded.substring(0, 150));
  console.log('---\n');
});

socket.on('error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

socket.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

// Adjusted timing - wait longer before sending username
setTimeout(() => {
  console.log('[SEND 3s] Sending username: dummy');
  socket.write('dummy\n');
}, 3000);

setTimeout(() => {
  console.log('[SEND 5s] Sending confirmation: y');
  socket.write('y\n');
}, 5000);

setTimeout(() => {
  console.log('[SEND 6.5s] Sending password: helloworld');
  socket.write('helloworld\n');
}, 6500);

setTimeout(() => {
  console.log('[SEND 8s] Sending confirmation: y');
  socket.write('y\n');
}, 8000);

setTimeout(() => {
  console.log('[SEND 10s] Sending menu choice: 1');
  socket.write('1\n');
}, 10000);

setTimeout(() => {
  console.log('[SEND 12s] Sending look command');
  socket.write('look\n');
}, 12000);

setTimeout(() => {
  console.log('\n[CLOSING CONNECTION after 15s]\n');
  console.log('Final buffer:\n');
  console.log(buffer.substring(buffer.length - 500));
  socket.destroy();
  process.exit(0);
}, 15000);
