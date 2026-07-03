import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface Conversacion {
  paciente_id: string;
  nombre_paciente: string;
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
  selector: 'app-medicomensajes',
  templateUrl: './medicomensajes.page.html',
  styleUrls: ['./medicomensajes.page.scss'],
  standalone: false,
})
export class MedicoMensajesPage implements OnInit {

  @ViewChild('chatContainer') chatContainer!: ElementRef;

  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';
  
  cargando: boolean = true;
  sidebarOpen: boolean = false;
  submenuAbierto: string | null = null;

  notificacionesSinLeer: number = 0;
  mensajesNoLeidos: number = 0;

  conversaciones: Conversacion[] = [];
  conversacionesFiltradas: Conversacion[] = [];
  busqueda: string = '';

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
    this.cargarDatosUsuario();
    await this.cargarConversaciones();
    await this.cargarNotificaciones();

    setInterval(() => {
      this.cargarConversaciones();
      this.cargarNotificaciones();
      if (this.conversacionActiva) {
        this.cargarMensajes(this.conversacionActiva.paciente_id);
      }
    }, 30000);
  }

  private cargarDatosUsuario(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol === 'medico' ? 'Medico Especialista' : 
                           user.rol === 'nutricionista' ? 'Nutricionista' : 'Especialista';
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

      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/mensajes/conversaciones`,
        { headers }
      ).toPromise();

      this.conversaciones = resp?.conversaciones || [];
      this.filtrarConversaciones();
      this.actualizarTotalMensajesNoLeidos();

    } catch (error) {
      console.error('Error cargando conversaciones:', error);
      this.conversaciones = [];
      this.filtrarConversaciones();
    } finally {
      this.cargando = false;
    }
  }

  async cargarNotificaciones(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/notificaciones/no-leidas`,
        { headers }
      ).toPromise();

      this.notificacionesSinLeer = resp?.total || 0;
      this.mensajesNoLeidos = resp?.mensajesNoLeidos || 0;
    } catch (error) {
      console.warn('No se pudieron cargar notificaciones');
    }
  }

  filtrarConversaciones(): void {
    if (!this.busqueda.trim()) {
      this.conversacionesFiltradas = [...this.conversaciones];
    } else {
      const termino = this.busqueda.toLowerCase();
      this.conversacionesFiltradas = this.conversaciones.filter(c => 
        c.nombre_paciente.toLowerCase().includes(termino)
      );
    }
  }

  async seleccionarConversacion(conv: Conversacion): Promise<void> {
    this.conversacionActiva = conv;
    await this.cargarMensajes(conv.paciente_id);
    
    if (conv.mensajes_no_leidos > 0) {
      await this.marcarComoLeidos(conv.paciente_id);
    }
  }

  async cargarMensajes(pacienteId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      const resp: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/mensajes/conversacion/${pacienteId}`,
        { headers }
      ).toPromise();

      this.mensajes = resp?.mensajes || [];
      setTimeout(() => this.scrollAlFinal(), 100);

    } catch (error) {
      console.error('Error cargando mensajes:', error);
      this.mensajes = [];
    }
  }

  async marcarComoLeidos(pacienteId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      await this.http.put(
        `${environment.apiUrl}/nutricionapp-api/medico/mensajes/leidos/${pacienteId}`,
        {},
        { headers }
      ).toPromise();

      const conv = this.conversaciones.find(c => c.paciente_id === pacienteId);
      if (conv) {
        conv.mensajes_no_leidos = 0;
      }
      this.actualizarTotalMensajesNoLeidos();

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
        `${environment.apiUrl}/nutricionapp-api/medico/mensajes/enviar`,
        {
          paciente_id: this.conversacionActiva.paciente_id,
          contenido: this.nuevoMensaje.trim()
        },
        { headers }
      ).toPromise();

      this.mensajes.push({
        id: resp?.id || Date.now().toString(),
        contenido: this.nuevoMensaje.trim(),
        fecha: new Date().toISOString(),
        es_medico: true,
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

  actualizarTotalMensajesNoLeidos(): void {
    this.mensajesNoLeidos = this.conversaciones.reduce((acc, c) => acc + c.mensajes_no_leidos, 0);
  }

  volverALista(): void {
    this.conversacionActiva = null;
    this.mensajes = [];
  }

  async contactarWhatsApp(): Promise<void> {
    await this.mostrarToast('Abriendo WhatsApp...', 'primary');
  }

  verHistorialPaciente(): void {
  if (this.conversacionActiva) {
    this.router.navigate(['/medicoconsultarpaciente', this.conversacionActiva.paciente_id]);
  }
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
      'medico': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'medico-agregar-paciente': '/medico-agregar-paciente',
      'medico-buscar-paciente': '/medico-buscar-paciente',
      'medicoplanesnutricionalescreados': '/medicoplanesnutricionalescreados',
      'medicoseguimientoclinico': '/medicoseguimientoclinico',
      'medicoinformes': '/medicoinformes',
      'medicomensajes': '/medicomensajes',
      'medico-configuracion': '/medico-configuracion'
    };
    this.router.navigate([rutas[ruta] || `/${ruta}`]);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleSubmenu(nombre: string): void {
    this.submenuAbierto = this.submenuAbierto === nombre ? null : nombre;
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
    await this.cargarNotificaciones();
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