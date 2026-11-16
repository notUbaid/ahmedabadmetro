import { describe, it, expect } from 'vitest';

describe('Component Module Integrity Smoke Tests', () => {
  it('imports RoutePlanner without runtime syntax or reference errors', async () => {
    const mod = await import('../RoutePlanner');
    expect(mod.default).toBeDefined();
  });

  it('imports WelcomeOverlay without errors', async () => {
    const mod = await import('../WelcomeOverlay');
    expect(mod.WelcomeOverlay).toBeDefined();
  });

  it('imports OutageApologyModal without errors', async () => {
    const mod = await import('../OutageApologyModal');
    expect(mod.OutageApologyModal).toBeDefined();
  });

  it('imports AppSplash without errors', async () => {
    const mod = await import('../AppSplash');
    expect(mod.AppSplash).toBeDefined();
  });

  it('imports UpdateBanner without errors', async () => {
    const mod = await import('../UpdateBanner');
    expect(mod.UpdateBanner || mod.default).toBeDefined();
  });

  it('imports OfflineIndicator without errors', async () => {
    const mod = await import('../OfflineIndicator');
    expect(mod.default).toBeDefined();
  });

  it('imports BottomPanel without errors', async () => {
    const mod = await import('../BottomPanel');
    expect(mod.BottomPanel).toBeDefined();
  });

  it('imports SearchBar without errors', async () => {
    const mod = await import('../SearchBar');
    expect(mod.default).toBeDefined();
  });

  it('imports SideMenu without errors', async () => {
    const mod = await import('../SideMenu');
    expect(mod.default).toBeDefined();
  });

  it('imports App root without errors', async () => {
    const mod = await import('../../App');
    expect(mod.default).toBeDefined();
  });
});
