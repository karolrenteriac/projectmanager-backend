const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

class ReportGenerator {
  static async generatePDF(data, title, fields) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      
      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();
      
      data.forEach((item, index) => {
        doc.fontSize(14).text(`${index + 1}. ${item.title || item.name || 'N/A'}`);
        doc.fontSize(10);
        
        fields.forEach(field => {
          const value = item[field] || 'N/A';
          const label = field.charAt(0).toUpperCase() + field.slice(1);
          doc.text(`${label}: ${value}`);
        });
        
        doc.moveDown();
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve({
          buffer: pdfBuffer,
          filename: `${title.toLowerCase().replace(/\s+/g, '-')}-report.pdf`,
          contentType: 'application/pdf'
        });
      });
      
      doc.end();
    });
  }

  static async generateExcel(data, title, fields, sheetName = 'Data') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    const columns = fields.map(field => ({
      header: field.charAt(0).toUpperCase() + field.slice(1),
      key: field,
      width: 20
    }));

    worksheet.columns = columns;

    const processedData = data.map(item => {
      const row = {};
      fields.forEach(field => {
        let value = item[field];
        
        if (value && typeof value === 'object') {
          if (value.name) value = value.name;
          else if (value.email) value = value.email;
          else value = JSON.stringify(value);
        }
        
        if (value instanceof Date) {
          value = value.toLocaleDateString();
        }
        
        row[field] = value || '';
      });
      return row;
    });

    worksheet.addRows(processedData);

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer,
      filename: `${title.toLowerCase().replace(/\s+/g, '-')}-report.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  static async generateMultiSheetExcel(dataSheets, title) {
    const workbook = new ExcelJS.Workbook();

    for (const sheet of dataSheets) {
      const worksheet = workbook.addWorksheet(sheet.name);
      
      const columns = sheet.fields.map(field => ({
        header: field.charAt(0).toUpperCase() + field.slice(1),
        key: field,
        width: 20
      }));

      worksheet.columns = columns;

      const processedData = sheet.data.map(item => {
        const row = {};
        sheet.fields.forEach(field => {
          let value = item[field];
          
          if (value && typeof value === 'object') {
            if (value.name) value = value.name;
            else if (value.email) value = value.email;
            else value = JSON.stringify(value);
          }
          
          if (value instanceof Date) {
            value = value.toLocaleDateString();
          }
          
          row[field] = value || '';
        });
        return row;
      });

      worksheet.addRows(processedData);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer,
      filename: `${title.toLowerCase().replace(/\s+/g, '-')}-report.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }
}

module.exports = ReportGenerator;
