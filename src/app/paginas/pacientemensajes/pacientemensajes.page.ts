import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface Conversacion {
  medico_id: string;
  nombre_medico: string;
  telefono_medico: string;
  ultimo_mensaje: string;
  ultimo_mensaje_fecha: string;
  mensajes_no_leidos: number;
  en_linea: boolean;
}

interface Mensaje {
  id: string;
  contenido: string;
  fecha: string;
  es_medico: boolean;
  leido: boolean;
}

@Component({
  selector: 'app-pacientemensajes',
  templateUrl: './pacientemensajes.page.html',
  styleUrls: ['./pacientemensajes.page.scss'],
  standalone: false,
})
export class PacienteMensajesPage implements OnInit {

  @ViewChild('chatContainer') chatContainer!: ElementRef;

  nombrePaciente: string = '';
  cedulaPaciente: string = '';
  pacienteId: string = '';
  
  cargando: boolean = true;
  sidebarOpen: boolean = false;
  submenuAbierto: string | null = null;
  sinMedico: boolean = false;

  notificacionesSinLeer: number = 0;
  mensajesNoLeidos: number = 0;

  conversaciones: Conversacion[] = [];
  conversacionActiva: Conversacion | null = null;
  mensajes: Mensaje[] = [];
  nuevoMensaje: string = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) { }

  async ngOnInit() {
    this.cargarDatosPaciente();
    await this.cargarConversaciones();
    await this.cargarMensajesNoLeidos();

    setInterval(() => {
      this.cargarConversaciones();
      this.cargarMensajesNoLeidos();
      if (this.conversacionActiva) {
        this.cargarMensajes(this.conversacionActiva.medico_id);
      }
    }, 30000);
  }

  private cargarDatosPaciente(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombrePaciente = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Paciente';
        this.cedulaPaciente = user.cedula || 'Sin cedula';
        this.pacienteId = user.id || '';
      } catch (e) { 
        console.warn('Error parseando usuario'); 
      }
    }
  }

  async cargarConversaciones(): Promise<void> {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Sin autenticacion');

    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    console.log('[DEBUG] ========================================');
    console.log('[DEBUG] Llamando a endpoint de conversaciones');
    console.log('[DEBUG] URL:', `${environment.apiUrl}/nutricionapp-api/paciente/mensajes/conversacion`);
    console.log('[DEBUG] Token (primeros 20 chars):', token.substring(0, 20) + '...');

    const resp: any = await this.http.get(
      `${environment.apiUrl}/nutricionapp-api/paciente/mensajes/conversacion`,
      { headers }
    ).toPromise();

    console.log('[DEBUG] Respuesta completa del backend:', JSON.stringify(resp, null, 2));
    console.log('[DEBUG] sinMedico:', resp?.sinMedico);
    console.log('[DEBUG] conversaciones:', resp?.conversaciones);
    console.log('[DEBUG] mensaje:', resp?.mensaje);
    console.log('[DEBUG] ========================================');

    if (resp?.sinMedico) {
      this.sinMedico = true;
      this.conversaciones = [];
      console.warn('[DEBUG] Backend dice que NO hay medico asignado');
      console.warn('[DEBUG] Mensaje del backend:', resp?.mensaje);
    } else {
      this.sinMedico = false;
      this.conversaciones = resp?.conversaciones || [];
      console.log('[DEBUG] Conversaciones cargadas:', this.conversaciones.length);
      
      if (this.conversaciones.length > 0) {
        console.log('[DEBUG] Primera conversacion:', JSON.stringify(this.conversaciones[0], null, 2));
      }
    }

  } catch (error: any) {
    console.error('[ERROR] ========================================');
    console.error('[ERROR] Error cargando conversaciones');
    console.error('[ERROR] Status:', error.status);
    console.error('[ERROR] StatusText:', error.statusText);
    console.error('[ERROR] Mensaje:', error.message);
    console.error('[ERROR] Error completo:', error);
    console.error('[ERROR] ========================================');
    this.conversaciones = [];
  } finally {
    this.cargando = false;
  }
}

  async cargarMensajesNoLeidos(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/mensajes/no-leidos`,
        { headers }
      ).toPromise();

      this.mensajesNoLeidos = resp?.total || 0;
    } catch (error) {
      console.warn('No se pudieron cargar mensajes no leidos');
    }
  }

  async seleccionarConversacion(conv: Conversacion): Promise<void> {
    this.conversacionActiva = conv;
    await this.cargarMensajes(conv.medico_id);
    
    if (conv.mensajes_no_leidos > 0) {
      await this.marcarComoLeidos(conv.medico_id);
    }
  }

  async cargarMensajes(medicoId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/paciente/mensajes/conversacion/${medicoId}`,
        { headers }
      ).toPromise();

      this.mensajes = resp?.mensajes || [];
      setTimeout(() => this.scrollAlFinal(), 100);

    } catch (error) {
      console.error('Error cargando mensajes:', error);
      this.mensajes = [];
    }
  }

  async marcarComoLeidos(medicoId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      await this.http.put(
        `${environment.apiUrl}/nutricionapp-api/paciente/mensajes/leidos/${medicoId}`,
        {},
        { headers }
      ).toPromise();

      const conv = this.conversaciones.find(c => c.medico_id === medicoId);
      if (conv) {
        conv.mensajes_no_leidos = 0;
      }
      await this.cargarMensajesNoLeidos();

    } catch (error) {
      console.warn('Error marcando como leidos');
    }
  }

  async enviarMensaje(event?: Event): Promise<void> {
    if (event) {
      event.preventDefault();
    }

    if (!this.nuevoMensaje.trim() || !this.conversacionActiva) return;

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const resp: any = await this.http.post(
        `${environment.apiUrl}/nutricionapp-api/paciente/mensajes/enviar`,
        {
          medico_id: this.conversacionActiva.medico_id,
          contenido: this.nuevoMensaje.trim()
        },
        { headers }
      ).toPromise();

      this.mensajes.push({
        id: resp?.id || Date.now().toString(),
        contenido: this.nuevoMensaje.trim(),
        fecha: new Date().toISOString(),
        es_medico: false,
        leido: false
      });

      this.conversacionActiva.ultimo_mensaje = this.nuevoMensaje.trim();
      this.conversacionActiva.ultimo_mensaje_fecha = new Date().toISOString();

      this.nuevoMensaje = '';
      setTimeout(() => this.scrollAlFinal(), 100);

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      await this.mostrarToast('Error al enviar el mensaje', 'danger');
    }
  }

  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  scrollAlFinal(): void {
    if (this.chatContainer) {
      const container = this.chatContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  mostrarSeparadorFecha(index: number): boolean {
    if (index === 0) return true;
    
    const msgActual = new Date(this.mensajes[index].fecha);
    const msgAnterior = new Date(this.mensajes[index - 1].fecha);
    
    return msgActual.toDateString() !== msgAnterior.toDateString();
  }

  formatearHora(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const ahora = new Date();
    const diffMin = Math.floor((ahora.getTime() - d.getTime()) / 60000);
    
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `${diffMin}m`;
    if (d.toDateString() === ahora.toDateString()) {
      return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' });
  }

  formatearFechaMensaje(fecha: string): string {
    const d = new Date(fecha);
    const ahora = new Date();
    
    if (d.toDateString() === ahora.toDateString()) return 'Hoy';
    
    const ayer = new Date(ahora);
    ayer.setDate(ayer.getDate() - 1);
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    
    return d.toLocaleDateString('es-EC', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  }

  formatearHoraMensaje(fecha: string): string {
    return new Date(fecha).toLocaleTimeString('es-EC', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  volverALista(): void {
    this.conversacionActiva = null;
    this.mensajes = [];
  }

  async contactarWhatsApp(): Promise<void> {
    if (!this.conversacionActiva || !this.conversacionActiva.telefono_medico) {
      await this.mostrarToast('No hay telefono del medico registrado', 'warning');
      return;
    }

    let telefonoLimpio = this.conversacionActiva.telefono_medico.replace(/[\s\-\(\)]/g, '');
    if (telefonoLimpio.startsWith('0')) {
      telefonoLimpio = telefonoLimpio.substring(1);
    }
    if (!telefonoLimpio.startsWith('593')) {
      telefonoLimpio = '593' + telefonoLimpio;
    }

    const mensaje = `Hola Dr. ${this.conversacionActiva.nombre_medico}, soy ${this.nombrePaciente}. Le contacto desde la plataforma NutriAI.`;
    const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  async verNotificaciones(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Notificaciones',
      message: this.notificacionesSinLeer > 0 
        ? `Tienes ${this.notificacionesSinLeer} notificacion(es) pendiente(s).`
        : 'No tienes notificaciones nuevas.',
      buttons: ['Cerrar']
    });
    await alert.present();
  }

  navegarA(ruta: string): void {
    const rutas: Record<string, string> = {
      'pacienteprincipal': '/pacienteprincipal',
      'pacienteverplan': '/pacienteverplan',
      'pacienteplanhistorial': '/pacienteplanhistorial',
      'pacientedatosantropometricos': '/pacientedatosantropometricos',
      'pacienteregistrarglucosa': '/pacienteregistrarglucosa',
      'pacienteverglucosa': '/pacienteverglucosa',
      'pacienteregistrarpresion': '/pacienteregistrarpresion',
      'pacienteverpresion': '/pacienteverpresion',
      'pacientehistorialmedico': '/pacientehistorialmedico',
      'pacientemensajes': '/pacientemensajes',
      'pacienteconfiguracion': '/pacienteconfiguracion'
    };
    this.sidebarOpen = false;
    this.submenuAbierto = null;
    this.router.navigate([rutas[ruta] || `/${ruta}`]);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    if (!this.sidebarOpen) {
      this.submenuAbierto = null;
    }
  }

  toggleSubmenu(item: string): void {
    if (this.submenuAbierto === item) {
      this.submenuAbierto = null;
    } else {
      this.submenuAbierto = item;
    }
  }

  async cerrarSesion(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesion',
      message: 'Estas seguro de que deseas cerrar sesion?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salir',
          handler: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.router.navigate(['/principal'], { replaceUrl: true });
          }
        }
      ]
    });
    await alert.present();
  }

  async refrescarDatos(): Promise<void> {
    this.cargando = true;
    await this.cargarConversaciones();
    await this.cargarMensajesNoLeidos();
    if (this.conversacionActiva) {
      await this.cargarMensajes(this.conversacionActiva.medico_id);
    }
    await this.mostrarToast('Datos actualizados', 'success');
  }

  async mostrarToast(message: string, color: 'primary' | 'success' | 'danger' | 'warning' = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}