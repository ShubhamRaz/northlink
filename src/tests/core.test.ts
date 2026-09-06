import { describe, it, expect } from 'vitest';
import { resolveLocationCoordinates } from '@/services/routeService';

describe('Core Logic Tests', () => {

  describe('coordinate validation', () => {
    it('resolves known locations to coordinates', () => {
      const guwahati = resolveLocationCoordinates('Guwahati Logistics Hub');
      expect(guwahati).toEqual([26.1445, 91.7362]);
    });

    it('returns null for unknown locations', () => {
      const unknown = resolveLocationCoordinates('UnknownCity123');
      expect(unknown).toBeNull();
    });
  });

});
