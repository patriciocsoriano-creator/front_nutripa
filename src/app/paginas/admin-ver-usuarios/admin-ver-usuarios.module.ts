import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminVerUsuariosPageRoutingModule } from './admin-ver-usuarios-routing.module';

import { AdminVerUsuariosPage } from './admin-ver-usuarios.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminVerUsuariosPageRoutingModule
  ],
  declarations: [AdminVerUsuariosPage]
})
export class AdminVerUsuariosPageModule {}
