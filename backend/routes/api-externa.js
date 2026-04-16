const express = require('express');
const router = express.Router();

/**
 * GET /api/externa/tasas-cambio
 * Mock API con tasas de cambio relevantes para el simulador de préstamos (COP como base).
 */
router.get('/tasas-cambio', async (req, res) => {
  try {
    res.json({
      base: 'COP',
      fecha: new Date().toISOString().slice(0, 10),
      tasas: {
        USD: 0.000237,
        EUR: 0.000218,
        GBP: 0.000188,
        MXN: 0.004050,
        BRL: 0.001190,
        ARS: 0.214000,
        PEN: 0.000886,
        CLP: 0.222000,
      },
    });
  } catch (error) {
    console.error('Error en tasas de cambio:', error.message);
    res.status(500).json({ error: 'Error al obtener tasas de cambio' });
  }
});

/**
 * GET /api/externa/indicadores-financieros
 * Retorna indicadores financieros simulados / Mock API
 * con datos representativos del mercado colombiano.
 */
router.get('/indicadores-financieros', async (req, res) => {
  try {
    // Mock API con indicadores financieros colombianos
    const indicadores = {
      fecha: new Date().toISOString().slice(0, 10),
      tasaUsura: 27.77,
      tasaReferenciaBanrep: 9.50,
      inflacionAnual: 5.20,
      dtf: 8.45,
      ipc: 0.43,
      tasaPromedioConsumo: 16.85,
      tasaPromedioMicrocredito: 22.30,
      tasaPromedioVivienda: 12.10,
      salarioMinimo: 1423500,
      uvt: 49799,
    };

    res.json(indicadores);
  } catch (error) {
    console.error('Error en indicadores financieros:', error);
    res.status(500).json({ error: 'Error al obtener indicadores' });
  }
});

module.exports = router;
