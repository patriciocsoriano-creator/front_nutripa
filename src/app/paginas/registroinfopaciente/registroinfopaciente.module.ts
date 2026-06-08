import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RegistroinfopacientePageRoutingModule } from './registroinfopaciente-routing.module';

import { RegistroinfopacientePage } from './registroinfopaciente.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RegistroinfopacientePageRoutingModule
  ],
  declarations: [RegistroinfopacientePage]
})
export class RegistroinfopacientePageModule {}
