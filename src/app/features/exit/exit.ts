import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-exit',
  imports: [],
  templateUrl: './exit.html',
  styleUrl: './exit.scss',
})
export class Exit implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly pageData = signal<any>(null);

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.pageData.set(data);
    });
  }
}
