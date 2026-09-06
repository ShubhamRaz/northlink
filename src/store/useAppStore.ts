import { create } from 'zustand';
import {
  Vehicle, Shipment, Incident, Corridor, District,
  MapLayer, SimulationMode, SimulationEvent, DeliveryPoint,
  RouteAlternative, DecisionHistory, Alert, UserRole, QueuedIncident, JourneyAnalysis, RouteRecommendation, AuditEvent
} from '@/types';
import {
  mockVehicles, mockShipments, mockIncidents,
  mockCorridors, mockDistricts, mockDeliveryPoints, mockAlerts
} from '@/data/mockData';
import { generateRoutesAsync, resolveLocationCoordinates, reassessRemainingJourney } from '@/services/routeService';
import { predictCorridorRisk } from '@/services/riskService';
import { determineAccessibility } from '@/services/accessibilityService';
import { incidentRelevanceService } from '@/services/incidentRelevanceService';

export type AppView =
  | 'command-center'
  | 'map'
  | 'optimizer'
  | 'insights'
  | 'analytics'
  | 'vehicles'
  | 'shipments'
  | 'incidents'
  | 'field'
  | 'driver'
  | 'login'
  | 'settings';

interface AppState {
  // Data entities
  vehicles: Vehicle[];
  shipments: Shipment[];
  shipmentsHydrated: boolean;
  shipmentPersistenceError: string | null;
  incidents: Incident[];
  corridors: Corridor[];
  districts: District[];
  deliveryPoints: DeliveryPoint[];

  // Selections
  selectedVehicleId: string | null;
  selectedShipmentId: string | null;
  selectedIncidentId: string | null;
  selectedCorridorId: string | null;

  // AI & Routing State
  routesByShipment: Record<string, RouteAlternative[]>;
  decisionHistory: DecisionHistory[];
  routeRecommendations: RouteRecommendation[];
  auditTrail: AuditEvent[];

  // App State
  simulationActive: boolean;
  simulationMode: SimulationMode;
  networkOnline: boolean;
  activeMapLayers: MapLayer[];
  eventFeed: SimulationEvent[];
  alerts: Alert[];
  offlineQueue: QueuedIncident[];
  currentUserRole: UserRole;
  demoStage: number;
  playbackSpeed: number;

  // Journey Intelligence
  journeyAnalysis: JourneyAnalysis | null;
  journeyStartTime: string; // HH:MM
  currentDriverVehicleId: string | null; // Set at driver login
  trackedVehicleId: string | null; // Map focus: null = show all

  // Single-page view navigation
  currentView: AppView;
  setView: (view: AppView) => void;

  // Actions
  setSimulationActive: (active: boolean) => void;
  setSimulationMode: (mode: SimulationMode) => void;
  setPlaybackSpeed: (speed: number) => void;
  setNetworkOnline: (online: boolean) => void;
  toggleMapLayer: (layer: MapLayer) => void;
  
  selectVehicle: (id: string | null) => void;
  selectShipment: (id: string | null) => void;
  selectIncident: (id: string | null) => void;
  selectCorridor: (id: string | null) => void;

  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  // --- NEW WORKFLOW ACTIONS ---
  // 1. Shipment Lifecycle
  createShipment: (shipmentData: any) => void;
  markCargoReady: (shipmentId: string) => void;
  analyzeRoutesForReadyShipment: (shipmentId: string) => Promise<void>;
  approveInitialRoute: (shipmentId: string, routeId: string) => void;
  overrideInitialRoute: (shipmentId: string, routeId: string, reason: string) => void;
  dispatchCargo: (shipmentId: string) => void;

  // 2. Incident & Mid-Journey
  verifyIncident: (id: string) => void;
  resolveIncident: (id: string) => void;
  rejectIncident: (id: string) => void;
  assessIncidentImpact: (incidentId: string) => Promise<void>;
  decideMidJourneyRoute: (shipmentId: string, decision: 'CHANGE' | 'KEEP', routeId?: string) => Promise<void>;
  recordAuditEvent: (event: Omit<AuditEvent, 'id' | 'timestamp' | 'actorRole'> & { actorRole?: AuditEvent['actorRole'] }) => void;

  // 3. System & Legacy
  addEvent: (event: Omit<SimulationEvent, 'id' | 'timestamp'>) => void;
  clearSelections: () => void;
  recalculateNetwork: () => void;
  resetScenario: () => void;
  setCurrentUserRole: (role: UserRole) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void;
  markAlertRead: (id: string) => void;
  acknowledgeAlert: (id: string) => void;
  acknowledgeRouteChange: (id: string) => void;
  queueIncident: (incidentData: Partial<Incident>) => void;
  setOfflineQueue: (queue: QueuedIncident[]) => void;
  addIncident: (incident: Incident) => void;
  setDemoStage: (stage: number) => void;
  initializeScenario: () => void;

  // Journey Intelligence Actions
  analyzeJourney: (shipmentId: string, startTime?: string, routeId?: string, routeCoordinates?: [number, number][], routeDurationMinutes?: number) => Promise<void>;
  setJourneyStartTime: (time: string) => void;
  refreshJourneyAnalysis: () => void;
  setCurrentDriverVehicleId: (id: string) => void;
  setTrackedVehicleId: (id: string | null) => void;
  hydrateShipments: (shipments: Shipment[]) => void;
  persistShipments: () => Promise<void>;
  persistVehicles: () => void;
  hydrateVehicles: (vehicles: Vehicle[], routesByShipment: Record<string, RouteAlternative[]>, routeRecommendations?: RouteRecommendation[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  injectDisasterAtPoint: (coordinates: [number, number], type: Incident['type'], severity: Incident['severity'], location: string) => void;
}

const defaultLayers: MapLayer[] = ['Corridors', 'Vehicles', 'Incidents', 'Deliveries'];

function haversineKm(a: [number, number], b: [number, number]): number {
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

// Downsampled nearest route index: checks at most 200 points for performance.
// With 10,000+ route points, checking every point would freeze the browser.
function nearestRouteIndex(point: [number, number], geometry: [number, number][]): number {
  if (geometry.length === 0) return 0;
  const step = Math.max(1, Math.floor(geometry.length / 200));
  let nearestIndex = 0;
  let nearestDist = haversineKm(point, geometry[0]);
  for (let i = 0; i < geometry.length; i += step) {
    const d = haversineKm(point, geometry[i]);
    if (d < nearestDist) {
      nearestDist = d;
      nearestIndex = i;
    }
  }
  return nearestIndex;
}

export const useAppStore = create<AppState>((set, get) => ({
  vehicles: JSON.parse(JSON.stringify(mockVehicles)),
  shipments: JSON.parse(JSON.stringify(mockShipments)),
  shipmentsHydrated: false,
  shipmentPersistenceError: null,
  incidents: JSON.parse(JSON.stringify(mockIncidents)),
  corridors: JSON.parse(JSON.stringify(mockCorridors)),
  districts: JSON.parse(JSON.stringify(mockDistricts)),
  deliveryPoints: JSON.parse(JSON.stringify(mockDeliveryPoints)),

  selectedVehicleId: null,
  selectedShipmentId: null,
  selectedIncidentId: null,
  selectedCorridorId: null,

  routesByShipment: {},
  decisionHistory: [],
  routeRecommendations: [],
  auditTrail: [],

  simulationActive: false,
  simulationMode: 'NORMAL',
  networkOnline: true,
  activeMapLayers: defaultLayers,
  eventFeed: [],
  alerts: JSON.parse(JSON.stringify(mockAlerts)),
  offlineQueue: [],
  currentUserRole: 'Dispatcher',
  demoStage: 0,
  playbackSpeed: 4,
  journeyAnalysis: null,
  journeyStartTime: '10:00',
  currentDriverVehicleId: null,
  trackedVehicleId: null,

  currentView: 'command-center',
  setView: (view) => set({ currentView: view }),

  setSimulationActive: (active) => set({ simulationActive: active }),
  
  setPlaybackSpeed: (speed) => {
    set({ playbackSpeed: speed });
    import('@/services/simulationService').then(({ simulationService }) => {
      simulationService.setSpeed(speed);
    });
  },

  setSimulationMode: (mode) => {
    if (mode === 'RESET SCENARIO') {
      get().resetScenario();
      return;
    }

    set({ simulationMode: mode });
    get().addEvent({
      message: `Simulation mode changed to ${mode}`,
      type: 'warning'
    });

    // If LANDSLIDE, simulate an incident on C02
    if (mode === 'LANDSLIDE') {
      const landslideIncident: Incident = {
        id: 'INC-' + Math.floor(Math.random() * 1000),
        type: 'Landslide',
        location: 'NH-102 (Imphal Approach)',
        severity: 'Critical',
        timestamp: new Date().toLocaleTimeString(),
        status: 'Reported',
        verificationStatus: 'REPORTED',
        resolutionStatus: 'UNRESOLVED',
        description: 'Major landslide blocking the highway due to heavy rainfall.',
        coordinates: [25.0, 93.9], // roughly on C02
        source: 'Satellite & Field Sensor',
        confidence: 0.95,
        affectedCorridorId: 'C02'
      };
      
      get().addIncident(landslideIncident);
    }

    // After setting mode (and possibly adding incidents), recalculate network risk and routing
    setTimeout(() => {
      get().recalculateNetwork();
      get().refreshJourneyAnalysis();
    }, 100);
  },

  setNetworkOnline: (online) => {
    set({ networkOnline: online });
    get().addEvent({
      message: online ? 'Network connection restored' : 'Network connection lost',
      type: online ? 'success' : 'critical'
    });
    
    // Automatically trigger sync if going online
    if (online) {
      import('@/services/syncService').then(({ syncService }) => {
        syncService.processQueue();
      });
    }
  },
  
  toggleMapLayer: (layer) => set((state) => {
    const layers = state.activeMapLayers;
    if (layers.includes(layer)) {
      return { activeMapLayers: layers.filter(l => l !== layer) };
    }
    return { activeMapLayers: [...layers, layer] };
  }),

  selectVehicle: (id) => set({ selectedVehicleId: id, selectedShipmentId: null, selectedIncidentId: null, selectedCorridorId: null }),
  selectShipment: (id) => set((state) => {
    // When switching shipments, clear the previous shipment's route analysis
    // so we don't show stale routes. Keep vehicle route geometry intact so
    // in-transit vehicles still render on the map.
    const isSameShipment = state.selectedShipmentId === id;
    if (isSameShipment) return {};
    return {
      selectedShipmentId: id,
      selectedVehicleId: null,
      selectedIncidentId: null,
      selectedCorridorId: null,
      journeyAnalysis: null,
      // State is now isolated per shipment, no need to clear anything on selection change
    };
  }),
  selectIncident: (id) => set({ selectedIncidentId: id, selectedVehicleId: null, selectedShipmentId: null, selectedCorridorId: null }),
  selectCorridor: (id) => set({ selectedCorridorId: id, selectedVehicleId: null, selectedShipmentId: null, selectedIncidentId: null }),

  clearSelections: () => set({ selectedVehicleId: null, selectedShipmentId: null, selectedIncidentId: null, selectedCorridorId: null }),

  updateVehicle: (id, updates) => set((state) => ({
    vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...updates, lastUpdated: new Date().toISOString() } : v)
  })),

  // --- 1. SHIPMENT LIFECYCLE ---

  createShipment: (data) => {
    const newShipment: Shipment = {
      id: data.id || `SHIP-${Math.floor(Math.random() * 1000)}`,
      cargoType: data.cargoType,
      origin: data.origin,
      destination: data.destination,
      priority: data.priority,
      status: 'Planned',
      eta: '--',
      assignedVehicleId: data.assignedVehicleId,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      scheduleType: data.scheduleType,
      schedule: data.schedule,
      deadline: data.deadline,
      notes: data.notes
    };
    
    set(state => ({
      shipments: [newShipment, ...state.shipments.filter(s => s.id !== data.id)],
      selectedShipmentId: newShipment.id
    }));

    get().recordAuditEvent({
      eventType: 'SHIPMENT_CREATED', entityType: 'SHIPMENT', entityId: newShipment.id,
      shipmentId: newShipment.id, action: 'Shipment created', nextState: 'Planned'
    });

    get().addEvent({ message: `Shipment ${newShipment.id} created (Planned).`, type: 'info' });
    void get().persistShipments();
  },

  markCargoReady: (shipmentId) => {
    const timeNow = new Date().toISOString();
    const previous = get().shipments.find(s => s.id === shipmentId)?.status;
    set(state => ({
      shipments: state.shipments.map(s => s.id === shipmentId ? { ...s, status: 'Ready', cargoReadyAt: timeNow } : s)
    }));
    get().recordAuditEvent({
      eventType: 'CARGO_READY', entityType: 'SHIPMENT', entityId: shipmentId,
      shipmentId, action: 'Cargo marked ready', previousState: previous, nextState: 'Ready'
    });
    get().addEvent({ message: `Cargo for ${shipmentId} is Ready.`, type: 'info' });
    get().analyzeRoutesForReadyShipment(shipmentId);
    void get().persistShipments();
  },

  analyzeRoutesForReadyShipment: async (shipmentId) => {
    const state = get();
    const shipment = state.shipments.find(s => s.id === shipmentId);
    if (!shipment || shipment.status !== 'Ready') return;

    const actualStart = shipment.cargoReadyAt
      ? new Date(shipment.cargoReadyAt).toTimeString().slice(0, 5)
      : shipment.scheduledTime ?? shipment.startTime ?? '10:00';

    const alternatives = (await generateRoutesAsync(shipment, state.incidents, state.simulationMode, undefined, undefined, actualStart));
    const bestRoute = alternatives.find(a => a.isFeasible);
    
    if (bestRoute) {
      set(s => ({ routesByShipment: { ...s.routesByShipment, [shipmentId]: alternatives } }));
      state.addEvent({
        message: `Route analysis completed for ${shipment.id}. Recommended: ${bestRoute.name}. Pending Dispatcher Decision.`,
        type: 'info'
      });
      await state.analyzeJourney(shipmentId, actualStart, bestRoute.id, bestRoute.coordinates, bestRoute.currentEta);
    } else {
      set(s => ({ routesByShipment: { ...s.routesByShipment, [shipmentId]: alternatives } }));
      state.addEvent({ message: `ALERT: No feasible routes found for ${shipment.id}`, type: 'critical' });
    }
  },

  approveInitialRoute: (shipmentId, routeId) => {
    const state = get();
    if (state.currentUserRole !== 'Dispatcher' && state.currentUserRole !== 'Admin') return;
    const shipment = state.shipments.find(s => s.id === shipmentId);
    const candidateRoutes = state.routesByShipment[shipmentId] || [];
    const route = candidateRoutes.find(r => r.id === routeId);
    if (!shipment || !route) return;

    const decision: DecisionHistory = {
      id: 'DEC-' + Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      shipmentId,
      selectedRouteId: route.id,
      candidateRoutes,
      trigger: 'Initial Route Approval',
      reason: route.reasons[0] || 'Dispatcher selected route',
      decisionType: 'INITIAL_ROUTE_APPROVAL',
      approvedBy: state.currentUserRole,
      risk: route.risk,
      eta: `${Math.floor(route.currentEta / 60)}h ${route.currentEta % 60}m`,
      cost: route.cost,
      resilience: route.resilience
    };

    const approvedAt = new Date().toISOString();
    set(s => ({
      decisionHistory: [decision, ...s.decisionHistory],
      shipments: s.shipments.map(sh => sh.id === shipmentId ? { 
        ...sh, 
        routeId: route.id,
        eta: decision.eta || sh.eta,
        routeApprovedAt: approvedAt,
        routeApprovedBy: s.currentUserRole,
        status: 'Ready'
      } : sh)
    }));
    
    // Assign route to vehicle if already assigned
    if (shipment.assignedVehicleId) {
      set(s => ({
        vehicles: s.vehicles.map(v => v.id === shipment.assignedVehicleId ? { ...v, currentRouteId: route.id, currentRouteGeometry: route.coordinates, eta: decision.eta || v.eta, status: 'Ready' } : v)
      }));
    }

    state.addEvent({ message: `Route ${route.name} approved for ${shipmentId}. Ready for dispatch.`, type: 'success' });
    state.recordAuditEvent({
      eventType: 'ROUTE_APPROVED', entityType: 'ROUTE', entityId: route.id,
      shipmentId, action: 'Initial route approved', nextState: 'Ready', reason: decision.reason
    });
    state.refreshJourneyAnalysis();
    void state.persistShipments();
    state.persistVehicles();
  },

  overrideInitialRoute: (shipmentId, routeId, reason) => {
    const state = get();
    if (state.currentUserRole !== 'Dispatcher' && state.currentUserRole !== 'Admin') return;
    const shipment = state.shipments.find(s => s.id === shipmentId);
    const candidateRoutes = state.routesByShipment[shipmentId] || [];
    const route = candidateRoutes.find(r => r.id === routeId);
    if (!shipment || !route) return;

    const decision: DecisionHistory = {
      id: 'DEC-' + Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      shipmentId,
      selectedRouteId: route.id,
      candidateRoutes,
      trigger: 'Manual Override',
      reason,
      decisionType: 'MANUAL_OVERRIDE',
      approvedBy: state.currentUserRole,
      isOverride: true,
      risk: route.risk,
      eta: `${Math.floor(route.currentEta / 60)}h ${route.currentEta % 60}m`,
      cost: route.cost,
      resilience: route.resilience
    };

    set(s => ({
      decisionHistory: [decision, ...s.decisionHistory],
      shipments: s.shipments.map(sh => sh.id === shipmentId ? { 
        ...sh, 
        routeId: route.id,
        eta: decision.eta || sh.eta
      } : sh)
    }));

    if (shipment.assignedVehicleId) {
      set(s => ({
        vehicles: s.vehicles.map(v => v.id === shipment.assignedVehicleId ? { ...v, currentRouteId: route.id, eta: decision.eta || v.eta } : v)
      }));
    }

    state.addEvent({ message: `Route ${route.name} manually overridden for ${shipmentId}. Ready for dispatch.`, type: 'warning' });
    state.refreshJourneyAnalysis();
  },

  dispatchCargo: (shipmentId) => {
    const state = get();
    if (state.currentUserRole !== 'Dispatcher' && state.currentUserRole !== 'Admin') return;
    const shipment = state.shipments.find(s => s.id === shipmentId);
    if (!shipment || shipment.status !== 'Ready' || !shipment.routeId) {
      state.addEvent({ message: `Cannot dispatch ${shipmentId}: No route approved.`, type: 'critical' });
      return;
    }
    
    const timeNow = new Date().toISOString();

    set(s => ({
      shipments: s.shipments.map(sh => sh.id === shipmentId ? { ...sh, status: 'In Transit', dispatchedAt: timeNow } : sh)
    }));

    if (shipment.assignedVehicleId) {
      set(s => ({
        vehicles: s.vehicles.map(v => v.id === shipment.assignedVehicleId ? { ...v, status: 'In Transit', progress: 0, progressMinutes: 0 } : v)
      }));
    }

    state.addEvent({ message: `Cargo ${shipmentId} Dispatched. Monitoring active.`, type: 'success' });
    state.recordAuditEvent({
      eventType: 'CARGO_DISPATCHED', entityType: 'SHIPMENT', entityId: shipmentId,
      shipmentId, action: 'Cargo dispatched', previousState: 'Ready', nextState: 'In Transit'
    });
    
    if (!state.simulationActive) {
      import('@/services/simulationService').then(({ simulationService }) => {
        simulationService.start();
      });
    }
    void state.persistShipments();
    state.persistVehicles();
  },

  // --- 2. INCIDENT & MID-JOURNEY LOGIC ---

  verifyIncident: (id) => {
    if (get().currentUserRole !== 'Dispatcher' && get().currentUserRole !== 'Admin') return;
    const incident = get().incidents.find(i => i.id === id);
    if (!incident || incident.verificationStatus === 'REJECTED') return;
    set(state => ({ incidents: state.incidents.map(i => i.id === id ? { ...i, status: 'Verified', verificationStatus: 'VERIFIED' } : i) }));
    get().recordAuditEvent({ eventType: 'INCIDENT_VERIFIED', entityType: 'INCIDENT', entityId: id, incidentId: id, action: 'Incident verified', previousState: incident.status, nextState: 'VERIFIED' });
    get().addEvent({ message: `Incident ${id} verified. Ready for impact assessment.`, type: 'warning' });
  },

  resolveIncident: (id) => {
    if (get().currentUserRole !== 'Dispatcher' && get().currentUserRole !== 'Admin') return;
    const incident = get().incidents.find(i => i.id === id);
    if (!incident || incident.verificationStatus !== 'VERIFIED') return;
    set(state => ({ incidents: state.incidents.map(i => i.id === id ? { ...i, status: 'Resolved', resolutionStatus: 'RESOLVED', passability: 'OPEN' } : i) }));
    get().recordAuditEvent({ eventType: 'INCIDENT_RESOLVED', entityType: 'INCIDENT', entityId: id, incidentId: id, action: 'Incident resolved', previousState: incident.resolutionStatus, nextState: 'RESOLVED' });
    get().addEvent({ message: `Incident ${id} Resolved.`, type: 'success' });
    
    const state = get();
    // Cancel any active recommendations related to this incident
    const staleRecs = state.routeRecommendations.filter(r => r.incidentId === id && r.status === 'ACTIVE');
    
    set(s => ({
      routeRecommendations: s.routeRecommendations.map((r: RouteRecommendation) => r.incidentId === id && r.status === 'ACTIVE' ? { ...r, status: 'CANCELLED' } : r)
    }));

    // Re-evaluate paused vehicles
    staleRecs.forEach(rec => {
      const shipment = get().shipments.find(sh => sh.id === rec.shipmentId);
      const vehicle = get().vehicles.find(v => v.id === shipment?.assignedVehicleId);
      
      if (shipment && vehicle && vehicle.status === 'Paused for Safety') {
        // Are there other active blockages for this shipment?
        const otherBlockages = get().routeRecommendations.some(r => r.shipmentId === shipment.id && r.status === 'ACTIVE');
        if (!otherBlockages) {
          set(s => ({
            shipments: s.shipments.map(sh => sh.id === shipment.id ? { ...sh, status: 'In Transit' } : sh),
            vehicles: s.vehicles.map(v => v.id === vehicle.id ? { ...v, status: 'In Transit', speed: 45 } : v)
          }));
          get().addAlert({
            type: 'INFO', title: 'Vehicle Resumed',
            message: `Incident resolved. Vehicle ${vehicle.id} has safely resumed its journey.`,
            severity: 'Low', recipientRole: 'Driver', actionRequired: false, actionTaken: false
          });
        }
      }
    });

    setTimeout(() => get().recalculateNetwork(), 100);
  },
  
  rejectIncident: (id) => {
    if (get().currentUserRole !== 'Dispatcher' && get().currentUserRole !== 'Admin') return;
    set(state => ({ incidents: state.incidents.map(i => i.id === id ? { ...i, status: 'Rejected', verificationStatus: 'REJECTED' } : i) }));
    get().addEvent({ message: `Incident ${id} Rejected.`, type: 'info' });
  },

  assessIncidentImpact: async (incidentId) => {
    const state = get();
    if (state.currentUserRole !== 'Dispatcher' && state.currentUserRole !== 'Admin') return;
    const incident = state.incidents.find(i => i.id === incidentId);
    if (!incident || incident.verificationStatus !== 'VERIFIED' || incident.resolutionStatus !== 'UNRESOLVED') return;
    
    const timeNow = new Date().toLocaleTimeString();

    // Cache the relevance per shipment to avoid re-calculating
    const relevanceMap = new Map<string, ReturnType<typeof incidentRelevanceService.assessIncidentRelevance>>();

    const affectedShipments = state.shipments.filter(s => {
      if (s.status !== 'In Transit' && s.status !== 'Route Change Pending' && s.status !== 'Paused for Safety') return false;
      const vehicle = state.vehicles.find(v => v.id === s.assignedVehicleId);
      if (!vehicle || !vehicle.currentRouteId) return false;
      
      const relevance = incidentRelevanceService.assessIncidentRelevance(incident, vehicle, s);
      relevanceMap.set(s.id, relevance);
      
      return relevance.affectsRemainingRoute;
    });

    set(s => ({ incidents: s.incidents.map(i => i.id === incidentId ? {
      ...i,
      passability: affectedShipments.length > 0 ? relevanceMap.get(affectedShipments[0].id)?.passability : i.passability,
      impactAssessment: {
        assessedAt: timeNow,
        affectedShipmentIds: affectedShipments.map(shipment => shipment.id),
        affectsRemainingRoute: affectedShipments.length > 0,
        recommendedAction: affectedShipments.length > 0 ? 'ROUTE_CHANGE' : 'MONITOR'
      }
    } : i) }));

    if (affectedShipments.length > 0) {
      const updatedCorridors = get().corridors.map(corridor => {
        const riskPred = predictCorridorRisk(corridor, get().incidents, get().simulationMode);
        const accessibility = determineAccessibility(corridor, riskPred, get().incidents);
        return { ...corridor, risk: Math.round(riskPred.probability * 100), accessibility };
      });
      set({ corridors: updatedCorridors });

      for (const shipment of affectedShipments) {
        const vehicle = state.vehicles.find(item => item.id === shipment.assignedVehicleId);
        const destination = resolveLocationCoordinates(shipment.destination);
        if (!vehicle || !destination) continue;
        
        const relevance = relevanceMap.get(shipment.id)!;
        
        if (relevance.requiresSafetyPause) {
          set(s => ({
            shipments: s.shipments.map(sh => sh.id === shipment.id ? { ...sh, status: 'Route Change Pending' } : sh),
            vehicles: s.vehicles.map(v => v.id === shipment.assignedVehicleId ? { ...v, status: 'Paused for Safety' } : v)
          }));
          get().addAlert({
            type: 'CRITICAL', title: 'Vehicle Paused for Safety',
            message: `Vehicle ${shipment.assignedVehicleId} paused due to ${relevance.reason}.`,
            severity: 'High', recipientRole: 'Driver', actionRequired: false, actionTaken: false
          });
        }

        // TRUE CURRENT-POSITION REROUTING
        // Fetch new candidate routes starting from the vehicle's CURRENT GPS coordinates
        // to the original destination.
        let alternatives: RouteAlternative[] = [];
        try {
          alternatives = await reassessRemainingJourney(
            shipment,
            vehicle.coordinates,
            get().incidents,
            get().simulationMode
          );
        } catch (error) {
          console.error("Failed to reassess journey:", error);
          // Fallback if the router fails completely, but usually it returns at least a prototype
          alternatives = state.routesByShipment[shipment.id] || [];
        }

        const currentRouteAlt = (state.routesByShipment[shipment.id] || []).find(a => a.id === shipment.routeId);
        
        // Find the best fresh alternative
        const feasibleOsrm = alternatives.find(a => a.isFeasible && a.coordinates.length > 2);
        const bestRoute = feasibleOsrm || alternatives.slice().sort((a, b) => a.risk - b.risk)[0];
        
        if (bestRoute) {
          const allBlocked = !alternatives.some(a => a.isFeasible);
          const rec: RouteRecommendation = {
            id: 'REC-' + Math.random().toString(36).substring(7),
            shipmentId: shipment.id,
            incidentId,
            recommendedRouteId: bestRoute.id,
            alternativeRoutes: alternatives,
            reason: allBlocked
              ? `All routes affected by ${incident.type}. ${bestRoute.name} is the least-risky option at ${bestRoute.risk}% risk. Vehicle paused for safety pending dispatcher decision.`
              : `Avoids affected corridor. Reduces risk from ${currentRouteAlt?.risk || 100}% to ${bestRoute.risk}%.`,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            lastEvaluatedAt: new Date().toISOString(),
            trigger: 'Mid-Journey Verification',
            explanation: allBlocked
              ? `NORTHLINK detected a verified unresolved ${incident.type.toLowerCase()} ahead. All candidate routes to ${shipment.destination} are affected. ${bestRoute.name} is the least-risky option at ${bestRoute.risk}% risk with an estimated ${Math.floor(bestRoute.currentEta / 60)}h ${bestRoute.currentEta % 60}m journey. Vehicle is paused for safety. Dispatcher must decide whether to proceed, reroute, or hold.`
              : `NORTHLINK detected a verified unresolved ${incident.type.toLowerCase()} ahead on the current route. The affected route has ${currentRouteAlt?.risk ?? 100}% predicted risk; ${bestRoute.name} is recommended at ${bestRoute.risk}% risk with an estimated ${Math.floor(bestRoute.currentEta / 60)}h ${bestRoute.currentEta % 60}m journey.`
          };
          set(s => ({ routeRecommendations: [rec, ...s.routeRecommendations], routesByShipment: { ...s.routesByShipment, [shipment.id]: alternatives } }));
          get().persistVehicles();
          import('@/services/assistantService').then(({ assistantService }) => {
            assistantService.askQuestion(`Why was ${bestRoute.name} recommended for ${shipment.id}?`).then(({ reply }) => {
              set(s => ({ routeRecommendations: s.routeRecommendations.map(item => item.id === rec.id ? { ...item, explanation: reply } : item) }));
            });
          });
          get().addAlert({
            type: 'ROUTE UPDATE', title: 'Route Change Recommended',
            message: `Recommendation generated for ${shipment.id}: ${bestRoute.name}.`,
            severity: 'High', recipientRole: 'Dispatcher', actionRequired: true, actionTaken: false
          });
        }
      }

      if (affectedShipments.length > 0) {
        get().addEvent({ message: `Impact assessment complete for ${incidentId}: ${affectedShipments.length} shipment(s) affected.`, type: 'warning' });
        get().persistVehicles();
      }
    } else {
      get().addEvent({ message: `Impact assessment complete for ${incidentId}: no in-transit shipments affected.`, type: 'info' });
    }
  },

  decideMidJourneyRoute: async (shipmentId, decision, routeId) => {
    const state = get();
    if (state.currentUserRole !== 'Dispatcher' && state.currentUserRole !== 'Admin') return;
    const shipment = state.shipments.find(s => s.id === shipmentId);
    const rec = state.routeRecommendations.find(r => r.shipmentId === shipmentId && r.status === 'ACTIVE');
    if (!shipment || !rec) return;

    if (decision === 'CHANGE' && routeId) {
      const selectedRoute = rec.alternativeRoutes.find(r => r.id === routeId);
      if (!selectedRoute) return;

      // Get the vehicle's current position — the new route must start FROM HERE,
      // not from the original origin. This is the key fix: when a cargo is at 50km
      // of a 100km route and a disaster is at 75km, the reroute must go from 50km
      // to the destination, NOT from the origin again.
      const vehicle = state.vehicles.find(v => v.id === shipment.assignedVehicleId);
      const destination = resolveLocationCoordinates(shipment.destination);
      if (!vehicle || !destination) return;

      // TRUE CURRENT-POSITION REROUTING:
      // The selected route was generated fresh from the vehicle's current GPS position.
      // We DO NOT slice it. We use the exact geometry OSRM returned for the remaining journey.
      const finalRoute: RouteAlternative = selectedRoute;
      const finalGeometry = selectedRoute.coordinates;

      const hist: DecisionHistory = {
        id: 'DEC-' + Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        shipmentId,
        selectedRouteId: finalRoute.id,
        candidateRoutes: rec.alternativeRoutes,
        trigger: 'Mid-Journey Reroute',
        reason: rec.reason,
        decisionType: 'MID_JOURNEY_REROUTE',
        approvedBy: state.currentUserRole,
        risk: finalRoute.risk,
        eta: `${Math.floor(finalRoute.currentEta / 60)}h ${finalRoute.currentEta % 60}m`
      };

      set(s => ({
        decisionHistory: [hist, ...s.decisionHistory],
        // Mark ALL active recommendations for this shipment as APPROVED
        routeRecommendations: s.routeRecommendations.map(r => r.shipmentId === shipmentId && r.status === 'ACTIVE' ? { ...r, status: 'APPROVED' } : r),
        shipments: s.shipments.map(sh => sh.id === shipmentId ? { ...sh, routeId: finalRoute.id, status: 'Route Change Pending', eta: hist.eta || sh.eta } : sh),
        vehicles: s.vehicles.map(v => v.id === shipment.assignedVehicleId ? {
          ...v,
          currentRouteId: finalRoute.id,
          // The new route geometry starts from the vehicle's CURRENT position,
          // NOT from the origin. progress is reset to 0 because the vehicle
          // is at the start of this new route.
          currentRouteGeometry: finalGeometry,
          progressMinutes: 0,
          progress: 0,
          status: 'Route Change Pending',
          eta: hist.eta || v.eta
        } : v)
      }));

      import('@/services/alertService').then(({ alertService }) => {
        alertService.triggerRouteChangeAlert(shipment.id, shipment.assignedVehicleId!, finalRoute.name, 'Dispatcher Approved Reroute');
      });
      get().recordAuditEvent({
        eventType: 'REROUTE_APPROVED', entityType: 'ROUTE', entityId: finalRoute.id,
        shipmentId, vehicleId: shipment.assignedVehicleId,
        action: 'Dispatcher approved route change', previousState: shipment.routeId, nextState: finalRoute.id,
        reason: rec.reason
      });
      get().addEvent({ message: `Dispatcher changed route for ${shipmentId} to ${finalRoute.name}. New route starts from vehicle's current position. Waiting for driver acknowledgment.`, type: 'success' });
      void get().persistShipments();
      get().persistVehicles();
      
    } else {
      const incident = rec.incidentId ? state.incidents.find(item => item.id === rec.incidentId) : undefined;
      const remainsUnsafe = incident?.verificationStatus === 'VERIFIED' && incident.resolutionStatus === 'UNRESOLVED' &&
        (incident.type === 'Landslide' || incident.type === 'Road Blockage' || incident.type === 'Bridge Damage') &&
        incident.severity === 'Critical';
      const hist: DecisionHistory = {
        id: 'DEC-' + Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        shipmentId,
        selectedRouteId: shipment.routeId!,
        candidateRoutes: rec.alternativeRoutes,
        trigger: 'Mid-Journey Reroute',
        reason: 'Dispatcher confirmed route remains operational.',
        decisionType: 'KEEP_CURRENT_ROUTE',
        approvedBy: state.currentUserRole
      };
      set(s => ({
        decisionHistory: [hist, ...s.decisionHistory],
        // Mark ALL active recommendations for this shipment as REJECTED (not just one)
        routeRecommendations: s.routeRecommendations.map(r => r.shipmentId === shipmentId && r.status === 'ACTIVE' ? { ...r, status: 'REJECTED' } : r),
        shipments: s.shipments.map(item => item.id === shipmentId ? { ...item, status: remainsUnsafe ? 'Paused for Safety' : 'In Transit' } : item),
        vehicles: s.vehicles.map(item => item.id === shipment.assignedVehicleId ? { ...item, status: remainsUnsafe ? 'Paused for Safety' : 'In Transit' } : item)
      }));
      get().recordAuditEvent({
        eventType: 'REROUTE_DECISION', entityType: 'SHIPMENT', entityId: shipmentId,
        shipmentId, action: 'Dispatcher kept current route', nextState: remainsUnsafe ? 'Paused for Safety' : 'In Transit',
        reason: remainsUnsafe ? 'Current route remains confirmed unsafe.' : 'Current route remains operational.'
      });
      get().addEvent({ message: `Dispatcher kept current route for ${shipmentId}. ${remainsUnsafe ? 'Vehicle remains paused for safety.' : 'Vehicle continues monitoring.'}`, type: remainsUnsafe ? 'warning' : 'info' });
      void get().persistShipments();
      get().persistVehicles();
    }
  },

  // --- 3. SYSTEM & LEGACY ACTIONS ---

  addEvent: (event) => set((state) => ({
    eventFeed: [
      {
        ...event,
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      },
      ...state.eventFeed
    ].slice(0, 50)
  })),

  recalculateNetwork: () => {
    const state = get();
    const updatedCorridors = state.corridors.map(corridor => {
      const riskPred = predictCorridorRisk(corridor, state.incidents, state.simulationMode);
      const accessibility = determineAccessibility(corridor, riskPred, state.incidents);
      return {
        ...corridor,
        risk: Math.round(riskPred.probability * 100),
        accessibility
      };
    });
    set({ corridors: updatedCorridors });
    
    // Evaluate if any ACTIVE route recommendations are now STALE
    const activeRecs = state.routeRecommendations.filter(r => r.status === 'ACTIVE');
    if (activeRecs.length > 0) {
      set(s => ({
        routeRecommendations: s.routeRecommendations.map(r => r.status === 'ACTIVE' ? { ...r, status: 'STALE' } : r)
      }));
      activeRecs.forEach(r => get().assessIncidentImpact(r.incidentId!)); // Re-assess
    }
  },

  resetScenario: () => {
    set({
      simulationMode: 'NORMAL',
      vehicles: JSON.parse(JSON.stringify(mockVehicles)),
      shipments: JSON.parse(JSON.stringify(mockShipments)),
      incidents: JSON.parse(JSON.stringify(mockIncidents)),
      corridors: JSON.parse(JSON.stringify(mockCorridors)),
      alerts: JSON.parse(JSON.stringify(mockAlerts)),
      routesByShipment: {},
      decisionHistory: [],
      routeRecommendations: [],
      offlineQueue: [],
      demoStage: 0,
      journeyAnalysis: null,
      journeyStartTime: '10:00',
      selectedShipmentId: null,
      selectedVehicleId: null
    });
    
    import('@/services/simulationService').then(({ simulationService }) => {
      simulationService.pause();
    });

    try { window.localStorage.removeItem('northlink:vehicles'); } catch { /* best effort */ }
    try { window.localStorage.removeItem('northlink:shipments'); } catch { /* best effort */ }

    get().addEvent({ message: 'System reset to initial operational state.', type: 'info' });
    get().recalculateNetwork();
    void get().persistShipments();

    // Reset leaves the system stopped; the dispatcher must explicitly dispatch cargo.
  },

  setCurrentUserRole: (role) => set({ currentUserRole: role }),

  addAlert: (alert) => set((state) => ({
    alerts: [
      {
        ...alert,
        id: 'ALT-' + Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        read: false
      },
      ...state.alerts
    ]
  })),

  markAlertRead: (id) => set((state) => ({
    alerts: state.alerts.map(a => a.id === id ? { ...a, read: true } : a)
  })),

  acknowledgeAlert: (id) => set((state) => ({
    alerts: state.alerts.map(a => a.id === id ? { ...a, actionTaken: true, read: true } : a)
  })),

  acknowledgeRouteChange: (id) => {
    const state = get();
    const alert = state.alerts.find(item => item.id === id);
    if (!alert || alert.type !== 'ROUTE UPDATE' || state.currentUserRole !== 'Driver') return;
    set(current => ({
      alerts: current.alerts.map(item => item.id === id ? {
        ...item, actionTaken: true, read: true,
        acknowledgedAt: new Date().toISOString(), acknowledgedBy: 'Driver'
      } : item),
      shipments: alert.shipmentId
        ? current.shipments.map(item => item.id === alert.shipmentId && item.status === 'Route Change Pending' ? { ...item, status: 'In Transit' } : item)
        : current.shipments,
      vehicles: alert.vehicleId
        ? current.vehicles.map(item => item.id === alert.vehicleId && item.status === 'Route Change Pending' ? { ...item, status: 'In Transit' } : item)
        : current.vehicles
    }));
    get().recordAuditEvent({
      eventType: 'DRIVER_ACKNOWLEDGED', entityType: 'ALERT', entityId: id,
      shipmentId: alert.shipmentId, vehicleId: alert.vehicleId,
      action: 'Driver acknowledged route update', nextState: 'In Transit'
    });
    get().persistVehicles();
    void get().persistShipments();
  },

  queueIncident: (incidentData) => set((state) => {
    const newQueued: QueuedIncident = {
      id: 'QINC-' + Math.random().toString(36).substring(7),
      createdAt: new Date().toISOString(),
      incidentData,
      syncStatus: 'PENDING'
    };
    const offlineQueue = [...state.offlineQueue, newQueued];
    try { window.localStorage.setItem('northlink:offline-queue', JSON.stringify(offlineQueue)); } catch { /* local queue is best effort */ }
    return { offlineQueue };
  }),

  setOfflineQueue: (queue) => {
    try { window.localStorage.setItem('northlink:offline-queue', JSON.stringify(queue)); } catch { /* local queue is best effort */ }
    set({ offlineQueue: queue });
  },

  addIncident: (incident) => {
    const normalizedIncident: Incident = {
      ...incident,
      verificationStatus: incident.verificationStatus ?? 'REPORTED',
      resolutionStatus: incident.resolutionStatus ?? 'UNRESOLVED',
      status: incident.status ?? 'Reported'
    };
    set((state) => ({ incidents: [normalizedIncident, ...state.incidents] }));
    get().addEvent({ message: `New incident reported: ${incident.type} at ${incident.location}.`, type: 'warning' });
    // Note: We NO LONGER automatically pause/reroute here! 
    // It must go through 'verifyIncident' -> 'assessIncidentImpact'.
  },

  setDemoStage: (stage) => set({ demoStage: stage }),

  initializeScenario: () => {
    // We do NOT reset data here, we just set the initial active selections
    // The store already initializes with MED-204 and TRUCK-07 from mockData
    get().selectShipment('MED-204');
    
    get().addEvent({
      message: 'NORTHLINK AI System Online. Simulation stopped until cargo is dispatched.',
      type: 'success'
    });
  },

  recordAuditEvent: (event) => set(state => ({
    auditTrail: [{
      ...event,
      id: `AUD-${Math.random().toString(36).slice(2)}`,
      actorRole: event.actorRole ?? state.currentUserRole,
      timestamp: new Date().toISOString()
    }, ...state.auditTrail].slice(0, 500)
  })),

  // ── Journey Intelligence ─────────────────────────────────────────────────

  analyzeJourney: async (shipmentId, startTime, requestedRouteId, requestedCoordinates, requestedDuration) => {
    const { journeyService } = await import('@/services/journeyService');
    const state = get();
    const shipment = state.shipments.find(s => s.id === shipmentId);
    if (!shipment) return;

    const effectiveStartTime = startTime ?? state.journeyStartTime;
    const routeId = requestedRouteId ?? shipment.routeId;
    if (!routeId) return;
    const selectedRoute = (state.routesByShipment[shipmentId] || []).find(route => route.id === routeId);

    // Need to pass the vehicle progress so segments correctly mark as completed
    const vehicle = shipment.assignedVehicleId ? state.vehicles.find(v => v.id === shipment.assignedVehicleId) : null;
    const progressMin = vehicle?.progressMinutes ?? 0;

    // Prefer explicitly passed coordinates, then the selected route's coordinates,
    // then the vehicle's stored route geometry (from OSRM dispatch/approval).
    // This avoids making a new OSRM API call on every refresh.
    const routeCoordinates = requestedCoordinates
      ?? selectedRoute?.coordinates
      ?? vehicle?.currentRouteGeometry
      ?? undefined;
    const routeDuration = requestedDuration
      ?? selectedRoute?.currentEta
      ?? undefined;

    // If we have no geometry at all, skip analysis rather than calling OSRM in a loop
    if (!routeCoordinates) {
      return;
    }

    const analysis = await journeyService.analyzeJourney(
      shipmentId,
      routeId,
      shipment.origin,
      shipment.destination,
      effectiveStartTime,
      state.simulationMode,
      state.incidents,
      progressMin,
      routeCoordinates,
      routeDuration
    );

    set({ journeyAnalysis: analysis });

    // Auto-create alert if high risk segments found
    if (analysis.outlook.highRiskSegmentCount > 0 && analysis.outlook.advanceWarnings.length > 0) {
      const w = analysis.outlook.advanceWarnings[0];
      
      // Avoid spamming the same alert
      const alertExists = get().alerts.some(a => a.title === 'Future Route Risk Detected' && a.message.includes(w.location));
      if (!alertExists) {
        get().addAlert({
          type: 'WARNING',
          title: 'Future Route Risk Detected',
          message: `High disruption risk (${Math.round(w.disruptionProbability * 100)}%) predicted at ${w.location} around ${w.expectedArrivalTime}. Cause: ${w.cause}.`,
          severity: w.severity === 'EXTREME' ? 'High' : 'Medium',
          recipientRole: 'Dispatcher',
          actionRequired: true,
          actionTaken: false
        });
      }
    }

    // Only log if it's a new analysis or something changed significantly to avoid spam
    if (!state.journeyAnalysis || state.journeyAnalysis.outlook.forecastRisk !== analysis.outlook.forecastRisk) {
      get().addEvent({
        message: `Journey analysis updated for ${shipmentId}. ${analysis.outlook.highRiskSegmentCount} high-risk segments ahead.`,
        type: analysis.outlook.highRiskSegmentCount > 0 ? 'warning' : 'info'
      });
    }
  },

  setJourneyStartTime: (time) => {
    set({ journeyStartTime: time });
    // Refresh analysis with new start time if a shipment is selected
    const state = get();
    if (state.selectedShipmentId) {
      state.analyzeJourney(state.selectedShipmentId, time);
    }
  },

  refreshJourneyAnalysis: () => {
    const state = get();
    if (state.journeyAnalysis) {
      state.analyzeJourney(state.journeyAnalysis.shipmentId, state.journeyStartTime);
    } else if (state.selectedShipmentId) {
      state.analyzeJourney(state.selectedShipmentId, state.journeyStartTime);
    }
  },

  setCurrentDriverVehicleId: (id) => set({ currentDriverVehicleId: id }),

  setTrackedVehicleId: (id) => set({ trackedVehicleId: id }),

  hydrateShipments: (persistedShipments) => set(state => {
    const persistedIds = new Set(persistedShipments.map(shipment => shipment.id));
    const localOnlyShipments = state.shipments.filter(shipment => !persistedIds.has(shipment.id));
    return {
      shipments: [...persistedShipments, ...localOnlyShipments],
      shipmentsHydrated: true,
      shipmentPersistenceError: null
    };
  }),

  persistShipments: async () => {
    const shipments = get().shipments;
    try {
      window.localStorage.setItem('northlink:shipments', JSON.stringify(shipments));
    } catch {
      set({ shipmentPersistenceError: 'Local shipment storage is unavailable.' });
    }
    try {
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipments })
      });
      if (!response.ok) throw new Error('Shipment persistence failed');
      set({ shipmentPersistenceError: null });
    } catch {
      set({ shipmentPersistenceError: 'Shipment changes are currently local and could not be persisted.' });
    }
  },

  // addShipment removed. use createShipment instead.

  persistVehicles: () => {
    const { vehicles, routesByShipment, routeRecommendations } = get();
    try {
      window.localStorage.setItem('northlink:vehicles', JSON.stringify({
        vehicles,
        routesByShipment,
        routeRecommendations
      }));
    } catch {
      // Best-effort persistence; continue silently if storage is unavailable.
    }
  },

  hydrateVehicles: (vehicles, routesByShipment, routeRecommendations) => {
    set(state => ({
      vehicles: vehicles.length > 0 ? vehicles : state.vehicles,
      routesByShipment: routesByShipment && Object.keys(routesByShipment).length > 0 ? routesByShipment : state.routesByShipment,
      routeRecommendations: routeRecommendations && routeRecommendations.length > 0 ? routeRecommendations : state.routeRecommendations,
    }));
  },

  addVehicle: (vehicle) => {
    set(state => ({
      vehicles: [...state.vehicles, vehicle]
    }));
    get().addEvent({
      message: `New vehicle added: ${vehicle.id} (${vehicle.driver}) — ${vehicle.cargoType}`,
      type: 'success'
    });
    get().persistVehicles();
  },

  injectDisasterAtPoint: (coordinates, type, severity, location) => {
    const incident: Incident = {
      id: 'INC-' + Math.floor(Math.random() * 10000),
      type,
      location,
      severity,
      timestamp: new Date().toLocaleTimeString(),
      status: 'Verified',
      verificationStatus: 'VERIFIED',
      resolutionStatus: 'UNRESOLVED',
      description: `${type} reported at ${location} via map injection.`,
      coordinates,
      source: 'Dispatcher Map Injection',
      confidence: 0.9,
    };
    get().addIncident(incident);
    get().addEvent({
      message: `Disaster injected at map point: ${type} (${severity}) near ${location}.`,
      type: 'critical'
    });
    get().addAlert({
      type: 'INCIDENT',
      title: `${type} Injected at Map Point`,
      message: `${type} (${severity}) reported near ${location}. Impact assessment will trigger automatically for in-transit shipments.`,
      severity: severity === 'Critical' ? 'High' : 'Medium',
      recipientRole: 'Dispatcher',
      actionRequired: true,
      actionTaken: false
    });
  }
}));
