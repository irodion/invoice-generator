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
        filename: 'DefaultTemplate'
    },
    {
        id: 'modern',
        name: 'Modern Template',
        description: 'Contemporary design with enhanced styling',
        filename: 'ModernTemplate'
    },
    {
        id: 'printer-friendly',
        name: 'Printer-Friendly Template',
        description: 'Clean, minimal design optimized for printing',
        filename: 'PrinterFriendlyTemplate'
    }
];
// Template management functions
function getTemplatesList() {
    console.info(">>> TEMPLATES <<< ", TEMPLATES);
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
    ui.createMenu('Invoice Generator')
        .addItem('Generate Invoice', 'showInvoiceDialog')
        .addToUi();
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
        if (data[i][0]) { // If name exists
            companies.push({
                name: data[i][0],
                address: data[i][1],
                email: data[i][2],
                phone: data[i][3],
                driveFolder: data[i][4] || ''
            });
        }
    }
    return companies;
}
function getContragentData() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[1];
    const data = sheet.getDataRange().getValues();
    const contragents = [];
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
function cleanNameForFile(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .substring(0, 10);
}
function getOrCreateInvoicesFolder() {
    const folderName = "Invoices";
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
        return folders.next();
    }
    return DriveApp.createFolder(folderName);
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
        const contragent = contragents[invoiceData.contragentIndex];
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
                total
            };
        });
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
        SpreadsheetApp.getUi().alert('Invoice has been generated successfully!\n\n' +
            'Location: Invoices/' + fileName);
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
