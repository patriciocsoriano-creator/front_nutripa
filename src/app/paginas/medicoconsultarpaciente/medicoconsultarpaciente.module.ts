import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicoconsultarpacientePageRoutingModule } from './medicoconsultarpaciente-routing.module';

import { MedicoconsultarpacientePage } from './medicoconsultarpaciente.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MedicoconsultarpacientePageRoutingModule
  ],
  declarations: [MedicoconsultarpacientePage]
})
export class MedicoconsultarpacientePageModule {}
