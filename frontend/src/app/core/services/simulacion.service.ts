import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from '../../../enviroments/firebase';

export interface Simulacion {
  id?: number;
  monto_prestamo: number;
  tasa_mensual: number;
  plazo_meses: number;
  cuota_mensual: number;
  total_a_pagar: number;
  total_intereses: number;
  clasificacion_riesgo: string;
  created_at?: string;
}

export interface Estadisticas {
  totalRegistros: number;
  ultimoRegistro: string | null;
  promedioCuota: number;
  promedioTasa: number;
  totalMonto: number;
  totalInteresesAcumulado: number;
  mayorInteres: { totalInteres: number; createdAt: string } | null;
  distribucionRiesgo: { clasificacion: string; cantidad: number }[];
  evolucionMensual: {
    mes: string;
    cantidad: number;
    promedioCuota: number;
    totalMonto: number;
  }[];
}

@Injectable({ providedIn: 'root' })
export class SimulacionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private auth: Auth) {}

  private getAuthHeaders(): Observable<HttpHeaders> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        from(
          Promise.resolve(
            new HttpHeaders({
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            })
          )
        )
      )
    );
  }

  guardarSimulacion(data: {
    montoPrestamo: number;
    tasaMensual: number;
    plazoMeses: number;
    cuotaMensual: number;
    totalAPagar: number;
    totalIntereses: number;
    clasificacionRiesgo: string;
  }): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap((headers) =>
        this.http.post(`${this.apiUrl}/simulaciones`, data, { headers })
      )
    );
  }

  obtenerSimulaciones(): Observable<Simulacion[]> {
    return this.getAuthHeaders().pipe(
      switchMap((headers) =>
        this.http.get<Simulacion[]>(`${this.apiUrl}/simulaciones`, { headers })
      )
    );
  }

  obtenerEstadisticas(): Observable<Estadisticas> {
    return this.getAuthHeaders().pipe(
      switchMap((headers) =>
        this.http.get<Estadisticas>(`${this.apiUrl}/simulaciones/estadisticas`, {
          headers,
        })
      )
    );
  }
}
