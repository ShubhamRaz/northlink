export type OperationalStatus = 'OPEN' | 'CAUTION' | 'RESTRICTED' | 'BLOCKED';
export type CargoPriority = 'Critical' | 'High' | 'Normal' | 'Low';

export type ShipmentScheduleType = 'one-time' | 'scheduled';

export interface Shipment {
  id: string;
  origin: string;
  destination: string;
  cargoType: string;
  priority: CargoPriority;
  eta: string;
  status: 'Planned' | 'Ready' | 'Dispatched' | 'In Transit' | 'Route Change Pending' | 'Paused for Safety' | 'Delayed' | 'Delivered';
  assignedVehicleId?: string;
  routeId?: string;
  deadline?: string;
  scheduleType?: ShipmentScheduleType;
  schedule?: string; // e.g. "Every Monday", "Bi-Weekly"
  scheduledDate?: string;
  scheduledTime?: string;
  cargoReadyAt?: string;
  dispatchedAt?: string;
  routeApprovedAt?: string;
  routeApprovedBy?: UserRole;
  notes?: string;
  startTime?: string;
}

export interface Vehicle {
  id: string;
  driver: string;
  driverId?: string; // unique ID for driver login
  cargoType: string;
  location: string;
  speed: number;
  heading: number;
  status: 'Available' | 'Loading' | 'Ready' | 'In Transit' | 'Monitoring' | 'Route Change Pending' | 'Paused for Safety' | 'Delayed' | 'Delivered';
  currentRouteId?: string;
  eta: string;
  lastUpdated: string;
  coordinates: [number, number]; // [lat, lng]
  progress?: number; // 0 to 1 percentage of completion
  progressMinutes?: number; // Tracks simulation time spent on route
  currentRouteGeometry?: [number, number][];
}

export interface Incident {
  id: string;
  type: 'Landslide' | 'Flood' | 'Road Blockage' | 'Bridge Damage' | 'Heavy Rain' | 'Traffic' | 'Accident';
  location: string;
  severity: 'High' | 'Medium' | 'Low' | 'Critical';
  status: 'Reported' | 'Under Review' | 'Verified' | 'Unresolved' | 'Resolved' | 'Rejected';
  verificationStatus: 'REPORTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  resolutionStatus: 'UNRESOLVED' | 'RESOLVED';
  passability?: OperationalStatus;
  impactAssessment?: {
    assessedAt: string;
    affectedShipmentIds: string[];
    affectsRemainingRoute: boolean;
    recommendedAction: 'MONITOR' | 'ROUTE_CHANGE' | 'PAUSE_FOR_SAFETY';
  };
  description: string;
  timestamp: string;
  source: string;
  confidence: number;
  affectedCorridorId?: string;
  coordinates: [number, number];
}

export interface District {
  id: string;
  name: string;
  connectivity: OperationalStatus;
  activeIncidents: number;
  highRiskCorridors: number;
  activeDeliveries: number;
  coordinates: [number, number];
}

export interface Corridor {
  id: string;
  name: string;
  status: OperationalStatus;
  risk: number; // 0 - 100
  accessibility: OperationalStatus;
  lastUpdated: string;
  source: string;
  coordinates: [number, number][];
  baseTravelTime: number; // minutes
}

export interface PredictionFactor {
  factor: string;
  contribution: number; // -1 to 1 (negative reduces risk, positive increases risk)
  description: string;
}

export interface RiskPrediction {
  probability: number; // 0 - 1
  expectedDelay: number; // minutes
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence: number; // 0 - 1
  contributingFactors: PredictionFactor[];
  lastUpdated: string;
}

export interface RouteAlternative {
  id: string;
  name: string;
  corridorIds: string[];
  distance: number; // km
  baseEta: number; // minutes
  currentEta: number; // minutes
  uncertaintyRange: number; // minutes (e.g. +/- 35m)
  cost: number;
  risk: number; // 0 - 100
  resilience: number; // 0 - 100
  status: 'FEASIBLE' | 'BLOCKED' | 'RESTRICTED';
  isFeasible: boolean;
  priorityScore: number;
  reasons: string[];
  coordinates: [number, number][];
}

export type DecisionType = 'INITIAL_ROUTE_APPROVAL' | 'MID_JOURNEY_REROUTE' | 'KEEP_CURRENT_ROUTE' | 'MANUAL_OVERRIDE';

export interface DecisionHistory {
  id: string;
  timestamp: string;
  shipmentId: string;
  selectedRouteId: string;
  candidateRoutes: RouteAlternative[];
  trigger: string;
  reason: string;
  decisionType: DecisionType;
  approvedBy?: string;
  isOverride?: boolean;
  risk?: number;
  eta?: string;
  cost?: number;
  resilience?: number;
  forecastVersion?: string;
}

export type RecommendationStatus = 'ACTIVE' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'STALE';

export interface RouteRecommendation {
  id: string;
  shipmentId: string;
  incidentId?: string;
  recommendedRouteId: string;
  alternativeRoutes: RouteAlternative[];
  reason: string;
  status: RecommendationStatus;
  createdAt: string;
  lastEvaluatedAt: string;
  trigger: string;
  vehicleId?: string;
  currentRouteId?: string;
  currentRisk?: number;
  newRisk?: number;
  currentETA?: string;
  newETA?: string;
  resilience?: number;
  explanation?: string;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  entityType: 'SHIPMENT' | 'VEHICLE' | 'INCIDENT' | 'ROUTE' | 'ALERT';
  entityId: string;
  shipmentId?: string;
  vehicleId?: string;
  incidentId?: string;
  actorRole: UserRole | 'SYSTEM';
  action: string;
  previousState?: string;
  nextState?: string;
  reason?: string;
  timestamp: string;
  correlationId?: string;
}

export interface Alert {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'ROUTE UPDATE' | 'INCIDENT' | 'SYSTEM';
  title: string;
  message: string;
  severity: 'High' | 'Medium' | 'Low';
  timestamp: string;
  read: boolean;
  recipientRole?: UserRole;
  actionRequired?: boolean;
  actionTaken?: boolean;
  shipmentId?: string;
  vehicleId?: string;
  routeId?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: UserRole;
}

export type UserRole = 'Dispatcher' | 'Field Officer' | 'Driver' | 'Admin';

export interface QueuedIncident {
  id: string;
  createdAt: string;
  incidentData: Partial<Incident>;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
}

export interface DeliveryPoint {
  id: string;
  name: string;
  district: string;
  type: 'Warehouse' | 'Hospital' | 'Depot' | 'Distribution Center';
  coordinates: [number, number];
  activeShipments: number;
  outgoingDeliveries: number;
}

export interface SimulationEvent {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
}

export type MapLayer = 'Corridors' | 'Vehicles' | 'Incidents' | 'Warehouses' | 'Deliveries' | 'Risk Zones' | 'Districts';

export type SimulationMode = 'NORMAL' | 'HEAVY RAIN' | 'LANDSLIDE' | 'TRAFFIC SURGE' | 'OFFLINE' | 'RESET SCENARIO';

// ── Time-Aware Route Intelligence ──────────────────────────────────────────

export type WeatherCondition = 'Clear' | 'Cloudy' | 'Light Rain' | 'Moderate Rain' | 'Heavy Rain' | 'Thunderstorm';
export type WeatherSeverity = 'NORMAL' | 'WATCH' | 'HIGH' | 'EXTREME';

export interface SegmentWeather {
  condition: WeatherCondition;
  rainfall: number;       // mm/hr
  temperature: number;    // °C
  windSpeed: number;      // km/h
  severity: WeatherSeverity;
  source: 'Prototype Forecast';
}

export interface RouteSegment {
  id: string;
  routeId: string;
  sequence: number;
  location: string;
  coordinates: [number, number];
  distanceFromOrigin: number; // km
  segmentDistance: number;    // km
  estimatedTravelMinutes: number; // minutes from previous segment
  estimatedArrivalTime: string;   // HH:MM format
  weather: SegmentWeather;
  terrainRisk: number;       // 0–1
  incidentRisk: number;      // 0–1
  trafficRisk: number;       // 0–1
  disruptionProbability: number; // 0–1
  expectedDelay: number;     // minutes
  accessibility: OperationalStatus;
  confidence: number;        // 0–1
  isCompleted?: boolean;
  isActive?: boolean;
  geometry?: [number, number][]; // Full route geometry for this segment
}

export interface JourneyOutlook {
  totalDistanceKm: number;
  baseTravelMinutes: number;
  currentTravelMinutes: number;
  predictedDelayMinutes: number;
  forecastRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  highestRiskSegmentId: string | null;
  highRiskSegmentCount: number;
  advanceWarnings: AdvanceWarning[];
}

export interface AdvanceWarning {
  segmentId: string;
  location: string;
  expectedArrivalTime: string;
  minutesAhead: number;
  disruptionProbability: number;
  expectedDelay: number;
  cause: string;
  severity: WeatherSeverity;
}

export interface JourneyAnalysis {
  id: string;
  shipmentId: string;
  routeId: string;
  origin: string;
  destination: string;
  startTime: string;
  segments: RouteSegment[];
  outlook: JourneyOutlook;
  lastAnalyzed: string;
}

