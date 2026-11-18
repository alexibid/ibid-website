import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { AdminFacade } from '../../../../application/facades/admin.facade';

@Component({
  selector: 'website-admin-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UpperCasePipe, ScrollingModule],
  templateUrl: './admin-list.html',
  styleUrl: './admin-list.scss',
})
export default class AdminList implements OnInit {
  public readonly facade = inject(AdminFacade);
  private readonly route = inject(ActivatedRoute);

  async ngOnInit() {
    this.facade.lang.set(this.route.snapshot.paramMap.get('lang') || '');
    await this.facade.loadUrls();
  }
}
