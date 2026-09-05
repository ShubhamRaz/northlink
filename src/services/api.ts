import { Shipment, Vehicle, Incident, District, Corridor, Alert } from '../types';
import { mockShipments, mockVehicles, mockIncidents, mockDistricts, mockCorridors, mockAlerts } from '../data/mockData';

// Abstracted service layer. Currently returns mock data.
// In later steps, these will be replaced with real API calls (e.g., fetch to FastAPI backend).

export const shipmentService = {
  getShipments: async (): Promise<Shipment[]> => {
    return Promise.resolve(mockShipments);
  },
  getShipmentById: async (id: string): Promise<Shipment | undefined> => {
    return Promise.resolve(mockShipments.find(s => s.id === id));
  }
};

export const vehicleService = {
  getVehicles: async (): Promise<Vehicle[]> => {
    return Promise.resolve(mockVehicles);
  },
  getVehicleById: async (id: string): Promise<Vehicle | undefined> => {
    return Promise.resolve(mockVehicles.find(v => v.id === id));
  }
};

export const incidentService = {
  getIncidents: async (): Promise<Incident[]> => {
    return Promise.resolve(mockIncidents);
  },
  getIncidentById: async (id: string): Promise<Incident | undefined> => {
    return Promise.resolve(mockIncidents.find(i => i.id === id));
  }
};

export const districtService = {
  getDistricts: async (): Promise<District[]> => {
    return Promise.resolve(mockDistricts);
  }
};

export const corridorService = {
  getCorridors: async (): Promise<Corridor[]> => {
    return Promise.resolve(mockCorridors);
  }
};

export const alertService = {
  getAlerts: async (): Promise<Alert[]> => {
    return Promise.resolve(mockAlerts);
  }
};

// Global search over multiple mock entities
export const searchService = {
  search: async (query: string): Promise<{
    shipments: Shipment[],
    vehicles: Vehicle[],
    incidents: Incident[],
    districts: District[],
    corridors: Corridor[]
  }> => {
    const lowerQuery = query.toLowerCase();
    
    if (!lowerQuery) {
        return Promise.resolve({ shipments: [], vehicles: [], incidents: [], districts: [], corridors: [] });
    }

    return Promise.resolve({
      shipments: mockShipments.filter(s => s.id.toLowerCase().includes(lowerQuery) || s.destination.toLowerCase().includes(lowerQuery)),
      vehicles: mockVehicles.filter(v => v.id.toLowerCase().includes(lowerQuery) || v.driver.toLowerCase().includes(lowerQuery)),
      incidents: mockIncidents.filter(i => i.type.toLowerCase().includes(lowerQuery) || i.location.toLowerCase().includes(lowerQuery)),
      districts: mockDistricts.filter(d => d.name.toLowerCase().includes(lowerQuery)),
      corridors: mockCorridors.filter(c => c.name.toLowerCase().includes(lowerQuery)),
    });
  }
};
