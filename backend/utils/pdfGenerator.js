const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const axios = require('axios');

// Fonts directory
const fontsDir = path.join(__dirname, '../fonts');
const tajawalFonts = {
  regular: path.join(fontsDir, 'Tajawal-Regular.ttf'),
  bold: path.join(fontsDir, 'Tajawal-Bold.ttf'),
  medium: path.join(fontsDir, 'Tajawal-Medium.ttf')
};

async function getSystemLogoBuffer() {
  try {
    const logoUrl = 'http://localhost:5001/uploads/ourLogo.png';
    const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Failed to load system logo:', error.message);
    return null;
  }
}

function addPdfHeader(doc, title, tajawalFonts, logoBuffer) {
  const pageWidth = doc.page.width;
  const centerX = pageWidth / 2;
  // System logo - centered
  if (logoBuffer) {
    try {
      const logoSize = 50;
      doc.image(logoBuffer, centerX - logoSize/2, 50, {
        width: logoSize,
        height: logoSize
      });
    } catch (e) {
      console.error('Error drawing system logo:', e.message);
    }
  }
  // Report title
  doc.font(tajawalFonts.bold)
    .fontSize(22)
    .fillColor('#1a5276')
    .text(title, centerX, 110, {
      align: 'center'
    });
  // Report date - LTR formatting
  const now = new Date();
  const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const dateLabel = 'Report Date: ';
  const dateLabelWidth = doc.widthOfString(dateLabel, {
    font: tajawalFonts.medium,
    fontSize: 12
  });
  doc.font(tajawalFonts.medium)
    .fontSize(12)
    .fillColor('#7f8c8d')
    .text(dateLabel, centerX - dateLabelWidth/2, 140, {
      textDirection: 'ltr'
    })
    .text(formattedDate, centerX - dateLabelWidth/2 + dateLabelWidth, 140, {
      textDirection: 'ltr'
    });
  // Divider line
  doc.moveTo(50, 170)
    .lineTo(pageWidth - 50, 170)
    .lineWidth(1)
    .stroke('#3498db');
}

function addPdfFooter(doc, tajawalFonts) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const pageNumber = doc.bufferedPageRange().count + 1;
  doc.save();
  doc.translate(0, pageHeight - 30);
  doc.font(tajawalFonts.regular)
    .fontSize(9)
    .fillColor('#7f8c8d')
    .text(`Page ${pageNumber}`, pageWidth - 50, 10, {
      align: 'right'
    });
  doc.font(tajawalFonts.regular)
    .fontSize(9)
    .fillColor('#7f8c8d')
    .text('Rhlty System Report - © All rights reserved', 50, 10, {
      align: 'left'
    });
  doc.restore();
}

// Function to generate system report (as in your provided code)
async function generateSystemReport(reportData) {
  // ... (copy your provided generateSystemReport function here, adapted to CommonJS)
}

module.exports = {
  tajawalFonts,
  getSystemLogoBuffer,
  addPdfHeader,
  addPdfFooter,
  generateSystemReport
}; 