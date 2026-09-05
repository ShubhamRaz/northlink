import { Corridor, OperationalStatus, RiskPrediction, Incident } from '@/types';

/**
 * Derives the discrete accessibility status of a corridor based on risk predictions,
 * active incidents, and operational hard rules.
 */
export const determineAccessibility = (
  corridor: Corridor, 
  riskPrediction: RiskPrediction,
  activeIncidents: Incident[]
): OperationalStatus => {
  
  // Rule 1: Hard Constraints (Field verified blockages override AI probability)
  const corridorIncidents = activeIncidents.filter(i =>
    i.affectedCorridorId === corridor.id &&
    i.verificationStatus === 'VERIFIED' &&
    i.resolutionStatus === 'UNRESOLVED'
  );
  
  for (const incident of corridorIncidents) {
    if (incident.type === 'Landslide' && (incident.severity === 'High' || incident.severity === 'Critical')) {
      return 'BLOCKED';
    }
    if (incident.type === 'Bridge Damage') {
      return 'BLOCKED';
    }
  }

  // Rule 2: AI Probability thresholds
  if (riskPrediction.probability >= 0.80) {
    return 'BLOCKED'; // System deems it impassable due to extreme risk
  }
  
  if (riskPrediction.probability >= 0.50) {
    return 'RESTRICTED';
  }
  
  if (riskPrediction.probability >= 0.25) {
    return 'CAUTION';
  }

  return 'OPEN';
};
