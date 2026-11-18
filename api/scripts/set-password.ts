import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../src/auth/password-hash.js';

const apiRoot = fileURLToPath(new URL('../', import.meta.url));
const envPath = `${apiRoot}.env`;
const examplePath = `${apiRoot}.env.example`;

async function main(): Promise<void> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  const password = await readline.question('Enter new admin password: ');
  readline.close();

  if (password.trim() === '') {
    throw new Error('Password cannot be empty');
  }

  const hash = await hashPassword(password);
  let content = existsSync(envPath)
    ? readFileSync(envPath, 'utf8')
    : readFileSync(examplePath, 'utf8');

  if (content.includes('ADMIN_PASSWORD_HASH=')) {
    content = content.replace(/^ADMIN_PASSWORD_HASH=.*$/m, `ADMIN_PASSWORD_HASH=${hash}`);
  } else {
    content += `\nADMIN_PASSWORD_HASH=${hash}\n`;
  }

  writeFileSync(envPath, content, 'utf8');
}

void main();
