import { Component, inject, OnInit } from '@angular/core';
import { UpperCasePipe, TitleCasePipe } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { UiErrorService } from './core/services/ui-error.service';
import { GlobalAlertComponent } from './shared/components/ui/global-alert/global-alert';
import { MetaService } from './core/services/meta.service';
import { PageType } from './shared/types/page-type.enum';
import { BookService } from './core/services/book.service';
import { PageTurn } from './shared/components/layout/page-turn/page-turn';
import { LangSelector } from './shared/components/layout/lang-selector/lang-selector';
import { Settings } from './shared/components/layout/settings/settings';
import { GlobalStateService } from './core/services/global-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, GlobalAlertComponent, PageTurn, LangSelector, Settings, UpperCasePipe, TitleCasePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected errorService = inject(UiErrorService);
  private appMetaService = inject(MetaService);
  public bookService = inject(BookService);
  public globalState = inject(GlobalStateService);
  
  public readonly PageType = PageType;

  constructor() {
    this.appMetaService.init();
  }

  ngOnInit() {
  }
}
