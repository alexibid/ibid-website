import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return new Promise<string>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error !== null) {
        reject(error);
        return;
      }
      resolve(`scrypt$${salt.toString('base64')}$${derivedKey.toString('base64')}`);
    });
  });
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (password === '' || typeof storedHash !== 'string') {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const saltPart = parts[1];
  const hashPart = parts[2];
  if (saltPart === undefined || hashPart === undefined) {
    return false;
  }

  let salt: Buffer;
  let expectedKey: Buffer;
  try {
    salt = Buffer.from(saltPart, 'base64');
    expectedKey = Buffer.from(hashPart, 'base64');
  } catch {
    return false;
  }

  if (salt.length === 0 || expectedKey.length !== KEY_LENGTH) {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error !== null) {
        resolve(false);
        return;
      }
      resolve(timingSafeEqual(derivedKey, expectedKey));
    });
  });
}
