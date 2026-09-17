import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export function fixturePath(name: string): string {
  return join(process.cwd(), 'test', 'fixtures', name);
}

export function readFixture(name: string): Promise<string> {
  return readFile(fixturePath(name), 'utf8');
}