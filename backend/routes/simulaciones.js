const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/simulaciones — Crear una simulación
router.post('/', async (req, res) => {
  try {
    const { uid, userName, userEmail } = req;
    const {
      montoPrestamo,
      tasaMensual,
      plazoMeses,
      cuotaMensual,
      totalAPagar,
      totalIntereses,
      clasificacionRiesgo,
    } = req.body;

    // Upsert del usuario
    await pool.execute(
      `INSERT INTO usuarios (uid, nombre, correo) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), correo = VALUES(correo)`,
      [uid, userName, userEmail]
    );

    // Insertar simulación
    const [result] = await pool.execute(
      `INSERT INTO simulaciones
        (uid, monto_prestamo, tasa_mensual, plazo_meses, cuota_mensual, total_a_pagar, total_intereses, clasificacion_riesgo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid, montoPrestamo, tasaMensual, plazoMeses, cuotaMensual, totalAPagar, totalIntereses, clasificacionRiesgo]
    );

    res.status(201).json({ id: result.insertId, message: 'Simulación guardada' });
  } catch (error) {
    console.error('Error al guardar simulación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/simulaciones — Obtener simulaciones del usuario autenticado
router.get('/', async (req, res) => {
  try {
    const { uid } = req;

    const [rows] = await pool.execute(
      `SELECT id, monto_prestamo, tasa_mensual, plazo_meses, cuota_mensual,
              total_a_pagar, total_intereses, clasificacion_riesgo, created_at
       FROM simulaciones
       WHERE uid = ?
       ORDER BY created_at DESC`,
      [uid]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener simulaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/simulaciones/estadisticas — Estadísticas del usuario
router.get('/estadisticas', async (req, res) => {
  try {
    const { uid } = req;

    const [stats] = await pool.execute(
      `SELECT
         COUNT(*) AS total_registros,
         MAX(created_at) AS ultimo_registro,
         COALESCE(AVG(cuota_mensual), 0) AS promedio_cuota,
         COALESCE(AVG(tasa_mensual), 0) AS promedio_tasa,
         COALESCE(SUM(monto_prestamo), 0) AS total_monto,
         COALESCE(SUM(total_intereses), 0) AS total_intereses_acumulado,
         COALESCE(MAX(total_intereses), 0) AS mayor_interes
       FROM simulaciones
       WHERE uid = ?`,
      [uid]
    );

    // Obtener la fecha de la simulación con mayor interés
    const [mayorInteresRow] = await pool.execute(
      `SELECT total_intereses, created_at
       FROM simulaciones
       WHERE uid = ?
       ORDER BY total_intereses DESC
       LIMIT 1`,
      [uid]
    );

    // Distribución por riesgo para gráficas
    const [riesgoDist] = await pool.execute(
      `SELECT clasificacion_riesgo, COUNT(*) AS cantidad
       FROM simulaciones
       WHERE uid = ?
       GROUP BY clasificacion_riesgo`,
      [uid]
    );

    // Evolución mensual (últimos 12 meses)
    const [evolucion] = await pool.execute(
      `SELECT
         DATE_FORMAT(created_at, '%Y-%m') AS mes,
         COUNT(*) AS cantidad,
         AVG(cuota_mensual) AS promedio_cuota,
         SUM(monto_prestamo) AS total_monto
       FROM simulaciones
       WHERE uid = ?
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY mes DESC
       LIMIT 12`,
      [uid]
    );

    res.json({
      totalRegistros: stats[0].total_registros,
      ultimoRegistro: stats[0].ultimo_registro,
      promedioCuota: Number(stats[0].promedio_cuota),
      promedioTasa: Number(stats[0].promedio_tasa),
      totalMonto: Number(stats[0].total_monto),
      totalInteresesAcumulado: Number(stats[0].total_intereses_acumulado),
      mayorInteres: mayorInteresRow.length > 0
        ? {
            totalInteres: Number(mayorInteresRow[0].total_intereses),
            createdAt: mayorInteresRow[0].created_at,
          }
        : null,
      distribucionRiesgo: riesgoDist.map((r) => ({
        clasificacion: r.clasificacion_riesgo,
        cantidad: r.cantidad,
      })),
      evolucionMensual: evolucion.reverse().map((e) => ({
        mes: e.mes,
        cantidad: e.cantidad,
        promedioCuota: Number(e.promedio_cuota),
        totalMonto: Number(e.total_monto),
      })),
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
