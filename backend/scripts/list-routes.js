import express from 'express';
import { authRouter } from '../src/routes/auth.js';

const app = express();
app.use('/auth', authRouter);

function listRoutes(stack, prefix = '') {
  stack.forEach(r => {
    if (r.route) {
      const methods = Object.keys(r.route.methods).join(',').toUpperCase();
      console.log(`- ${methods} ${prefix}${r.route.path}`);
    } else if (r.name === 'router') {
      listRoutes(r.handle.stack, prefix + (r.regexp.source.replace('\\/?(?=\\/|$)', '').replace('^', '').replace(/\\\//g, '/')));
    }
  });
}

console.log('Registered Routes:');
listRoutes(app._router.stack);
process.exit(0);
