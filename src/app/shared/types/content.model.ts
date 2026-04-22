import { Observable } from 'rxjs';

export interface Language {
  code: string;
  name: string;
}

export interface ContentType {
  code: string;
  name: string;
}

export interface Config {
  languages: Language[];
  types: ContentType[];
}

export interface ContentEntry {
  id: number;
  type: string;
  location: string;
  lang: string;
  slug: string;
  title: string;
  subtitle?: string;
  content: (string | any)[];
}
