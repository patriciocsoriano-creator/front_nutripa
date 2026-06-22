import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminVerPacientesPageRoutingModule } from './admin-ver-pacientes-routing.module';

import { AdminVerPacientesPage } from './admin-ver-pacientes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminVerPacientesPageRoutingModule
  ],
  declarations: [AdminVerPacientesPage]
})
export class AdminVerPacientesPageModule {}
