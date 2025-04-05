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
    console.info('>>> TEMPLATES <<< ', TEMPLATES);
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
        throw new Error(`Invalid ${fieldName}: must be a number`);
    }
    return num;
}
function validateSelection(selection) {
    if (!selection) {
        throw new Error('No range selected. Please select invoice items.');
    }
    return selection;
}
function validateRowData(row, rowIndex) {
    if (row.length < 3) {
        throw new Error(`Row ${rowIndex + 1} is missing required fields.`);
    }
    if (!row[0]) {
        throw new Error(`Row ${rowIndex + 1} is missing a description.`);
    }
    validateNumber(row[1], `quantity in row ${rowIndex + 1}`);
    validateNumber(row[2], `unit price in row ${rowIndex + 1}`);
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
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const companies = [];
    // Skip header row
    for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
            // If name exists
            companies.push({
                name: data[i][0],
                address: data[i][1],
                email: data[i][2],
                phone: data[i][3],
                driveFolder: data[i][4] || '', // Ensure we handle undefined values properly
            });
        }
    }
    // Log the first company's driveFolder value for debugging
    if (companies.length > 0) {
        console.log("First company's drive folder: " + companies[0].driveFolder);
    }
    return companies;
}
function getContragentData() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[1];
    const data = sheet.getDataRange().getValues();
    const contragents = [];
    // Skip header row
    for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
            // If company name exists
            contragents.push({
                companyName: data[i][0],
                address: data[i][1],
                email: data[i][2],
                phone: data[i][3],
                tax: validateNumber(data[i][4] || 0, `tax for ${data[i][0]}`), // New tax field
                driveFolder: data[i][5] || '', // Moved folder field one column to the right
            });
        }
    }
    // Log the first contragent's tax and driveFolder values for debugging
    if (contragents.length > 0) {
        console.log("First contragent's tax rate: " + contragents[0].tax + "%");
        console.log("First contragent's drive folder: " + contragents[0].driveFolder);
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
    console.log(`Looking for folder "${finalFolderName}" ${parent ? 'in parent folder' : 'in root'}`);
    try {
        const folders = searchIn.getFoldersByName(finalFolderName);
        if (folders.hasNext()) {
            const folder = folders.next();
            console.log(`Found existing folder: "${folder.getName()}" with ID: ${folder.getId()}`);
            return folder;
        }
        // Create new folder in the appropriate parent
        const newFolder = parent ?
            parent.createFolder(finalFolderName) :
            DriveApp.createFolder(finalFolderName);
        console.log(`Created new folder: "${newFolder.getName()}" with ID: ${newFolder.getId()}`);
        return newFolder;
    }
    catch (error) {
        console.error(`Error when creating/finding folder "${finalFolderName}":`, error);
        // Fallback to a default folder name in the root if there's an error
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
        if (invoiceData.companyIndex >= companies.length) {
            throw new Error('Invalid company selected.');
        }
        if (invoiceData.contragentIndex >= contragents.length) {
            throw new Error('Invalid contragent selected.');
        }
        const company = companies[invoiceData.companyIndex];
        console.log("Selected company for invoice:", company.name);
        console.log("Drive folder for this company:", company.driveFolder);
        const contragent = contragents[invoiceData.contragentIndex];
        console.log("Selected contragent for invoice:", contragent.companyName);
        console.log("Tax rate for this contragent:", contragent.tax, "%");
        console.log("Drive folder for this contragent:", contragent.driveFolder);
        // Calculate dates
        const currentDate = new Date();
        const dueDate = new Date(currentDate);
        dueDate.setMonth(dueDate.getMonth() + 1);
        // Load the template
        const template = loadTemplate(invoiceData.templateId);
        // Process items and calculate totals
        let subtotal = 0;
        const items = selectedRows.map((row, index) => {
            const quantity = validateNumber(row[1], `quantity in row ${index + 1}`);
            const unitPrice = validateNumber(row[2], `unit price in row ${index + 1}`);
            const total = quantity * unitPrice;
            subtotal += total;
            return {
                description: String(row[0]),
                quantity,
                unitPrice,
                total,
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
            invoiceNumber: invoiceData.invoiceNumber,
            currentDate: Utilities.formatDate(currentDate, Session.getScriptTimeZone(), 'MMMM dd, yyyy'),
            dueDate: Utilities.formatDate(dueDate, Session.getScriptTimeZone(), 'MMMM dd, yyyy'),
            currency: invoiceData.currency,
            items,
            subtotal,
            taxRate,
            taxAmount,
            total
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
        const folderPath = company.driveFolder +
            (contragent.driveFolder ? '/' + contragent.driveFolder : '');
        // Store the file in the proper folder
        const createdFile = targetFolder.createFile(pdf.setName(fileName));
        // Show success message with the full path
        SpreadsheetApp.getUi().alert('Invoice has been generated successfully!\n\n' +
            `Location: ${folderPath}/${fileName}`);
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
            console.error('Invoice generation error:', error);
        }
        throw error;
    }
}
