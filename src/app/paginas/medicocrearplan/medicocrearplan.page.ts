import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { MlService, PrediccionResponse } from 'src/app/services/ml-service';
import { firstValueFrom } from 'rxjs';
import { PatientClinicalData } from 'src/app/services/patient-data-util';
import { FormControl } from '@angular/forms';

interface PacienteData {
  id?: string;
  nombre_completo?: string;
  edad?: number;
  fechaNacimiento?: string;
  sexo?: 'M' | 'F' | 'Masculino' | 'Femenino' | 'O';
  actividad_fisica?: string;
  ultimos_datos?: {
    signos_vitales?: any;
    datos_antropometricos?: any;
    condiciones_metabolicas?: any;
  };
}

interface FormularioPlan {
  paciente_id: string;
  nombre_paciente: string;
  imc: number | null;
  peso: number | null;
  talla: number | null;
  glucosa_ayunas: number | null;
  hba1c: number | null;
  cintura: number | null;
  colesterol_ldl: number | null;
  actividad_fisica: string;
  preferencias_alimentarias: string;
  situacion_economica: string;
  objetivos: string[];
  recomendaciones: string;
  duracion_semanas: number;
  notas_adicionales: string;
  alergias: string;
}

@Component({
  selector: 'app-medicocrearplan',
  templateUrl: './medicocrearplan.page.html',
  styleUrls: ['./medicocrearplan.page.scss'],
  standalone: false,
})
export class MedicocrearplanPage implements OnInit {

  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';

  preferenciasControl = new FormControl('equilibrada');

  pacienteId: string | null = null;
  pacienteData: PacienteData | null = null;
  cargandoPaciente = false;

  perfilRecomendado: string | null = null;
  perfilRecomendadoId: number | null = null;
  confianzaPrediccion: number | null = null;
  cargandoML = false;
  errorML: string | null = null;
  respuestaIA: PrediccionResponse | null = null;

  formulario: FormularioPlan = {
    paciente_id: '',
    nombre_paciente: '',
    imc: null,
    peso: null,
    talla: null,
    glucosa_ayunas: null,
    hba1c: null,
    cintura: null,
    colesterol_ldl: null,
    actividad_fisica: 'moderada',
    preferencias_alimentarias: 'equilibrada',
    situacion_economica: 'media',
    objetivos: [],
    recomendaciones: '',
    duracion_semanas: 4,
    notas_adicionales: '',
    alergias: ''
  };

  objetivosDisponibles = [
    { id: 'control_glucosa', label: 'Control de glucosa', icon: 'flask-outline' },
    { id: 'perder_peso', label: 'Perdida de peso', icon: 'scale-outline' },
    { id: 'mejorar_lipidos', label: 'Mejorar lipidos', icon: 'heart-outline' },
    { id: 'aumentar_energia', label: 'Aumentar energia', icon: 'flash-outline' },
    { id: 'educacion_nutricional', label: 'Educacion nutricional', icon: 'school-outline' }
  ];

  preferenciasAlimentarias = [
    { id: 'equilibrada', label: 'Equilibrada' },
    { id: 'baja_carbo', label: 'Baja en carbohidratos' },
    { id: 'sin_restricciones', label: 'Sin restricciones' }
  ];

  situacionesEconomicas = [
    { id: 'baja', label: 'Recursos limitados' },
    { id: 'media', label: 'Recursos moderados' },
    { id: 'alta', label: 'Recursos amplios' }
  ];

  perfilesDieteticos: Record<number, { nombre: string; color: string; desc: string }> = {
    0: { nombre: 'Hipocalorico', color: 'warning', desc: 'Enfocado en deficit calorico controlado para perdida de peso' },
    1: { nombre: 'Control Glucemico', color: 'danger', desc: 'Control estricto de carbohidratos y estabilidad glucemica' },
    2: { nombre: 'Hipo-grasa', color: 'tertiary', desc: 'Reduccion de grasas saturadas y colesterol para salud cardiovascular' },
    3: { nombre: 'Normocalorico', color: 'success', desc: 'Mantenimiento con equilibrio nutricional para peso estable' }
  };

  intercambios: any[] = [];
  distribucion: any[] = [];
  mostrarConfiguracion = false;
  segmentoConfig = 'intercambios';
  cargandoConfig = false;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private http: HttpClient,
    private mlService: MlService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private cdr: ChangeDetectorRef 
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    this.preferenciasControl.valueChanges.subscribe(value => {
      if (value) {
        this.formulario.preferencias_alimentarias = value;
      }
    });
    await this.inicializarFormulario();
  }

  private cargarDatosUsuario() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol || user.especialidad || 'Especialista';
      } catch (e) { 
        console.warn('Error parseando usuario'); 
      }
    }
  }

  async inicializarFormulario() {
    this.cargandoPaciente = true;
    this.pacienteId = 
      this.activatedRoute.snapshot.queryParamMap.get('paciente_id') ||
      this.activatedRoute.snapshot.paramMap.get('id');

    const stateData = this.router.getCurrentNavigation()?.extras?.state?.['pacienteData'];
    if (stateData) {
      this.pacienteData = stateData;
      this.prellenarFormularioConDatos(stateData);
    } else if (this.pacienteId) {
      await this.cargarDatosPacienteDesdeAPI();
    }
    this.cargandoPaciente = false;

    if (this.formulario.imc) {
      await this.ejecutarPrediccionML();
    }
  }

  private prellenarFormularioConDatos(data: any) {
    this.formulario.paciente_id = data.id || '';
    this.formulario.nombre_paciente = data.nombre_completo || '';

    if (data.edad !== undefined) this.pacienteData = { ...this.pacienteData, edad: data.edad } as PacienteData;
    if (data.fechaNacimiento !== undefined) this.pacienteData = { ...this.pacienteData, fechaNacimiento: data.fechaNacimiento } as PacienteData;
    if (data.sexo !== undefined) this.pacienteData = { ...this.pacienteData, sexo: data.sexo } as PacienteData;

    if (data.ultimos_datos?.datos_antropometricos) {
      const ant = data.ultimos_datos.datos_antropometricos;
      this.formulario.imc = ant.imc || null;
      this.formulario.peso = ant.peso || null;
      this.formulario.talla = ant.talla ? ant.talla * 100 : null;
      this.formulario.cintura = ant.circunferenciaCintura || null;
    }

    if (data.ultimos_datos?.signos_vitales) {
      const sv = data.ultimos_datos.signos_vitales;
      this.formulario.glucosa_ayunas = sv.glucosaAyunas || null;
      this.formulario.hba1c = sv.hemoglobinaGlicosilada || null;
    }

    if (data.ultimos_datos?.condiciones_metabolicas) {
      const cm = data.ultimos_datos.condiciones_metabolicas;
      if (cm.dislipidemia && !this.formulario.colesterol_ldl) {
        this.formulario.colesterol_ldl = 140;
      }
    }

    if (data.actividad_fisica) {
      this.formulario.actividad_fisica = data.actividad_fisica;
    }
  }

  async cargarDatosPacienteDesdeAPI() {
    if (!this.pacienteId) return;
    try {
      const token = localStorage.getItem('token');
      const response: any = await firstValueFrom(this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/paciente/${this.pacienteId}/detalle`,
        { headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` }) }
      ));

      if (response?.paciente) {
        const paciente = response.paciente;
        this.pacienteData = {
          id: paciente.id,
          nombre_completo: `${paciente.nombres} ${paciente.apellidos}`,
          edad: paciente.edad,
          fechaNacimiento: paciente.fechaNacimiento,
          sexo: paciente.sexo,
          actividad_fisica: paciente.actividad_fisica
        };
        this.prellenarFormularioConDatos({ ...paciente, ultimos_datos: response.ultimos_datos });
      }
    } catch (error) {
      console.warn('No se pudo cargar datos del paciente desde API');
      await this.showToast('Usando datos basicos del paciente', 'warning');
    }
  }

  async ejecutarPrediccionML() {
    this.cargandoML = true;
    this.errorML = null;

    try {
      const datosClinicos: PatientClinicalData = {
        imc: this.formulario.imc,
        edad: this.pacienteData?.edad || null,
        genero: this.pacienteData?.sexo || null,
        peso_kg: this.formulario.peso || null,
        talla_cm: this.formulario.talla || null,
        tiene_diabetes: this.inferirTieneDiabetes(),
        fechaNacimiento: this.pacienteData?.fechaNacimiento || null,
        sexo: this.pacienteData?.sexo || null
      };

      const validacion = this.mlService.dataUtilService.validarDatosParaInferencia(datosClinicos);
      if (!validacion.valido) {
        throw new Error(`Datos invalidos: ${validacion.errores.join(', ')}`);
      }
      
      this.respuestaIA = await firstValueFrom(
        this.mlService.inferirPerfilDesdeDatosClinicos(datosClinicos)
      );

      if (this.respuestaIA?.perfil_id !== undefined) {
        const perfilInfo = this.perfilesDieteticos[this.respuestaIA.perfil_id];
        this.perfilRecomendadoId = this.respuestaIA.perfil_id;
        this.perfilRecomendado = perfilInfo?.nombre || 'Desconocido';
        this.confianzaPrediccion = this.respuestaIA.confianza || null;
        
        this.sugerirObjetivosPorPerfil(this.respuestaIA.perfil_id);
        
        if (!this.formulario.recomendaciones && this.respuestaIA.recomendacion) {
          this.formulario.recomendaciones = this.respuestaIA.recomendacion;
        }
        
        const confianzaPorcentaje = this.respuestaIA.confianza 
          ? (this.respuestaIA.confianza * 100).toFixed(1) 
          : 'N/A';
        await this.showToast(`Perfil: ${this.perfilRecomendado} (${confianzaPorcentaje}% confianza)`, 'success');
      }
    } catch (error: any) {
      console.error('Error en prediccion ML:', error);
      this.errorML = error.message || 'No se pudo conectar con el servicio de IA.';
      await this.showToast('Prediccion IA no disponible. Continuando con formulario manual.', 'warning');
    } finally {
      this.cargandoML = false;
    }
  }

  private inferirTieneDiabetes(): number {
    if (this.formulario.glucosa_ayunas && this.formulario.glucosa_ayunas >= 126) return 1;
    if (this.formulario.hba1c && this.formulario.hba1c >= 6.5) return 1;
    if (this.pacienteData?.ultimos_datos?.condiciones_metabolicas) {
      const cm = this.pacienteData.ultimos_datos.condiciones_metabolicas;
      if (cm.diabetes || cm.diabetesTipo2 || cm.dm2) return 1;
    }
    return 0;
  }

  private sugerirObjetivosPorPerfil(perfilId: number) {
    const sugerencias: Record<number, string[]> = {
      0: ['perder_peso', 'mejorar_lipidos'],
      1: ['control_glucosa', 'educacion_nutricional'],
      2: ['mejorar_lipidos', 'control_glucosa'],
      3: ['aumentar_energia', 'educacion_nutricional']
    };
    this.formulario.objetivos = sugerencias[perfilId] || [];

    const preferenciasPorPerfil: Record<number, string> = {
      0: 'equilibrada',
      1: 'baja_carbo',
      2: 'equilibrada',
      3: 'sin_restricciones'
    };
    
    const nuevaPreferencia = preferenciasPorPerfil[perfilId] || 'equilibrada';
    this.preferenciasControl.setValue(nuevaPreferencia);
    this.formulario.preferencias_alimentarias = nuevaPreferencia;
  }

  toggleObjetivo(objetivoId: string) {
    const index = this.formulario.objetivos.indexOf(objetivoId);
    if (index > -1) {
      this.formulario.objetivos.splice(index, 1);
    } else {
      this.formulario.objetivos.push(objetivoId);
    }
  }

  async guardarPlan() {
    if (!this.formulario.paciente_id) {
      await this.showToast('Seleccione un paciente primero', 'warning');
      return;
    }
    if (this.formulario.objetivos.length === 0) {
      await this.showToast('Seleccione al menos un objetivo', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({ 
      message: 'Guardando plan nutricional...', 
      spinner: 'crescent' 
    });
    await loading.present();

    try {
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      const caloriasDiarias = this.calcularCaloriasDiarias();
      const perfilNombre = this.perfilRecomendado || 'Normocalorico';

      const planData = {
        paciente_id: this.formulario.paciente_id,
        medico_id: userData.id,
        perfil_recomendado: perfilNombre,
        perfil_recomendado_id: this.perfilRecomendadoId,
        confianza_ia: this.confianzaPrediccion,
        respuesta_ia_completa: this.respuestaIA,
        datos_clinicos_base: {
          imc: this.formulario.imc,
          glucosa_ayunas: this.formulario.glucosa_ayunas,
          hba1c: this.formulario.hba1c
        },
        objetivos: this.formulario.objetivos,
        recomendaciones: this.formulario.recomendaciones,
        duracion_semanas: this.formulario.duracion_semanas,
        notas_adicionales: this.formulario.notas_adicionales,
        alergias: this.formulario.alergias.split(',').map((a: string) => a.trim()).filter((a: string) => a),
        preferencias: {
          actividad_fisica: this.formulario.actividad_fisica,
          alimentarias: this.formulario.preferencias_alimentarias,
          economicas: this.formulario.situacion_economica
        },
        fecha_creacion: new Date().toISOString().slice(0, 19).replace('T', ' '),
        estado: 'activo',
        validado_por_ia: this.respuestaIA !== null
      };

      const response: any = await firstValueFrom(this.http.post(
        `${environment.apiUrl}/nutricionapp-api/medico/plan-nutricional`,
        planData,
        { headers: new HttpHeaders({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }) }
      ));

      if (response?.error) throw new Error(response.mensaje);

      await loading.dismiss();
      await this.showToast('Plan nutricional creado exitosamente', 'success');

      const planGenerationInput = {
        patient_id: this.formulario.paciente_id,
        patient_name: this.formulario.nombre_paciente,
        profile_type: perfilNombre as 'Hipocalorico' | 'Control Glucemico' | 'Hipo-grasa' | 'Normocalorico',
        profile_id: this.perfilRecomendadoId !== null ? this.perfilRecomendadoId : 3,
        daily_calories: caloriasDiarias,
        allergies: this.formulario.alergias.split(',').map((a: string) => a.trim()).filter((a: string) => a),
        preferences: {
          dietary_style: this.formulario.preferencias_alimentarias as 'equilibrada' | 'baja_carbo' | 'sin_restricciones',
          economic_level: this.formulario.situacion_economica as 'baja' | 'media' | 'alta',
          activity_level: this.formulario.actividad_fisica as 'sedentario' | 'ligera' | 'moderada' | 'intensa'
        },
        recommendations: {
          main: this.formulario.recomendaciones,
          additional_notes: this.formulario.notas_adicionales
        }
      };

      this.router.navigate(['/medicoplanalimenticio'], {
        state: { 
          planData: planGenerationInput,
          planId: response.plan_id
        }
      });

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error guardando plan:', error);
      await this.showToast('Error al guardar el plan: ' + (error.message || 'Error desconocido'), 'danger');
    }
  }

  private calcularCaloriasDiarias(): number {
    const peso = this.formulario.peso || 70;
    const talla = this.formulario.talla ? this.formulario.talla / 100 : 1.70;
    const edad = this.pacienteData?.edad || 30;
    const sexo = this.pacienteData?.sexo === 'M' || this.pacienteData?.sexo === 'Masculino' ? 'M' : 'F';
    const actividad = this.formulario.actividad_fisica;

    let tmb = (10 * peso) + (6.25 * (talla * 100)) - (5 * edad);
    tmb += sexo === 'M' ? 5 : -161;

    const factores: Record<string, number> = {
      sedentario: 1.2,
      ligera: 1.375,
      moderada: 1.55,
      intensa: 1.725
    };

    return Math.round(tmb * (factores[actividad] || 1.2));
  }

  private calcularMacroPorcentaje(macro: 'protein' | 'carbs' | 'fat'): number {
    const distribuciones: Record<string, Record<string, number>> = {
      'Normocalorico': { protein: 25, carbs: 50, fat: 25 },
      'Control Glucemico': { protein: 30, carbs: 40, fat: 30 },
      'Hipocalorico': { protein: 35, carbs: 40, fat: 25 },
      'Hipo-grasa': { protein: 25, carbs: 55, fat: 20 }
    };
    
    const perfil = this.perfilRecomendado || 'Normocalorico';
    return distribuciones[perfil]?.[macro] || 25;
  }

  limpiarFormulario() {
    this.formulario = {
      paciente_id: '', nombre_paciente: '', imc: null, peso: null, talla: null,
      glucosa_ayunas: null, hba1c: null, cintura: null, colesterol_ldl: null,
      actividad_fisica: 'moderada', preferencias_alimentarias: 'equilibrada',
      situacion_economica: 'media', objetivos: [], recomendaciones: '',
      duracion_semanas: 4, notas_adicionales: '', alergias: ''
    };
    this.preferenciasControl.setValue('equilibrada');
    this.perfilRecomendado = null;
    this.perfilRecomendadoId = null;
    this.confianzaPrediccion = null;
    this.respuestaIA = null;
    this.errorML = null;
  }

  volver() {
    this.router.navigate(['/medicoverpacientes']);
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  toggleSubmenu(item: string) { this.submenuAbierto = this.submenuAbierto === item ? null : item; }
  
  navegarA(ruta: string) {
    const rutas: Record<string, string> = {
      'principaldoctor': '/medico',
      'medicoverpacientes': '/medicoverpacientes',
      'agregar-paciente': '/agregar-paciente',
      'buscar-paciente': '/buscar-paciente',
      'medicoplanesnutricionalescreados': '/medicoplanesnutricionalescreados',
      'medicoseguimientoclinico': '/medicoseguimientoclinico',
      'crear-plan': '/medicocrearplan',
      'medico-informes': '/medico-informes',
      'medico-configuracion': '/medico-configuracion'
    };
    this.router.navigate([rutas[ruta] || `/${ruta}`]);
    this.submenuAbierto = null;
  }
  
  async cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    await this.showToast('Sesion cerrada', 'success');
    this.router.navigate(['/principal'], { replaceUrl: true });
  }
  
  async showToast(message: string, color: 'primary'|'success'|'danger'|'warning' = 'primary') {
    await this.toastCtrl.create({ message, color, duration: 3000, position: 'bottom' }).then(t => t.present());
  }

  getPerfilInfo(identifier: string | number | null): { nombre: string; color: string; desc: string } | null {
    if (identifier == null) return null;
    if (typeof identifier === 'number') return this.perfilesDieteticos[identifier] || null;
    const entries = Object.entries(this.perfilesDieteticos);
    const found = entries.find(([_, info]) => info.nombre === identifier);
    return found ? found[1] : null;
  }

  getColorPorPerfil(nombrePerfil: string): string {
    const colores: Record<string, string> = {
      'Hipocalorico': 'warning',
      'Control Glucemico': 'danger',
      'Hipo-grasa': 'tertiary',
      'Normocalorico': 'success'
    };
    return colores[nombrePerfil] || 'primary';
  }

  esObjetivoSeleccionado(id: string): boolean {
    return this.formulario.objetivos.includes(id);
  }

  getProbabilidadesIA(): Array<{ nombre: string; prob: number }> {
    if (!this.respuestaIA?.probabilidades) return [];
    return Object.entries(this.respuestaIA.probabilidades)
      .map(([nombre, prob]: [string, number]) => ({ nombre, prob: prob * 100 }))
      .sort((a, b) => b.prob - a.prob);
  }

  toggleConfiguracion() {
    this.mostrarConfiguracion = !this.mostrarConfiguracion;
    if (this.mostrarConfiguracion && this.intercambios.length === 0) {
      this.cargarConfiguracion();
    }
  }

    async cargarConfiguracion() {
    this.cargandoConfig = true;
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      
      // Eliminamos cualquier barra final del apiUrl para evitar la doble barra //
      const baseUrl = environment.apiUrl.replace(/\/$/, ''); 
      
      const resInt: any = await firstValueFrom(
  this.http.get(
    `${baseUrl}/nutricionapp-api/medico/configuracion/intercambios`,
    { headers }
  )
);

const resDist: any = await firstValueFrom(
  this.http.get(
    `${baseUrl}/nutricionapp-api/medico/configuracion/distribucion`,
    { headers }
  )
);

      this.intercambios = resInt.data || [];
      this.distribucion = resDist.data || [];
    } catch (error) {
      console.error('Error cargando configuracion', error);
      await this.showToast('No se pudo cargar la configuracion', 'warning');
    } finally {
      this.cargandoConfig = false;
    }
  }

  async guardarConfiguracion() {
    this.cargandoConfig = true;
    try {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' });
      
      const baseUrl = environment.apiUrl.replace(/\/$/, '');
      
      await firstValueFrom(this.http.put(`${baseUrl}/nutricionapp-api/medico/configuracion/intercambios`, { datos: this.intercambios }, { headers }));
      await firstValueFrom(this.http.put(`${baseUrl}/nutricionapp-api/medico/configuracion/distribucion`, { datos: this.distribucion }, { headers }));
      
      await this.showToast('Configuracion guardada exitosamente', 'success');
      this.mostrarConfiguracion = false;
    } catch (error: any) {
      console.error('Error guardando configuracion', error);
      await this.showToast('Error al guardar la configuracion', 'danger');
    } finally {
      this.cargandoConfig = false;
    }
  }
}