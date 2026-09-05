import { Corridor, RouteAlternative } from '@/types';

/**
 * Calculates a Route Resilience Index (0-100).
 * High index means the route can withstand disruptions (e.g. has alternatives, low exposure).
 */
export const calculateResilience = (
  corridors: Corridor[],
  riskScores: Record<string, number> // corridorId -> probability
): number => {
  if (corridors.length === 0) return 0;

  // 1. Exposure Penalty
  // Calculate average risk probability across the route
  const avgRisk = corridors.reduce((sum, c) => sum + (riskScores[c.id] || 0), 0) / corridors.length;
  const exposurePenalty = avgRisk * 40; // up to 40 points penalty

  // 2. Structural Resilience 
  // In a real system, this would evaluate the graph for redundant paths.
  // For the prototype, we assign a base resilience depending on the corridors involved.
  let structuralScore = 50; 
  
  // Example heuristics for prototype:
  const hasSilchar = corridors.some(c => c.name.includes('Silchar'));
  const hasKohima = corridors.some(c => c.name.includes('Kohima'));

  if (hasSilchar) {
    structuralScore += 30; // Longer, but historically more redundant paths available
  }
  if (hasKohima) {
    structuralScore += 10; // Prone to single points of failure
  }

  // 3. Final Calculation
  let rri = 100 - exposurePenalty - (50 - structuralScore);
  
  // Cap between 0 and 100
  rri = Math.max(0, Math.min(100, Math.round(rri)));
  
  return rri;
};
