import { expect, test } from '@playwright/test';
import { sendMessage, signInAsDemo, uniqueMarker, waitForLiveRoom } from './helpers';

test.describe('famuse smoke', () => {
  test('demo sign-in lands in the seeded household', async ({ page }) => {
    await signInAsDemo(page, 'Dad');
    await waitForLiveRoom(page);

    // Seeded living-room history is visible after join.
    await expect(
      page.getByText(/Running late from the clinic/),
    ).toBeVisible();
    // Family roster from the seed is listed in the sidebar.
    await expect(page.getByText('Leo', { exact: true }).first()).toBeVisible();
  });

  test('two members exchange a message in real time', async ({ browser }) => {
    const dadContext = await browser.newContext();
    const momContext = await browser.newContext();
    const dadPage = await dadContext.newPage();
    const momPage = await momContext.newPage();
    try {
      await signInAsDemo(dadPage, 'Dad');
      await signInAsDemo(momPage, 'Mom');
      await waitForLiveRoom(dadPage);
      await waitForLiveRoom(momPage);

      const marker = uniqueMarker('hello from Dad');
      await sendMessage(dadPage, marker);

      // The second member receives it over the live room socket,
      // without reloading.
      await expect(momPage.getByText(marker, { exact: true })).toBeVisible();
    } finally {
      await dadContext.close();
      await momContext.close();
    }
  });

  test('ask famuse chip inserts a mention instead of sending', async ({ page }) => {
    await signInAsDemo(page, 'Dad');
    await waitForLiveRoom(page);

    const log = page.getByRole('log', { name: 'Messages' });
    const before = await log.textContent();

    await page
      .getByRole('toolbar', { name: 'Quick actions' })
      .getByRole('button', { name: '✨ Ask famuse' })
      .click();

    // The mention lands in the composer for editing…
    await expect(page.getByLabel(/Message #/)).toHaveValue('@famuse ');
    // …and nothing is posted.
    await expect.poll(async () => log.textContent()).toBe(before);
  });

  test('a household task can be checked off and restored', async ({ page }) => {
    await signInAsDemo(page, 'Dad');
    await waitForLiveRoom(page);

    const task = page.getByRole('checkbox', {
      name: /Take out the recycling/,
    });
    await expect(task).toBeVisible();
    const wasChecked = await task.isChecked();

    await task.click();
    await expect(task).toBeChecked({ checked: !wasChecked });

    // Restore the seeded state so reruns and other tests are unaffected.
    await task.click();
    await expect(task).toBeChecked({ checked: wasChecked });
  });
});
