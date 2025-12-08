import { Routes } from '@angular/router';
import { ItemsComponent } from './items/items.component';
import { HomeComponent } from './home/home.component';
import { StudentListComponent } from './student-list/student-list.component';
import { EditStudentComponent } from './edit-student/edit-student.component';
import { CourseListComponent } from './course-list/course-list.component';
import { CourseAddComponent } from './course-add/course-add.component';
import { StudentEnrollComponent } from './student-enroll/student-enroll.component';
import { MarksCardComponent } from './marks-card/marks-card.component';
import { CourseUpdateComponent } from './course-update/course-update.component';
import { StudentPerformanceComponent } from './student-performance/student-performance.component';
import { OverviewComponent } from './overview/overview.component';
import { NotificationsComponent } from './notifications/notifications.component';
import { EmailQueueComponent } from './email-queue/email-queue.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { StudentManagementComponent } from './student-management/student-management.component';

export const routes: Routes = [
  {
    path: 'user-management',
    component: UserManagementComponent
  },
  {
    path: 'student-management',
    component: StudentManagementComponent
  },
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full'
  },
  {
    path: 'overview',
    component: OverviewComponent
  },
  {
    path: 'home',
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
    path: 'course-list',
    component: CourseListComponent
  },
  {
    path: 'course-add',
    component: CourseAddComponent
  },
  {
    path: 'course-update/:id',     
    component: CourseUpdateComponent
  },
  {
    path: 'student-enroll/:id',
    component: StudentEnrollComponent
  },
  {
    path: 'edit-student/:id',
    component: EditStudentComponent
  },
  {
    path: 'marks-card/:id',
    component: MarksCardComponent
  },
  {
    path: 'student-performance',
    component: StudentPerformanceComponent
  },
  {
    path: 'notifications',
    component: NotificationsComponent
  },
  {
    path: 'email-queue',
    component: EmailQueueComponent
  }
];
