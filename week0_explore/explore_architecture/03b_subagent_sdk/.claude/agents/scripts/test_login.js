#!/usr/bin/env node

const net = require('net');

const socket = net.createConnection({
  host: 'localhost',
  port: 4000,
});

let stage = 0;
let buffer = '';

console.log('Starting detailed login test...\n');

socket.on('connect', () => {
  console.log('[CONNECT] Connected to localhost:4000\n');
});

socket.on('data', (data) => {
  buffer += data.toString();
  const decoded = data.toString();
  console.log(`[DATA ${new Date().toISOString().split('T')[1]}] Received ${data.length} bytes`);
  console.log(decoded.substring(0, 200));
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

// Timed sequence
setTimeout(() => {
  console.log('[SEND 1s] Sending username: dummy');
  socket.write('dummy\n');
}, 1000);

setTimeout(() => {
  console.log('[SEND 2.5s] Sending confirmation: y');
  socket.write('y\n');
}, 2500);

setTimeout(() => {
  console.log('[SEND 3.5s] Sending password: helloworld');
  socket.write('helloworld\n');
}, 3500);

setTimeout(() => {
  console.log('[SEND 5s] Sending menu choice: 1');
  socket.write('1\n');
}, 5000);

setTimeout(() => {
  console.log('[SEND 7s] Sending look command');
  socket.write('look\n');
}, 7000);

setTimeout(() => {
  console.log('\n[BUFFER CONTENTS]\n');
  console.log(buffer);
  console.log('\n[CLOSING CONNECTION]');
  socket.destroy();
  process.exit(0);
}, 10000);
