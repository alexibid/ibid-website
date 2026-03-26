import { Injectable } from '@angular/core';
import PocketBase from 'pocketbase';

@Injectable({
  providedIn: 'root'
})
export class PocketbaseService {
  public readonly pb: PocketBase;

  constructor() {
    // EndPoint for Local Development
    this.pb = new PocketBase('http://127.0.0.1:8090');
    
    // Disable request auto cancellation since it can conflict in SSR processes
    // where multiple parallel requests are initiated
    this.pb.autoCancellation(false);
  }
}
