import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicoverpacientesPageRoutingModule } from './medicoverpacientes-routing.module';

import { MedicoverpacientesPage } from './medicoverpacientes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MedicoverpacientesPageRoutingModule
  ],
  declarations: [MedicoverpacientesPage]
})
export class MedicoverpacientesPageModule {}
