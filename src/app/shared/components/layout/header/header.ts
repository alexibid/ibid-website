import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LangSelector } from '../lang-selector/lang-selector';
import { Settings } from '../settings/settings';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, LangSelector, Settings],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {}
