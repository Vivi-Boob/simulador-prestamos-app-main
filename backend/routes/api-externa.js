const express = require('express');
const router = express.Router();



/**
 * GET /api/externa/tasas-bancos
 */
router.get('/tasas-bancos', async (req, res) => {
  try {
    const EXTERNAL_API_URL = 'https://69e16aa0b1cb62b9f316d886.mockapi.io/api/v1/TasasCambio';
    
    const response = await fetch(EXTERNAL_API_URL);
    
    if (!response.ok) {
      throw new Error(`Error al conectar con el API externa: ${response.statusText}`);
    }

    const jsonResponse = await response.json();
    const data = jsonResponse.record || jsonResponse;

    if (!Array.isArray(data)) {
      throw new Error('El API externa no devolvio un arreglo valido');
    }

    const normalizedData = data.map(item => {
      return {
        id: typeof item.id === 'string' ? parseInt(item.id, 10) : item.id,
        bank: item.bank,
        monthlyRate: item.monthlyRate,
        date: typeof item.date === 'number' 
          ? new Date(item.date * 1000).toISOString().slice(0, 7) 
          : item.date
      };
    });

    res.json(normalizedData);
  } catch (error) {
    console.error('Error externo:', error.message);
    res.status(500).json({ 
      error: 'Error al obtener tasas bancarias externas',
      message: error.message 
    });
  }
});

module.exports = router;
