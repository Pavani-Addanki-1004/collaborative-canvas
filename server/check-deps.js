try {
  require('express');
  require('socket.io');
} catch (err) {
  console.error('Missing dependencies. Please run `npm install` in the project root.');
  console.error(err && err.message);
  process.exit(1);
}
// If all good, load server
require('./server.js');
