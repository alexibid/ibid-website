import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-chapter',
  imports: [],
  templateUrl: './chapter.html',
  styleUrl: './chapter.scss',
})
export class Chapter implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly pageData = signal<any>(null);

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.pageData.set(data);
    });
  }
}
