// A preview's demo controls (make the next save fail, and the like) sit in one collapsed "Example fixtures" region after
// the example, never inside it (#409). A check that drives them opens the region first, and in doing so checks the
// region is there exactly once and starts closed, so a screenshot of the preview shows the product, not the harness.
// A helper, not a check of its own (build/checks/ci.json lists it under "elsewhere").
import assert from 'node:assert/strict';

export async function openFixtures(page) {
  const regions = page.locator('details.preview-fixtures');
  assert.equal(await regions.count(), 1, 'the preview has one Example fixtures region');
  const region = regions.first();
  assert.equal(await region.evaluate((d) => d.open), false, 'the Example fixtures region starts closed');
  assert.equal((await region.locator('summary').textContent()).trim(), 'Example fixtures', 'the region is headed "Example fixtures"');
  await region.locator('summary').click();
  assert.equal(await region.evaluate((d) => d.open), true, 'the Example fixtures region opens');
  return region;
}
