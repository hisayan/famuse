import { expect, test, type Locator, type Page } from '@playwright/test';
import { sendMessage, signInAsDemo, uniqueMarker, waitForLiveRoom } from './helpers';

// Phone viewport: sidebar and household drawer become slide-in overlays.
test.use({ viewport: { width: 390, height: 844 } });

/** Bounding rect of a slide-in drawer; open/closed is a position, not visibility. */
async function rect(page: Page, locator: Locator) {
  return locator.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { left: box.left, right: box.right };
  });
}

test.describe('famuse mobile', () => {
  test('navigation drawer opens, switches channel, and closes', async ({ page }) => {
    await signInAsDemo(page, 'Dad');
    await waitForLiveRoom(page);

    const nav = page.getByRole('complementary', { name: 'Household navigation' });

    // Drawer starts off-canvas to the left.
    expect((await rect(page, nav)).left).toBeLessThan(-100);

    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect.poll(async () => (await rect(page, nav)).left).toBeGreaterThanOrEqual(-1);

    // Channel buttons are reachable once the drawer is open.
    await nav.getByRole('button', { name: 'groceries' }).click();
    await expect(page.getByRole('heading', { name: 'groceries' })).toBeVisible();

    // Selecting a channel dismisses the drawer.
    await expect.poll(async () => (await rect(page, nav)).left).toBeLessThan(-100);
  });

  test('household panel opens and tasks toggle from the phone layout', async ({ page }) => {
    await signInAsDemo(page, 'Mom');
    await waitForLiveRoom(page);

    const panel = page.getByRole('complementary', { name: 'Household context' });

    await page.getByRole('button', { name: 'Open household panel' }).click();
    await expect
      .poll(async () => (await rect(page, panel)).right)
      .toBeLessThanOrEqual(391);

    const task = panel.getByRole('checkbox', { name: /Take out the recycling/ });
    await expect(task).toBeVisible();
    const wasChecked = await task.isChecked();

    await task.click();
    await expect(task).toBeChecked({ checked: !wasChecked });

    // Restore the seeded state so reruns and other tests are unaffected.
    await task.click();
    await expect(task).toBeChecked({ checked: wasChecked });

    await panel.getByRole('button', { name: 'Close household panel' }).click();
    await expect.poll(async () => (await rect(page, panel)).right).toBeGreaterThan(500);
  });

  test('composer sends with no horizontal overflow', async ({ page }) => {
    await signInAsDemo(page, 'Leo');
    await waitForLiveRoom(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const marker = uniqueMarker('mobile hello');
    await sendMessage(page, marker);
  });
});
