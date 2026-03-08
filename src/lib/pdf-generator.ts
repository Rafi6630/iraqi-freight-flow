import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatUSD, formatIQD, DEFAULT_FX_RATE } from './currency';

const COMPANY_NAME = 'FreightFlow Logistics';
const COMPANY_SLOGAN = 'Your Trusted Freight Forwarding Partner';

function addHeader(doc: jsPDF, title: string, docNo: string) {
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_NAME, 14, 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_SLOGAN, 14, 27);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 196, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(docNo, 196, 27, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 196, 33, { align: 'right' });

  doc.setDrawColor(41, 98, 255);
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);
}

function addFxBlock(doc: jsPDF, y: number, fxRate: number, fxDate: string) {
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, y, 182, 16, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`FX Rate: ${fxRate.toLocaleString()} (USD/IQD)`, 20, y + 7);
  doc.text(`FX Date: ${fxDate}`, 120, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text('FX rate locked at time of creation', 20, y + 13);
  return y + 20;
}

export function generateQuotationPDF(data: {
  quoteNo: string; customerName: string; order: any; costs: any[];
  marginPct: number; serviceFeeUsd: number; totalUsd: number;
  fxRate: number; fxDate: string; validity: number;
}) {
  const doc = new jsPDF();
  addHeader(doc, 'QUOTATION', data.quoteNo);

  let y = 45;

  // Customer info
  doc.setFontSize(10);
  doc.text('To:', 14, y);
  doc.setFont('helvetica', 'bold');
  doc.text(data.customerName, 14, y + 6);
  doc.setFont('helvetica', 'normal');

  // Order details
  doc.text(`Order: ${data.order.order_no}`, 120, y);
  doc.text(`Route: ${data.order.origin_city || data.order.origin_country} → ${data.order.destination_city || data.order.destination_country}`, 120, y + 6);
  doc.text(`Mode: ${data.order.mode?.toUpperCase()}`, 120, y + 12);
  if (data.order.incoterm) doc.text(`Incoterm: ${data.order.incoterm}`, 120, y + 18);

  y += 28;

  // FX Block
  y = addFxBlock(doc, y, data.fxRate, data.fxDate);

  // Services table
  const serviceRows = data.costs.map((c: any) => [
    c.description || c.category || 'Service',
    formatUSD(c.amount_usd),
    formatIQD(c.amount_iqd),
    formatUSD(c.amount_usd * (data.marginPct / 100)),
    formatUSD(c.amount_usd * (1 + data.marginPct / 100)),
    formatIQD(c.amount_iqd * (1 + data.marginPct / 100)),
  ]);

  serviceRows.push([
    { content: 'Service Fee', styles: { fontStyle: 'bold' } },
    '', '',
    formatUSD(data.serviceFeeUsd),
    formatUSD(data.serviceFeeUsd),
    formatIQD(data.serviceFeeUsd * data.fxRate),
  ]);

  serviceRows.push([
    { content: 'TOTAL', styles: { fontStyle: 'bold' } },
    '', '', '',
    { content: formatUSD(data.totalUsd), styles: { fontStyle: 'bold' } },
    { content: formatIQD(data.totalUsd * data.fxRate), styles: { fontStyle: 'bold' } },
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Service', 'Cost USD', 'Cost IQD', 'Fee USD', 'Quoted USD', 'Quoted IQD']],
    body: serviceRows,
    theme: 'grid',
    headStyles: { fillColor: [41, 98, 255], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Validity
  doc.setFontSize(9);
  doc.text(`This quotation is valid for ${data.validity} days from the date of issue.`, 14, y);
  y += 20;

  // Signature
  doc.text('Customer Acceptance:', 14, y);
  doc.line(14, y + 15, 90, y + 15);
  doc.text('Signature & Date', 14, y + 20);

  doc.save(`Quotation-${data.order.order_no}.pdf`);
}

export function generateInvoicePDF(data: {
  invoiceNo: string; customerName: string; order: any;
  totalUsd: number; totalIqd: number; fxRate: number; fxDate: string;
}) {
  const doc = new jsPDF();
  addHeader(doc, 'INVOICE', data.invoiceNo);

  let y = 45;

  doc.setFontSize(10);
  doc.text('Bill To:', 14, y);
  doc.setFont('helvetica', 'bold');
  doc.text(data.customerName, 14, y + 6);
  doc.setFont('helvetica', 'normal');

  doc.text(`Order: ${data.order.order_no}`, 120, y);
  doc.text(`Issue Date: ${new Date().toLocaleDateString()}`, 120, y + 6);
  doc.text(`Due Date: ${new Date(Date.now() + 30 * 86400000).toLocaleDateString()}`, 120, y + 12);

  y += 22;
  y = addFxBlock(doc, y, data.fxRate, data.fxDate);

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount USD', 'Amount IQD']],
    body: [
      ['Freight forwarding services', formatUSD(data.totalUsd), formatIQD(data.totalIqd)],
      [{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: formatUSD(data.totalUsd), styles: { fontStyle: 'bold' } }, { content: formatIQD(data.totalIqd), styles: { fontStyle: 'bold' } }],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 98, 255], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  y = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.text('Payment Instructions:', 14, y);
  doc.text('Please remit payment within 30 days of invoice date.', 14, y + 6);

  doc.save(`Invoice-${data.invoiceNo}.pdf`);
}

export function generateVendorBillPDF(data: {
  billNo: string; vendorName: string; order: any; costs: any[];
  totalUsd: number; totalIqd: number; fxRate: number; fxDate: string;
}) {
  const doc = new jsPDF();
  addHeader(doc, 'VENDOR BILL', data.billNo);

  let y = 45;

  doc.setFontSize(10);
  doc.text('Vendor:', 14, y);
  doc.setFont('helvetica', 'bold');
  doc.text(data.vendorName, 14, y + 6);
  doc.setFont('helvetica', 'normal');

  doc.text(`Order: ${data.order.order_no}`, 120, y);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 120, y + 6);

  y += 18;
  y = addFxBlock(doc, y, data.fxRate, data.fxDate);

  const rows = data.costs.map((c: any) => [
    c.description || c.category || 'Service',
    formatUSD(c.amount_usd),
    formatIQD(c.amount_iqd),
  ]);
  rows.push([
    { content: 'TOTAL', styles: { fontStyle: 'bold' } },
    { content: formatUSD(data.totalUsd), styles: { fontStyle: 'bold' } },
    { content: formatIQD(data.totalIqd), styles: { fontStyle: 'bold' } },
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount USD', 'Amount IQD']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [41, 98, 255], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  doc.save(`VendorBill-${data.billNo}.pdf`);
}
