import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-auditoria',
  templateUrl: './admin-auditoria.page.html',
  styleUrls: ['./admin-auditoria.page.scss'],
  standalone: false,
})
export class AdminAuditoriaPage implements OnInit {
  logs: any[] = [];
  cargando = false;
  filtroTipo = 'todos';
  terminoBusqueda = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.cargarLogs();
  }

  async cargarLogs() {
    this.cargando = true;
    const token = localStorage.getItem('token');
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/admin/auditoria`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      ).toPromise();
      
      this.logs = response?.logs || [];
    } catch (error) {
      console.error('Error cargando logs:', error);
    } finally {
      this.cargando = false;
    }
  }

  get logsFiltrados() {
    let result = [...this.logs];
    
    if (this.filtroTipo !== 'todos') {
      result = result.filter(l => l.tipo === this.filtroTipo);
    }
    
    if (this.terminoBusqueda) {
      const t = this.terminoBusqueda.toLowerCase();
      result = result.filter(l => 
        l.descripcion?.toLowerCase().includes(t) ||
        l.usuario_nombre?.toLowerCase().includes(t)
      );
    }
    
    return result;
  }

  getIconoTipo(tipo: string): string {
    const iconos: Record<string, string> = {
      'login': 'log-in',
      'user': 'person',
      'registro': 'document',
      'error': 'alert-circle',
      'plan': 'nutrition'
    };
    return iconos[tipo] || 'information-circle';
  }

  getColorTipo(tipo: string): string {
    const colores: Record<string, string> = {
      'login': 'primary',
      'user': 'success',
      'registro': 'secondary',
      'error': 'danger',
      'plan': 'warning'
    };
    return colores[tipo] || 'medium';
  }

  volver() {
    this.router.navigate(['/administrador']);
  }
}