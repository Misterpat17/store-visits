// src/lib/generatePDF.js
// Genera report PDF per una visita usando jsPDF

export default async function generatePDF(visit, visitActivities, storeName, userName) {
  // Import dinamico per non appesantire il bundle iniziale
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210; // larghezza A4 mm
  const margin = 15;
  let y = 0;

  // ── Helpers ──
  const addPage = () => { doc.addPage(); y = 20; };
  const checkY = (needed = 10) => { if (y + needed > 270) addPage(); };

  const fmt = (iso, opts) => iso
    ? new Date(iso).toLocaleString('it-IT', opts)
    : '—';

  const getDuration = () => {
    if (!visit?.start_time || !visit?.end_time) return '—';
    const mins = Math.round((new Date(visit.end_time) - new Date(visit.start_time)) / 60000);
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  // ── Intestazione blu ──
  doc.setFillColor(30, 64, 175); // primary-800
  doc.rect(0, 0, W, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Store Visit Report', margin, 15);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(storeName || '—', margin, 23);

  doc.setFontSize(9);
  doc.setTextColor(180, 200, 255);
  doc.text(`Generato il ${fmt(new Date().toISOString(), { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, 32);

  y = 48;

  // ── Info visita ──
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DETTAGLI VISITA', margin, y); y += 7;

  const infoItems = [
    ['Utente', userName || '—'],
    ['Store', storeName || '—'],
    ['Data', fmt(visit?.start_time, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })],
    ['Inizio', fmt(visit?.start_time, { hour: '2-digit', minute: '2-digit' })],
    ['Fine', fmt(visit?.end_time, { hour: '2-digit', minute: '2-digit' })],
    ['Durata', getDuration()],
  ];

  doc.setFontSize(9);
  infoItems.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? margin : 110;
    const iy = y + row * 8;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, iy - 4, 85, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x + 3, iy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(value, x + 3, iy + 4);
  });

  y += Math.ceil(infoItems.length / 2) * 8 + 8;

  // Note generali
  if (visit?.note_generali) {
    checkY(20);
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin, y - 2, W - margin * 2, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('NOTE GENERALI', margin + 3, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const wrapped = doc.splitTextToSize(visit.note_generali, W - margin * 2 - 6);
    doc.text(wrapped, margin + 3, y + 8);
    y += 14 + wrapped.length * 4 + 6;
  }

  // ── Attività completate ──
  const completed = visitActivities.filter(v => v.completed);
  const notCompleted = visitActivities.filter(v => !v.completed);

  if (completed.length > 0) {
    checkY(14);
    // Titolo sezione
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(margin, y, 4, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(6, 78, 59);
    doc.text(`ATTIVITÀ COMPLETATE (${completed.length})`, margin + 8, y + 5);
    y += 11;

    completed.forEach((va) => {
      checkY(16);
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.roundedRect(margin, y, W - margin * 2, va.notes ? 16 : 10, 1.5, 1.5, 'F');

      // Checkmark
      doc.setFillColor(16, 185, 129);
      doc.circle(margin + 5, y + 5, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text('✓', margin + 3.5, y + 6.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(6, 78, 59);
      doc.text(va.activities?.titolo || '', margin + 11, y + 5.5);

      if (va.notes) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const wrapped = doc.splitTextToSize(va.notes, W - margin * 2 - 14);
        doc.text(wrapped, margin + 11, y + 11);
        y += 6 + wrapped.length * 4;
      }

      y += 12;

      // Allegati non-immagine: elenca nomi
      if (va.attachments?.length > 0) {
        const nonImages = va.attachments.filter(a => !a.file_type?.startsWith('image/'));
        if (nonImages.length > 0) {
          checkY(8);
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`  📎 Allegati: ${nonImages.map(a => a.file_name).join(', ')}`, margin + 11, y);
          y += 5;
        }
      }
    });

    y += 4;
  }

  // ── Attività non completate ──
  if (notCompleted.length > 0) {
    checkY(14);
    doc.setFillColor(148, 163, 184); // slate-400
    doc.rect(margin, y, 4, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`ATTIVITÀ NON COMPLETATE (${notCompleted.length})`, margin + 8, y + 5);
    y += 11;

    notCompleted.forEach((va) => {
      checkY(14);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, W - margin * 2, va.notes ? 16 : 10, 1.5, 1.5, 'F');

      doc.setFillColor(203, 213, 225);
      doc.circle(margin + 5, y + 5, 3, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(va.activities?.titolo || '', margin + 11, y + 5.5);

      if (va.notes) {
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const wrapped = doc.splitTextToSize(va.notes, W - margin * 2 - 14);
        doc.text(wrapped, margin + 11, y + 11);
        y += 6 + wrapped.length * 4;
      }

      y += 12;
    });
  }

  // ── Immagini allegate ──
  const allImages = visitActivities.flatMap(va =>
    (va.attachments || [])
      .filter(a => a.file_type?.startsWith('image/'))
      .map(a => ({ ...a, activityTitle: va.activities?.titolo }))
  );

  if (allImages.length > 0) {
    addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 64, 175);
    doc.text('FOTO ALLEGATE', margin, y);
    y += 8;

    // Griglia 2 colonne
    let col = 0;
    for (const img of allImages) {
      checkY(75);
      try {
        // Carica immagine come base64
        const response = await fetch(img.file_url);
        const blob = await response.blob();
        const base64 = await new Promise((res) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.readAsDataURL(blob);
        });

        const x = col === 0 ? margin : W / 2 + 2;
        const imgW = (W - margin * 2 - 4) / 2;

        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(img.activityTitle || '', x, y);

        doc.addImage(base64, 'JPEG', x, y + 3, imgW, 55, undefined, 'MEDIUM');
        doc.setTextColor(150, 150, 150);
        doc.text(img.file_name, x, y + 60);

        if (col === 0) {
          col = 1;
        } else {
          col = 0;
          y += 68;
        }
      } catch {
        // Skip immagini non caricabili
      }
    }
  }

  // ── Footer su ogni pagina ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Store Visit Manager · Pag. ${i}/${pageCount}`,
      W / 2, 290,
      { align: 'center' }
    );
  }

  // ── Download ──
  const dateStr = fmt(visit?.start_time, { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '-');
  doc.save(`visita_${storeName?.replace(/\s+/g, '_')}_${dateStr}.pdf`);
}
