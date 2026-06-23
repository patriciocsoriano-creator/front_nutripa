import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicoAgregarPacientePageRoutingModule } from './medico-agregar-paciente-routing.module';

import { MedicoAgregarPacientePage } from './medico-agregar-paciente.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    MedicoAgregarPacientePageRoutingModule
  ],
  declarations: [MedicoAgregarPacientePage]
})
export class MedicoAgregarPacientePageModule {}
