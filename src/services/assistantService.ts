import { useAppStore } from '@/store/useAppStore';

/**
 * Service to manage LLM interactions.
 * Fetches required state, builds safe context, and queries the backend.
 * Provides a local fallback if the backend API is unavailable or rate-limited.
 */
export const assistantService = {

  // Extracts only the relevant data needed to answer routing/incident queries
  buildContext() {
    const store = useAppStore.getState();

    // Build journey segment summary for grounding
    const journeySegments = store.journeyAnalysis?.segments.map(s => ({
      location: s.location,
      arrivalTime: s.estimatedArrivalTime,
      weather: s.weather.condition,
      rainfall: `${s.weather.rainfall} mm/hr`,
      disruptionProbability: `${Math.round(s.disruptionProbability * 100)}%`,
      expectedDelay: s.expectedDelay > 0 ? `+${s.expectedDelay}m` : 'None',
      accessibility: s.accessibility,
      severity: s.weather.severity,
      isCompleted: !!s.isCompleted,
      isActive: !!s.isActive
    })) ?? [];

    const journeyOutlook = store.journeyAnalysis?.outlook ? {
      forecastRisk: store.journeyAnalysis.outlook.forecastRisk,
      predictedDelayMinutes: store.journeyAnalysis.outlook.predictedDelayMinutes,
      highRiskSegmentCount: store.journeyAnalysis.outlook.highRiskSegmentCount,
      advanceWarnings: store.journeyAnalysis.outlook.advanceWarnings.map(w => ({
        location: w.location,
        arrivalTime: w.expectedArrivalTime,
        probability: `${Math.round(w.disruptionProbability * 100)}%`,
        expectedDelay: `+${w.expectedDelay}m`,
        cause: w.cause
      }))
    } : null;

    return {
      simulationMode: store.simulationMode,
      networkOnline: store.networkOnline,
      activeShipment: store.selectedShipmentId ? store.shipments.find(s => s.id === store.selectedShipmentId) : null,
      activeRoutes: (store.routesByShipment[store.selectedShipmentId || ''] || []).map(r => ({
        id: r.id,
        name: r.name,
        isFeasible: r.isFeasible,
        status: r.status,
        eta: r.currentEta,
        risk: r.risk,
        resilience: r.resilience,
        reasons: r.reasons
      })),
      highRiskCorridors: store.corridors.filter(c => c.risk > 50).map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        risk: c.risk
      })),
      activeIncidents: store.incidents.map(i => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        location: i.location,
        corridorId: i.affectedCorridorId
      })).filter(i => {
        const incident = store.incidents.find(item => item.id === i.id);
        return incident?.verificationStatus === 'VERIFIED' && incident.resolutionStatus === 'UNRESOLVED';
      }),
      routeRecommendations: store.routeRecommendations.filter(r => r.status === 'ACTIVE').map(r => ({
        shipmentId: r.shipmentId,
        incidentId: r.incidentId,
        recommendedRouteId: r.recommendedRouteId,
        currentRisk: r.currentRisk,
        newRisk: r.newRisk,
        currentETA: r.currentETA,
        newETA: r.newETA,
        resilience: r.resilience,
        reason: r.reason,
        explanation: r.explanation
      })),
      auditTrail: store.auditTrail.slice(0, 20),
      // Time-aware journey data
      journeySegments,
      journeyOutlook,
      journeyStartTime: store.journeyStartTime,
      lastUpdated: new Date().toISOString()
    };
  },

  async askQuestion(query: string): Promise<{ reply: string; isFallback: boolean }> {
    const context = this.buildContext();

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context })
      });

      if (!response.ok) {
        throw new Error('API unavailable or rate limited');
      }

      const data = await response.json();
      return { reply: data.reply, isFallback: false };
    } catch (err) {
      console.warn('Using LLM fallback due to API error:', err);
      return { reply: this.generateFallbackResponse(query, context), isFallback: true };
    }
  },

  generateFallbackResponse(query: string, context: any): string {
    const lowerQuery = query.toLowerCase();
    const segs: any[] = context.journeySegments ?? [];
    const outlook = context.journeyOutlook;

    // ── Temporal weather queries ────────────────────────────────────────────

    if (lowerQuery.includes('heavy rain') || (lowerQuery.includes('rain') && lowerQuery.includes('where'))) {
      const rainSegs = segs.filter((s: any) => s.weather === 'Heavy Rain' || s.weather === 'Thunderstorm');
      if (rainSegs.length === 0) return 'Based on the current journey forecast, no heavy rain is expected along the route during the vehicle\'s travel window.';
      const s = rainSegs[0];
      return `**Heavy rain** is forecast near **${s.location}**, with the vehicle expected to arrive around **${s.arrivalTime}**.\n\n` +
        `Rainfall: ${s.rainfall} · Disruption probability: ${s.disruptionProbability} · Expected delay: ${s.expectedDelay}\n\n` +
        `This is derived from the prototype forecast model and may update as conditions change.`;
    }

    if (lowerQuery.includes('highest risk') || lowerQuery.includes('worst') || lowerQuery.includes('most dangerous')) {
      if (!outlook || !segs.length) return 'No journey analysis is available yet. Please run ANALYZE JOURNEY first.';
      const highest = [...segs].sort((a: any, b: any) => parseFloat(b.disruptionProbability) - parseFloat(a.disruptionProbability))[0];
      return `The **highest-risk segment** on the current route is **${highest.location}**.\n\n` +
        `- Expected arrival: **${highest.arrivalTime}**\n- Forecast: **${highest.weather}**\n- Disruption probability: **${highest.disruptionProbability}**\n- Expected delay: **${highest.expectedDelay}**\n- Accessibility: ${highest.accessibility}`;
    }

    if (lowerQuery.includes('next') && (lowerQuery.includes('hours') || lowerQuery.includes('hour'))) {
      if (!segs.length) return 'No journey segments are loaded. Analyze a journey first.';
      const futureSegs = segs.filter((s: any) => !s.isCompleted).slice(0, 4);
      if (!futureSegs.length) return 'All route segments appear to be completed.';
      let reply = `**Journey forecast for upcoming segments:**\n\n`;
      futureSegs.forEach((s: any) => {
        reply += `- **${s.arrivalTime}** — ${s.location}: ${s.weather} (${s.disruptionProbability} risk${s.expectedDelay !== 'None' ? `, ${s.expectedDelay} delay` : ''})\n`;
      });
      return reply;
    }

    if (lowerQuery.includes('journey') && (lowerQuery.includes('summarize') || lowerQuery.includes('summary') || lowerQuery.includes('outlook'))) {
      if (!outlook || !segs.length) return 'No journey analysis is available. Please select a shipment and click ANALYZE JOURNEY.';
      let reply = `**Journey Intelligence Summary:**\n\n`;
      reply += `- **Overall Forecast Risk:** ${outlook.forecastRisk}\n`;
      reply += `- **High-Risk Segments:** ${outlook.highRiskSegmentCount}\n`;
      reply += `- **Predicted Delay:** +${outlook.predictedDelayMinutes} minutes\n\n`;
      reply += `**Segment Forecast:**\n`;
      segs.forEach((s: any) => {
        reply += `- ${s.arrivalTime} — ${s.location}: ${s.weather}`;
        if (s.expectedDelay !== 'None') reply += ` ⚠️ ${s.expectedDelay}`;
        reply += '\n';
      });
      if (outlook.advanceWarnings?.length) {
        reply += `\n**Advance Warnings:**\n`;
        outlook.advanceWarnings.forEach((w: any) => {
          reply += `- ${w.location} at ${w.arrivalTime}: ${w.probability} disruption risk — ${w.cause}\n`;
        });
      }
      return reply;
    }

    if (lowerQuery.includes('should') && lowerQuery.includes('change') || lowerQuery.includes('alternative') || lowerQuery.includes('route b')) {
      const bestRoute = context.activeRoutes.find((r: any) => r.isFeasible);
      if (bestRoute && outlook?.highRiskSegmentCount > 0) {
        return `**Route Recommendation:**\n\nThe current route has **${outlook.highRiskSegmentCount} high-risk segment(s)** ahead with a combined predicted delay of **+${outlook.predictedDelayMinutes} minutes**.\n\n` +
          `The system is evaluating alternatives. The recommended route is **${bestRoute.name}** (Risk: ${bestRoute.risk}%, Resilience: ${bestRoute.resilience}/100).\n\n` +
          `Note: I am only an intelligence assistant. A human Dispatcher must review and approve any route changes using the Command Center. I cannot change routes for you.`;
      }
      return 'The current route is within acceptable risk parameters. No route change is recommended at this time.';
    }

    // ── Existing handlers ───────────────────────────────────────────────────

    if (lowerQuery.includes('why') && lowerQuery.includes('route')) {
      const bestRoute = context.activeRoutes.find((r: any) => r.isFeasible);
      if (bestRoute) {
        return `**Route Explanation:**\n\n${bestRoute.name} is recommended because:\n\n` +
          bestRoute.reasons.map((r: string) => `- ${r}`).join('\n') +
          `\n\nIt offers a calculated ETA of ${Math.floor(bestRoute.eta / 60)}h ${bestRoute.eta % 60}m with ${bestRoute.risk}% risk exposure.`;
      }
      return 'No feasible routes are currently available due to severe blockages on all candidate paths.';
    }

    if (lowerQuery.includes('incident') || (lowerQuery.includes('summarize') && !lowerQuery.includes('journey'))) {
      if (context.activeIncidents.length === 0) return 'There are currently no active incidents reported in the network.';
      const criticalCount = context.activeIncidents.filter((i: any) => i.severity === 'Critical').length;
      return `**Incident Summary:**\n\nThere are ${context.activeIncidents.length} active incidents in the network. ${criticalCount > 0 ? `**${criticalCount} are marked as Critical severity.**` : ''} Check the Incidents page for specific locations.`;
    }

    if (lowerQuery.includes('briefing')) {
      return `**Operational Briefing:**\n\n- **Network Status:** ${context.networkOnline ? 'Online' : 'Offline'}\n- **Simulation:** ${context.simulationMode}\n- **Active Incidents:** ${context.activeIncidents.length}\n- **Journey Risk:** ${outlook?.forecastRisk ?? 'Not analyzed'}\n- **High-Risk Segments:** ${outlook?.highRiskSegmentCount ?? 0}`;
    }

    return 'The AI assistant is temporarily operating in fallback mode. Try asking: "Where will the vehicle encounter heavy rain?", "Summarize the journey outlook", or "What is the highest-risk segment?"';
  }
};
