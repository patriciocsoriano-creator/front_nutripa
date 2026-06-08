import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicoseguimientoclinicoPageRoutingModule } from './medicoseguimientoclinico-routing.module';

import { MedicoseguimientoclinicoPage } from './medicoseguimientoclinico.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    MedicoseguimientoclinicoPageRoutingModule
  ],
  declarations: [MedicoseguimientoclinicoPage]
})
export class MedicoseguimientoclinicoPageModule {}
