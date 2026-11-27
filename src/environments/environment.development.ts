export const environment: {
  readonly production: boolean;
  readonly contentMode: 'static' | 'api';
  readonly apiBaseUrl: string;
  readonly recaptchaSiteKey: string;
} = {
  production: false,
  contentMode: 'api',
  apiBaseUrl: '',
  recaptchaSiteKey: ''
};
