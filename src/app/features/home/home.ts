import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private route = inject(ActivatedRoute);

  // Armazenamos os dados da capa aqui
  protected readonly pageData = signal<null>(null);

  ngOnInit(): void {
    // Escuta mudanças no slug (caso navegue entre /inicio, /cover, etc)
    this.route.url.subscribe(url => {
      const slug = url.length > 0 ? url[0].path : '';
    });
  }
}
