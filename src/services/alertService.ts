import { useAppStore } from '@/store/useAppStore';
import { Alert, UserRole } from '@/types';

/**
 * Service to generate and push alerts to the global store
 */
export const alertService = {
  
  createAlert(
    type: Alert['type'],
    title: string,
    message: string,
    severity: Alert['severity'],
    recipientRole?: UserRole,
    actionRequired?: boolean
  ) {
    // We use getState to access actions outside of a react component
    useAppStore.getState().addAlert({
      type,
      title,
      message,
      severity,
      recipientRole,
      actionRequired
    });
  },

  triggerRouteChangeAlert(shipmentId: string, vehicleId: string, newRouteName: string, reason: string) {
    this.createAlert(
      'ROUTE UPDATE',
      `CRITICAL ROUTE UPDATE: ${vehicleId}`,
      `Your approved route has changed. Reason: ${reason}. New route: ${newRouteName}. Please acknowledge.`,
      'High',
      'Driver',
      true
    );
    const alerts = useAppStore.getState().alerts;
    const alert = alerts[0];
    if (alert) {
      useAppStore.setState(state => ({
        alerts: state.alerts.map(item => item.id === alert.id ? { ...item, shipmentId, vehicleId } : item)
      }));
    }
  },

  triggerIncidentAlert(incidentId: string, type: string, location: string, severity: string) {
    this.createAlert(
      'INCIDENT',
      `New ${severity} Incident Reported`,
      `A ${type} has been reported near ${location}.`,
      severity as Alert['severity'],
      'Dispatcher'
    );
  },

  triggerOfflineSyncAlert(count: number) {
    this.createAlert(
      'SYSTEM',
      'Data Synchronized',
      `${count} offline reports have been synchronized with the central system.`,
      'Low'
    );
  }
};
