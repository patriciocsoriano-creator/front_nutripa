import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminActividadUsuariosPageRoutingModule } from './admin-actividad-usuarios-routing.module';

import { AdminActividadUsuariosPage } from './admin-actividad-usuarios.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminActividadUsuariosPageRoutingModule
  ],
  declarations: [AdminActividadUsuariosPage]
})
export class AdminActividadUsuariosPageModule {}
