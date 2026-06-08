import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { PacienteregistrarglucosaPageRoutingModule } from './pacienteregistrarglucosa-routing.module';

import { PacienteregistrarglucosaPage } from './pacienteregistrarglucosa.page';

const routes: Routes = [
  { path: '', component: PacienteregistrarglucosaPage }
];


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    PacienteregistrarglucosaPageRoutingModule
  ],
  declarations: [PacienteregistrarglucosaPage]
})
export class PacienteregistrarglucosaPageModule {}
