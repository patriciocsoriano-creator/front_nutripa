// src/app/paginas/medicoverpacientes/medicoverpacientes.page.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medicoverpacientes',
  templateUrl: './medicoverpacientes.page.html',
  styleUrls: ['./medicoverpacientes.page.scss'],
  standalone: false,
})
export class MedicoverpacientesPage implements OnInit {

  // 👤 UI State
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';
  
  // 📋 Data
  pacientes: any[] = [];
  cargando = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    await this.cargarPacientes();
  }

  private cargarDatosUsuario() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol || 'Especialista';
      } catch (e) { console.warn('⚠️ Error parseando usuario'); }
    }
  }

  async cargarPacientes() {
    
    this.cargando = true;
    const loading = await this.loadingCtrl.create({ 
      message: 'Cargando pacientes...', 
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sin autenticación');

      const headers = new HttpHeaders({ 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/pacientes`,
        { headers }
      ).toPromise();
      // Dentro de cargarPacientes(), después de recibir la respuesta:
console.log('🔍 [DEBUG] Pacientes recibidos:', response.pacientes);
console.log('🔍 [DEBUG] Primer paciente - sexo:', response.pacientes?.[0]?.sexo);
console.log('🔍 [DEBUG] Primer paciente - actividad_fisica:', response.pacientes?.[0]?.actividad_fisica);

      if (response?.error) throw new Error(response.mensaje);
      
      this.pacientes = response.pacientes || [];

    } catch (error: any) {
      console.error('❌ Error cargando pacientes:', error);
      await this.showToast('No se pudieron cargar los pacientes', 'danger');
    } finally {
      await loading.dismiss();
      this.cargando = false;
    }
    
  }

  // 👁️ Ver detalle de paciente (historial clínico)
  verDetallePaciente(paciente: any) {
    this.router.navigate(['/medicoconsultarpaciente', paciente.id]);
  }

  // 📋 NUEVO: Ver plan alimenticio guardado
  async verPlanAlimenticio(paciente: any) {
    const loading = await this.loadingCtrl.create({ 
      message: 'Buscando plan alimenticio...', 
      spinner: 'crescent' 
    });
    await loading.present();

    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      // Obtener planes del paciente
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/plan-nutricional/paciente/${paciente.id}`,
        { headers }
      ).toPromise();

      await loading.dismiss();

      if (response?.error || !response?.planes?.length) {
        await this.alertCtrl.create({
          header: 'Sin Plan Alimenticio',
          message: `El paciente <strong>${paciente.nombre_completo}</strong> aún no tiene un plan alimenticio guardado.`,
          buttons: ['Entendido']
        }).then(alert => alert.present());
        return;
      }

      // Si hay múltiples planes, mostrar el más reciente
      const planMasReciente = response.planes[0]; // Ya viene ordenado por fecha_creacion DESC

      // Redirigir a una vista de detalle del plan (puedes crear esta página o usar un modal)
      this.router.navigate(['/medicoplanalimenticio-detalle'], {
        state: { 
          planId: planMasReciente.id,
          pacienteId: paciente.id,
          pacienteNombre: paciente.nombre_completo
        }
      });

    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error obteniendo plan:', error);
      await this.showToast('No se pudo cargar el plan alimenticio', 'danger');
    }
  }

  // 🩺 NUEVO: Ver seguimiento clínico
verSeguimientoClinico(paciente: any) {
  this.router.navigate(['/medicoseguimientoclinico', paciente.id], {
    state: { pacienteId: paciente.id }
  });
}

  // 💬 NUEVO: Contactar por WhatsApp
  contactarWhatsApp(paciente: any) {
    if (!paciente.telefono) {
      this.showToast('El paciente no tiene número de teléfono registrado', 'warning');
      return;
    }

    // Formatear número para WhatsApp (eliminar espacios, guiones, agregar código de país)
    // Ecuador: +593, eliminar el primer 0 si existe
    let telefonoLimpio = paciente.telefono.replace(/[\s\-\(\)]/g, '');
    if (telefonoLimpio.startsWith('0')) {
      telefonoLimpio = telefonoLimpio.substring(1);
    }
    // Asegurar código de país Ecuador
    if (!telefonoLimpio.startsWith('593')) {
      telefonoLimpio = '593' + telefonoLimpio;
    }

    // Mensaje personalizado
    const mensaje = `Hola ${paciente.nombre_completo}, soy el Dr. ${this.nombreDoctor}. Te contacto desde la plataforma NutriPa para dar seguimiento a tu plan nutricional. ¿En qué puedo ayudarte?`;
    
    // Abrir WhatsApp
    const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    
    this.showToast(`Abriendo WhatsApp con ${paciente.nombre_completo}...`, 'success', 2000);
  }

  // 🗑️ NUEVO: Eliminar paciente (soft delete)
  async eliminarPaciente(paciente: any) {
    // Confirmación con alert
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de que deseas eliminar a <strong>${paciente.nombre_completo}</strong>?<br><br>
                <small>Esta acción es reversible desde el panel de administración.</small>`,
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-button-cancel' },
        { 
          text: 'Sí, Eliminar', 
          cssClass: 'alert-button-confirm',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ 
              message: 'Eliminando paciente...', 
              spinner: 'crescent' 
            });
            await loading.present();

            try {
              const token = localStorage.getItem('token');
              const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

              // Llamar al endpoint de eliminación (soft delete)
              await this.http.delete(
                `${environment.apiUrl}/nutricionapp-api/medico/pacientes/${paciente.id}`,
                { headers }
              ).toPromise();

              await loading.dismiss();
              
              // Remover de la lista local sin recargar toda la tabla
              this.pacientes = this.pacientes.filter(p => p.id !== paciente.id);
              
              await this.showToast(`✅ ${paciente.nombre_completo} eliminado correctamente`, 'success');

            } catch (error: any) {
              await loading.dismiss();
              console.error('❌ Error eliminando paciente:', error);
              await this.showToast('Error al eliminar el paciente', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // 🔧 Helpers de UI
  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  toggleSubmenu(item: string) { this.submenuAbierto = this.submenuAbierto === item ? null : item; }
  
  navegarA(ruta: string) {
    const rutas: Record<string, string> = {
      'principaldoctor': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'agregar-paciente': '/agregar-paciente',
      'buscar-paciente': '/buscar-paciente',
      'planes-nutricionales': '/medicoplanesnutricionalescreados',
      'medicoseguimientoclinico': '/medicoseguimientoclinico', 
      'reportes': '/reportes-medico',
      'educacion': '/educacion-pacientes',
      'configuracion': '/configuracion-medico'
    };
    this.router.navigate([rutas[ruta] || `/${ruta}`]);
    this.submenuAbierto = null;
  }
  
  async cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    await this.showToast('Sesión cerrada', 'success');
    this.router.navigate(['/principal'], { replaceUrl: true });
  }
  
  async showToast(message: string, color: 'primary'|'success'|'danger'|'warning' = 'primary', duration: number = 3000) {
    await this.toastCtrl.create({ message, color, duration, position: 'bottom' }).then(t => t.present());
  }

  
}