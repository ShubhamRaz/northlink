import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Shipment } from '@/types';

const shipmentStatuses = new Set<Shipment['status']>([
  'Planned', 'Ready', 'Dispatched', 'In Transit', 'Route Change Pending',
  'Paused for Safety', 'Delayed', 'Delivered'
]);

function isShipment(value: unknown): value is Shipment {
  if (!value || typeof value !== 'object') return false;
  const shipment = value as Partial<Shipment>;
  return typeof shipment.id === 'string' && shipment.id.length <= 80 &&
    typeof shipment.origin === 'string' && shipment.origin.length <= 160 &&
    typeof shipment.destination === 'string' && shipment.destination.length <= 160 &&
    typeof shipment.cargoType === 'string' && shipment.cargoType.length <= 120 &&
    typeof shipment.eta === 'string' && shipmentStatuses.has(shipment.status as Shipment['status']);
}

export async function GET() {
  try {
    const rows = await db.shipment.findMany();
    if (rows.length === 0) {
      // Return empty array so the client falls back to its initial mock data
      // and any persisted localStorage state, rather than overriding with mock data.
      return NextResponse.json([]);
    }
    const shipments: Shipment[] = [];
    for (const row of rows) {
      try {
        shipments.push(JSON.parse(row.data) as Shipment);
      } catch {
        // Skip rows with corrupted JSON rather than failing the whole request.
        continue;
      }
    }
    return NextResponse.json(shipments);
  } catch (error) {
    console.error('Shipment GET DB error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shipments } = body as { shipments?: unknown };
    if (!Array.isArray(shipments) || shipments.length > 500 || !shipments.every(isShipment)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await db.$transaction(
      shipments.map((s) =>
        db.shipment.upsert({
          where: { id: s.id },
          update: { data: JSON.stringify(s) },
          create: { id: s.id, data: JSON.stringify(s) }
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Shipment POST DB error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
