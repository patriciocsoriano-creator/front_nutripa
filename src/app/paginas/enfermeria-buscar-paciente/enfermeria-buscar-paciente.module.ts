import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EnfermeriaBuscarPacientePageRoutingModule } from './enfermeria-buscar-paciente-routing.module';

import { EnfermeriaBuscarPacientePage } from './enfermeria-buscar-paciente.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EnfermeriaBuscarPacientePageRoutingModule
  ],
  declarations: [EnfermeriaBuscarPacientePage]
})
export class EnfermeriaBuscarPacientePageModule {}
