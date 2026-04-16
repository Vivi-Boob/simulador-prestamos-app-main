const admin = require('firebase-admin');

// Inicializar Firebase Admin con las credenciales del proyecto
// En producción usar GOOGLE_APPLICATION_CREDENTIALS o un service account JSON
admin.initializeApp({
  projectId: 'simulador-prestamos-app',
});

/**
 * Middleware que verifica el token de Firebase del header Authorization.
 * Extrae el uid y lo coloca en req.uid para uso posterior.
 */
async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.uid = decodedToken.uid;
    req.userEmail = decodedToken.email || '';
    req.userName = decodedToken.name || '';
    next();
  } catch (error) {
    console.error('Error verificando token:', error.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = { verificarToken };
