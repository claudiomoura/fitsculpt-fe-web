import fs from 'node:fs/promises';
import path from 'node:path';
import { createDemoUserStorageState, resetDemoState } from './support';

export default async function globalSetup(): Promise<void> {
  const authDir = path.resolve(process.cwd(), 'e2e', '.auth');
  await fs.mkdir(authDir, { recursive: true });

  await resetDemoState();
  await createDemoUserStorageState(path.join(authDir, 'demo-user.json'));
}
