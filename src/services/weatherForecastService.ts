/**
 * Weather Forecast Service
 * Provides deterministic mock forecast data for prototype demonstration.
 * Architecture: Designed so this service can be replaced with a real weather API
 * (e.g. OpenWeatherMap One Call API) without changing calling code.
 */

import { WeatherCondition, WeatherSeverity, SegmentWeather, SimulationMode } from '@/types';

// Baseline weather scenario for each waypoint (keyed by location slug)
// Values represent the forecast at the "base" hour of 10:00 departure
const BASELINE_FORECASTS: Record<string, {
  hourlyPattern: { hour: number; condition: WeatherCondition; rainfall: number; temp: number; wind: number }[];
  terrainRisk: number;
}> = {
  'guwahati': {
    terrainRisk: 0.05,
    hourlyPattern: [
      { hour: 10, condition: 'Clear', rainfall: 0, temp: 28, wind: 12 },
      { hour: 11, condition: 'Clear', rainfall: 0, temp: 30, wind: 10 },
      { hour: 12, condition: 'Cloudy', rainfall: 2, temp: 29, wind: 15 },
      { hour: 13, condition: 'Cloudy', rainfall: 3, temp: 28, wind: 18 },
    ]
  },
  'nagaon': {
    terrainRisk: 0.10,
    hourlyPattern: [
      { hour: 11, condition: 'Cloudy', rainfall: 5, temp: 27, wind: 20 },
      { hour: 12, condition: 'Cloudy', rainfall: 8, temp: 26, wind: 22 },
      { hour: 13, condition: 'Light Rain', rainfall: 12, temp: 25, wind: 25 },
      { hour: 14, condition: 'Moderate Rain', rainfall: 18, temp: 24, wind: 28 },
    ]
  },
  'dimapur': {
    terrainRisk: 0.22,
    hourlyPattern: [
      { hour: 13, condition: 'Moderate Rain', rainfall: 20, temp: 23, wind: 30 },
      { hour: 14, condition: 'Moderate Rain', rainfall: 25, temp: 22, wind: 32 },
      { hour: 15, condition: 'Heavy Rain', rainfall: 35, temp: 21, wind: 38 },
      { hour: 16, condition: 'Heavy Rain', rainfall: 38, temp: 20, wind: 40 },
    ]
  },
  'kohima': {
    terrainRisk: 0.55,
    hourlyPattern: [
      { hour: 15, condition: 'Heavy Rain', rainfall: 35, temp: 18, wind: 45 },
      { hour: 16, condition: 'Heavy Rain', rainfall: 40, temp: 17, wind: 48 },
      { hour: 17, condition: 'Heavy Rain', rainfall: 38, temp: 17, wind: 50 },
      { hour: 18, condition: 'Thunderstorm', rainfall: 55, temp: 16, wind: 65 },
    ]
  },
  'mao': {
    terrainRisk: 0.40,
    hourlyPattern: [
      { hour: 17, condition: 'Heavy Rain', rainfall: 30, temp: 19, wind: 42 },
      { hour: 18, condition: 'Moderate Rain', rainfall: 22, temp: 20, wind: 35 },
      { hour: 19, condition: 'Light Rain', rainfall: 15, temp: 21, wind: 28 },
      { hour: 20, condition: 'Cloudy', rainfall: 5, temp: 22, wind: 20 },
    ]
  },
  'imphal': {
    terrainRisk: 0.12,
    hourlyPattern: [
      { hour: 19, condition: 'Cloudy', rainfall: 3, temp: 24, wind: 18 },
      { hour: 20, condition: 'Cloudy', rainfall: 5, temp: 23, wind: 15 },
      { hour: 21, condition: 'Light Rain', rainfall: 10, temp: 22, wind: 20 },
    ]
  },
  // Alternative route (Silchar corridor)
  'silchar': {
    terrainRisk: 0.18,
    hourlyPattern: [
      { hour: 12, condition: 'Light Rain', rainfall: 10, temp: 26, wind: 22 },
      { hour: 13, condition: 'Moderate Rain', rainfall: 15, temp: 25, wind: 25 },
      { hour: 14, condition: 'Light Rain', rainfall: 12, temp: 25, wind: 20 },
      { hour: 15, condition: 'Cloudy', rainfall: 5, temp: 26, wind: 18 },
    ]
  },
  'jiribam': {
    terrainRisk: 0.20,
    hourlyPattern: [
      { hour: 15, condition: 'Light Rain', rainfall: 12, temp: 25, wind: 20 },
      { hour: 16, condition: 'Cloudy', rainfall: 5, temp: 25, wind: 18 },
      { hour: 17, condition: 'Clear', rainfall: 0, temp: 26, wind: 15 },
      { hour: 18, condition: 'Cloudy', rainfall: 3, temp: 25, wind: 18 },
    ]
  }
};

function conditionToSeverity(condition: WeatherCondition, rainfall: number): WeatherSeverity {
  if (condition === 'Thunderstorm' || rainfall >= 50) return 'EXTREME';
  if (condition === 'Heavy Rain' || rainfall >= 30) return 'HIGH';
  if (condition === 'Moderate Rain' || rainfall >= 15) return 'WATCH';
  return 'NORMAL';
}

function applySimulationModifier(
  base: { condition: WeatherCondition; rainfall: number; temp: number; wind: number },
  simulationMode: SimulationMode,
  locationSlug: string
): { condition: WeatherCondition; rainfall: number; temp: number; wind: number } {
  if (simulationMode === 'NORMAL') return base;

  if (simulationMode === 'HEAVY RAIN') {
    const rainfallBoost = locationSlug === 'kohima' || locationSlug === 'dimapur' ? 25 : 15;
    const newRainfall = Math.min(base.rainfall + rainfallBoost, 70);
    let condition = base.condition;
    if (newRainfall >= 50) condition = 'Thunderstorm';
    else if (newRainfall >= 30) condition = 'Heavy Rain';
    else if (newRainfall >= 15) condition = 'Moderate Rain';
    return { ...base, rainfall: newRainfall, condition, wind: base.wind + 15 };
  }

  if (simulationMode === 'LANDSLIDE') {
    if (locationSlug === 'kohima' || locationSlug === 'dimapur') {
      return { condition: 'Thunderstorm', rainfall: 65, temp: base.temp - 3, wind: base.wind + 25 };
    }
  }

  if (simulationMode === 'TRAFFIC SURGE') {
    // Traffic doesn't change weather but signals delays
    return base;
  }

  return base;
}

export const weatherForecastService = {
  getTerrainRisk(locationSlug: string): number {
    return BASELINE_FORECASTS[locationSlug]?.terrainRisk ?? 0.15;
  },

  getForecastForSegment(
    locationSlug: string,
    arrivalHour: number,
    simulationMode: SimulationMode = 'NORMAL'
  ): SegmentWeather {
    const forecast = BASELINE_FORECASTS[locationSlug];
    const baseForecast = forecast ?? {
      hourlyPattern: [{ hour: arrivalHour, condition: 'Cloudy' as WeatherCondition, rainfall: 8, temp: 25, wind: 20 }],
      terrainRisk: 0.15
    };

    // Find the nearest hourly entry
    const pattern = baseForecast.hourlyPattern;
    const nearest = pattern.reduce((prev, curr) =>
      Math.abs(curr.hour - arrivalHour) < Math.abs(prev.hour - arrivalHour) ? curr : prev
    );

    const modified = applySimulationModifier(nearest, simulationMode, locationSlug);
    const severity = conditionToSeverity(modified.condition, modified.rainfall);

    return {
      condition: modified.condition,
      rainfall: modified.rainfall,
      temperature: modified.temp,
      windSpeed: modified.wind,
      severity,
      source: 'Prototype Forecast'
    };
  },

  getConditionColor(condition: WeatherCondition): string {
    switch (condition) {
      case 'Clear': return '#22c55e';       // green
      case 'Cloudy': return '#94a3b8';      // slate
      case 'Light Rain': return '#facc15';  // yellow
      case 'Moderate Rain': return '#f97316'; // orange
      case 'Heavy Rain': return '#ef4444';   // red
      case 'Thunderstorm': return '#7c3aed'; // purple
      default: return '#94a3b8';
    }
  },

  getSeverityColor(severity: WeatherSeverity): string {
    switch (severity) {
      case 'NORMAL': return '#22c55e';
      case 'WATCH': return '#facc15';
      case 'HIGH': return '#f97316';
      case 'EXTREME': return '#ef4444';
      default: return '#94a3b8';
    }
  }
};
