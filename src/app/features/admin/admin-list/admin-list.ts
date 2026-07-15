import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { CmsUrl } from '../../../shared/types/cms.interface';
import { PageType } from '../../../shared/types/page-type.enum';
import { locationToInt } from '../../../shared/utils/location.utils';

@Component({
  selector: 'app-admin-list',
  standalone: true,
  imports: [RouterLink, UpperCasePipe],
  templateUrl: './admin-list.html',
  styleUrl: './admin-list.scss',
})
export default class AdminList implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly route = inject(ActivatedRoute);

  public lang = signal<string>('');

  public isLoading = signal(true);
  private allUrls = signal<CmsUrl[]>([]);

  private filteredUrls = computed(() => 
    this.allUrls().filter(u => u.lang === this.lang())
  );

  public homeUrls = computed(() => 
    this.filteredUrls()
      .filter(u => u.expand?.page_id?.type === PageType.Home)
      .sort((a, b) => locationToInt(a.expand?.page_id?.metadata?.location) - locationToInt(b.expand?.page_id?.metadata?.location))
  );

  public chapterUrls = computed(() => 
    this.filteredUrls()
      .filter(u => u.expand?.page_id?.type === PageType.Chapter)
      .sort((a, b) => locationToInt(a.expand?.page_id?.metadata?.location) - locationToInt(b.expand?.page_id?.metadata?.location))
  );

  public exitUrls = computed(() => 
    this.filteredUrls()
      .filter(u => u.expand?.page_id?.type === PageType.Exit)
      .sort((a, b) => locationToInt(a.expand?.page_id?.metadata?.location) - locationToInt(b.expand?.page_id?.metadata?.location))
  );

  async ngOnInit() {
    this.lang.set(this.route.snapshot.paramMap.get('lang') || '');
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const records = await this.adminService.getUrls();
      this.allUrls.set(records);
    } catch (err) {
      console.error('Error fetching admin list data:', err);
    } finally {
      this.isLoading.set(false);
    }
  }
}
