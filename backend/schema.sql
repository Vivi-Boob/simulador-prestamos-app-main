-- Esquema de base de datos MySQL para simulador de préstamos

CREATE DATABASE IF NOT EXISTS simulador_prestamos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE simulador_prestamos;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(128) NOT NULL UNIQUE,
  nombre VARCHAR(255),
  correo VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS simulaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(128) NOT NULL,
  monto_prestamo DECIMAL(15, 2) NOT NULL,
  tasa_mensual DECIMAL(6, 4) NOT NULL,
  plazo_meses INT NOT NULL,
  cuota_mensual DECIMAL(15, 2) NOT NULL,
  total_a_pagar DECIMAL(15, 2) NOT NULL,
  total_intereses DECIMAL(15, 2) NOT NULL,
  clasificacion_riesgo VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uid) REFERENCES usuarios(uid) ON DELETE CASCADE
);
