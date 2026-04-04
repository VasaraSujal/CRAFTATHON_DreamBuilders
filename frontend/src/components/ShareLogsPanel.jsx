import React, { useEffect, useMemo, useState } from 'react';
import { createLogsPdf, selectLogsForExport, saveLogsPdf } from '../utils/logExport.js';

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getDownloadFileName(recipientName) {
  const base = recipientName ? recipientName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'logs-report';
  return `${base || 'logs-report'}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

export default function ShareLogsPanel({ open, logs, onClose }) {
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const openPicker = (event) => {
    event.currentTarget.showPicker?.();
  };

  useEffect(() => {
    if (!open) {
      setStatus('');
      setError('');
    }
  }, [open]);

  const exportRows = useMemo(
    () => selectLogsForExport(logs, { startAt, endAt }),
    [logs, startAt, endAt],
  );

  const selectedRangeLabel = startAt || endAt
    ? `${startAt || 'Start'} to ${endAt || 'End'}`
    : 'Latest 50 logs';

  const handleGenerate = async () => {
    setError('');
    setStatus('');

    if (startAt && endAt && new Date(startAt) > new Date(endAt)) {
      setError('Start time must be earlier than end time.');
      return;
    }

    if (!exportRows.length) {
      setError('No logs match the selected range.');
      return;
    }

    const fileName = getDownloadFileName(recipientName || recipientEmail);
    saveLogsPdf(exportRows, {
      recipientName,
      recipientEmail,
      startAt: startAt ? toDateTimeLocal(startAt) : '',
      endAt: endAt ? toDateTimeLocal(endAt) : '',
      fileName,
    });

    setStatus(`PDF created with ${exportRows.length} logs.`);
  };

  const handleShare = async () => {
    setError('');
    setStatus('');

    if (startAt && endAt && new Date(startAt) > new Date(endAt)) {
      setError('Start time must be earlier than end time.');
      return;
    }

    if (!exportRows.length) {
      setError('No logs match the selected range.');
      return;
    }

    const fileName = getDownloadFileName(recipientName || recipientEmail);
    const doc = createLogsPdf(exportRows, {
      recipientName,
      recipientEmail,
      startAt: startAt ? toDateTimeLocal(startAt) : '',
      endAt: endAt ? toDateTimeLocal(endAt) : '',
      fileName,
    });

    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [pdfFile] }) && navigator.share) {
      await navigator.share({
        title: 'Secure Communication Logs Report',
        text: recipientEmail
          ? `Logs report prepared for ${recipientEmail}`
          : 'Logs report prepared for sharing',
        files: [pdfFile],
      });
      setStatus('Share sheet opened.');
      return;
    }

    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setStatus('PDF downloaded. Use your mail app to send it.');
  };

  if (!open) {
    return null;
  }

  return (
    <section className="panel share-panel">
      <div className="share-panel-head">
        <div>
          <p className="eyebrow">Share Logs</p>
          <h3>Generate a PDF report</h3>
          <p className="share-panel-copy">
            By default this exports the latest 50 logs and includes a ranked top 5 communicator list. Choose a start and end date/time from the calendar pickers to narrow it down.
          </p>
        </div>
        <button type="button" className="btn-muted" onClick={onClose}>Close</button>
      </div>

      <div className="share-grid">
        <label className="setting-item">
          <span>Recipient name</span>
          <input className="input" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Analyst Name" />
        </label>

        <label className="setting-item">
          <span>Recipient email</span>
          <input className="input" type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="person@example.com" />
        </label>

        <label className="setting-item">
          <span>Start date and time</span>
          <div className="date-input-wrap">
            <input
              className="input"
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              onFocus={openPicker}
              onClick={openPicker}
            />
            <button type="button" className="btn-muted picker-btn" onClick={(event) => event.currentTarget.previousElementSibling?.showPicker?.()}>
              Calendar
            </button>
          </div>
        </label>

        <label className="setting-item">
          <span>End date and time</span>
          <div className="date-input-wrap">
            <input
              className="input"
              type="datetime-local"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
              onFocus={openPicker}
              onClick={openPicker}
            />
            <button type="button" className="btn-muted picker-btn" onClick={(event) => event.currentTarget.previousElementSibling?.showPicker?.()}>
              Calendar
            </button>
          </div>
        </label>
      </div>

      <div className="share-summary">
        <strong>{selectedRangeLabel}</strong>
        <span>{exportRows.length} logs ready for PDF export, with top communicators ranked inside the PDF</span>
      </div>

      {error ? <div className="error-box" style={{ marginTop: 12 }}>{error}</div> : null}
      {status ? <div className="success-box" style={{ marginTop: 12 }}>{status}</div> : null}

      <div className="share-actions">
        <button type="button" className="btn-primary" onClick={handleGenerate}>
          Download PDF
        </button>
        <button type="button" className="btn-danger" onClick={handleShare}>
          Share PDF
        </button>
      </div>
    </section>
  );
}
