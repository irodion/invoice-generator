// Types remain the same
interface Company {
  name: string;
  address: string;
  email: string;
  phone: string;
}

interface Contragent {
  companyName: string;
  address: string;
  email: string;
  phone: string;
}

interface InvoiceData {
  invoiceNumber: string;
  companyIndex: number;
  contragentIndex: number;
  currency: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Custom error class
class InvoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvoiceError';
  }
}

// Validation functions
function validateNumber(value: unknown, fieldName: string): number {
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Invalid ${fieldName}: must be a number`);
  }
  return num;
}

function validateSelection(selection: GoogleAppsScript.Spreadsheet.Range | null): GoogleAppsScript.Spreadsheet.Range {
  if (!selection) {
    throw new Error('No range selected. Please select invoice items.');
  }
  return selection;
}

function validateRowData(row: unknown[], rowIndex: number): void {
  if (row.length < 3) {
    throw new Error(`Row ${rowIndex + 1} is missing required fields.`);
  }
  
  if (!row[0]) {
    throw new Error(`Row ${rowIndex + 1} is missing a description.`);
  }
  
  validateNumber(row[1], `quantity in row ${rowIndex + 1}`);
  validateNumber(row[2], `unit price in row ${rowIndex + 1}`);
}

function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Invoice Generator')
    .addItem('Generate Invoice', 'showInvoiceDialog')
    .addToUi();
}

function showInvoiceDialog(): void {
  const html = HtmlService.createTemplateFromFile('templates/DialogTemplate.html')
    .evaluate()
    .setWidth(400)
    .setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'Generate Invoice');
}

function getCompanyData(): Company[] {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const companies: Company[] = [];

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) { // If name exists
      companies.push({
        name: data[i][0],
        address: data[i][1],
        email: data[i][2],
        phone: data[i][3]
      });
    }
  }
  return companies;
}

function getContragentData(): Contragent[] {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[1];
  const data = sheet.getDataRange().getValues();
  const contragents: Contragent[] = [];

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) { // If company name exists
      contragents.push({
        companyName: data[i][0],
        address: data[i][1],
        email: data[i][2],
        phone: data[i][3]
      });
    }
  }
  return contragents;
}

function cleanNameForFile(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .substring(0, 10);
}

function getOrCreateInvoicesFolder(): GoogleAppsScript.Drive.Folder {
  const folderName = "Invoices";
  const folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function generateInvoicePDF(invoiceData: InvoiceData): void {
  try {
    // Get the active spreadsheet and selected rows
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const activeSheet = spreadsheet.getActiveSheet();
    
    // Use validation utilities
    const selection = validateSelection(activeSheet.getActiveRange());
    const selectedRows = selection.getValues();

    // Validate all rows
    selectedRows.forEach((row, index) => {
      validateRowData(row, index);
    });

    // Get company and contragent data
    const companies = getCompanyData();
    const contragents = getContragentData();

    // Validate indices
    if (invoiceData.companyIndex >= companies.length) {
      throw new InvoiceError('Invalid company selected.');
    }
    if (invoiceData.contragentIndex >= contragents.length) {
      throw new InvoiceError('Invalid contragent selected.');
    }

    const company = companies[invoiceData.companyIndex];
    const contragent = contragents[invoiceData.contragentIndex];
    
    // Calculate dates
    const currentDate = new Date();
    const dueDate = new Date(currentDate);
    dueDate.setMonth(dueDate.getMonth() + 1);
    
    // Calculate totals using validation
    let subtotal = 0;
    const items: InvoiceItem[] = selectedRows.map((row, index) => {
      const quantity = validateNumber(row[1], `quantity in row ${index + 1}`);
      const unitPrice = validateNumber(row[2], `unit price in row ${index + 1}`);
      
      const total = unitPrice * quantity;
      subtotal += total;
      
      return {
        description: String(row[0]),
        quantity,
        unitPrice,
        total
      };
    });

    // Create HTML template
    const template = HtmlService.createTemplate(
      HtmlService.createTemplateFromFile('templates/InvoiceTemplate.html')
        .getRawContent()
    );

    // Set template variables
    Object.assign(template, {
      company,
      contragent,
      invoiceNumber: invoiceData.invoiceNumber,
      currentDate: Utilities.formatDate(currentDate, Session.getScriptTimeZone(), 'MMMM dd, yyyy'),
      dueDate: Utilities.formatDate(dueDate, Session.getScriptTimeZone(), 'MMMM dd, yyyy'),
      currency: invoiceData.currency,
      items,
      subtotal
    });

    // Generate PDF
    const htmlOutput = template.evaluate().getContent();
    const blob = Utilities.newBlob(htmlOutput, 'text/html', 'invoice.html');
    const pdf = blob.getAs('application/pdf');
    
    // Create filename
    const cleanContragentName = cleanNameForFile(contragent.companyName);
    const dateStr = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), 'yyyyMMdd');
    const fileName = `${cleanContragentName}_${invoiceData.invoiceNumber}_${dateStr}.pdf`;
    
    // Save to Drive
    const folder = getOrCreateInvoicesFolder();
    folder.createFile(pdf.setName(fileName));
    
    // Show success message
    SpreadsheetApp.getUi().alert(
      'Invoice has been generated successfully!\n\n' +
      'Location: Invoices/' + fileName
    );
    
  } catch (error) {
    // Type guard for our custom error
    if (error instanceof InvoiceError) {
      SpreadsheetApp.getUi().alert('Error: ' + error.message);
    } else {
      // Handle unknown errors
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      SpreadsheetApp.getUi().alert('Error generating invoice: ' + errorMessage);
      console.error('Invoice generation error:', error);
    }
    throw error;
  }
}
