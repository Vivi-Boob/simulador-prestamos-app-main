const express = require('express');
const router = express.Router();
const { connectDB } = require('../db');
const { ObjectId } = require('mongodb');

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

    const db = await connectDB();

    // Upsert del usuario
    await db.collection('usuarios').updateOne(
      { uid },
      { $set: { nombre: userName, correo: userEmail } },
      { upsert: true }
    );

    // Insertar simulación
    const result = await db.collection('simulaciones').insertOne({
      uid,
      monto_prestamo: montoPrestamo,
      tasa_mensual: tasaMensual,
      plazo_meses: plazoMeses,
      cuota_mensual: cuotaMensual,
      total_a_pagar: totalAPagar,
      total_intereses: totalIntereses,
      clasificacion_riesgo: clasificacionRiesgo,
      created_at: new Date(),
    });

    res.status(201).json({ id: result.insertedId, message: 'Simulación guardada' });
  } catch (error) {
    console.error('Error al guardar simulación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/simulaciones — Obtener simulaciones del usuario autenticado
router.get('/', async (req, res) => {
  try {
    const { uid } = req;

    const db = await connectDB();
    const rows = await db
      .collection('simulaciones')
      .find({ uid })
      .sort({ created_at: -1 })
      .toArray();

    // Normalizar _id a id para compatibilidad con el frontend
    const formatted = rows.map(({ _id, ...rest }) => ({ id: _id, ...rest }));

    res.json(formatted);
  } catch (error) {
    console.error('Error al obtener simulaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/simulaciones/estadisticas — Estadísticas del usuario
router.get('/estadisticas', async (req, res) => {
  try {
    const { uid } = req;

    const db = await connectDB();
    const col = db.collection('simulaciones');

    // Estadísticas generales
    const statsAgg = await col
      .aggregate([
        { $match: { uid } },
        {
          $group: {
            _id: null,
            total_registros: { $sum: 1 },
            ultimo_registro: { $max: '$created_at' },
            promedio_cuota: { $avg: '$cuota_mensual' },
            promedio_tasa: { $avg: '$tasa_mensual' },
            total_monto: { $sum: '$monto_prestamo' },
            total_intereses_acumulado: { $sum: '$total_intereses' },
            mayor_interes: { $max: '$total_intereses' },
          },
        },
      ])
      .toArray();

    const stats = statsAgg[0] || {
      total_registros: 0,
      ultimo_registro: null,
      promedio_cuota: 0,
      promedio_tasa: 0,
      total_monto: 0,
      total_intereses_acumulado: 0,
      mayor_interes: 0,
    };

    // Simulación con mayor interés
    const mayorInteresRow = await col
      .find({ uid })
      .sort({ total_intereses: -1 })
      .limit(1)
      .toArray();

    // Distribución por riesgo
    const riesgoDistAgg = await col
      .aggregate([
        { $match: { uid } },
        { $group: { _id: '$clasificacion_riesgo', cantidad: { $sum: 1 } } },
      ])
      .toArray();

    // Evolución mensual (últimos 12 meses)
    const evolucionAgg = await col
      .aggregate([
        { $match: { uid } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m', date: '$created_at' },
            },
            cantidad: { $sum: 1 },
            promedio_cuota: { $avg: '$cuota_mensual' },
            total_monto: { $sum: '$monto_prestamo' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
      ])
      .toArray();

    res.json({
      totalRegistros: stats.total_registros,
      ultimoRegistro: stats.ultimo_registro,
      promedioCuota: Number(stats.promedio_cuota || 0),
      promedioTasa: Number(stats.promedio_tasa || 0),
      totalMonto: Number(stats.total_monto || 0),
      totalInteresesAcumulado: Number(stats.total_intereses_acumulado || 0),
      mayorInteres:
        mayorInteresRow.length > 0
          ? {
              totalInteres: Number(mayorInteresRow[0].total_intereses),
              createdAt: mayorInteresRow[0].created_at,
            }
          : null,
      distribucionRiesgo: riesgoDistAgg.map((r) => ({
        clasificacion: r._id,
        cantidad: r.cantidad,
      })),
      evolucionMensual: evolucionAgg.reverse().map((e) => ({
        mes: e._id,
        cantidad: e.cantidad,
        promedioCuota: Number(e.promedio_cuota || 0),
        totalMonto: Number(e.total_monto || 0),
      })),
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
