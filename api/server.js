require('dotenv').config();
const express = require('express');
const cors = require('cors');

if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not set. Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/merchants', require('./routes/merchants'));
app.use('/tokens',   require('./routes/tokens'));
app.use('/analytics', require('./routes/analytics'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404 catch-all
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Authorizd API running on port ${PORT}`);
});
