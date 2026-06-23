import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicoBuscarPacientePageRoutingModule } from './medico-buscar-paciente-routing.module';

import { MedicoBuscarPacientePage } from './medico-buscar-paciente.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MedicoBuscarPacientePageRoutingModule
  ],
  declarations: [MedicoBuscarPacientePage]
})
export class MedicoBuscarPacientePageModule {}
