// src/app/paginas/medicocrearplan/medicocrearplan.page.ts
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { MlService, PrediccionResponse } from 'src/app/services/ml-service';  // ✅ Verificar ruta
import { firstValueFrom } from 'rxjs';

// 👤 Interfaces para tipado seguro
interface PacienteData {
  id?: string;  // ✅ HACER OPCIONAL para evitar error TS2322
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

// ✅ AGREGAR DECORADOR @Component (CRÍTICO para evitar NG6001)
@Component({
  selector: 'app-medicocrearplan',
  templateUrl: './medicocrearplan.page.html',
  styleUrls: ['./medicocrearplan.page.scss'],
  standalone: false,
})
export class MedicocrearplanPage implements OnInit {

  // 👤 UI State
  sidebarOpen = false;
  submenuAbierto: string | null = null;
  nombreDoctor: string = 'Dr. Usuario';
  especialidad: string = 'Especialista';

  // 📋 Datos del paciente
  pacienteId: string | null = null;
  pacienteData: PacienteData | null = null;
  cargandoPaciente = false;

  // 🧠 Predicción de la red neuronal
  perfilRecomendado: string | null = null;
  perfilRecomendadoId: number | null = null;
  confianzaPrediccion: number | null = null;
  cargandoML = false;
  errorML: string | null = null;
  respuestaIA: PrediccionResponse | null = null;

  // 📝 Formulario del plan
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
    preferencias_alimentarias: 'occidental',
    situacion_economica: 'media',
    objetivos: [],
    recomendaciones: '',
    duracion_semanas: 4,
    notas_adicionales: '',
    alergias: ''
  };

  // 🎯 Opciones del formulario
  objetivosDisponibles = [
    { id: 'control_glucosa', label: 'Control de glucosa', icon: 'flask-outline' },
    { id: 'perder_peso', label: 'Pérdida de peso', icon: 'scale-outline' },
    { id: 'mejorar_lipidos', label: 'Mejorar lípidos', icon: 'heart-outline' },
    { id: 'aumentar_energia', label: 'Aumentar energía', icon: 'flash-outline' },
    { id: 'educacion_nutricional', label: 'Educación nutricional', icon: 'school-outline' }
  ];

  preferenciasAlimentarias = [
    { id: 'occidental', label: 'Occidental tradicional' },
    { id: 'mediterranea', label: 'Mediterránea' },
    { id: 'baja_carbo', label: 'Baja en carbohidratos' },
    { id: 'vegetariana', label: 'Vegetariana' },
    { id: 'sin_restricciones', label: 'Sin restricciones' }
  ];

  situacionesEconomicas = [
    { id: 'baja', label: 'Recursos limitados' },
    { id: 'media', label: 'Recursos moderados' },
    { id: 'alta', label: 'Recursos amplios' }
  ];

  // ✅ Perfiles dietéticos con tipado seguro
  perfilesDieteticos: Record<number, { nombre: string; color: string; desc: string }> = {
    0: { nombre: 'Hipocalórico', color: 'warning', desc: 'Enfocado en déficit calórico controlado para pérdida de peso' },
    1: { nombre: 'Control Glucémico', color: 'danger', desc: 'Control estricto de carbohidratos y estabilidad glucémica' },
    2: { nombre: 'Hipo-grasa', color: 'tertiary', desc: 'Reducción de grasas saturadas y colesterol para salud cardiovascular' },
    3: { nombre: 'Normocalórico', color: 'success', desc: 'Mantenimiento con equilibrio nutricional para peso estable' }
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private http: HttpClient,
    private mlService: MlService,  // ✅ Ahora funcionará si MlService tiene @Injectable
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    this.cargarDatosUsuario();
    await this.inicializarFormulario();
  }

  private cargarDatosUsuario() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.nombreDoctor = `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Dr. Usuario';
        this.especialidad = user.rol || user.especialidad || 'Especialista';
      } catch (e) { console.warn('⚠️ Error parseando usuario'); }
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

    // ✅ Usar asignación directa sin spread para evitar errores de tipado
    if (data.edad !== undefined) this.pacienteData = { ...this.pacienteData, edad: data.edad };
    if (data.fechaNacimiento !== undefined) this.pacienteData = { ...this.pacienteData, fechaNacimiento: data.fechaNacimiento };
    if (data.sexo !== undefined) this.pacienteData = { ...this.pacienteData, sexo: data.sexo };

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
      const response: any = await this.http.get(
        `${environment.apiUrl}/nutricionapp-api/medico/paciente/${this.pacienteId}/detalle`,
        { headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` }) }
      ).toPromise();

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
      console.warn('⚠️ No se pudo cargar datos del paciente desde API');
      await this.showToast('Usando datos básicos del paciente', 'warning');
    }
  }

  async ejecutarPrediccionML() {
  this.cargandoML = true;
  this.errorML = null;

  try {
    // 🔍 Debug: Ver qué datos tenemos disponibles
    console.log('🔍 [DEBUG] pacienteData completa:', this.pacienteData);
    console.log('🔍 [DEBUG] formulario.imc:', this.formulario.imc);

    // ✅ Preparar datos clínicos INCLUYENDO edad si está disponible
    const datosClinicos = {
      imc: this.formulario.imc,
      fechaNacimiento: this.pacienteData?.fechaNacimiento || null,
      edad: this.pacienteData?.edad || null,  // ✅ PASAR EDAD DIRECTA
      sexo: this.pacienteData?.sexo || null
    };

    console.log('📤 [Componente] Enviando a IA:', datosClinicos);

    // Validar datos antes de enviar
    const validacion = this.mlService.dataUtilService.validarDatosParaInferencia(datosClinicos);
    if (!validacion.valido) {
      throw new Error(`Datos inválidos: ${validacion.errores.join(', ')}`);
    }
    if (validacion.advertencias.length > 0) {
      console.warn('⚠️ Advertencias:', validacion.advertencias);
      for (const advertencia of validacion.advertencias) {
        await this.showToast(advertencia, 'warning');
      }
    }

    // Llamar al servicio de inferencia
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
        await this.showToast(
          `✅ Perfil: ${this.perfilRecomendado} (${confianzaPorcentaje}% confianza)`, 
          'success'
        );
      }

    } catch (error: any) {
      console.error('❌ Error en predicción ML:', error);
      this.errorML = error.message || 'No se pudo conectar con el servicio de IA.';
      
      // ✅ VERIFICAR NULL antes de usar .includes() (evita TS2531)
      if (this.errorML && (this.errorML.includes('Datos inválidos') || this.errorML.includes('IMC'))) {
        await this.showToast(this.errorML, 'danger');
      } else {
        await this.showToast('Predicción IA no disponible. Continuando con formulario manual.', 'warning');
      }
    } finally {
      this.cargandoML = false;
    }
  }

  private sugerirObjetivosPorPerfil(perfilId: number) {
    const sugerencias: Record<number, string[]> = {
      0: ['perder_peso', 'mejorar_lipidos'],
      1: ['control_glucosa', 'educacion_nutricional'],
      2: ['mejorar_lipidos', 'control_glucosa'],
      3: ['aumentar_energia', 'educacion_nutricional']
    };
    this.formulario.objetivos = sugerencias[perfilId] || [];
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
    await this.showToast('⚠️ Seleccione un paciente primero', 'warning');
    return;
  }
  if (this.formulario.objetivos.length === 0) {
    await this.showToast('⚠️ Seleccione al menos un objetivo', 'warning');
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
    
    // Preparar datos para guardar el plan base
    const planData = {
      paciente_id: this.formulario.paciente_id,
      medico_id: userData.id,
      perfil_recomendado: this.perfilRecomendado,
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
      fecha_creacion: new Date().toISOString(),
      estado: 'activo',
      validado_por_ia: this.respuestaIA !== null
    };

    // 1️⃣ Guardar plan base en API
    const response: any = await this.http.post(
      `${environment.apiUrl}/nutricionapp-api/medico/plan-nutricional`,
      planData,
      { headers: new HttpHeaders({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }) }
    ).toPromise();

    if (response?.error) throw new Error(response.mensaje);

    await loading.dismiss();
    await this.showToast('✅ Plan nutricional creado exitosamente', 'success');

    // 2️⃣ Preparar datos para generar el plan detallado en medicoplanalimenticio
    const planGenerationInput = {
      patient_id: this.formulario.paciente_id,
      patient_name: this.formulario.nombre_paciente,
      profile_type: this.perfilRecomendado as 'Hipocalorico' | 'Control Glucemico' | 'Hipo-grasa' | 'Normocalorico',
      profile_id: this.perfilRecomendadoId!,
      daily_calories: this.calcularCaloriasDiarias(), // 👈 Implementa esta función según tus reglas
      macros: { 
        protein: this.calcularMacroPorcentaje('protein'), 
        carbs: this.calcularMacroPorcentaje('carbs'), 
        fat: this.calcularMacroPorcentaje('fat') 
      },
      allergies: this.formulario.alergias.split(',').map((a: string) => a.trim()).filter((a: string) => a),
      preferences: {
        dietary_style: this.formulario.preferencias_alimentarias as 'occidental' | 'mediterranea' | 'baja_carbo' | 'vegetariana',
        economic_level: this.formulario.situacion_economica as 'baja' | 'media' | 'alta',
        activity_level: this.formulario.actividad_fisica as 'sedentario' | 'ligera' | 'moderada' | 'intensa'
      },
      recommendations: {
        main: this.formulario.recomendaciones,
        additional_notes: this.formulario.notas_adicionales
      }
    };

    // 3️⃣ Redirigir a medicoplanalimenticio con los datos del plan
    this.router.navigate(['/medicoplanalimenticio'], {
      state: { 
        planData: planGenerationInput,
        planId: response.plan_id // ID del plan recién creado
      }
    });

  } catch (error: any) {
    await loading.dismiss();
    console.error('❌ Error guardando plan:', error);
    await this.showToast('Error al guardar el plan: ' + (error.message || 'Error desconocido'), 'danger');
  }
}

// 🔢 Helpers para calcular calorías y macros (ajusta según tus reglas clínicas)
private calcularCaloriasDiarias(): number {
  // Fórmula simplificada: Mifflin-St Jeor o Harris-Benedict
  // Aquí puedes usar los datos del paciente para calcular TMB + factor de actividad
  const peso = this.formulario.peso || 70;
  const talla = this.formulario.talla ? this.formulario.talla / 100 : 1.70; // cm → m
  const edad = this.pacienteData?.edad || 30;
  const sexo = this.pacienteData?.sexo === 'M' ? 'M' : 'F';
  const actividad = this.formulario.actividad_fisica;

  // Mifflin-St Jeor
  let tmb = (10 * peso) + (6.25 * talla * 100) - (5 * edad);
  tmb += sexo === 'M' ? 5 : -161;

  // Factor de actividad
  const factores: Record<string, number> = {
    sedentario: 1.2,
    ligera: 1.375,
    moderada: 1.55,
    intensa: 1.725
  };

  return Math.round(tmb * (factores[actividad] || 1.2));
}

private calcularMacroPorcentaje(macro: 'protein' | 'carbs' | 'fat'): number {
  // Distribución por perfil recomendado
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
      paciente_id: '',
      nombre_paciente: '',
      imc: null, peso: null, talla: null,
      glucosa_ayunas: null, hba1c: null, cintura: null, colesterol_ldl: null,
      actividad_fisica: 'moderada',
      preferencias_alimentarias: 'occidental',
      situacion_economica: 'media',
      objetivos: [],
      recomendaciones: '',
      duracion_semanas: 4,
      notas_adicionales: '',
      alergias: ''
    };
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
      'medicoinformes': '/medicoinformes',
      
      'configuracion': '/configuracion-medico'
    };
    this.router.navigate([rutas[ruta] || `/${ruta}`]);
    this.submenuAbierto = null;
  }
  
  async cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    await this.showToast('Sesión cerrada', 'success');
    this.router.navigate(['/login'], { replaceUrl: true });
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
      'Hipocalórico': 'warning',
      'Control Glucémico': 'danger',
      'Hipo-grasa': 'tertiary',
      'Normocalórico': 'success'
    };
    return colores[nombrePerfil] || 'primary';
  }

  esObjetivoSeleccionado(id: string): boolean {
    return this.formulario.objetivos.includes(id);
  }

  // ✅ TIPAR EXPLÍCITAMENTE para evitar TS18046
  getProbabilidadesIA(): Array<{ nombre: string; prob: number }> {
    if (!this.respuestaIA?.probabilidades) return [];
    
    return Object.entries(this.respuestaIA.probabilidades)
      // ✅ Tipar como [string, number] para que TypeScript sepa que prob es number
      .map(([nombre, prob]: [string, number]) => ({ nombre, prob: prob * 100 }))
      .sort((a, b) => b.prob - a.prob);
  }
}