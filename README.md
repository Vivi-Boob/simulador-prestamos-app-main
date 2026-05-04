# Simulador de Préstamos

Monorepo con frontend Angular 17 y backend Express/Node.js para simular préstamos personales, analizar intereses y generar reportes financieros.

## Estructura del proyecto

```
simulador-prestamos-app/
├── frontend/          ← Angular 17 (cliente web)
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/      (guards, services)
│   │   │   └── features/  (auth, dashboard)
│   │   └── enviroments/
│   └── package.json
│
├── backend/           ← Express + Node.js (API REST)
│   ├── routes/        (simulaciones, api-externa)
│   ├── middleware/    (auth Firebase)
│   ├── server.js
│   ├── db.js
│   ├── schema.sql
│   └── package.json
│
└── package.json       ← Scripts de conveniencia (raíz)
```

## Requisitos

- Node.js 20+
- npm 10+
- MySQL 8+
- Navegador moderno (Chrome recomendado)

---

## Instalación

```bash
# Instalar dependencias de ambas partes de una vez
npm run install:all

# O por separado:
cd frontend && npm install
cd backend  && npm install
```

---

## Configuración

### Backend — variables de entorno

```bash
cp backend/.env.example backend/.env
```

Editar `backend/.env` con los valores reales:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=simulador_prestamos
PORT=3000
```

### Frontend — Firebase

La configuración de Firebase está en:

```
frontend/src/enviroments/firebase.ts
```

---

## Ejecución local

Abrir **dos terminales**:

```bash
# Terminal 1 — Frontend
npm run frontend
# → http://localhost:4200

# Terminal 2 — Backend
npm run backend
# → http://localhost:3000
```

O correrlos manualmente:

```bash
cd frontend && npm run start    # Angular en :4200
cd backend  && npm run dev      # Express en :3000 (node --watch)
```

---

## Funcionalidades

### Simulación financiera
- Interés total = monto × (tasa / 100) × meses
- Total a pagar = monto + interés total
- Cuota mensual = total a pagar / meses

### Clasificación de riesgo
| Tasa | Nivel |
|------|-------|
| ≤ 1% | Bajo riesgo |
| 1% – 3% | Riesgo medio |
| > 3% | Alto riesgo |

### Análisis histórico
- Total de simulaciones por usuario
- Última actividad
- Simulación con mayor interés histórico
- Promedio histórico de cuota
- Comparación cuota actual vs promedio histórico

### Visualización
- Gráfica circular: capital vs interés
- Gráfica de línea: saldo pendiente por mes
- Tabla con historial de simulaciones

### Reporte financiero
- Resumen de métricas históricas
- Recomendación según riesgo y comportamiento
- Exportación a TXT y PDF

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 17 (standalone components) |
| UI | Angular Material, ng2-charts + Chart.js |
| Auth | Firebase Authentication (Google) |
| Base de datos | Firestore + MySQL 8 |
| Backend | Express 4, Node.js 20+ |
| PDF | jsPDF + jspdf-autotable |

---

## Scripts disponibles

### Raíz del monorepo
| Comando | Descripción |
|---------|-------------|
| `npm run frontend` | Levanta el servidor de desarrollo Angular |
| `npm run backend` | Levanta el servidor Express con `node --watch` |
| `npm run install:all` | Instala dependencias de frontend y backend |

### Dentro de `frontend/`
| Comando | Descripción |
|---------|-------------|
| `npm run start` | Servidor de desarrollo (`:4200`) |
| `npm run build` | Build de producción |
| `npm run test` | Pruebas unitarias (Karma) |

### Dentro de `backend/`
| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con `node --watch` (recarga automática) |
| `npm run start` | Servidor en modo producción |

---

## Validación antes de entregar

```bash
cd frontend
npm run build
npm run test -- --watch=false --browsers=ChromeHeadless
```
