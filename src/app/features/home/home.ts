import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly route = inject(ActivatedRoute);

  // Armazenamos os dados da capa aqui
  protected readonly pageData = signal<any>(null);

  ngOnInit(): void {
    // Escuta mudanças nos dados da rota (injetados dinamicamente via CmsRouterService)
    this.route.data.subscribe(data => {
      this.pageData.set(data);
      
      if (data['scrollTo'] === 'indice') {
        // Exemplo de como poderia acionar um scroll
        // window.scrollTo(...) ou acionar noutro service
        console.log('Scroll to indice requested by router data!');
      }
    });
  }
}
