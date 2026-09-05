'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAppStore } from '@/store/useAppStore';
import { RouteSegment } from '@/types';
import { useEffect } from 'react';

// ── Icons ─────────────────────────────────────────────────────────────────────
const vehicleIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const vehicleFocusedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [30, 49], iconAnchor: [15, 49], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const incidentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const facilityIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// ── Route colours per vehicle ─────────────────────────────────────────────────
const VEHICLE_ROUTE_COLORS: Record<string, string> = {
  'TRUCK-07': '#3b82f6',  // blue
  'TRUCK-12': '#10b981',  // emerald
  'TRUCK-21': '#f59e0b',  // amber
  'TRUCK-33': '#a855f7',  // purple
};

function getDefaultColor(idx: number) {
  const palette = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];
  return palette[idx % palette.length];
}

import { ROUTE_COORDS } from '@/data/routeGeometry';

// ── Auto-pan to tracked vehicle ───────────────────────────────────────────────
function MapFocusController() {
  const map = useMap();
  const { trackedVehicleId, vehicles } = useAppStore();

  // 1. Initial flyTo when user starts/stops tracking
  useEffect(() => {
    if (trackedVehicleId) {
      const v = vehicles.find(v => v.id === trackedVehicleId);
      if (v) map.flyTo(v.coordinates, 10, { animate: true, duration: 1.2 });
    } else {
      map.flyTo([25.5, 92.5], 7, { animate: true, duration: 1.2 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedVehicleId, map]); // Do not depend on vehicles, only ID

  // 2. Smooth pan as the vehicle moves
  useEffect(() => {
    if (trackedVehicleId) {
      const v = vehicles.find(v => v.id === trackedVehicleId);
      if (v) {
        map.panTo(v.coordinates, { animate: true, duration: 0.5 });
      }
    }
  }, [vehicles, trackedVehicleId, map]);

  return null;
}

// ── Corridor colour ───────────────────────────────────────────────────────────
function getCorridorColor(status: string) {
  switch (status) {
    case 'OPEN':       return '#10b981';
    case 'CAUTION':    return '#f59e0b';
    case 'RESTRICTED': return '#f97316';
    case 'BLOCKED':    return '#ef4444';
    default:           return '#3b82f6';
  }
}

function getSegmentColor(seg: RouteSegment) {
  if (seg.isCompleted) return '#64748b';
  if (seg.isActive)    return '#3b82f6';
  if (seg.disruptionProbability >= 0.75) return '#ef4444';
  if (seg.disruptionProbability >= 0.5)  return '#f97316';
  if (seg.disruptionProbability >= 0.25) return '#f59e0b';
  return '#10b981';
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MapComponent() {
  const {
    incidents, corridors, vehicles, deliveryPoints, shipments,
    activeMapLayers, selectVehicle, selectIncident, selectCorridor,
    journeyAnalysis, trackedVehicleId, setTrackedVehicleId,
    selectedShipmentId
  } = useAppStore();

  // Vehicles to render on map
  const visibleVehicles = trackedVehicleId
    ? vehicles.filter(v => v.id === trackedVehicleId)
    : vehicles;

  // Build per-vehicle route polylines for ALL active vehicles
  const vehicleRoutes = vehicles.map((v, idx) => {
    // For the selected shipment's vehicle, prefer the detailed journeyAnalysis
    if (journeyAnalysis && v.id === vehicles.find(vv =>
      shipments.find(s => s.id === selectedShipmentId)?.assignedVehicleId === vv.id
    )?.id) return null; // Handled below via journeyAnalysis segments

    if (!v.currentRouteId) return null;
    const coords = ROUTE_COORDS[v.currentRouteId];
    if (!coords) return null;
    return { vehicleId: v.id, coords, color: VEHICLE_ROUTE_COLORS[v.id] ?? getDefaultColor(idx) };
  }).filter(Boolean) as { vehicleId: string; coords: [number, number][]; color: string }[];

  return (
    <div className="flex flex-col h-full w-full">
      {/* ── Map Canvas ── */}
      <div className="flex-1 rounded-t-xl overflow-hidden border border-slate-800 border-b-0 relative z-0" style={{ minHeight: '300px' }}>
        <MapContainer
          center={[25.5, 92.5]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFocusController />

          {/* All vehicle route paths (faint, always visible) */}
          {activeMapLayers.includes('Vehicles') && vehicleRoutes.map(({ vehicleId, coords, color }) => (
            <Polyline
              key={`route-${vehicleId}`}
              positions={coords}
              color={color}
              weight={3}
              opacity={trackedVehicleId && trackedVehicleId !== vehicleId ? 0.25 : 0.7}
              dashArray={trackedVehicleId && trackedVehicleId !== vehicleId ? '6 4' : undefined}
            />
          ))}

          {/* Detailed Journey Segments (active shipment) */}
          {activeMapLayers.includes('Corridors') && journeyAnalysis?.segments?.map(seg => {
            if (!seg.geometry || seg.geometry.length === 0) return null;
            return (
              <Polyline
                key={seg.id}
                positions={seg.geometry}
                color={getSegmentColor(seg)}
                weight={seg.isActive ? 6 : 4}
                opacity={seg.isCompleted ? 0.4 : 0.85}
              >
                <Popup>
                  <div className="text-slate-900 min-w-[220px]">
                    <h3 className="font-bold text-sm mb-1">{seg.location}</h3>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">
                      {seg.isCompleted ? 'COMPLETED' : seg.isActive ? 'ACTIVE' : 'FUTURE FORECAST'}
                    </div>
                    <div className="space-y-1 text-xs">
                      <p><span className="font-semibold">Expected Arrival:</span> {seg.estimatedArrivalTime}</p>
                      {!seg.isCompleted && (
                        <>
                          <p><span className="font-semibold">Weather:</span> {seg.weather.condition}</p>
                          <p><span className="font-semibold">Disruption Risk:</span> {Math.round(seg.disruptionProbability * 100)}%</p>
                          <p><span className="font-semibold">Expected Delay:</span> {seg.expectedDelay} min</p>
                        </>
                      )}
                    </div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* Static Corridors remain visible beneath any journey overlay. */}
          {activeMapLayers.includes('Corridors') && corridors.map(corridor => (
            <Polyline
              key={corridor.id}
              positions={corridor.coordinates}
              color={getCorridorColor(corridor.accessibility)}
              weight={4}
              opacity={0.8}
              eventHandlers={{ click: () => selectCorridor(corridor.id) }}
            >
              <Popup>
                <div className="text-slate-900 min-w-[200px]">
                  <h3 className="font-bold text-sm mb-2">{corridor.name}</h3>
                  <div className="space-y-1 text-xs">
                    <p><span className="font-semibold">Accessibility:</span> {corridor.accessibility}</p>
                    <p><span className="font-semibold">Risk:</span> {corridor.risk}%</p>
                    <p><span className="font-semibold">Source:</span> {corridor.source}</p>
                    <p className="text-slate-500 mt-2">Updated {corridor.lastUpdated}</p>
                  </div>
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* Incidents */}
          {activeMapLayers.includes('Incidents') && incidents.map(incident =>
            incident.status !== 'Resolved' && incident.status !== 'Rejected' ? (
              <Marker
                key={incident.id}
                position={incident.coordinates}
                icon={incidentIcon}
                eventHandlers={{ click: () => selectIncident(incident.id) }}
              >
                <Popup>
                  <div className="text-slate-900 min-w-[200px]">
                    <h3 className="font-bold text-sm mb-1 text-red-600">{incident.type}</h3>
                    <p className="text-xs font-semibold mb-2">{incident.location}</p>
                    <p className="text-xs mb-2">{incident.description}</p>
                    <div className="flex justify-between text-[10px] text-slate-500 border-t pt-2 mt-2">
                      <span>{incident.timestamp}</span>
                      <span className="uppercase font-bold text-red-500">{incident.severity} SEV</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ) : null
          )}

          {/* Vehicles */}
          {activeMapLayers.includes('Vehicles') && visibleVehicles.map(vehicle => {
            const isTracked = trackedVehicleId === vehicle.id;
            const shipment = shipments.find(s => s.assignedVehicleId === vehicle.id);
            return (
              <Marker
                key={vehicle.id}
                position={vehicle.coordinates}
                icon={isTracked ? vehicleFocusedIcon : vehicleIcon}
                eventHandlers={{ click: () => { selectVehicle(vehicle.id); setTrackedVehicleId(vehicle.id); } }}
              >
                <Popup>
                  <div className="text-slate-900 min-w-[180px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${vehicle.status === 'In Transit' ? 'bg-green-500' : vehicle.status === 'Delayed' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                      <h3 className="font-bold text-sm">{vehicle.id}</h3>
                    </div>
                    <div className="text-xs space-y-1 mb-3">
                      <p className="text-slate-600">{vehicle.driver}</p>
                      <p><span className="font-semibold">Cargo:</span> {vehicle.cargoType}</p>
                      {shipment && <p><span className="font-semibold">Shipment:</span> {shipment.id}</p>}
                      <p><span className="font-semibold">Status:</span> {vehicle.status}</p>
                      <p><span className="font-semibold">Speed:</span> {vehicle.speed} km/h</p>
                      <p><span className="font-semibold">ETA:</span> {vehicle.eta}</p>
                    </div>
                    <button
                      onClick={() => setTrackedVehicleId(isTracked ? null : vehicle.id)}
                      className={`w-full text-xs py-1.5 rounded font-bold border ${isTracked ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                    >
                      {isTracked ? '✕ Stop Tracking' : '▶ Track This Vehicle'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Delivery Points / Facilities */}
          {activeMapLayers.includes('Deliveries') && deliveryPoints.map(dp => (
            <Marker key={dp.id} position={dp.coordinates} icon={facilityIcon}>
              <Popup>
                <div className="text-slate-900">
                  <h3 className="font-bold text-sm">{dp.name}</h3>
                  <p className="text-xs text-slate-600 mb-2">{dp.type} · {dp.district}</p>
                  <div className="text-xs space-y-1">
                    <p><span className="font-semibold">Active Shipments:</span> {dp.activeShipments}</p>
                    <p><span className="font-semibold">Outgoing:</span> {dp.outgoingDeliveries}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ── Cargo Tracking Chips — BELOW the map ── */}
      <div className="bg-slate-900/95 border border-slate-800 border-t-0 rounded-b-xl px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold shrink-0 mr-1">Track:</span>

        <button
          onClick={() => setTrackedVehicleId(null)}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
            !trackedVehicleId
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          All Cargo
        </button>

        {vehicles.map(v => {
          const shipment = shipments.find(s => s.assignedVehicleId === v.id);
          const isTracked = trackedVehicleId === v.id;
          const color = VEHICLE_ROUTE_COLORS[v.id];
          const statusColor = v.status === 'In Transit' ? 'bg-emerald-400' : v.status === 'Delayed' ? 'bg-amber-400' : 'bg-slate-500';
          return (
            <button
              key={v.id}
              onClick={() => setTrackedVehicleId(isTracked ? null : v.id)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                isTracked
                  ? 'border-slate-600 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              style={isTracked ? { backgroundColor: color + '33', borderColor: color } : undefined}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
              <span style={isTracked ? { color } : undefined}>{v.id}</span>
              {shipment && (
                <span className="text-slate-500 font-normal">
                  · {shipment.cargoType.split(' ')[0]}
                </span>
              )}
              {isTracked && (
                <span className="text-[10px] font-normal opacity-70">▶ Live</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
