import { useAppStore } from '@/store/useAppStore';
import { Incident } from '@/types';
import { alertService } from './alertService';

/**
 * Service to manage offline synchronization of queued data.
 */
export const syncService = {
  processing: false,
  
  processQueue() {
    if (this.processing || !useAppStore.getState().networkOnline) return;
    const store = useAppStore.getState();
    const queue = store.offlineQueue.filter(item => item.syncStatus === 'PENDING');
    
    if (queue.length === 0) return;

    useAppStore.getState().setOfflineQueue(
      useAppStore.getState().offlineQueue.map(item => queue.some(candidate => candidate.id === item.id)
        ? { ...item, syncStatus: 'SYNCING' }
        : item)
    );
    this.processing = true;
    setTimeout(() => {
      let syncedCount = 0;
      const failedIds = new Set<string>();
      const currentIncidents = useAppStore.getState().incidents;

      queue.forEach(item => {
        // Prevent duplicates by checking if an incident with same temp ID or location/timestamp exists
        const isDuplicate = currentIncidents.some(inc => 
          inc.id === item.incidentData.id || 
          (inc.location === item.incidentData.location && inc.timestamp === item.incidentData.timestamp)
        );

        try {
        if (!isDuplicate && item.incidentData) {
          const finalIncident: Incident = {
            id: item.incidentData.id || 'INC-' + Math.floor(Math.random() * 1000),
            type: item.incidentData.type || 'Road Blockage',
            location: item.incidentData.location || 'Unknown',
            severity: item.incidentData.severity || 'Medium',
            timestamp: item.createdAt, // Original local creation time
            status: 'Reported',
            verificationStatus: 'REPORTED',
            resolutionStatus: 'UNRESOLVED',
            description: item.incidentData.description || '',
            source: item.incidentData.source || 'Field Officer',
            confidence: item.incidentData.confidence || 0.8,
            coordinates: item.incidentData.coordinates || [25.0, 93.9],
            affectedCorridorId: item.incidentData.affectedCorridorId
          };

          useAppStore.getState().addIncident(finalIncident);
          syncedCount++;

          if (finalIncident.severity === 'High' || finalIncident.severity === 'Critical') {
            alertService.triggerIncidentAlert(
              finalIncident.id, 
              finalIncident.type, 
              finalIncident.location, 
              finalIncident.severity
            );
          }
        }
        } catch {
          failedIds.add(item.id);
        }
      });

      useAppStore.getState().setOfflineQueue(
        useAppStore.getState().offlineQueue
          .filter(item => !queue.some(synced => synced.id === item.id) || failedIds.has(item.id))
          .map(item => failedIds.has(item.id) ? { ...item, syncStatus: 'FAILED' } : item)
      );

      // Recalculate network risk due to new incidents
      useAppStore.getState().recalculateNetwork();

      if (syncedCount > 0) {
        alertService.triggerOfflineSyncAlert(syncedCount);
        useAppStore.getState().addEvent({
          message: `Synchronized ${syncedCount} queued reports.`,
          type: 'success'
        });
      }
      this.processing = false;
    }, 800);
  }
};
