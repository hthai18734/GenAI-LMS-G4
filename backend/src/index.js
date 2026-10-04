require('dotenv').config();

const express = require('express');
const path = require('path');
const MongoDBUtil = require('./utils/database/MongoDBUtil');
const LoggerUtil = require('./utils/common/LoggerUtil');
const ResponseUtil = require('./utils/common/ResponseUtil');
const ErrorFilter = require('./filter/ErrorFilter');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// CORS – allow React dev server
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

// Serve files uploaded through the API; application pages are served by the frontend.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.get('/health', (req, res) => ResponseUtil.success(res, { data: { service: 'AI-LMS Iteration 1', status: 'ok' } }));
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/v1/teacher', teacherRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use((req, res) => ResponseUtil.error(res, { status: 404, message: 'Route not found.' }));
app.use(ErrorFilter);

async function start() {
  await MongoDBUtil.connect();
  const { seedAdmin } = require('./utils/database/AdminSeeder');
  await seedAdmin();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => LoggerUtil.info(`AI-LMS Iteration 1 server listening on port ${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    LoggerUtil.error('AI-LMS failed to start', error);
    process.exitCode = 1;
  });
}

module.exports = { app, start };
