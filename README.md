# Simulador de Prestamos App

Aplicacion web desarrollada con Angular 17 para simular prestamos personales, analizar intereses y generar reportes financieros personalizados.

## Objetivo

Permitir que un cliente:
- simule un prestamo con monto, tasa mensual y plazo
- entienda el impacto de los intereses en el costo total
- compare su simulacion actual contra su historial
- visualice resultados con graficas
- exporte un reporte financiero

## Funcionalidades implementadas

### 1. Simulacion financiera
- Interes total = monto * (tasa / 100) * meses
- Total a pagar = monto + interes total
- Cuota mensual = total a pagar / meses

### 2. Clasificacion de riesgo
- `tasa <= 1` -> `Bajo riesgo`
- `1 < tasa <= 3` -> `Riesgo medio`
- `tasa > 3` -> `Alto riesgo`

### 3. Analisis historico
- Total de simulaciones por usuario
- Ultima actividad
- Simulacion con mayor interes historico
- Promedio historico de cuota
- Comparacion de cuota actual vs promedio historico

### 4. Visualizacion
- Grafica circular: capital vs interes
- Grafica de linea: saldo pendiente por mes
- Tabla con historial de simulaciones

### 5. Reporte financiero personalizado
- Resumen de metricas historicas
- Recomendacion segun riesgo y comportamiento
- Exportacion a:
  - TXT
  - PDF

## Stack tecnologico

- Angular 17 (standalone components)
- Angular Material
- Firebase Authentication (Google)
- Firestore
- ng2-charts + Chart.js
- jsPDF + jspdf-autotable

## Requisitos

- Node.js 20+
- npm 10+
- Navegador moderno (Chrome recomendado)

## Configuracion

La configuracion de Firebase se encuentra en:

- `src/enviroments/firebase.ts`

Nota: la carpeta se llama `enviroments` en el proyecto actual.

## Instalacion

```bash
npm install
```

## Ejecucion local

```bash
npm run start
```

Abrir en:

- `http://localhost:4200/`
- o `http://127.0.0.1:4200/`

## Scripts utiles

- `npm run start` -> servidor de desarrollo
- `npm run build` -> build de produccion
- `npm run test` -> pruebas unitarias (Karma)

## Validacion recomendada antes de entregar

```bash
npm run build
npm run test -- --watch=false --browsers=ChromeHeadless
```

## Estructura principal

```text
src/
  app/
    core/
      guards/
      services/
    features/
      auth/
      dashboard/
```
