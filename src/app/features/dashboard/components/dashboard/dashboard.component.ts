import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import {
  SimulacionService,
  Simulacion,
  Estadisticas,
} from '../../../../core/services/simulacion.service';
import {
  ApiExternaService,
  BancoTasa,
} from '../../../../core/services/api-externa.service';
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
  simulacionMayorInteres: {
    totalInteres: number;
    createdAt: Date | null;
  } | null = null;
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

  tasasBancos: BancoTasa[] = [];
  bancosConMenorTasa: BancoTasa[] = [];
  bancosConMayorTasa: BancoTasa[] = [];
  cargandoTasas: boolean = false;

  // Grafica circular: Capital vs Interes
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
          label: (context : any) => {
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

  // Grafica de linea: Saldo pendiente
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
          callback: (valor: any) => this.formatearMoneda(Number(valor)),
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
          label: (context: any) =>
            `${context.dataset.label}: ${this.formatearMoneda(Number(context.raw ?? 0))}`,
        },
      },
    },
  };

  // Grafica de barras: Distribución por riesgo (datos MySQL)
  public riesgoBarData: ChartData<'bar'> = {
    labels: ['Bajo riesgo', 'Riesgo medio', 'Alto riesgo'],
    datasets: [
      {
        data: [0, 0, 0],
        label: 'Simulaciones',
        backgroundColor: ['#2e7d32', '#ef6c00', '#c62828'],
        borderRadius: 6,
      },
    ],
  };
  public riesgoBarType = 'bar' as const;
  public riesgoBarOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
      y: {
        beginAtZero: true,
        ticks: { color: '#94a3b8', stepSize: 1 },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  };

  // Grafica de linea: Evolución mensual (datos MySQL)
  public evolucionData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Monto simulado por mes',
        backgroundColor: 'rgba(255, 152, 0, 0.15)',
        borderColor: '#ff9800',
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#e65100',
        pointHoverRadius: 6,
      },
    ],
  };
  public evolucionType = 'line' as const;
  public evolucionOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
      y: {
        ticks: {
          color: '#94a3b8',
          callback: (valor : any) => this.formatearMoneda(Number(valor)),
        },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
    plugins: {
      legend: { display: true, labels: { color: '#94a3b8' } },
      tooltip: {
        callbacks: {
          label: (context : any) =>
            `${context.dataset.label}: ${this.formatearMoneda(Number(context.raw ?? 0))}`,
        },
      },
    },
  };

  constructor(
    private authService: AuthService,
    private simulacionService: SimulacionService,
    private apiExternaService: ApiExternaService,
    private router: Router,
    private fb: FormBuilder,
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
        this.cargarEstadisticas();
        this.cargarHistorial();
      }
    });
  }

  private cargarEstadisticas() {
    this.simulacionService.obtenerEstadisticas().subscribe({
      next: (stats: Estadisticas) => {
        this.totalRecords = stats.totalRegistros;
        this.lastRecordDate = stats.ultimoRegistro
          ? new Date(stats.ultimoRegistro)
          : null;
        this.promedioCuotaHistorica = stats.promedioCuota;
        this.simulacionMayorInteres = stats.mayorInteres
          ? {
              totalInteres: stats.mayorInteres.totalInteres,
              createdAt: new Date(stats.mayorInteres.createdAt),
            }
          : null;

        // Actualizar gráfica de distribución por riesgo (datos MySQL)
        const riesgoMap: Record<string, number> = {
          'Bajo riesgo': 0,
          'Riesgo medio': 0,
          'Alto riesgo': 0,
        };
        stats.distribucionRiesgo.forEach((r) => {
          if (riesgoMap.hasOwnProperty(r.clasificacion)) {
            riesgoMap[r.clasificacion] = r.cantidad;
          }
        });
        this.riesgoBarData = {
          labels: Object.keys(riesgoMap),
          datasets: [
            {
              data: Object.values(riesgoMap),
              label: 'Simulaciones',
              backgroundColor: ['#2e7d32', '#ef6c00', '#c62828'],
              borderRadius: 6,
            },
          ],
        };

        // Actualizar gráfica de evolución mensual (datos MySQL)
        if (stats.evolucionMensual.length > 0) {
          this.evolucionData = {
            labels: stats.evolucionMensual.map((e) => e.mes),
            datasets: [
              {
                ...this.evolucionData.datasets[0],
                data: stats.evolucionMensual.map((e) => e.totalMonto),
              },
            ],
          };
        }

        if (this.mostrarResultados) {
          this.actualizarComparacionConPromedio();
        }
      },
      error: (e) => console.error('Error al cargar estadísticas:', e),
    });
  }

  private cargarHistorial() {
    this.simulacionService.obtenerSimulaciones().subscribe({
      next: (simulaciones: Simulacion[]) => {
        this.historialSimulaciones = simulaciones.map((s) => ({
          createdAt: s.created_at ? new Date(s.created_at) : null,
          montoPrestamo: Number(s.monto_prestamo),
          tasaMensual: Number(s.tasa_mensual),
          plazoMeses: Number(s.plazo_meses),
          cuotaMensual: Number(s.cuota_mensual),
          totalIntereses: Number(s.total_intereses),
          clasificacionRiesgo: s.clasificacion_riesgo as Riesgo,
        }));

        // Cargar gráficas con la última simulación si hay historial
        if (this.historialSimulaciones.length > 0 && !this.mostrarResultados) {
          const ultima = this.historialSimulaciones[0];
          const monto = ultima.montoPrestamo;
          const plazo = ultima.plazoMeses;
          this.totalInteres = ultima.totalIntereses;
          this.totalPagar = monto + this.totalInteres;
          this.pagoMensual = ultima.cuotaMensual;
          this.clasificacionRiesgo = ultima.clasificacionRiesgo;

          this.doughnutChartData = {
            labels: this.doughnutChartLabels,
            datasets: [
              {
                data: [monto, this.totalInteres],
                backgroundColor: ['#6366f1', '#ef4444'],
                hoverBackgroundColor: ['#4f46e5', '#dc2626'],
                borderColor: '#ffffff',
                borderWidth: 2,
              },
            ],
          };

          const etiquetas: string[] = [];
          const saldos: number[] = [];
          for (let i = 1; i <= plazo; i++) {
            const saldoActual = this.totalPagar - this.pagoMensual * i;
            if (plazo <= 12 || i % Math.ceil(plazo / 12) === 0 || i === plazo) {
              etiquetas.push(`Mes ${i}`);
              saldos.push(Math.max(0, saldoActual));
            }
          }
          this.lineChartData = {
            labels: etiquetas,
            datasets: [
              {
                ...this.lineChartData.datasets[0],
                data: saldos,
              },
            ],
          };

          this.mostrarResultados = true;
        }
      },
      error: (e) => console.error('Error al cargar historial:', e),
    });
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

    this.compararConTasasBancos(tasaInteres);
    this.guardarSimulacion();
    this.mostrarResultados = true;
  }

  private compararConTasasBancos(tasaIngresada: number) {
    this.cargandoTasas = true;
    this.apiExternaService.obtenerTasasBancos().subscribe({
      next: (bancos: BancoTasa[]) => {
        this.tasasBancos = bancos;
        this.bancosConMenorTasa = bancos.filter(
          (b: BancoTasa) => b.monthlyRate < tasaIngresada,
        );
        this.bancosConMayorTasa = bancos.filter(
          (b: BancoTasa) => b.monthlyRate > tasaIngresada,
        );
        this.cargandoTasas = false;
      },
      error: () => {
        this.tasasBancos = [];
        this.cargandoTasas = false;
      },
    });
  }

  private guardarSimulacion() {
    if (!this.currentUser) return;

    this.simulacionService
      .guardarSimulacion({
        montoPrestamo: this.formularioSimulacion.value.monto,
        tasaMensual: this.formularioSimulacion.value.tasaInteres,
        plazoMeses: this.formularioSimulacion.value.plazo,
        cuotaMensual: this.pagoMensual,
        totalAPagar: this.totalPagar,
        totalIntereses: this.totalInteres,
        clasificacionRiesgo: this.clasificacionRiesgo,
      })
      .subscribe({
        next: () => {
          this.cargarEstadisticas();
          this.cargarHistorial();
        },
        error: (e) => console.error('Error al guardar simulación:', e),
      });
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
        head: [
          ['Fecha', 'Monto', 'Tasa', 'Meses', 'Cuota', 'Interes', 'Riesgo'],
        ],
        body: this.historialSimulaciones.map((item) => [
          item.createdAt
            ? item.createdAt.toLocaleDateString('es-CO')
            : 'Sin fecha',
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

  formatearMoneda(valor: number): string {
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

    this.diferenciaCuotaVsPromedio =
      this.pagoMensual - this.promedioCuotaHistorica;
    this.diferenciaAbsolutaCuotaVsPromedio = Math.abs(
      this.diferenciaCuotaVsPromedio,
    );
    this.porcentajeCuotaVsPromedio =
      (this.diferenciaCuotaVsPromedio / this.promedioCuotaHistorica) * 100;
  }
}
