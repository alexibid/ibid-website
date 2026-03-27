import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../services/i18n.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private readonly i18nService = inject(I18nService);

  transform(path: string): string {
    const keys = path.split('.');
    let currentObject: any = this.i18nService.ui();

    for (const key of keys) {
      if (currentObject && typeof currentObject === 'object' && key in currentObject) {
        currentObject = currentObject[key];
      } else {
        return path;
      }
    }

    return currentObject;
  }
}
