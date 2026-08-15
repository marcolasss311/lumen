const express = require('express');
const cors = require('cors');
require('dotenv').config();

const simuladoRoutes = require('./api/routes/simulado');
const correcaoRoutes = require('./api/routes/correcao');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/simulado', simuladoRoutes);
app.use('/api/correcao', correcaoRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
