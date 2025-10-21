import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { ItemsComponent } from './items/items.component';
import { HomeComponent } from './home/home.component';
import { StudentListComponent } from './student-list/student-list.component';
import { EditStudentComponent } from './edit-student/edit-student.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'items',
    component: ItemsComponent
  },
  {
    path: 'student-list',
    component: StudentListComponent
  },
  {
    path: 'edit-student/:id',
    component: EditStudentComponent
  }
];
