import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Per PRD st-tfy: 4 location paths × Calculate happy path.
 *
 * We mock /api/prospect-runs so the e2e suite is fast, deterministic, and
 * doesn't depend on PVGIS/PVWatts/Nominatim uptime. Adapter behaviour is
 * covered by unit tests.
 */

const successResponse = {
  status: 'success',
  location: {
    lat: 38.7223,
    lon: -9.1393,
    inputText: '38.722300, -9.139300',
    displayLabel: 'Lisbon, Portugal',
    source: 'manual_coordinates',
    geocodingProvider: null,
    geocodingPlaceId: null,
    osmType: null,
    osmId: null,
  },
  assumptions: {
    systemSizeKwp: 10,
    lossPercent: 14,
    tiltDegrees: 35,
    uiAzimuthDegrees: 180,
    moduleType: 'standard',
    mountingType: 'free',
  },
  anglesSource: 'manual',
  sources: [
    {
      source: 'pvgis',
      status: 'success',
      annualKwh: 15784,
      annualKwhPerKwp: 1578,
      monthly: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        kwh: 1100 + i * 20,
        kwhPerKwp: 110 + i * 2,
      })),
      warnings: [],
      metadata: {},
    },
    {
      source: 'pvwatts',
      status: 'success',
      annualKwh: 15375,
      annualKwhPerKwp: 1538,
      monthly: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        kwh: 1050 + i * 20,
        kwhPerKwp: 105 + i * 2,
      })),
      warnings: [],
      metadata: {},
    },
  ],
  consolidated: {
    annualKwh: 15579.5,
    annualKwhPerKwp: 1558,
    monthly: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      kwh: 1075 + i * 20,
      kwhPerKwp: 108 + i * 2,
    })),
    deltaPercent: 2.6,
    providerCount: 2,
    recommendationLabel: 'Based on PVGIS and PVWatts',
  },
  warnings: [],
};

const needsChoiceResponse = {
  status: 'needs_location_choice',
  location: null,
  assumptions: null,
  anglesSource: null,
  sources: [],
  consolidated: null,
  warnings: [],
  candidates: [
    {
      lat: 38.7077,
      lon: -9.1366,
      inputText: 'Lisbon',
      displayLabel: 'Lisbon, Portugal',
      source: 'nominatim_search',
      geocodingProvider: 'nominatim',
      geocodingPlaceId: 1,
      osmType: 'relation',
      osmId: 5400890,
    },
    {
      lat: 43.7806,
      lon: -71.9069,
      inputText: 'Lisbon',
      displayLabel: 'Lisbon, New Hampshire, USA',
      source: 'nominatim_search',
      geocodingProvider: 'nominatim',
      geocodingPlaceId: 2,
      osmType: 'relation',
      osmId: 134567,
    },
  ],
};

async function mockApi(page: Page, response: unknown) {
  await page.route('**/api/prospect-runs', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/pvprospect/i);
});

test('path 1: paste coordinates → Calculate', async ({ page }) => {
  await mockApi(page, successResponse);

  await page.getByRole('textbox', { name: 'Location' }).fill('38.7223, -9.1393');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByText('Estimated annual production')).toBeVisible();
  // Rounded to nearest int and formatted with thousands separator; locale may use
  // comma or non-breaking space — match either.
  await expect(page.getByText(/15[,  ]?580.*kWh\/year/).first()).toBeVisible();
  await expect(page.getByText(/2\.6%/).first()).toBeVisible();
});

test('path 2: typed address → Nominatim ambiguity → pick candidate → Calculate', async ({
  page,
}) => {
  // First request: ambiguous geocoding.
  await page.route('**/api/prospect-runs', async (route: Route) => {
    const body = (await route.request().postDataJSON()) as Record<string, unknown>;
    // Direct lat/lon present → run real flow (success mock).
    if (typeof body.lat === 'number' && typeof body.lon === 'number') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(needsChoiceResponse),
    });
  });

  await page.getByRole('textbox', { name: 'Location' }).fill('Lisbon');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByText('Choose location')).toBeVisible();
  const portugalBtn = page.getByRole('button', { name: /Lisbon, Portugal/ });
  const usBtn = page.getByRole('button', { name: /Lisbon, New Hampshire, USA/ });
  await expect(portugalBtn).toBeVisible();
  await expect(usBtn).toBeVisible();

  await portugalBtn.click();
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByText('Estimated annual production')).toBeVisible();
});

test('path 3: map click confirms location → Calculate', async ({ page }) => {
  await mockApi(page, successResponse);

  // Click the map roughly at its centre to fire the leaflet click handler.
  const map = page.locator('.leaflet-container');
  await expect(map).toBeVisible();
  await map.click({ position: { x: 200, y: 120 } });

  // Wait for confirmed coordinates to appear in the input (canonical format).
  const locationInput = page.getByRole('textbox', { name: 'Location' });
  await expect(locationInput).toHaveValue(/^-?\d+\.\d{6}, -?\d+\.\d{6}$/);

  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.getByText('Estimated annual production')).toBeVisible();
});

test('path 4: browser geolocation → Calculate', async ({ page, context }) => {
  await mockApi(page, successResponse);

  // Grant geolocation and pin a fixed point.
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 50.228232, longitude: 29.452135 });

  await page.getByRole('button', { name: 'Find my location' }).click();

  await expect(page.getByRole('textbox', { name: 'Location' })).toHaveValue('50.228232, 29.452135');

  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.getByText('Estimated annual production')).toBeVisible();
});

test('auto-angles: PVGIS optimal_pvgis badge appears next to tilt/azimuth', async ({ page }) => {
  await mockApi(page, {
    ...successResponse,
    anglesSource: 'optimal_pvgis',
    assumptions: {
      ...successResponse.assumptions,
      tiltDegrees: 33,
      uiAzimuthDegrees: 184,
    },
  });

  // Default state: autoAngles checkbox checked.
  const autoCheckbox = page.getByRole('checkbox', {
    name: /Auto-pick optimal tilt and azimuth/,
  });
  await expect(autoCheckbox).toBeChecked();

  await page.getByRole('textbox', { name: 'Location' }).fill('38.7223, -9.1393');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByRole('heading', { name: 'Assumptions' })).toBeVisible();
  // Auto · PVGIS badge appears at least once (next to tilt and/or azimuth).
  await expect(page.getByText('Auto · PVGIS').first()).toBeVisible();
  // And the picked values reach the table.
  await expect(page.getByText('33°').first()).toBeVisible();
  await expect(page.getByText('184°').first()).toBeVisible();
});

test('manual override: editing tilt in Expert mode auto-unchecks autoAngles', async ({ page }) => {
  await mockApi(page, {
    ...successResponse,
    anglesSource: 'manual',
    assumptions: { ...successResponse.assumptions, tiltDegrees: 25 },
  });

  const autoCheckbox = page.getByRole('checkbox', {
    name: /Auto-pick optimal tilt and azimuth/,
  });
  await expect(autoCheckbox).toBeChecked();

  // Open Expert mode and edit tilt.
  await page.getByText('Expert mode').click();
  const tiltInput = page.getByLabel('Tilt °');
  await tiltInput.fill('25');

  // The interlock kicks in: autoAngles is now off.
  await expect(autoCheckbox).not.toBeChecked();

  await page.getByRole('textbox', { name: 'Location' }).fill('38.7223, -9.1393');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByRole('heading', { name: 'Assumptions' })).toBeVisible();
  // Manual mode → no Auto badge for tilt/azimuth row.
  await expect(page.getByText('Auto · PVGIS')).toHaveCount(0);
  await expect(page.getByText('25°').first()).toBeVisible();
});
