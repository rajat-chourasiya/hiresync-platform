import PDFDocument from 'pdfkit';

interface InvoiceData {
  orgName: string;
  planId: string;
  amount: number;
  currency: string;
  orderId: string;
  paymentId: string;
  paidAt: Date;
}

export function generateInvoicePdfBuffer(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).fillColor('#1D4ED8').text('HireSync', { align: 'left' });
    doc.fontSize(10).fillColor('#6B7280').text('Payment Receipt', { align: 'left' });
    doc.moveDown(2);

    doc.fontSize(12).fillColor('#111827');
    doc.text(`Receipt for: ${data.orgName}`);
    doc.text(`Plan: ${data.planId}`);
    doc.text(`Order ID: ${data.orderId}`);
    doc.text(`Payment ID: ${data.paymentId}`);
    doc.text(`Date: ${data.paidAt.toUTCString()}`);
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').stroke();
    doc.moveDown(1);

    doc.fontSize(14).fillColor('#15803D').text(`Amount Paid: ${data.currency} ${data.amount}`, { align: 'right' });

    doc.moveDown(3);
    doc.fontSize(9).fillColor('#6B7280').text('This is a computer-generated receipt and does not require a signature.', { align: 'center' });

    doc.end();
  });
}