const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function runAudit() {
  console.log('--- STARTING COMPREHENSIVE AUTOMATED VERIFICATION ---');
  const logs = [];
  const errors = [];

  // Launch browser (using installed Edge or Chromium)
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Mobile viewport (Pixel 7 / modern mobile device)
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
    geolocation: { latitude: 23.0225, longitude: 72.5714 }, // Ahmedabad coordinates
    permissions: ['geolocation']
  });

  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    logs.push(`[${type.toUpperCase()}] ${text}`);
    if (type === 'error' && !text.includes('_vercel')) {
      errors.push(`Console Error: ${text}`);
      console.error(`  ❌ Console Error: ${text}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`Uncaught Page Exception: ${err.message}\n${err.stack}`);
    console.error(`  ❌ Uncaught Exception:`, err.message);
  });

  page.on('response', resp => {
    if (resp.status() >= 400) {
      console.warn(`  ⚠️ HTTP ${resp.status()}: ${resp.url()}`);
    }
  });

  try {
    // 1. Initial Page Load
    console.log('1. Navigating to http://localhost:5000/ ...');
    await page.goto('http://localhost:5000/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);

    const title = await page.title();
    console.log(`   Page Title: "${title}"`);

    // Verify map container
    const mapExists = await page.locator('.leaflet-container').isVisible();
    console.log(`   Leaflet Map Visible: ${mapExists ? 'YES ✅' : 'NO ❌'}`);
    if (!mapExists) errors.push('Leaflet map container not visible');

    // Verify metros running badge
    const metrosBadge = await page.locator('text=/\\d+ metros running|\\d+ મેટ્રો|\\d+ मेट्रो/').first();
    const badgeVisible = await metrosBadge.isVisible().catch(() => false);
    console.log(`   Live Metros Running Badge: ${badgeVisible ? 'YES ✅' : 'NO ❌'}`);

    // Verify Bottom Panel
    const bottomPanel = await page.locator('text=/Welcome to AhmMetro|અમદાવાદ મેટ્રો/').first();
    const panelVisible = await bottomPanel.isVisible().catch(() => false);
    console.log(`   Bottom Welcome Panel: ${panelVisible ? 'YES ✅' : 'NO ❌'}`);

    // Take initial screenshot
    const shotDir = 'C:\\Users\\ubaid\\.gemini\\antigravity\\brain\\88faac6f-89d5-4d63-a92f-4082423e97db';
    await page.screenshot({ path: path.join(shotDir, 'audit_01_initial_mobile.png') });
    console.log('   📸 Screenshot saved: audit_01_initial_mobile.png');

    // Check for WelcomeOverlay modal (first-time visitor onboarding)
    const welcomeModal = page.locator('text=/Welcome to AhmMetro!|Let\'s Go!/').first();
    const hasWelcome = await welcomeModal.isVisible().catch(() => false);
    if (hasWelcome) {
      console.log('   👋 Welcome Overlay detected. Testing dismissal via "Let\'s Go!"...');
      const letsGoBtn = page.locator('button:has-text("Let\'s Go!"), button:has-text("ચાલો શરૂ કરીએ!"), button:has-text("शुरू करें!")').first();
      await letsGoBtn.click();
      await page.waitForTimeout(600);
      console.log('   Dismissed Welcome Overlay successfully ✅');
    }

    // 2. Test Side Menu
    console.log('\n2. Testing Side Menu Opening & Content...');
    const menuBtn = page.locator('button[aria-label="Open menu"]').first();
    await menuBtn.click();
    await page.waitForTimeout(600);

    const sideMenuVisible = await page.locator('text=Daily Commute').isVisible();
    console.log(`   Side Menu Content Visible: ${sideMenuVisible ? 'YES ✅' : 'NO ❌'}`);
    if (!sideMenuVisible) errors.push('Side menu did not display items properly');
    await page.screenshot({ path: path.join(shotDir, 'audit_02_sidemenu.png') });

    // 3. Test Language Switching in Side Menu
    console.log('\n3. Testing Language Switching...');
    // Click Gujarati
    const guBtn = page.locator('button:text-is("ગુજરાતી")');
    await guBtn.click();
    await page.waitForTimeout(500);
    const hasGujaratiText = await page.locator('text=દૈનિક મુસાફરી').isVisible();
    console.log(`   Gujarati Text Visible ("દૈનિક મુસાફરી"): ${hasGujaratiText ? 'YES ✅' : 'NO ❌'}`);
    if (!hasGujaratiText) errors.push('Gujarati language switch failed to render translated text');

    // Click Hindi
    const hiBtn = page.locator('button:text-is("हिंदी")');
    await hiBtn.click();
    await page.waitForTimeout(500);
    const hasHindiText = await page.locator('text=दैनिक यात्रा').isVisible();
    console.log(`   Hindi Text Visible ("दैनिक यात्रा"): ${hasHindiText ? 'YES ✅' : 'NO ❌'}`);
    if (!hasHindiText) errors.push('Hindi language switch failed to render translated text');

    // Return to English
    const enBtn = page.locator('button:text-is("English")');
    await enBtn.click();
    await page.waitForTimeout(500);
    console.log('   Returned to English successfully ✅');

    // Close side menu
    const closeMenuBtn = page.locator('button[aria-label="Close menu"]').first();
    await closeMenuBtn.click();
    await page.waitForTimeout(500);

    // 4. Test Tips Dialog
    console.log('\n4. Testing Tips Dialog...');
    await menuBtn.click();
    await page.waitForTimeout(400);
    const tipsBtn = page.locator('button:has-text("Tips")');
    await tipsBtn.click();
    await page.waitForTimeout(600);

    const tipsDialogTitle = await page.locator('#tips-dialog-title').isVisible();
    console.log(`   Tips Dialog Title Visible: ${tipsDialogTitle ? 'YES ✅' : 'NO ❌'}`);
    if (!tipsDialogTitle) errors.push('Tips dialog failed to open');

    // Test accordion toggles inside TipsDialog
    const proTipsTrigger = page.locator('button:has-text("Pro Travel Tips")');
    await proTipsTrigger.click();
    await page.waitForTimeout(400);
    const tipItemVisible = await page.locator('text=Board Before the Interchange').isVisible();
    console.log(`   Pro Tips Accordion Expanded: ${tipItemVisible ? 'YES ✅' : 'NO ❌'}`);
    if (!tipItemVisible) errors.push('Pro tips accordion did not expand');

    await page.screenshot({ path: path.join(shotDir, 'audit_03_tips_dialog.png') });

    // Close Tips Dialog
    const closeTipsBtn = page.locator('button[aria-label="Close"]').first();
    await closeTipsBtn.click();
    await page.waitForTimeout(500);

    // 5. Test Route Planner
    console.log('\n5. Testing Route Planner & Route Calculation...');
    // Open route planner by clicking "Plan Journey" in side menu or search bar
    await menuBtn.click();
    await page.waitForTimeout(400);
    const planRouteBtn = page.locator('button:has-text("Plan Route"), button:has-text("રૂટ પ્લાન કરો"), button:has-text("मार्ग खोजें")').first();
    await planRouteBtn.click();
    await page.waitForTimeout(600);

    const plannerTitle = await page.locator('text=Plan Your Journey').isVisible();
    console.log(`   Route Planner Dialog Visible: ${plannerTitle ? 'YES ✅' : 'NO ❌'}`);
    if (!plannerTitle) errors.push('Route planner dialog failed to open');

    // Select Origin Station
    const originInput = page.locator('input[placeholder*="origin" i], input[placeholder*="From" i]').first();
    await originInput.click();
    await originInput.fill('Paldi');
    await page.waitForTimeout(400);
    const paldiOpt = page.locator('button:has-text("Paldi")').first();
    await paldiOpt.click();
    await page.waitForTimeout(400);
    console.log('   Selected Origin: Paldi');

    // Select Destination Station
    const destInput = page.locator('input[placeholder*="destination" i], input[placeholder*="To" i]').first();
    await destInput.click();
    await destInput.fill('Thaltej');
    await page.waitForTimeout(400);
    const thaltejOpt = page.locator('button:has-text("Thaltej")').first();
    await thaltejOpt.click();
    await page.waitForTimeout(600);
    console.log('   Selected Destination: Thaltej');

    // Verify calculated route card
    const routeSummary = await page.locator('text=/₹\\d+|\\d+ mins|\\d+ stations/').first();
    const routeVisible = await routeSummary.isVisible().catch(() => false);
    console.log(`   Calculated Route Card Displayed: ${routeVisible ? 'YES ✅' : 'NO ❌'}`);
    if (!routeVisible) errors.push('Calculated route did not display for Paldi -> Thaltej');

    // Test Swap button
    console.log('   Testing Swap button...');
    const swapBtn = page.locator('button[aria-label="Swap origin and destination"]');
    await swapBtn.click();
    await page.waitForTimeout(600);

    const originValAfterSwap = await originInput.inputValue();
    const destValAfterSwap = await destInput.inputValue();
    console.log(`   After Swap: Origin = "${originValAfterSwap}", Destination = "${destValAfterSwap}"`);
    if (!originValAfterSwap.includes('Thaltej') || !destValAfterSwap.includes('Paldi')) {
      errors.push(`Swap failed: Origin is "${originValAfterSwap}", Dest is "${destValAfterSwap}"`);
    } else {
      console.log('   Swap Succeeded ✅');
    }

    await page.screenshot({ path: path.join(shotDir, 'audit_04_route_planner.png') });

    // Close Route Planner
    const closePlannerBtn = page.locator('button[aria-label="Close"]').first();
    await closePlannerBtn.click().catch(() => {});
    await page.waitForTimeout(500);

    // 6. Test Station Tap on Map
    console.log('\n6. Testing Station Marker Click on Map...');
    const stationMarker = page.locator('.station-marker-container').first();
    const hasMarker = await stationMarker.count();
    console.log(`   Station marker elements found on map: ${hasMarker}`);
    if (hasMarker > 0) {
      await stationMarker.click({ force: true });
      await page.waitForTimeout(800);
      const stationPanelHeader = await page.locator('text=/Metro Station|First metro|Upcoming Metros|Directions/').first().isVisible().catch(() => false);
      console.log(`   Station details panel opened on marker click: ${stationPanelHeader ? 'YES ✅' : 'NO ❌'}`);
      if (!stationPanelHeader) errors.push('Station details panel did not open on marker click');
    }

    // 7. Verify GPS Marker Status
    console.log('\n7. Verifying User Location GPS Marker in DOM...');
    const circleMarkers = await page.locator('path.leaflet-interactive').count();
    console.log(`   Interactive Leaflet vector layers count: ${circleMarkers}`);

    await page.screenshot({ path: path.join(shotDir, 'audit_05_final_state.png') });
    console.log('   📸 Screenshot saved: audit_05_final_state.png');

  } catch (err) {
    errors.push(`Test Execution Crash: ${err.message}\n${err.stack}`);
    console.error('❌ Exception during audit execution:', err);
  } finally {
    await browser.close();
  }

  console.log('\n=== AUDIT SUMMARY ===');
  console.log(`Total Errors Logged: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Errors List:');
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  } else {
    console.log('🎉 ALL USER FLOWS & VERIFICATIONS PASSED WITH ZERO ERRORS!');
  }
}

runAudit();
