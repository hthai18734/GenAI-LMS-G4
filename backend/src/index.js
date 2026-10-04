const express = require('express');

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'AI-LMS', status: 'running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

function start() {
  const port = Number(process.env.PORT) || 3000;
  return app.listen(port, () => {
    console.log(`AI-LMS server listening on port ${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
