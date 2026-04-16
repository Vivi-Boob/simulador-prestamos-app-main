const express = require('express');
const cors = require('cors');

const { verificarToken } = require('./middleware/auth');
const simulacionesRouter = require('./routes/simulaciones');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

// Rutas protegidas (requieren token Firebase)
app.use('/api/simulaciones', verificarToken, simulacionesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
