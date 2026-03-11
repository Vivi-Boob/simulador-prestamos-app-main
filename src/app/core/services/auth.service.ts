import { inject, Injectable } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  user,
  User,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  usuarioActual$: Observable<User | null>;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
  ) {
    this.usuarioActual$ = user(this.auth);
  }

  async loginGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(this.auth, provider);
      if (result.user) {
        await this.guardarDatosUsuario(result.user);
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Error al iniciar sesión:', error);
        throw error;
      }
    }
  }

  private async guardarDatosUsuario(user: User) {
    const userRef = doc(this.firestore, `usuarios/${user.uid}`);
    const datosAGuardar = {
      uid: user.uid,
      nombreUsuario: user.displayName,
      correo: user.email,
      fechaCreacion: serverTimestamp(),
    };
    return setDoc(userRef, datosAGuardar, { merge: true });
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
}
