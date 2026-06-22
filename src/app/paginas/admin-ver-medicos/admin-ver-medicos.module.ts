import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminVerMedicosPageRoutingModule } from './admin-ver-medicos-routing.module';

import { AdminVerMedicosPage } from './admin-ver-medicos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminVerMedicosPageRoutingModule
  ],
  declarations: [AdminVerMedicosPage]
})
export class AdminVerMedicosPageModule {}
