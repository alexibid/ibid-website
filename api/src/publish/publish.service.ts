import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { isRecord } from '../common/type-guards.util';
import { ConfigService } from '../config/config.service';

export interface PublishResult {
  readonly published: true;
  readonly site: string;
}

interface PublishStep {
  readonly label: string;
  readonly command: string;
  readonly args: readonly string[];
}

const HOSTING_SITE = 'ibid-website';
const FIREBASE_PROJECT = 'ibid-32cbe';
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;
const FAILURE_TAIL_LENGTH = 800;

const PUBLISH_STEPS: readonly PublishStep[] = [
  {
    label: 'Build',
    command: 'npx',
    args: ['nx', 'build', 'ibid-website', '--configuration=production'],
  },
  {
    label: 'Deploy',
    command: 'firebase',
    args: [
      'deploy',
      '--only',
      `hosting:${HOSTING_SITE}`,
      '--project',
      FIREBASE_PROJECT,
      '--non-interactive',
    ],
  },
];

const runFile = promisify(execFile);

@Injectable()
export class PublishService {
  private isPublishing = false;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async publish(): Promise<PublishResult> {
    if (this.isPublishing) {
      throw new ConflictException('A publish is already running.');
    }
    this.isPublishing = true;
    try {
      await this.runSteps(this.resolveMonorepoRoot());
      return { published: true, site: HOSTING_SITE };
    } finally {
      this.isPublishing = false;
    }
  }

  private resolveMonorepoRoot(): string {
    const monorepoRoot = resolve(this.config.workspaceRoot, '../..');
    const hasWorkspace =
      existsSync(resolve(monorepoRoot, 'nx.json')) &&
      existsSync(resolve(monorepoRoot, 'firebase.json'));
    if (!hasWorkspace) {
      throw new InternalServerErrorException(
        'Publish needs the API running on the host (npm run dev in apps/ibid-website/api), not in Docker.',
      );
    }
    return monorepoRoot;
  }

  private async runSteps(cwd: string): Promise<void> {
    for (const step of PUBLISH_STEPS) {
      await this.runStep(step, cwd);
    }
  }

  private async runStep(step: PublishStep, cwd: string): Promise<void> {
    try {
      await runFile(step.command, [...step.args], { cwd, maxBuffer: MAX_OUTPUT_BYTES });
    } catch (error) {
      throw new InternalServerErrorException(`${step.label} failed: ${describeFailure(error)}`);
    }
  }
}

function describeFailure(error: unknown): string {
  const output = [readText(error, 'stderr'), readText(error, 'stdout'), readText(error, 'message')]
    .find((text) => text.length > 0);
  return (output ?? 'unknown error').slice(-FAILURE_TAIL_LENGTH);
}

function readText(error: unknown, key: string): string {
  if (!isRecord(error)) {
    return '';
  }
  const value = error[key];
  return typeof value === 'string' ? value.trim() : '';
}
