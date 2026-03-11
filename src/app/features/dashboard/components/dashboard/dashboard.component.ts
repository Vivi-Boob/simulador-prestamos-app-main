import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';

type Riesgo = 'Bajo riesgo' | 'Riesgo medio' | 'Alto riesgo';
type SimulacionHistorial = {
  createdAt: Date | null;
  montoPrestamo: number;
  tasaMensual: number;
  plazoMeses: number;
  cuotaMensual: number;
  totalIntereses: number;
  clasificacionRiesgo: Riesgo;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BaseChartDirective,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatToolbarModule,
    MatDividerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private currentUser: any = null;
  userName: string = 'Usuario';
  userEmail: string = '';

  lastRecordDate: Date | null = null;
  totalRecords: number = 0;
  promedioCuotaHistorica: number = 0;
  simulacionMayorInteres: { totalInteres: number; createdAt: Date | null } | null =
    null;
  historialSimulaciones: SimulacionHistorial[] = [];

  formularioSimulacion: FormGroup;

  pagoMensual: number = 0;
  totalPagar: number = 0;
  totalInteres: number = 0;
  clasificacionRiesgo: Riesgo = 'Bajo riesgo';
  diferenciaCuotaVsPromedio: number = 0;
  diferenciaAbsolutaCuotaVsPromedio: number = 0;
  porcentajeCuotaVsPromedio: number = 0;
  mostrarResultados: boolean = false;

  // Grafica circular
  public doughnutChartLabels: string[] = ['Capital', 'Interes'];
  public doughnutChartData: ChartData<'doughnut'> = {
    labels: this.doughnutChartLabels,
    datasets: [
      {
        data: [0, 0],
        backgroundColor: ['#6366f1', '#ef4444'],
        hoverBackgroundColor: ['#4f46e5', '#dc2626'],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };
  public doughnutChartType = 'doughnut' as const;
  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { color: '#94a3b8', padding: 20 },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = Number(context.raw ?? 0);
            const total = this.totalPagar || 1;
            const percent = (value / total) * 100;
            return `${context.label}: ${this.formatearMoneda(value)} (${percent.toFixed(1)}%)`;
          },
        },
      },
    },
    cutout: '70%',
  };

  // Grafica de linea
  public lineChartLabels: string[] = [];
  public lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Saldo Pendiente',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: '#6366f1',
        borderWidth: 3,
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointBackgroundColor: '#4338ca',
        pointHoverRadius: 6,
      },
    ],
  };
  public lineChartType = 'line' as const;
  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8' },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          color: '#94a3b8',
          callback: (valor) => this.formatearMoneda(Number(valor)),
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        labels: { color: '#94a3b8' },
      },
      tooltip: {
        callbacks: {
          label: (context) =>
            `${context.dataset.label}: ${this.formatearMoneda(Number(context.raw ?? 0))}`,
        },
      },
    },
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private firestore: Firestore,
  ) {
    this.formularioSimulacion = this.fb.group({
      monto: [null, [Validators.required, Validators.min(1)]],
      tasaInteres: [null, [Validators.required, Validators.min(0)]],
      plazo: [null, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.obtenerDatosUsuario();
  }

  obtenerDatosUsuario() {
    this.authService.usuarioActual$.subscribe((user: any) => {
      if (user) {
        this.currentUser = user;
        this.userName = user.displayName || 'Usuario';
        this.userEmail = user.email || 'Sin correo';
        this.obtenerEstadisticas(user.uid);
      }
    });
  }

  private async obtenerEstadisticas(uid: string) {
    try {
      const coleccionRef = collection(this.firestore, 'simulaciones');
      const consulta = query(coleccionRef, where('uid', '==', uid));
      const snapshot = await getDocs(consulta);

      this.totalRecords = snapshot.size;
      this.historialSimulaciones = [];

      let sumaCuotas = 0;
      let mayorInteres = 0;
      let fechaMayorInteres: Date | null = null;
      let fechaMasReciente: Date | null = null;

      snapshot.docs.forEach((documento) => {
        const datos = documento.data();
        const createdAt = datos['createdAt']?.toDate?.() ?? null;
        const montoPrestamo = Number(datos['montoPrestamo'] ?? 0);
        const tasaMensual = Number(datos['tasaMensual'] ?? 0);
        const plazoMeses = Number(datos['plazoMeses'] ?? 0);
        const cuota = Number(datos['resultados']?.['cuotaMensual'] ?? 0);
        const interes = Number(datos['resultados']?.['totalIntereses'] ?? 0);
        const riesgoGuardado = datos['clasificacionRiesgo'] as Riesgo | undefined;
        const clasificacionRiesgo = riesgoGuardado ?? this.calcularRiesgo(tasaMensual);

        this.historialSimulaciones.push({
          createdAt,
          montoPrestamo,
          tasaMensual,
          plazoMeses,
          cuotaMensual: cuota,
          totalIntereses: interes,
          clasificacionRiesgo,
        });

        sumaCuotas += cuota;

        if (interes > mayorInteres) {
          mayorInteres = interes;
          fechaMayorInteres = createdAt;
        }

        if (
          createdAt &&
          (!fechaMasReciente || createdAt.getTime() > fechaMasReciente.getTime())
        ) {
          fechaMasReciente = createdAt;
        }
      });

      this.lastRecordDate = fechaMasReciente;
      this.promedioCuotaHistorica =
        this.totalRecords > 0 ? sumaCuotas / this.totalRecords : 0;
      this.historialSimulaciones.sort((a, b) => {
        const fechaA = a.createdAt?.getTime() ?? 0;
        const fechaB = b.createdAt?.getTime() ?? 0;
        return fechaB - fechaA;
      });

      this.simulacionMayorInteres =
        this.totalRecords > 0
          ? { totalInteres: mayorInteres, createdAt: fechaMayorInteres }
          : null;

      if (this.mostrarResultados) {
        this.actualizarComparacionConPromedio();
      }
    } catch (e) {
      console.error('Error al traer estadisticas:', e);
    }
  }

  calcular() {
    if (this.formularioSimulacion.invalid) {
      this.formularioSimulacion.markAllAsTouched();
      return;
    }

    const { monto, tasaInteres, plazo } = this.formularioSimulacion.value;

    this.totalInteres = monto * (tasaInteres / 100) * plazo;
    this.totalPagar = monto + this.totalInteres;
    this.pagoMensual = this.totalPagar / plazo;
    this.clasificacionRiesgo = this.calcularRiesgo(tasaInteres);
    this.actualizarComparacionConPromedio();

    this.doughnutChartData.datasets[0].data = [monto, this.totalInteres];

    const etiquetas: string[] = [];
    const saldos: number[] = [];
    for (let i = 1; i <= plazo; i++) {
      const saldoActual = this.totalPagar - this.pagoMensual * i;
      if (plazo <= 12 || i % Math.ceil(plazo / 12) === 0 || i === plazo) {
        etiquetas.push(`Mes ${i}`);
        saldos.push(Math.max(0, saldoActual));
      }
    }

    this.lineChartLabels = etiquetas;
    this.lineChartData = {
      labels: etiquetas,
      datasets: [
        {
          ...this.lineChartData.datasets[0],
          data: saldos,
        },
      ],
    };

    this.guardarSimulacion();
    this.mostrarResultados = true;
  }

  private async guardarSimulacion() {
    if (!this.currentUser) return;

    const datosAGuardar = {
      uid: this.currentUser.uid,
      nombreUsuario: this.currentUser.displayName,
      correo: this.currentUser.email,
      createdAt: serverTimestamp(),
      montoPrestamo: this.formularioSimulacion.value.monto,
      tasaMensual: this.formularioSimulacion.value.tasaInteres,
      plazoMeses: this.formularioSimulacion.value.plazo,
      clasificacionRiesgo: this.clasificacionRiesgo,
      resultados: {
        cuotaMensual: this.pagoMensual,
        totalAPagar: this.totalPagar,
        totalIntereses: this.totalInteres,
      },
    };

    try {
      await addDoc(collection(this.firestore, 'simulaciones'), datosAGuardar);
      this.obtenerEstadisticas(this.currentUser.uid);
    } catch (error) {
      console.error('Error al guardar simulacion:', error);
    }
  }

  cerrarSesion() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get totalMontoHistorico(): number {
    return this.historialSimulaciones.reduce(
      (acumulado, item) => acumulado + item.montoPrestamo,
      0,
    );
  }

  get totalInteresHistorico(): number {
    return this.historialSimulaciones.reduce(
      (acumulado, item) => acumulado + item.totalIntereses,
      0,
    );
  }

  get promedioTasaHistorica(): number {
    if (this.historialSimulaciones.length === 0) return 0;
    const sumaTasas = this.historialSimulaciones.reduce(
      (acumulado, item) => acumulado + item.tasaMensual,
      0,
    );
    return sumaTasas / this.historialSimulaciones.length;
  }

  get recomendacionFinanciera(): string {
    if (this.historialSimulaciones.length === 0) {
      return 'Realiza simulaciones para obtener recomendaciones personalizadas.';
    }

    if (this.clasificacionRiesgo === 'Alto riesgo') {
      return 'Tu simulacion actual tiene alta carga financiera. Considera menor tasa o mayor plazo.';
    }

    if (this.diferenciaCuotaVsPromedio > 0) {
      return 'Tu cuota actual supera tu promedio historico. Evalua bajar monto o tasa.';
    }

    if (this.clasificacionRiesgo === 'Riesgo medio') {
      return 'Tu escenario es moderado. Negociar una menor tasa mejoraria el costo total.';
    }

    return 'Tu perfil actual es estable frente a tu historial. Mantienes un riesgo bajo.';
  }

  descargarReporteFinanciero() {
    const fecha = new Date().toLocaleString('es-CO');
    const lineas = [
      'REPORTE FINANCIERO PERSONALIZADO',
      `Cliente: ${this.userName} (${this.userEmail})`,
      `Fecha de generacion: ${fecha}`,
      '',
      `Total simulaciones: ${this.totalRecords}`,
      `Monto acumulado simulado: ${this.totalMontoHistorico.toFixed(2)}`,
      `Interes acumulado historico: ${this.totalInteresHistorico.toFixed(2)}`,
      `Promedio historico de cuota: ${this.promedioCuotaHistorica.toFixed(2)}`,
      `Promedio historico de tasa mensual: ${this.promedioTasaHistorica.toFixed(2)}%`,
      this.simulacionMayorInteres
        ? `Mayor interes historico: ${this.simulacionMayorInteres.totalInteres.toFixed(2)}`
        : 'Mayor interes historico: N/A',
      '',
      `Ultima cuota calculada: ${this.pagoMensual.toFixed(2)}`,
      `Clasificacion de riesgo actual: ${this.clasificacionRiesgo}`,
      `Recomendacion: ${this.recomendacionFinanciera}`,
    ];

    const blob = new Blob([lineas.join('\n')], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `reporte-financiero-${Date.now()}.txt`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  descargarReporteFinancieroPdf() {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleString('es-CO');

    doc.setFontSize(16);
    doc.text('Reporte Financiero Personalizado', 14, 18);
    doc.setFontSize(11);
    doc.text(`Cliente: ${this.userName} (${this.userEmail})`, 14, 26);
    doc.text(`Fecha de generacion: ${fecha}`, 14, 32);

    doc.setFontSize(12);
    doc.text('Resumen', 14, 42);
    doc.setFontSize(10);
    const resumen = [
      `Total simulaciones: ${this.totalRecords}`,
      `Monto acumulado: ${this.formatearMoneda(this.totalMontoHistorico)}`,
      `Interes acumulado: ${this.formatearMoneda(this.totalInteresHistorico)}`,
      `Promedio cuota historica: ${this.formatearMoneda(this.promedioCuotaHistorica)}`,
      `Promedio tasa mensual: ${this.promedioTasaHistorica.toFixed(2)}%`,
      `Mayor interes historico: ${
        this.simulacionMayorInteres
          ? this.formatearMoneda(this.simulacionMayorInteres.totalInteres)
          : 'N/A'
      }`,
      `Riesgo actual: ${this.clasificacionRiesgo}`,
      `Recomendacion: ${this.recomendacionFinanciera}`,
    ];

    let y = 48;
    resumen.forEach((linea) => {
      const lineasPartidas = doc.splitTextToSize(linea, 180);
      doc.text(lineasPartidas, 14, y);
      y += lineasPartidas.length * 5 + 1;
    });

    if (this.historialSimulaciones.length > 0) {
      autoTable(doc, {
        startY: y + 4,
        head: [['Fecha', 'Monto', 'Tasa', 'Meses', 'Cuota', 'Interes', 'Riesgo']],
        body: this.historialSimulaciones.map((item) => [
          item.createdAt ? item.createdAt.toLocaleDateString('es-CO') : 'Sin fecha',
          this.formatearMoneda(item.montoPrestamo),
          `${item.tasaMensual.toFixed(2)}%`,
          String(item.plazoMeses),
          this.formatearMoneda(item.cuotaMensual),
          this.formatearMoneda(item.totalIntereses),
          item.clasificacionRiesgo,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [63, 81, 181] },
      });
    }

    doc.save(`reporte-financiero-${Date.now()}.pdf`);
  }

  private formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor || 0);
  }

  private calcularRiesgo(tasaInteresMensual: number): Riesgo {
    if (tasaInteresMensual <= 1) return 'Bajo riesgo';
    if (tasaInteresMensual <= 3) return 'Riesgo medio';
    return 'Alto riesgo';
  }

  private actualizarComparacionConPromedio() {
    if (this.promedioCuotaHistorica <= 0) {
      this.diferenciaCuotaVsPromedio = 0;
      this.diferenciaAbsolutaCuotaVsPromedio = 0;
      this.porcentajeCuotaVsPromedio = 0;
      return;
    }

    this.diferenciaCuotaVsPromedio = this.pagoMensual - this.promedioCuotaHistorica;
    this.diferenciaAbsolutaCuotaVsPromedio = Math.abs(
      this.diferenciaCuotaVsPromedio,
    );
    this.porcentajeCuotaVsPromedio =
      (this.diferenciaCuotaVsPromedio / this.promedioCuotaHistorica) * 100;
  }
}
