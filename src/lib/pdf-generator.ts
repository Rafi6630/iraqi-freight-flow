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
  serviceBreakdown?: any[]; paymentTerms?: { description: string; percentage: number }[];
  quotationDescription?: string; companyName?: string; companySlogan?: string; companyLogoUrl?: string | null;
  customer?: any;
}) {
  const doc = new jsPDF();
  const companyName = data.companyName || COMPANY_NAME;
  const companySlogan = data.companySlogan || COMPANY_SLOGAN;
  const customer = data.customer || {};

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, 14, 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(companySlogan, 14, 27);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', 196, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.quoteNo, 196, 27, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 196, 33, { align: 'right' });

  doc.setDrawColor(41, 98, 255);
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);

  let y = 45;

  // Customer info
  doc.setFontSize(10);
  doc.text('To:', 14, y);
  doc.setFont('helvetica', 'bold');
  doc.text(customer.company || data.customerName, 14, y + 6);
  doc.setFont('helvetica', 'normal');
  if (customer.contact_name) doc.text(`Contact: ${customer.contact_name}`, 14, y + 12);
  if (customer.phone) doc.text(`Phone: ${customer.phone}`, 14, y + 18);
  if (customer.email) doc.text(`Email: ${customer.email}`, 14, y + 24);
  if (customer.address) doc.text(`Address: ${customer.address}${customer.city ? `, ${customer.city}` : ''}`, 14, y + 30);

  // Order info (right side)
  doc.text(`Order: ${data.order.order_no}`, 120, y);
  doc.text(`Route: ${data.order.origin_city || data.order.origin_country} → ${data.order.destination_city || data.order.destination_country}`, 120, y + 6);
  doc.text(`Mode: ${data.order.mode?.toUpperCase()}`, 120, y + 12);
  if (data.order.incoterm) doc.text(`Incoterm: ${data.order.incoterm}`, 120, y + 18);
  if (data.order.cargo_desc) doc.text(`Cargo: ${data.order.cargo_desc.substring(0, 40)}`, 120, y + 24);
  if (data.order.etd) doc.text(`ETD: ${data.order.etd}`, 120, y + 30);
  if (data.order.eta) doc.text(`ETA: ${data.order.eta}`, 160, y + 30);

  y += 38;

  // FX Block
  y = addFxBlock(doc, y, data.fxRate, data.fxDate);

  // Services table — Customer-facing: Service | Quoted Price USD | Quoted Price IQD
  const breakdown = data.serviceBreakdown || data.costs.map((c: any) => ({
    description: c.description || c.category || 'Service',
    quoted_price_usd: c.amount_usd * (1 + data.marginPct / 100),
    quoted_price_iqd: c.amount_usd * (1 + data.marginPct / 100) * data.fxRate,
  }));

  const serviceRows: any[] = breakdown.map((svc: any) => [
    svc.description || svc.category || 'Service',
    formatUSD(svc.quoted_price_usd),
    formatIQD(svc.quoted_price_iqd || svc.quoted_price_usd * data.fxRate),
  ]);

  // Service fee line
  serviceRows.push([
    { content: 'Service Fee', styles: { fontStyle: 'bold' } },
    formatUSD(data.serviceFeeUsd),
    formatIQD(data.serviceFeeUsd * data.fxRate),
  ]);

  // Total
  serviceRows.push([
    { content: 'TOTAL', styles: { fontStyle: 'bold' } },
    { content: formatUSD(data.totalUsd), styles: { fontStyle: 'bold' } },
    { content: formatIQD(data.totalUsd * data.fxRate), styles: { fontStyle: 'bold' } },
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Service', 'Quoted Price USD', 'Quoted Price IQD']],
    body: serviceRows,
    theme: 'grid',
    headStyles: { fillColor: [41, 98, 255], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Payment Terms
  if (data.paymentTerms && data.paymentTerms.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Terms:', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    data.paymentTerms.forEach(term => {
      const amtUsd = data.totalUsd * (term.percentage / 100);
      doc.text(`• ${term.description}: ${term.percentage}% — ${formatUSD(amtUsd)} | ${formatIQD(amtUsd * data.fxRate)}`, 14, y);
      y += 5;
    });
    y += 5;
  }

  // Validity
  doc.setFontSize(9);
  doc.text(`This quotation is valid for ${data.validity} days from the date of issue.`, 14, y);
  y += 5;
  doc.text(`Validity Date: ${new Date(Date.now() + data.validity * 86400000).toLocaleDateString()}`, 14, y);
  y += 8;

  // Terms & Conditions
  if (data.quotationDescription) {
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(data.quotationDescription, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 5;
  }

  // Signature
  doc.text('Customer Acceptance:', 14, y + 5);
  doc.line(14, y + 20, 90, y + 20);
  doc.text('Signature & Date', 14, y + 25);

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
