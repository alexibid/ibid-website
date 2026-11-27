export interface AntiSpamTokenPort {
  init(): void;
  execute(action: string): Promise<string>;
}
