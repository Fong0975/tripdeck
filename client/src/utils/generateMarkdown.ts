import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';

import type { TransportMode, Trip, TripContent } from '@/types';

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  walk: '步行',
  transit: '大眾運輸',
  drive: '開車',
  bike: '騎車',
  flight: '飛機',
  other: '其他',
};

export function generateMarkdown(trip: Trip, content: TripContent): string {
  const lines: string[] = [];

  lines.push(`# ${trip.title}`);
  lines.push('');

  if (trip.destination) {
    lines.push(`**目的地：** ${trip.destination}`);
  }

  const startDate = format(parseISO(trip.startDate), 'yyyy/MM/dd', {
    locale: zhTW,
  });
  const endDate = format(parseISO(trip.endDate), 'yyyy/MM/dd', {
    locale: zhTW,
  });
  lines.push(`**日期：** ${startDate} – ${endDate}`);
  lines.push(`**天數：** ${content.days.length} 天`);

  if (trip.description) {
    lines.push('');
    lines.push(trip.description);
  }

  lines.push('---');
  lines.push('');

  for (const day of content.days) {
    const dayLabel = format(parseISO(day.date), 'M月d日 (EEEE)', {
      locale: zhTW,
    });
    lines.push(`## 第 ${day.day} 天 · ${dayLabel}`);

    const connsByFrom = new Map<number, (typeof day.connections)[number][]>();
    for (const c of day.connections) {
      const list = connsByFrom.get(c.fromAttractionId) ?? [];
      list.push(c);
      connsByFrom.set(c.fromAttractionId, list);
    }

    for (const attraction of day.attractions) {
      lines.push(`### ${attraction.name}`);

      if (attraction.startTime || attraction.endTime) {
        const start = attraction.startTime ?? '–';
        const end = attraction.endTime ?? '–';
        lines.push(`🕐 ${start} – ${end}`);
        lines.push('');
      }

      if (attraction.googleMapUrl) {
        lines.push(`📍 [Google Maps](${attraction.googleMapUrl})`);
        lines.push('');
      }

      if (attraction.notes) {
        lines.push(attraction.notes);
        lines.push('');
      }

      if (attraction.nearbyAttractions) {
        lines.push(`**附近景點：** ${attraction.nearbyAttractions}`);
        lines.push('');
      }

      if ((attraction.referenceWebsites ?? []).length > 0) {
        lines.push('**參考網站：**');
        for (const url of attraction.referenceWebsites!) {
          lines.push(`- [${url}](${url})`);
        }
        lines.push('');
      }

      if ((attraction.images ?? []).length > 0) {
        for (const img of attraction.images!) {
          lines.push(`![${img.title}](/uploads/${img.filename})`);
        }
        lines.push('');
      }

      const outgoing = connsByFrom.get(attraction.id) ?? [];
      for (const conn of outgoing) {
        const toName =
          day.attractions.find(a => a.id === conn.toAttractionId)?.name ?? '';

        const transportParts = [TRANSPORT_LABELS[conn.transportMode]];
        if (conn.duration) {
          transportParts.push(conn.duration);
        }

        lines.push(
          `> **交通方式：** ${transportParts.join(' · ')}${toName ? ` → ${toName}` : ''}`,
        );

        if (conn.route) {
          lines.push(`> **路線：** ${conn.route}`);
        }

        if (conn.notes) {
          for (const noteLine of conn.notes.split('\n')) {
            lines.push(`> ${noteLine}`);
          }
        }

        if ((conn.images ?? []).length > 0) {
          lines.push('> ');
          for (const img of conn.images!) {
            lines.push(`> ![${img.title}](/uploads/${img.filename})`);
          }
        }

        lines.push('');
      }
    }
  }

  return lines.join('\n');
}
