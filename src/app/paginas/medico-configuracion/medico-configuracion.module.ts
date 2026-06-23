import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicoConfiguracionPageRoutingModule } from './medico-configuracion-routing.module';

import { MedicoConfiguracionPage } from './medico-configuracion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    MedicoConfiguracionPageRoutingModule
  ],
  declarations: [MedicoConfiguracionPage]
})
export class MedicoConfiguracionPageModule {}
