/**
 * Invoice Generator for Google Sheets
 *
 * Copyright (c) 2025 Rodion Izotov
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

namespace InvoiceTypes {
  export interface Company {
    name: string;
    address: string;
    email: string;
    phone: string;
    driveFolder: string;
  }

  export interface Contragent {
    companyName: string;
    address: string;
    email: string;
    phone: string;
    tax: number; // Added tax field (percentage)
    driveFolder: string;
  }

  export interface InvoiceData {
    invoiceNumber: string;
    companyIndex: number;
    contragentIndex: number;
    currency: string;
    templateId: string;
    paymentDays: number;
  }

  export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }

  export interface TemplateConfig {
    id: string;
    name: string;
    description: string;
    filename: string;
  }

  export class InvoiceError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'InvoiceError';
    }
  }
}

// Template configurations
const TEMPLATES: InvoiceTypes.TemplateConfig[] = [
  {
    id: 'default',
    name: 'Default Template',
    description: 'Standard invoice template with basic styling',
    filename: 'DefaultTemplate',
  },
  {
    id: 'modern',
    name: 'Modern Template',
    description: 'Contemporary design with enhanced styling',
    filename: 'ModernTemplate',
  },
  {
    id: 'printer-friendly',
    name: 'Printer-Friendly Template',
    description: 'Clean, minimal design optimized for printing',
    filename: 'PrinterFriendlyTemplate',
  },
];

// Template management functions
function getTemplatesList(): InvoiceTypes.TemplateConfig[] {
  return TEMPLATES;
}

function getTemplateById(id: string): InvoiceTypes.TemplateConfig | undefined {
  return TEMPLATES.find(template => template.id === id);
}

function getDefaultTemplate(): InvoiceTypes.TemplateConfig {
  return TEMPLATES[0];
}

function loadTemplate(templateId: string): GoogleAppsScript.HTML.HtmlTemplate {
  const template = getTemplateById(templateId) || getDefaultTemplate();
  return HtmlService.createTemplateFromFile(`templates/${template.filename}`);
}

// Validation functions
function validateNumber(value: unknown, fieldName: string): number {
  const num = Number(value);
  if (isNaN(num)) {
    throw new InvoiceTypes.InvoiceError(`Invalid ${fieldName}: must be a number`);
  }
  return num;
}

function validateSelection(
  selection: GoogleAppsScript.Spreadsheet.Range | null
): GoogleAppsScript.Spreadsheet.Range {
  if (!selection) {
    throw new InvoiceTypes.InvoiceError('No range selected. Please select invoice items.');
  }
  return selection;
}

function validateRowData(row: unknown[], rowIndex: number): void {
  if (row.length < 3) {
    throw new InvoiceTypes.InvoiceError(`Row ${rowIndex + 1} is missing required fields.`);
  }

  if (!row[0]) {
    throw new InvoiceTypes.InvoiceError(`Row ${rowIndex + 1} is missing a description.`);
  }

  validateNumber(row[1], `quantity in row ${rowIndex + 1}`);
  validateNumber(row[2], `unit price in row ${rowIndex + 1}`);
}

function validateSheetExists(
  sheets: GoogleAppsScript.Spreadsheet.Sheet[],
  index: number,
  sheetName: string
): GoogleAppsScript.Spreadsheet.Sheet {
  if (!sheets[index]) {
    throw new InvoiceTypes.InvoiceError(
      `Missing required sheet: "${sheetName}" (Sheet ${index + 1}). ` +
        'Please ensure the spreadsheet has the correct structure.'
    );
  }
  return sheets[index];
}

// HTML escaping helper to prevent XSS/broken PDFs
function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Create HTML-escaped version of company for template rendering
function escapeCompanyForTemplate(company: InvoiceTypes.Company): InvoiceTypes.Company {
  return {
    name: escapeHtml(company.name),
    address: escapeHtml(company.address),
    email: escapeHtml(company.email),
    phone: escapeHtml(company.phone),
    driveFolder: company.driveFolder, // Not rendered in template
  };
}

// Create HTML-escaped version of contragent for template rendering
function escapeContragentForTemplate(contragent: InvoiceTypes.Contragent): InvoiceTypes.Contragent {
  return {
    companyName: escapeHtml(contragent.companyName),
    address: escapeHtml(contragent.address),
    email: escapeHtml(contragent.email),
    phone: escapeHtml(contragent.phone),
    tax: contragent.tax,
    driveFolder: contragent.driveFolder, // Not rendered in template
  };
}

// Sanitize value to prevent spreadsheet formula injection
function sanitizeForSheet(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  // Prefix with single quote if value starts with formula-triggering characters
  if (/^[=+\-@\t\r]/.test(value)) {
    return "'" + value;
  }
  return value;
}

// Safe array access helper - handles both null and undefined
function safeGet<T>(arr: T[], index: number, defaultValue: T): T {
  return arr[index] != null ? arr[index] : defaultValue;
}

function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Invoice Generator')
    .addItem('Generate Invoice', 'showInvoiceDialog')
    .addSeparator()
    .addItem('Initialize Spreadsheet', 'initializeSpreadsheet')
    .addToUi();
}

/**
 * Initializes the spreadsheet with required sheets and headers
 */
function initializeSpreadsheet(): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // Confirm before initializing
  const response = ui.alert(
    'Initialize Spreadsheet',
    'This will create/update the following sheets:\n' +
      '• My Info (your company details)\n' +
      '• Contragents (client details)\n\n' +
      'Existing data will NOT be deleted. Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  // Initialize My Info sheet
  let myInfoSheet = spreadsheet.getSheetByName('My Info');
  if (!myInfoSheet) {
    myInfoSheet = spreadsheet.insertSheet('My Info', 0);
  }
  initializeMyInfoSheet(myInfoSheet);

  // Initialize Contragents sheet
  let contragentsSheet = spreadsheet.getSheetByName('Contragents');
  if (!contragentsSheet) {
    contragentsSheet = spreadsheet.insertSheet('Contragents', 1);
  }
  initializeContragentsSheet(contragentsSheet);

  ui.alert(
    'Spreadsheet initialized successfully!\n\nPlease fill in your company info in "My Info" sheet and client details in "Contragents" sheet.'
  );
}

function initializeMyInfoSheet(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  // Set headers if first row is empty
  const firstRow = sheet.getRange(1, 1, 1, 6).getValues()[0];
  if (!firstRow[0]) {
    sheet
      .getRange(1, 1, 1, 6)
      .setValues([['Company Name', 'Address', 'Email', 'Phone', 'Website', 'Google Drive Folder']]);
  }

  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, 6);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f3f3f3');
  sheet.setFrozenRows(1);

  // Set column widths
  sheet.setColumnWidth(1, 200); // Company Name
  sheet.setColumnWidth(2, 250); // Address
  sheet.setColumnWidth(3, 180); // Email
  sheet.setColumnWidth(4, 120); // Phone
  sheet.setColumnWidth(5, 150); // Website
  sheet.setColumnWidth(6, 200); // Google Drive Folder
}

function initializeContragentsSheet(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  // Set headers if first row is empty
  const firstRow = sheet.getRange(1, 1, 1, 9).getValues()[0];
  if (!firstRow[0]) {
    sheet
      .getRange(1, 1, 1, 9)
      .setValues([
        [
          'Company Name',
          'Address',
          'Email',
          'Phone',
          'Tax %',
          'Contact Person',
          'Notes',
          'Currency',
          'Google Drive Folder',
        ],
      ]);
  }

  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, 9);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f3f3f3');
  sheet.setFrozenRows(1);

  // Set column widths
  sheet.setColumnWidth(1, 200); // Company Name
  sheet.setColumnWidth(2, 250); // Address
  sheet.setColumnWidth(3, 180); // Email
  sheet.setColumnWidth(4, 120); // Phone
  sheet.setColumnWidth(5, 70); // Tax %
  sheet.setColumnWidth(6, 150); // Contact Person
  sheet.setColumnWidth(7, 200); // Notes
  sheet.setColumnWidth(8, 80); // Currency
  sheet.setColumnWidth(9, 200); // Google Drive Folder
}

function showInvoiceDialog(): void {
  const html = HtmlService.createTemplateFromFile('templates/DialogTemplate')
    .evaluate()
    .setWidth(600)
    .setHeight(520)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);

  SpreadsheetApp.getUi().showModalDialog(html, 'Generate Invoice');
}

function showSuccessDialog(folderPath: string, fileName: string, fileUrl: string): void {
  const template = HtmlService.createTemplateFromFile('templates/SuccessDialog');
  template.folderPath = escapeHtml(folderPath);
  template.fileName = escapeHtml(fileName);
  template.fileUrl = fileUrl;

  const html = template
    .evaluate()
    .setWidth(450)
    .setHeight(380)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);

  SpreadsheetApp.getUi().showModalDialog(html, 'Success');
}

function getCompanyData(): InvoiceTypes.Company[] {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  const sheet = validateSheetExists(sheets, 0, 'Companies');
  const data = sheet.getDataRange().getValues();
  const companies: InvoiceTypes.Company[] = [];

  // Skip header row - no escaping here, escape at render time only
  // Column mapping (1-indexed): 1=Name, 2=Address, 3=Email, 4=Phone, 6=Google Drive
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      // If name exists
      companies.push({
        name: String(safeGet(row, 0, '')),
        address: String(safeGet(row, 1, '')),
        email: String(safeGet(row, 2, '')),
        phone: String(safeGet(row, 3, '')),
        driveFolder: String(safeGet(row, 5, '')), // Column 6 (index 5)
      });
    }
  }

  return companies;
}

function getContragentData(): InvoiceTypes.Contragent[] {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  const sheet = validateSheetExists(sheets, 1, 'Clients');
  const data = sheet.getDataRange().getValues();
  const contragents: InvoiceTypes.Contragent[] = [];

  // Skip header row - no escaping here, escape at render time only
  // Column mapping (1-indexed): 1=Name, 2=Address, 3=Email, 4=Phone, 5=Tax, 9=Google Drive Folder
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      // If company name exists
      const companyName = String(safeGet(row, 0, ''));
      contragents.push({
        companyName: companyName,
        address: String(safeGet(row, 1, '')),
        email: String(safeGet(row, 2, '')),
        phone: String(safeGet(row, 3, '')),
        tax: validateNumber(safeGet(row, 4, 0), `tax for ${companyName}`),
        driveFolder: String(safeGet(row, 8, '')), // Column 9 (index 8)
      });
    }
  }

  return contragents;
}

function cleanNameForFile(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .substring(0, 10);
}

/**
 * Gets the next invoice number by scanning the target folder for existing invoices.
 * Falls back to a default if no company/client selected or folder doesn't exist.
 * @param companyIndex Optional company index to determine target folder
 * @param contragentIndex Optional client index to determine target subfolder
 * @returns The next invoice number based on existing files in the folder
 */
function getNextInvoiceNumber(companyIndex?: number, contragentIndex?: number): string {
  const year = new Date().getFullYear();

  try {
    // Get folder path if indices provided
    let targetFolder: GoogleAppsScript.Drive.Folder | null = null;

    if (companyIndex !== undefined && contragentIndex !== undefined) {
      const companies = getCompanyData();
      const contragents = getContragentData();

      if (
        companyIndex >= 0 &&
        companyIndex < companies.length &&
        contragentIndex >= 0 &&
        contragentIndex < contragents.length
      ) {
        const company = companies[companyIndex];
        const contragent = contragents[contragentIndex];
        targetFolder = createNestedFolderStructure(company.driveFolder, contragent.driveFolder);
      }
    }

    if (!targetFolder) {
      // Fallback: return INV-YYYY-0001 if no folder context
      return `INV-${year}-0001`;
    }

    // Scan folder for existing invoice files
    const files = targetFolder.getFiles();
    let maxNumber = 0;

    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();

      // Match invoice number pattern: INV-YYYY-NNNN
      const match = fileName.match(/INV-(\d{4})-(\d{4})/);
      if (match) {
        const fileYear = parseInt(match[1], 10);
        const fileNum = parseInt(match[2], 10);

        // Only consider invoices from current year or find max across all years
        if (fileYear === year && fileNum > maxNumber) {
          maxNumber = fileNum;
        }
      }
    }

    const nextNum = maxNumber + 1;
    return `INV-${year}-${String(nextNum).padStart(4, '0')}`;
  } catch (error) {
    // On any error, return a safe default
    return `INV-${year}-0001`;
  }
}

/**
 * Logs a generated invoice to the Invoice Log sheet
 */
function logInvoice(
  invoiceNumber: string,
  companyName: string,
  clientName: string,
  total: number,
  currency: string,
  fileName: string,
  fileUrl: string
): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = spreadsheet.getSheetByName('Invoice Log');

  if (!logSheet) {
    logSheet = spreadsheet.insertSheet('Invoice Log');
    logSheet.appendRow([
      'Date',
      'Invoice #',
      'Company',
      'Client',
      'Total',
      'Currency',
      'File Name',
      'File URL',
    ]);
    // Format header row
    const headerRange = logSheet.getRange(1, 1, 1, 8);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f3f3f3');
    logSheet.setFrozenRows(1);
  }

  // Sanitize user-controlled strings to prevent formula injection
  // Validate fileUrl is a legitimate Google Drive URL before logging unsanitized
  const isValidDriveUrl = fileUrl.startsWith('https://drive.google.com/');

  logSheet.appendRow([
    new Date(),
    sanitizeForSheet(invoiceNumber),
    sanitizeForSheet(companyName),
    sanitizeForSheet(clientName),
    total,
    sanitizeForSheet(currency),
    sanitizeForSheet(fileName),
    isValidDriveUrl ? fileUrl : sanitizeForSheet(fileUrl),
  ]);
}

/**
 * Creates or finds a folder with the given name in the specified parent folder
 * @param folderName The name of the folder to create or find
 * @param parent Optional parent folder. If not provided, uses root Drive folder
 * @returns The folder object
 */
function getOrCreateFolder(
  folderName: string,
  parent?: GoogleAppsScript.Drive.Folder
): GoogleAppsScript.Drive.Folder {
  // Default to root if no parent specified
  const searchIn = parent || DriveApp;

  // Use default 'Invoices' folder if no name is provided or if it's empty
  const finalFolderName = folderName && folderName.trim() ? folderName.trim() : 'Invoices';

  try {
    const folders = searchIn.getFoldersByName(finalFolderName);

    if (folders.hasNext()) {
      return folders.next();
    }

    // Create new folder in the appropriate parent
    return parent ? parent.createFolder(finalFolderName) : DriveApp.createFolder(finalFolderName);
  } catch (error) {
    // Fallback to a default folder name in the root if there's an error
    console.error(`Error creating folder "${finalFolderName}":`, error);
    return DriveApp.createFolder('Invoices_Fallback');
  }
}

/**
 * Creates a nested folder structure based on company and client folder names
 * @param companyFolder The company folder name
 * @param clientFolder The client folder name
 * @returns The nested folder where the invoice will be stored
 */
function createNestedFolderStructure(
  companyFolder: string,
  clientFolder: string
): GoogleAppsScript.Drive.Folder {
  // First create or get the company folder
  const companyFolderObj = getOrCreateFolder(companyFolder || 'Invoices');

  // Then create or get the client folder inside the company folder
  if (clientFolder && clientFolder.trim()) {
    return getOrCreateFolder(clientFolder, companyFolderObj);
  } else {
    // If no client folder specified, just return the company folder
    return companyFolderObj;
  }
}

function generateInvoicePDF(invoiceData: InvoiceTypes.InvoiceData): void {
  try {
    // Get the active spreadsheet and selected rows
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const activeSheet = spreadsheet.getActiveSheet();
    const selection = validateSelection(activeSheet.getActiveRange());
    const selectedRows = selection.getValues();

    // Validate all rows
    selectedRows.forEach((row, index) => {
      validateRowData(row, index);
    });

    // Get company and contragent data
    const companies = getCompanyData();
    const contragents = getContragentData();

    if (invoiceData.companyIndex < 0 || invoiceData.companyIndex >= companies.length) {
      throw new InvoiceTypes.InvoiceError(
        'Invalid company selected. Please refresh and try again.'
      );
    }
    if (invoiceData.contragentIndex < 0 || invoiceData.contragentIndex >= contragents.length) {
      throw new InvoiceTypes.InvoiceError('Invalid client selected. Please refresh and try again.');
    }

    const company = companies[invoiceData.companyIndex];
    const contragent = contragents[invoiceData.contragentIndex];

    // Calculate dates using payment terms
    const currentDate = new Date();
    const dueDate = new Date(currentDate);
    const paymentDays = invoiceData.paymentDays || 30; // Default to Net 30
    dueDate.setDate(dueDate.getDate() + paymentDays);

    // Load the template
    const template = loadTemplate(invoiceData.templateId);

    // Process items and calculate totals
    let subtotal = 0;
    const items: InvoiceTypes.InvoiceItem[] = selectedRows.map((row, index) => {
      const quantity = validateNumber(row[1], `quantity in row ${index + 1}`);
      const unitPrice = validateNumber(row[2], `unit price in row ${index + 1}`);
      const itemTotal = quantity * unitPrice;
      subtotal += itemTotal;

      return {
        description: escapeHtml(String(row[0])),
        quantity,
        unitPrice,
        total: itemTotal,
      };
    });

    // Calculate tax amount and total
    const taxRate = contragent.tax || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    // Set template variables - use escaped versions for HTML rendering
    Object.assign(template, {
      company: escapeCompanyForTemplate(company),
      contragent: escapeContragentForTemplate(contragent),
      invoiceNumber: escapeHtml(invoiceData.invoiceNumber),
      currentDate: Utilities.formatDate(currentDate, Session.getScriptTimeZone(), 'MMMM dd, yyyy'),
      dueDate: Utilities.formatDate(dueDate, Session.getScriptTimeZone(), 'MMMM dd, yyyy'),
      currency: invoiceData.currency,
      items,
      subtotal,
      taxRate,
      taxAmount,
      total,
    });

    // Generate PDF
    const htmlOutput = template.evaluate().getContent();
    const blob = Utilities.newBlob(htmlOutput, 'text/html', 'invoice.html');
    const pdf = blob.getAs('application/pdf');

    // Create filename
    const cleanContragentName = cleanNameForFile(contragent.companyName);
    const dateStr = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), 'yyyyMMdd');
    const fileName = `${cleanContragentName}_${invoiceData.invoiceNumber}_${dateStr}.pdf`;

    // Create nested folder structure for the invoice
    const targetFolder = createNestedFolderStructure(company.driveFolder, contragent.driveFolder);

    // Build a readable folder path for display
    const companyFolderDisplay = company.driveFolder || 'Invoices';
    const folderPath = contragent.driveFolder
      ? `${companyFolderDisplay}/${contragent.driveFolder}`
      : companyFolderDisplay;

    // Store the file in the proper folder
    const createdFile = targetFolder.createFile(pdf.setName(fileName));
    const fileUrl = createdFile.getUrl();

    // Log the invoice to the Invoice Log sheet
    logInvoice(
      invoiceData.invoiceNumber,
      company.name,
      contragent.companyName,
      total,
      invoiceData.currency,
      fileName,
      fileUrl
    );

    // Show success dialog with clickable link
    showSuccessDialog(folderPath, fileName, fileUrl);
  } catch (error) {
    // Type guard for our custom error
    if (error instanceof InvoiceTypes.InvoiceError) {
      SpreadsheetApp.getUi().alert('Error: ' + error.message);
    } else {
      // Handle unknown errors
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      SpreadsheetApp.getUi().alert('Error generating invoice: ' + errorMessage);
    }
    // Don't re-throw - alert already shown to user, re-throwing causes duplicate error in client
  }
}
