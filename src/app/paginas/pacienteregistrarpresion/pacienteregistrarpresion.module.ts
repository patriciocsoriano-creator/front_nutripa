import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PacienteregistrarpresionPageRoutingModule } from './pacienteregistrarpresion-routing.module';

import { PacienteregistrarpresionPage } from './pacienteregistrarpresion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PacienteregistrarpresionPageRoutingModule
  ],
  declarations: [PacienteregistrarpresionPage]
})
export class PacienteregistrarpresionPageModule {}
