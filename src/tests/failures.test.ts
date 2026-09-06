import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { assistantService } from '@/services/assistantService';
import { generateRoutesAsync } from '@/services/routeService';

describe('Resilience and Failures', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Gemini Failure Tests', () => {
    it('Falls back to offline rule-based mode when API returns 503', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });

      const response = await assistantService.askQuestion('What is the weather?');
      expect(response.isFallback).toBe(true);
      expect(response.reply).toContain('fallback mode');
    });

    it('Falls back to offline rule-based mode on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const response = await assistantService.askQuestion('Is there traffic?');
      expect(response.isFallback).toBe(true);
      expect(response.reply).toContain('fallback mode');
    });
  });

  describe('OSRM Failure Tests', () => {
    it('Generates bounded fallback straight-line route when OSRM fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('OSRM Server Offline'));
      const mockShipment = { id: 'ship-1', origin: 'Guwahati Logistics Hub', destination: 'Shillong Supply Hub' } as any;

      const routes = await generateRoutesAsync(mockShipment, [], 'SIMULATED');
      expect(routes.length).toBeGreaterThan(0);
      
      const fallbackRoute = routes[0];
      // Should have >=21 points (straight line fallback generates at least 20 steps)
      expect(fallbackRoute.coordinates.length).toBeGreaterThanOrEqual(21);
      expect(fallbackRoute.baseEta).toBeGreaterThan(0);
    });
  });

});
