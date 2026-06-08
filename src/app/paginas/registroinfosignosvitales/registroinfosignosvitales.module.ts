import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RegistroinfosignosvitalesPageRoutingModule } from './registroinfosignosvitales-routing.module';

import { RegistroinfosignosvitalesPage } from './registroinfosignosvitales.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RegistroinfosignosvitalesPageRoutingModule
  ],
  declarations: [RegistroinfosignosvitalesPage]
})
export class RegistroinfosignosvitalesPageModule {}
