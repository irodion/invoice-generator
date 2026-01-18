"use strict";
/**
 * Invoice Generator for Google Sheets
 *
 * Copyright (c) 2025 Rodion Izotov
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var InvoiceTypes;
(function (InvoiceTypes) {
    class InvoiceError extends Error {
        constructor(message) {
            super(message);
            this.name = 'InvoiceError';
        }
    }
    InvoiceTypes.InvoiceError = InvoiceError;
})(InvoiceTypes || (InvoiceTypes = {}));
// Template configurations
const TEMPLATES = [
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
function getTemplatesList() {
    return TEMPLATES;
}
function getTemplateById(id) {
    return TEMPLATES.find(template => template.id === id);
}
function getDefaultTemplate() {
    return TEMPLATES[0];
}
function loadTemplate(templateId) {
    const template = getTemplateById(templateId) || getDefaultTemplate();
    return HtmlService.createTemplateFromFile(`templates/${template.filename}`);
}
// Validation functions
function validateNumber(value, fieldName) {
    const num = Number(value);
    if (isNaN(num)) {
        throw new InvoiceTypes.InvoiceError(`Invalid ${fieldName}: must be a number`);
    }
    return num;
}
function validateSelection(selection) {
    if (!selection) {
        throw new InvoiceTypes.InvoiceError('No range selected. Please select invoice items.');
    }
    return selection;
}
function validateRowData(row, rowIndex) {
    if (row.length < 3) {
        throw new InvoiceTypes.InvoiceError(`Row ${rowIndex + 1} is missing required fields.`);
    }
    if (!row[0]) {
        throw new InvoiceTypes.InvoiceError(`Row ${rowIndex + 1} is missing a description.`);
    }
    validateNumber(row[1], `quantity in row ${rowIndex + 1}`);
    validateNumber(row[2], `unit price in row ${rowIndex + 1}`);
}
function validateSheetExists(sheets, index, sheetName) {
    if (!sheets[index]) {
        throw new InvoiceTypes.InvoiceError(`Missing required sheet: "${sheetName}" (Sheet ${index + 1}). ` +
            'Please ensure the spreadsheet has the correct structure.');
    }
    return sheets[index];
}
// HTML escaping helper to prevent XSS/broken PDFs
function escapeHtml(text) {
    if (!text)
        return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
// Safe array access helper
function safeGet(arr, index, defaultValue) {
    return arr[index] !== undefined ? arr[index] : defaultValue;
}
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Invoice Generator').addItem('Generate Invoice', 'showInvoiceDialog').addToUi();
}
function showInvoiceDialog() {
    const html = HtmlService.createTemplateFromFile('templates/DialogTemplate')
        .evaluate()
        .setWidth(600)
        .setHeight(500)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    SpreadsheetApp.getUi().showModalDialog(html, 'Generate Invoice');
}
function getCompanyData() {
    const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
    const sheet = validateSheetExists(sheets, 0, 'Companies');
    const data = sheet.getDataRange().getValues();
    const companies = [];
    // Skip header row
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0]) {
            // If name exists
            companies.push({
                name: escapeHtml(String(safeGet(row, 0, ''))),
                address: escapeHtml(String(safeGet(row, 1, ''))),
                email: escapeHtml(String(safeGet(row, 2, ''))),
                phone: escapeHtml(String(safeGet(row, 3, ''))),
                driveFolder: String(safeGet(row, 4, '')),
            });
        }
    }
    return companies;
}
function getContragentData() {
    const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
    const sheet = validateSheetExists(sheets, 1, 'Clients');
    const data = sheet.getDataRange().getValues();
    const contragents = [];
    // Skip header row
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0]) {
            // If company name exists
            const companyName = String(safeGet(row, 0, ''));
            contragents.push({
                companyName: escapeHtml(companyName),
                address: escapeHtml(String(safeGet(row, 1, ''))),
                email: escapeHtml(String(safeGet(row, 2, ''))),
                phone: escapeHtml(String(safeGet(row, 3, ''))),
                tax: validateNumber(safeGet(row, 4, 0), `tax for ${companyName}`),
                driveFolder: String(safeGet(row, 5, '')),
            });
        }
    }
    return contragents;
}
function cleanNameForFile(name) {
    return name
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .substring(0, 10);
}
/**
 * Generates a sequential invoice number in the format INV-YYYY-NNNN
 * @returns The generated invoice number
 */
function generateInvoiceNumber() {
    const props = PropertiesService.getDocumentProperties();
    const lastNum = parseInt(props.getProperty('lastInvoiceNum') || '0', 10);
    const newNum = lastNum + 1;
    props.setProperty('lastInvoiceNum', String(newNum));
    const year = new Date().getFullYear();
    return `INV-${year}-${String(newNum).padStart(4, '0')}`;
}
/**
 * Gets the next invoice number without incrementing the counter (for preview)
 * @returns The next invoice number that would be generated
 */
function getNextInvoiceNumber() {
    const props = PropertiesService.getDocumentProperties();
    const lastNum = parseInt(props.getProperty('lastInvoiceNum') || '0', 10);
    const nextNum = lastNum + 1;
    const year = new Date().getFullYear();
    return `INV-${year}-${String(nextNum).padStart(4, '0')}`;
}
/**
 * Increments the invoice counter if the provided number matches the expected next auto-generated number.
 * This ensures the counter is only incremented when an auto-generated number is actually used.
 * @param invoiceNumber The invoice number being used
 */
function incrementCounterIfAutoNumber(invoiceNumber) {
    const expectedNext = getNextInvoiceNumber();
    if (invoiceNumber === expectedNext) {
        const props = PropertiesService.getDocumentProperties();
        const lastNum = parseInt(props.getProperty('lastInvoiceNum') || '0', 10);
        props.setProperty('lastInvoiceNum', String(lastNum + 1));
    }
}
/**
 * Logs a generated invoice to the Invoice Log sheet
 */
function logInvoice(invoiceNumber, companyName, clientName, total, currency, fileName, fileUrl) {
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
    logSheet.appendRow([
        new Date(),
        invoiceNumber,
        companyName,
        clientName,
        total,
        currency,
        fileName,
        fileUrl,
    ]);
}
/**
 * Creates or finds a folder with the given name in the specified parent folder
 * @param folderName The name of the folder to create or find
 * @param parent Optional parent folder. If not provided, uses root Drive folder
 * @returns The folder object
 */
function getOrCreateFolder(folderName, parent) {
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
    }
    catch (error) {
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
function createNestedFolderStructure(companyFolder, clientFolder) {
    // First create or get the company folder
    const companyFolderObj = getOrCreateFolder(companyFolder || 'Invoices');
    // Then create or get the client folder inside the company folder
    if (clientFolder && clientFolder.trim()) {
        return getOrCreateFolder(clientFolder, companyFolderObj);
    }
    else {
        // If no client folder specified, just return the company folder
        return companyFolderObj;
    }
}
function generateInvoicePDF(invoiceData) {
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
            throw new InvoiceTypes.InvoiceError('Invalid company selected. Please refresh and try again.');
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
        const items = selectedRows.map((row, index) => {
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
        // Set template variables
        Object.assign(template, {
            company,
            contragent,
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
        // Increment invoice counter if using auto-generated number
        incrementCounterIfAutoNumber(invoiceData.invoiceNumber);
        // Log the invoice to the Invoice Log sheet
        logInvoice(invoiceData.invoiceNumber, company.name, contragent.companyName, total, invoiceData.currency, fileName, fileUrl);
        // Show success message with the full path and URL
        SpreadsheetApp.getUi().alert('Invoice has been generated successfully!\n\n' +
            `Location: ${folderPath}/${fileName}\n\n` +
            `Open file: ${fileUrl}`);
    }
    catch (error) {
        // Type guard for our custom error
        if (error instanceof InvoiceTypes.InvoiceError) {
            SpreadsheetApp.getUi().alert('Error: ' + error.message);
        }
        else {
            // Handle unknown errors
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            SpreadsheetApp.getUi().alert('Error generating invoice: ' + errorMessage);
        }
        // Don't re-throw - alert already shown to user, re-throwing causes duplicate error in client
    }
}
