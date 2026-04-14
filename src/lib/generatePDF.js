// src/lib/generatePDF.js
export default async function generatePDF(visit, visitActivities, storeName, userName) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 15;
  let y = 0;

  const addPage = () => { doc.addPage(); y = 20; };
  const checkY = (needed = 10) => { if (y + needed > 270) addPage(); };
  const fmt = (iso, opts) => iso ? new Date(iso).toLocaleString('it-IT', opts) : '—';
  const getDuration = () => {
    if (!visit?.start_time || !visit?.end_time) return '—';
    const mins = Math.round((new Date(visit.end_time) - new Date(visit.start_time)) / 60000);
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  // Colori per rating
  const ratingColor = (r) => {
    if (!r) return [148, 163, 184]; // slate
    if (r <= 2) return [220, 38, 38]; // red
    if (r === 3) return [217, 119, 6]; // amber
    return [5, 150, 105]; // emerald
  };

  // ── Intestazione ──
  doc.setFillColor(30, 64, 175);
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
  doc.setTextColor(30, 41, 59);
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

  // ── Attività per area (ordine fisso) ──
  const AREA_ORDER = ['COMMERCIALE','OBSOLETI','ASSISTENZA','FORMAZIONE','VOLANTINO','PROMOZIONE','AREE ESPOSITIVE','ANALISI PERFORMANCE'];

  // Raggruppa per area mantenendo ordine fisso
  const byArea = {};
  visitActivities.forEach(va => {
    const area = va.activities?.area || 'ALTRO';
    if (!byArea[area]) byArea[area] = [];
    byArea[area].push(va);
  });

  const orderedAreas = [
    ...AREA_ORDER.filter(a => byArea[a]),
    ...Object.keys(byArea).filter(a => !AREA_ORDER.includes(a))
  ];

  for (const area of orderedAreas) {
    const areaActs = byArea[area];
    if (!areaActs?.length) continue;

    checkY(14);
    // Titolo area
    doc.setFillColor(30, 64, 175);
    doc.rect(margin, y, W - margin * 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(area, margin + 3, y + 5.5);
    y += 11;

    for (const va of areaActs) {
      const isCompleted = va.completed;
      const hasNotes = !!va.notes;
      const photos = (va.attachments || []).filter(a => a?.file_type?.startsWith('image/'));
      const hasPhotos = photos.length > 0;

      // Stima altezza riga
      let rowH = 10;
      if (hasNotes) rowH += 8;
      checkY(rowH + (hasPhotos ? 50 : 0));

      // Sfondo riga
      doc.setFillColor(isCompleted ? 240 : 248, isCompleted ? 253 : 250, isCompleted ? 244 : 252);
      doc.roundedRect(margin, y, W - margin * 2, rowH, 1.5, 1.5, 'F');

      // Pallino stato
      const [cr, cg, cb] = isCompleted ? [16, 185, 129] : [203, 213, 225];
      doc.setFillColor(cr, cg, cb);
      doc.circle(margin + 5, y + 5, 2.5, 'F');
      if (isCompleted) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.text('✓', margin + 3.8, y + 6.2);
      }

      // Titolo attività
      doc.setFont('helvetica', isCompleted ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(isCompleted ? 6 : 100, isCompleted ? 78 : 116, isCompleted ? 59 : 139);

      // Rating a destra
      if (va.rating) {
        const [rr, rg, rb] = ratingColor(va.rating);
        doc.setTextColor(rr, rg, rb);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const stars = '★'.repeat(va.rating) + '☆'.repeat(5 - va.rating);
        doc.text(stars, W - margin - 22, y + 5.5);
        // Testo attività più corto per fare spazio alle stelle
        doc.setTextColor(isCompleted ? 6 : 100, isCompleted ? 78 : 116, isCompleted ? 59 : 139);
        doc.setFont('helvetica', isCompleted ? 'bold' : 'normal');
        doc.setFontSize(8.5);
        const titleWrapped = doc.splitTextToSize(va.activities?.titolo || '', W - margin * 2 - 35);
        doc.text(titleWrapped, margin + 11, y + 5.5);
      } else {
        const titleWrapped = doc.splitTextToSize(va.activities?.titolo || '', W - margin * 2 - 14);
        doc.text(titleWrapped, margin + 11, y + 5.5);
      }

      y += rowH;

      // Note
      if (hasNotes) {
        checkY(8);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin + 8, y, W - margin * 2 - 8, 7, 1, 1, 'F');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const noteWrapped = doc.splitTextToSize(va.notes, W - margin * 2 - 14);
        doc.text(noteWrapped, margin + 11, y + 4);
        y += 7 + Math.max(0, (noteWrapped.length - 1) * 3.5);
      }

      // Foto sotto l'attività (non alla fine)
      if (hasPhotos) {
        y += 2;
        let col = 0;
        for (const img of photos) {
          checkY(42);
          try {
            const response = await fetch(img.file_url);
            const blob = await response.blob();
            const base64 = await new Promise((res) => {
              const reader = new FileReader();
              reader.onload = () => res(reader.result);
              reader.readAsDataURL(blob);
            });
            const x = col === 0 ? margin + 8 : margin + 8 + 45;
            const imgW = 40;
            doc.addImage(base64, 'JPEG', x, y, imgW, 35, undefined, 'MEDIUM');
            if (col === 0) {
              col = 1;
            } else {
              col = 0;
              y += 37;
            }
          } catch { /* skip */ }
        }
        if (col === 1) y += 37; // ultima riga con 1 sola foto
        y += 3;
      }

      y += 3;
    }
    y += 4;
  }

  // ── Footer ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Bruno Store Check · Pag. ${i}/${pageCount}`, W / 2, 290, { align: 'center' });
  }

  const dateStr = fmt(visit?.start_time, { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  doc.save(`visita_${storeName?.replace(/\s+/g, '_')}_${dateStr}.pdf`);
}
