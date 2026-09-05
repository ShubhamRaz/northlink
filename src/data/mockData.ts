import { Shipment, Vehicle, Incident, District, Corridor, Alert, DeliveryPoint } from '../types';

export const mockShipments: Shipment[] = [
  {
    id: 'MED-204',
    origin: 'Guwahati Logistics Hub',
    destination: 'Imphal Medical Depot',
    cargoType: 'Essential Medicines',
    priority: 'Critical',
    eta: '6h 35m',
    status: 'Planned',
    assignedVehicleId: 'TRUCK-07',
    routeId: undefined,
    deadline: '2026-09-05T18:00:00Z',
    scheduleType: 'scheduled',
    schedule: 'Every Monday & Thursday',
    notes: 'Priority cold-chain medicines for Imphal Civil Hospital',
    startTime: '08:00',
  },
  {
    id: 'FOOD-118',
    origin: 'Guwahati Logistics Hub',
    destination: 'Shillong Supply Hub',
    cargoType: 'Food & Rations',
    priority: 'High',
    eta: '4h 10m',
    status: 'Planned',
    assignedVehicleId: 'TRUCK-12',
    routeId: undefined,
    scheduleType: 'scheduled',
    schedule: 'Weekly (Friday)',
    notes: 'Weekly ration supply for Meghalaya depots',
    startTime: '07:00',
  },
  {
    id: 'AGRI-031',
    origin: 'Silchar',
    destination: 'Aizawl Distribution Center',
    cargoType: 'Agricultural Supplies',
    priority: 'Normal',
    eta: '7h 20m',
    status: 'Planned',
    assignedVehicleId: 'TRUCK-21',
    scheduleType: 'one-time',
    notes: 'One-time fertiliser delivery for seasonal farming initiative',
    startTime: '09:30',
  },
  {
    id: 'REL-055',
    origin: 'Tezpur Base',
    destination: 'Kohima Station',
    cargoType: 'Relief Cargo',
    priority: 'Critical',
    eta: '8h 45m',
    status: 'Planned',
    assignedVehicleId: 'TRUCK-33',
    scheduleType: 'one-time',
    notes: 'Emergency flood relief supplies',
    startTime: '06:00',
  },
];

export const mockVehicles: Vehicle[] = [
  {
    id: 'TRUCK-07',
    driver: 'Rajesh Kumar',
    driverId: 'driver-rajesh',
    cargoType: 'Essential Medicines',
    location: 'Guwahati Logistics Hub',
    speed: 0,
    heading: 95,
    status: 'Available',
    currentRouteId: undefined,
    eta: '--',
    lastUpdated: new Date().toISOString(),
    coordinates: [26.1445, 91.7362],
    progress: 0,
  },
  {
    id: 'TRUCK-12',
    driver: 'Amit Singh',
    driverId: 'driver-amit',
    cargoType: 'Food & Rations',
    location: 'Guwahati Logistics Hub',
    speed: 0,
    heading: 180,
    status: 'Available',
    currentRouteId: undefined,
    eta: '--',
    lastUpdated: new Date().toISOString(),
    coordinates: [26.1445, 91.7362],
    progress: 0,
  },
  {
    id: 'TRUCK-21',
    driver: 'Priya Devi',
    driverId: 'driver-priya',
    cargoType: 'Agricultural Supplies',
    location: 'Silchar (Depot)',
    speed: 0,
    heading: 90,
    status: 'Available',
    eta: '--',
    lastUpdated: new Date().toISOString(),
    coordinates: [24.8333, 92.7789],
    progress: 0,
  },
  {
    id: 'TRUCK-33',
    driver: 'Sanjoy Bora',
    driverId: 'driver-sanjoy',
    cargoType: 'Relief Cargo',
    location: 'Tezpur Base',
    speed: 0,
    heading: 90,
    status: 'Available',
    eta: '--',
    lastUpdated: new Date().toISOString(),
    coordinates: [26.6338, 92.7930],
    progress: 0,
  },
];

export const mockIncidents: Incident[] = [];

export const mockDistricts: District[] = [
  { id: 'D01', name: 'Imphal West', connectivity: 'OPEN', activeIncidents: 0, highRiskCorridors: 0, activeDeliveries: 4, coordinates: [24.817, 93.9368] },
  { id: 'D02', name: 'Kamrup', connectivity: 'OPEN', activeIncidents: 0, highRiskCorridors: 0, activeDeliveries: 12, coordinates: [26.1445, 91.7362] },
];

import { ROUTE_COORDS } from './routeGeometry';

export const mockCorridors: Corridor[] = [
  {
    id: 'C01',
    name: 'NH-27 (Guwahati - Nagaon)',
    status: 'OPEN',
    accessibility: 'OPEN',
    risk: 12,
    lastUpdated: '2 min ago',
    source: 'Live Sensors',
    coordinates: ROUTE_COORDS['RT-FASTEST'].slice(0, 5),
    baseTravelTime: 120,
  },
  {
    id: 'C02',
    name: 'NH-2 (Nagaon - Imphal via Kohima)',
    status: 'OPEN',
    accessibility: 'OPEN',
    risk: 20,
    lastUpdated: '8 min ago',
    source: 'Operational simulation',
    coordinates: ROUTE_COORDS['RT-FASTEST'].slice(4),
    baseTravelTime: 240,
  },
  {
    id: 'C03',
    name: 'NH-37 & NH-53 (Silchar - Jiribam - Imphal)',
    status: 'OPEN',
    accessibility: 'OPEN',
    risk: 15,
    lastUpdated: '15 min ago',
    source: 'Field Reports',
    coordinates: ROUTE_COORDS['RT-SILCHAR-AIZAWL'], // mapped closely enough for this region
    baseTravelTime: 360,
  },
  {
    id: 'C04',
    name: 'NH-6 (Guwahati-Shillong)',
    status: 'OPEN',
    accessibility: 'OPEN',
    risk: 25,
    lastUpdated: '5 min ago',
    source: 'Traffic API',
    coordinates: ROUTE_COORDS['RT-GH-SH'],
    baseTravelTime: 180,
  }
];

export const mockDeliveryPoints: DeliveryPoint[] = [
  { id: 'DP-01', name: 'Guwahati Logistics Hub', district: 'Kamrup', type: 'Warehouse', coordinates: [26.1445, 91.7362], activeShipments: 45, outgoingDeliveries: 12 },
  { id: 'DP-02', name: 'Imphal Medical Depot', district: 'Imphal West', type: 'Hospital', coordinates: [24.817, 93.9368], activeShipments: 8, outgoingDeliveries: 2 },
  { id: 'DP-03', name: 'Shillong Supply Hub', district: 'East Khasi Hills', type: 'Depot', coordinates: [25.5788, 91.8933], activeShipments: 5, outgoingDeliveries: 3 },
  { id: 'DP-04', name: 'Silchar Hub', district: 'Cachar', type: 'Warehouse', coordinates: [24.8333, 92.7789], activeShipments: 6, outgoingDeliveries: 2 },
  { id: 'DP-05', name: 'Tezpur Base', district: 'Sonitpur', type: 'Warehouse', coordinates: [26.6338, 92.7930], activeShipments: 4, outgoingDeliveries: 1 },
];

export const mockAlerts: Alert[] = [
  {
    id: 'A01',
    type: 'SYSTEM',
    title: 'Severe Weather Warning',
    message: 'Heavy rainfall expected in Meghalaya over the next 24 hours.',
    severity: 'Medium',
    timestamp: '1 hour ago',
    read: false
  }
];

// Driver profiles for login selection
export const mockDrivers = [
  { driverId: 'driver-rajesh', name: 'Rajesh Kumar', vehicleId: 'TRUCK-07', vehicleLabel: 'TRUCK-07 (Medicines)' },
  { driverId: 'driver-amit',   name: 'Amit Singh',   vehicleId: 'TRUCK-12', vehicleLabel: 'TRUCK-12 (Food & Rations)' },
  { driverId: 'driver-priya',  name: 'Priya Devi',   vehicleId: 'TRUCK-21', vehicleLabel: 'TRUCK-21 (Agriculture)' },
  { driverId: 'driver-sanjoy', name: 'Sanjoy Bora',  vehicleId: 'TRUCK-33', vehicleLabel: 'TRUCK-33 (Relief Cargo)' },
];
