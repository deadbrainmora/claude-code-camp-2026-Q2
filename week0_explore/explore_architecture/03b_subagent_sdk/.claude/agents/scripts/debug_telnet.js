#!/usr/bin/env node

const net = require('net');

const socket = net.createConnection({
  host: 'localhost',
  port: 4000,
});

console.log('Connecting to localhost:4000...\n');

socket.on('data', (data) => {
  console.log('=== MUD RESPONSE ===');
  console.log('Raw bytes:', data);
  console.log('Decoded:', data.toString());
  console.log('Hex:', data.toString('hex'));
  console.log('================\n');
});

socket.on('connect', () => {
  console.log('Connected! Waiting for MUD response...\n');

  // Send username after 1 second
  setTimeout(() => {
    console.log('>>> Sending: dummy\n');
    socket.write('dummy\n');
  }, 1000);

  // Send 'y' after 2 seconds
  setTimeout(() => {
    console.log('>>> Sending: y\n');
    socket.write('y\n');
  }, 2000);

  // Send password after 3 seconds
  setTimeout(() => {
    console.log('>>> Sending: helloworld\n');
    socket.write('helloworld\n');
  }, 3000);

  // Exit after 5 seconds
  setTimeout(() => {
    console.log('\nClosing connection...');
    socket.destroy();
    process.exit(0);
  }, 5000);
});

socket.on('error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});
