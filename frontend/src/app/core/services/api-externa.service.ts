import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from '../../../enviroments/firebase';

export interface BancoTasa {
  id: number;
  bank: string;
  monthlyRate: number;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class ApiExternaService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private auth: Auth,
  ) {}

  private getAuthHeaders(): Observable<HttpHeaders> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('Usuario no autenticado');
    }
    return from(user.getIdToken()).pipe(
      switchMap((token) =>
        from(
          Promise.resolve(
            new HttpHeaders({
              Authorization: `Bearer ${token}`,
            }),
          ),
        ),
      ),
    );
  }

  obtenerTasasBancos(): Observable<BancoTasa[]> {
    return this.getAuthHeaders().pipe(
      switchMap((headers: HttpHeaders) =>
        this.http.get<BancoTasa[]>(`${this.apiUrl}/externa/tasas-bancos`, {
          headers,
        }),
      ),
    );
  }
}
