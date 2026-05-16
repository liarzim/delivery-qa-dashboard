import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import KpiCard from './KpiCard';
import TrafficLightWidget from './TrafficLightWidget';
import GaugeChart from './GaugeChart';
import CustomWidgetRenderer from './CustomWidgetRenderer';
import { getTrafficLight, getLightHex } from '../utils/thresholds';

function WidgetContent({ widget, delivery, qa, settings }) {
  const s = settings || {};
  const latestDelivery = delivery?.piMetrics?.[delivery.piMetrics.length - 1] || {};
  const latestQA = qa?.piMetrics?.[qa.piMetrics.length - 1] || {};

  const th = {
    reopenY: parseFloat(s.reopen_yellow || 5),
    reopenR: parseFloat(s.reopen_red || 10),
    rejectedY: parseFloat(s.rejected_yellow || 5),
    rejectedR: parseFloat(s.rejected_red || 10),
    escapingY: parseFloat(s.escaping_yellow || 3),
    escapingR: parseFloat(s.escaping_red || 7),
    commitY: parseFloat(s.commitment_yellow || 80),
    commitR: parseFloat(s.commitment_red || 60),
  };

  switch (widget.id) {
    case 'committed-rate':
      return (
        <KpiCard
          label="Committed Completion Rate"
          value={latestDelivery.committedRate ?? '—'}
          unit="%"
          light={getTrafficLight(latestDelivery.committedRate, th.commitY, th.commitR, true)}
          sub={`${latestDelivery.committedDone ?? 0} / ${latestDelivery.totalCommitted ?? 0} committed`}
        />
      );
    case 'overall-rate':
      return (
        <KpiCard
          label="Overall Completion Rate"
          value={latestDelivery.overallRate ?? '—'}
          unit="%"
          light={getTrafficLight(latestDelivery.overallRate, th.commitY, th.commitR, true)}
          sub={`${latestDelivery.totalDone ?? 0} / ${latestDelivery.totalFeatures ?? 0} features`}
        />
      );
    case 'avg-velocity':
      return <KpiCard label="Average Velocity" value={delivery?.summary?.avgVelocity ?? '—'} unit=" items/PI" light="neutral" />;
    case 'throughput':
      return <KpiCard label="Total Throughput" value={delivery?.summary?.totalThroughput ?? '—'} unit=" items" light="neutral" />;
    case 'committed-gauge':
      return (
        <div className="card flex flex-col items-center gap-2 py-4">
          <GaugeChart
            value={latestDelivery.committedRate || 0}
            color={getLightHex(getTrafficLight(latestDelivery.committedRate, th.commitY, th.commitR, true))}
            label="Committed Rate"
            size={130}
          />
        </div>
      );
    case 'reopen-pct':
      return (
        <TrafficLightWidget
          label="Reopen %"
          value={latestQA.reopenPct ?? 0}
          light={getTrafficLight(latestQA.reopenPct, th.reopenY, th.reopenR)}
          yellowThreshold={th.reopenY}
          redThreshold={th.reopenR}
        />
      );
    case 'rejected-pct':
      return (
        <TrafficLightWidget
          label="Rejected %"
          value={latestQA.rejectedPct ?? 0}
          light={getTrafficLight(latestQA.rejectedPct, th.rejectedY, th.rejectedR)}
          yellowThreshold={th.rejectedY}
          redThreshold={th.rejectedR}
        />
      );
    case 'escaping-pct':
      return (
        <TrafficLightWidget
          label="Escaping %"
          value={latestQA.escapingPct ?? 0}
          light={getTrafficLight(latestQA.escapingPct, th.escapingY, th.escapingR)}
          yellowThreshold={th.escapingY}
          redThreshold={th.escapingR}
        />
      );
    case 'reopen-density':
      return (
        <KpiCard
          label="Reopen Density"
          value={latestQA.reopenDensity ?? '—'}
          unit="%"
          light={getTrafficLight(latestQA.reopenDensity, parseFloat(s.reopen_density_yellow || 2), parseFloat(s.reopen_density_red || 5))}
          sub={`Capacity: ${latestQA.capacity ?? '—'}`}
        />
      );
    case 'escaping-density':
      return (
        <KpiCard
          label="Escaping Density"
          value={latestQA.escapingDensity ?? '—'}
          unit="%"
          light={getTrafficLight(latestQA.escapingDensity, parseFloat(s.escaping_density_yellow || 2), parseFloat(s.escaping_density_red || 5))}
          sub={`Capacity: ${latestQA.capacity ?? '—'}`}
        />
      );
    case 'uncommitted-rate':
      return (
        <KpiCard
          label="Uncommitted Rate"
          value={latestDelivery.uncommittedRate ?? '—'}
          unit="%"
          light="neutral"
          sub={`${latestDelivery.uncommittedDone ?? 0} / ${latestDelivery.totalUncommitted ?? 0} not committed`}
        />
      );
    default: {
      // Custom widgets: id = "custom_<numericId>"
      if (widget.id?.toString().startsWith('custom_')) {
        const customId = widget.id.toString().replace('custom_', '');
        return (
          <div className="group h-full" style={{ minHeight: 160 }}>
            <CustomWidgetRenderer
              widgetId={customId}
              config={widget.config}
              name={widget.label}
            />
          </div>
        );
      }
      return (
        <div className="card flex items-center justify-center text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>
          {widget.label}
        </div>
      );
    }
  }
}

export default function GridWidget({ widget, delivery, qa, settings, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 p-1 rounded cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'rgba(237,240,254,0.3)' }}
      >
        <GripVertical size={14} />
      </div>

      <button
        onClick={() => onRemove(widget.id)}
        className="absolute top-2 right-2 z-10 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:text-sigma-red"
        style={{ color: 'rgba(237,240,254,0.3)' }}
      >
        <X size={14} />
      </button>

      <WidgetContent widget={widget} delivery={delivery} qa={qa} settings={settings} />
    </div>
  );
}
