import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private router = inject(Router);
  public history = signal<readonly string[]>([]);
  public previousUrl = signal<string | null>(null);
  public currentUrl = signal<string | null>(null);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const navEvent = event as NavigationEnd;
      const url = navEvent.urlAfterRedirects;
      const currentHistory = this.history();
      
      if (this.currentUrl() !== url) {
        this.previousUrl.set(this.currentUrl());
        this.currentUrl.set(url);
        
        const newHistory = [...currentHistory, url];
        this.history.set(newHistory);
      }
    });
  }

  public back(): void {
    const history = this.history();
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const targetUrl = newHistory.pop();
      
      if (targetUrl) {
        this.history.set([...newHistory, targetUrl]);
        this.router.navigateByUrl(targetUrl);
      }
    } else {
      this.router.navigate(['/']);
    }
  }
}
