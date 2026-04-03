import { jsPDF } from 'jspdf';

const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getLogTime(log) {
  return parseDate(log.timestamp || log.time);
}

function sortByNewest(a, b) {
  return getLogTime(b)?.getTime() - getLogTime(a)?.getTime();
}

export function selectLogsForExport(logs, { startAt = '', endAt = '' } = {}) {
  const ordered = [...logs].sort(sortByNewest);

  if (!startAt && !endAt) {
    return ordered.slice(0, 50);
  }

  const startTime = parseDate(startAt);
  const endTime = parseDate(endAt);

  return ordered.filter((log) => {
    const logTime = getLogTime(log);
    if (!logTime) return false;
    if (startTime && logTime < startTime) return false;
    if (endTime && logTime > endTime) return false;
    return true;
  });
}

function formatLogTime(log) {
  const logTime = getLogTime(log);
  return logTime ? TIME_FORMAT.format(logTime) : 'Unknown';
}

function wrapText(doc, text, width) {
  return doc.splitTextToSize(String(text || ''), width);
}

function getCommunicatorCounts(rows) {
  const counts = new Map();

  rows.forEach((row) => {
    const peers = [row.source, row.destination].filter(Boolean);

    peers.forEach((peer) => {
      const current = counts.get(peer) || 0;
      counts.set(peer, current + 1);
    });
  });

  return [...counts.entries()]
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count || a.ip.localeCompare(b.ip))
    .slice(0, 5);
}

export function createLogsPdf(rows, details = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const columnWidths = [42, 44, 44, 34, 30, 72];

  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Secure Communication Logs Report', margin, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated: ${TIME_FORMAT.format(new Date())}`, margin, y);
  y += 6;

  if (details.recipientName || details.recipientEmail) {
    doc.text(
      `Recipient: ${details.recipientName || 'N/A'}${details.recipientEmail ? ` <${details.recipientEmail}>` : ''}`,
      margin,
      y,
    );
    y += 6;
  }

  const rangeLabel = details.startAt || details.endAt
    ? `${details.startAt ? `from ${details.startAt}` : ''}${details.startAt && details.endAt ? ' ' : ''}${details.endAt ? `to ${details.endAt}` : ''}`
    : 'Latest 50 logs';
  doc.text(`Range: ${rangeLabel}`, margin, y);
  y += 6;
  doc.text(`Included logs: ${rows.length}`, margin, y);
  y += 10;

  const topCommunicators = getCommunicatorCounts(rows);

  const drawSectionTitle = (title) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
  };

  const drawTopCommunicators = () => {
    const sectionHeight = 8 + Math.max(1, topCommunicators.length) * 6;
    if (y + sectionHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    drawSectionTitle('Top 5 Communicators');
    doc.setTextColor(90, 90, 90);
    doc.text('Ranked by total involvement as source or destination in the selected logs.', margin, y);
    doc.setTextColor(22, 22, 22);
    y += 6;

    if (!topCommunicators.length) {
      doc.text('No communicators available for the selected range.', margin, y);
      y += 8;
      return;
    }

    const rankWidth = 16;
    const ipWidth = 120;
    const countWidth = 24;
    const tableWidth = rankWidth + ipWidth + countWidth;

    doc.setFillColor(25, 45, 41);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, y - 5, tableWidth, 8, 'F');
    doc.text('Rank', margin + 2, y);
    doc.text('IP Address', margin + rankWidth + 2, y);
    doc.text('Count', margin + rankWidth + ipWidth + 2, y);
    y += 8;
    doc.setTextColor(22, 22, 22);

    topCommunicators.forEach((item, index) => {
      const rankLabel = `#${index + 1}`;
      doc.text(rankLabel, margin + 2, y);
      doc.text(item.ip, margin + rankWidth + 2, y);
      doc.text(String(item.count), margin + rankWidth + ipWidth + 2, y);
      y += 6;
    });

    y += 4;
  };

  drawTopCommunicators();

  const headers = ['Time', 'Source', 'Destination', 'Status', 'Severity', 'Attack Type'];
  const rowHeight = 8;

  const drawHeader = () => {
    let x = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(25, 45, 41);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, y - 5, contentWidth, rowHeight, 'F');

    headers.forEach((header, index) => {
      doc.text(header, x + 1.5, y);
      x += columnWidths[index];
    });

    doc.setTextColor(22, 22, 22);
    y += rowHeight;
    doc.setFont('helvetica', 'normal');
  };

  const ensureSpace = (neededHeight = rowHeight) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
  };

  drawHeader();

  rows.forEach((row) => {
    const cells = [
      formatLogTime(row),
      row.source || '-',
      row.destination || '-',
      row.status || '-',
      row.severity || '-',
      row.attackType || 'None',
    ];

    const wrapped = cells.map((cell, index) => wrapText(doc, cell, columnWidths[index] - 3));
    const maxLines = Math.max(...wrapped.map((lines) => lines.length));
    const neededHeight = Math.max(rowHeight, maxLines * 5 + 2);

    ensureSpace(neededHeight);

    let x = margin;
    wrapped.forEach((lines, index) => {
      doc.text(lines, x + 1.5, y);
      x += columnWidths[index];
    });

    y += neededHeight;
  });

  return doc;
}

export function saveLogsPdf(rows, details = {}) {
  const doc = createLogsPdf(rows, details);
  const fileName = details.fileName || 'logs-report.pdf';
  doc.save(fileName);
  return doc;
}
