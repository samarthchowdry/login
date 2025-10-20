import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  username: string = '';
  password: string = '';

  onLogin() {
    if (this.username === 'admin' && this.password === '1234') {
      alert('Login successful!');
    } else {
      alert('Invalid credentials');
    }
  }
}

