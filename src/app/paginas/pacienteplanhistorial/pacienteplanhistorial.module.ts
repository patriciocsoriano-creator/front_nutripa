import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { PacienteplanhistorialPage } from './pacienteplanhistorial.page';

const routes: Routes = [
  {
    path: '',
    component: PacienteplanhistorialPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [PacienteplanhistorialPage]
})
export class PacienteplanhistorialPageModule {}