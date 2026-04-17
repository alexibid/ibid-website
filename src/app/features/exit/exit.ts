import { Component, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cover } from '../../shared/components/cover/cover';
import { PageType } from '../../core/models/page-type.enum';
import { BasePage } from '../../core/base/base-page';

@Component({
  selector: 'app-exit',
  standalone: true,
  imports: [CommonModule, Cover],
  templateUrl: './exit.html',
  styleUrl: './exit.scss',
})
export class Exit extends BasePage implements OnDestroy {
  constructor() {
    super();
    effect(() => {
      const structuralOrder = ['contact-form', 'about', 'back-cover'];
      const sortFn = (a: any, b: any) => {
        const locA = a['metadata']?.['location'];
        const locB = b['metadata']?.['location'];
        const orderA = structuralOrder.indexOf(locA) !== -1 ? structuralOrder.indexOf(locA) : 99;
        const orderB = structuralOrder.indexOf(locB) !== -1 ? structuralOrder.indexOf(locB) : 99;
        return orderA - orderB;
      };
      this.loadAllSections(PageType.Exit, this.i18n.currentLangCode(), sortFn);
    });
  }

  public onSubmit(event: Event) {
    event.preventDefault();
    this.hostEl.scrollTo({ left: this.hostEl.scrollWidth, behavior: 'smooth' });
  }
}
