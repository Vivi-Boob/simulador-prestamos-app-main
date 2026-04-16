import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from '../../../enviroments/firebase';

export interface TasasCambio {
  base: string;
  fecha: string;
  tasas: { [moneda: string]: number };
  esMock?: boolean;
}

export interface IndicadoresFinancieros {
  fecha: string;
  tasaUsura: number;
  tasaReferenciaBanrep: number;
  inflacionAnual: number;
  dtf: number;
  ipc: number;
  tasaPromedioConsumo: number;
  tasaPromedioMicrocredito: number;
  tasaPromedioVivienda: number;
  salarioMinimo: number;
  uvt: number;
}

@Injectable({ providedIn: 'root' })
export class ApiExternaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private auth: Auth) {}

  private getAuthHeaders(): Observable<HttpHeaders> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        from(
          Promise.resolve(
            new HttpHeaders({
              Authorization: `Bearer ${token}`,
            })
          )
        )
      )
    );
  }

  obtenerTasasCambio(): Observable<TasasCambio> {
    return this.getAuthHeaders().pipe(
      switchMap((headers) =>
        this.http.get<TasasCambio>(`${this.apiUrl}/externa/tasas-cambio`, {
          headers,
        })
      )
    );
  }

  obtenerIndicadoresFinancieros(): Observable<IndicadoresFinancieros> {
    return this.getAuthHeaders().pipe(
      switchMap((headers) =>
        this.http.get<IndicadoresFinancieros>(
          `${this.apiUrl}/externa/indicadores-financieros`,
          { headers }
        )
      )
    );
  }
}
