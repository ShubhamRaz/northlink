import { Corridor, Incident, RiskPrediction, PredictionFactor, SimulationMode } from '@/types';

/**
 * Prototype AI Risk Prediction Model.
 * Simulates a machine learning inference step. 
 * Real implementation would call a Python FastAPI (e.g. XGBoost model).
 */
export const predictCorridorRisk = (
  corridor: Corridor, 
  activeIncidents: Incident[], 
  simulationMode: SimulationMode
): RiskPrediction => {
  let probability = 0.1; // Base probability 10%
  let expectedDelay = 0; // minutes
  const factors: PredictionFactor[] = [];
  
  // 1. Terrain & Base Risk
  probability += (corridor.risk / 100) * 0.2; 
  factors.push({
    factor: 'Terrain & Historical',
    contribution: (corridor.risk / 100) * 0.2,
    description: 'Historical closure rates and terrain complexity.'
  });

  // 2. Weather Simulation
  if (simulationMode === 'HEAVY RAIN') {
    probability += 0.3;
    expectedDelay += 45;
    factors.push({
      factor: 'Weather Forecast',
      contribution: 0.3,
      description: 'Heavy rainfall increases landslide and flooding risk.'
    });
  } else if (simulationMode === 'LANDSLIDE') {
    // If it's the specific corridor we are targeting in the demo (NH-102 / C02)
    if (corridor.id === 'C02') {
      probability += 0.8;
      expectedDelay += 240; // Massive delay
      factors.push({
        factor: 'Geological Alert',
        contribution: 0.8,
        description: 'Active landslide detected directly on route segment.'
      });
    }
  } else if (simulationMode === 'TRAFFIC SURGE') {
    probability += 0.15;
    expectedDelay += 60;
    factors.push({
      factor: 'Live Traffic',
      contribution: 0.15,
      description: 'High congestion detected.'
    });
  }

  // 3. Field Incidents
  const corridorIncidents = activeIncidents.filter(i =>
    i.affectedCorridorId === corridor.id &&
    i.verificationStatus === 'VERIFIED' &&
    i.resolutionStatus === 'UNRESOLVED'
  );
  if (corridorIncidents.length > 0) {
    let incidentProb = 0;
    corridorIncidents.forEach(inc => {
      if (inc.severity === 'Critical') incidentProb += 0.5;
      else if (inc.severity === 'High') incidentProb += 0.3;
      else if (inc.severity === 'Medium') incidentProb += 0.15;
      expectedDelay += (inc.severity === 'High' || inc.severity === 'Critical') ? 120 : 30;
    });
    
    // Cap incident probability contribution
    incidentProb = Math.min(incidentProb, 0.6);
    probability += incidentProb;
    
    factors.push({
      factor: 'Field Reports',
      contribution: incidentProb,
      description: `${corridorIncidents.length} active incident(s) reported on this segment.`
    });
  }

  // Cap total probability at 0.99
  probability = Math.min(probability, 0.99);

  // Derive Severity
  let severity: RiskPrediction['severity'] = 'Low';
  if (probability >= 0.75) severity = 'Critical';
  else if (probability >= 0.50) severity = 'High';
  else if (probability >= 0.25) severity = 'Medium';

  return {
    probability,
    expectedDelay,
    severity,
    confidence: Math.min(0.98, 0.88 + corridor.risk / 1000),
    contributingFactors: factors.sort((a, b) => b.contribution - a.contribution),
    lastUpdated: 'Just now'
  };
};
