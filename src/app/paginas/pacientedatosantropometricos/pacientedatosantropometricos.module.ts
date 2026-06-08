import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { PacientedatosantropometricosPageRoutingModule } from './pacientedatosantropometricos-routing.module';

import { PacientedatosantropometricosPage } from './pacientedatosantropometricos.page';

const routes: Routes = [
  {
    path: '',
    component: PacientedatosantropometricosPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    PacientedatosantropometricosPageRoutingModule
  ],
  declarations: [PacientedatosantropometricosPage]
})
export class PacientedatosantropometricosPageModule {}
