import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminConfigBackupPage } from './admin-config-backup.page';

const routes: Routes = [
  {
    path: '',
    component: AdminConfigBackupPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminConfigBackupPageRoutingModule {}
