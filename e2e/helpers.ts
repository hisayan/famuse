import { expect, type Page } from '@playwright/test';

export type DemoMemberName = 'Mom' | 'Dad' | 'Leo';

/** Unique text so reruns against a persistent local DB never collide. */
export function uniqueMarker(label: string): string {
  return `${label} [e2e ${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}]`;
}

/**
 * One-click demo sign-in (see src/client/components/sign-in.tsx).
 * Demo accounts are seeded by /api/demo/ensure-household on first join,
 * so no direct DB access is needed from the browser.
 */
export async function signInAsDemo(page: Page, name: DemoMemberName): Promise<void> {
  await page.goto('/');
  const demoButton = page.getByRole('button', {
    name: new RegExp(`Continue as ${name}`),
  });
  await expect(demoButton).toBeVisible();
  // In dev, the server-rendered button is visible before React hydrates,
  // so an early click can be dropped. Retry until the household appears.
  const heading = page.getByRole('heading', { name: /The Miller Hearth/ });
  await expect(async () => {
    await demoButton.click({ timeout: 2_000 });
    await expect(heading).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 45_000, intervals: [500, 1_000, 2_000] });
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

/** Wait until the room WebSocket is live and the composer accepts input. */
export async function waitForLiveRoom(page: Page): Promise<void> {
  await expect(page.getByText('Live', { exact: true })).toBeVisible();
  await expect(page.getByLabel(/Message #/)).toBeEnabled();
}

export async function sendMessage(page: Page, text: string): Promise<void> {
  const composer = page.getByLabel(/Message #/);
  await composer.fill(text);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText(text, { exact: true })).toBeVisible();
}
