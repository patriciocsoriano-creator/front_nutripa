import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PacientehistorialmedicoPageRoutingModule } from './pacientehistorialmedico-routing.module';

import { PacientehistorialmedicoPage } from './pacientehistorialmedico.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PacientehistorialmedicoPageRoutingModule
  ],
  declarations: [PacientehistorialmedicoPage]
})
export class PacientehistorialmedicoPageModule {}
