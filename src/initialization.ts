/**
 * Invoice Generator for Google Sheets - Initialization
 *
 * Copyright (c) 2025 Rodion Izotov
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Initializes the spreadsheet with the required structure for the Invoice Generator.
 * Creates 'My Info' and 'Contragents' sheets if they don't exist.
 */
function initializeSpreadsheet(): void {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    
    // Check if initialization is needed
    const sheets = spreadsheet.getSheets();
    const sheetNames = sheets.map(sheet => sheet.getName());
    
    // If both sheets already exist, ask user if they want to reinitialize
    if (sheetNames.includes('My Info') && sheetNames.includes('Contragents')) {
      const response = ui.alert(
        'Sheets Already Exist',
        'The sheets "My Info" and "Contragents" already exist. Do you want to recreate them? This will delete any existing data in these sheets.',
        ui.ButtonSet.YES_NO
      );
      
      if (response !== ui.Button.YES) {
        ui.alert('Initialization canceled.');
        return;
      }
      
      // Delete existing sheets if user confirmed
      for (const sheet of sheets) {
        if (sheet.getName() === 'My Info' || sheet.getName() === 'Contragents') {
          spreadsheet.deleteSheet(sheet);
        }
      }
    }
    
    // Create Contragents sheet first (it will be the second sheet after reordering)
    const contragentsSheet = createContragentsSheet(spreadsheet);
    
    // Create My Info sheet (it will be the first sheet after reordering)
    const myInfoSheet = createMyInfoSheet(spreadsheet);
    
    // Move sheets to ensure correct order: My Info first, then Contragents
    moveSheetToPosition(myInfoSheet, 0);
    moveSheetToPosition(contragentsSheet, 1);
    
    // Activate the My Info sheet
    myInfoSheet.activate();
    
    // Show success message
    ui.alert(
      'Initialization Complete',
      'The spreadsheet has been initialized with the required sheets.\n\n' +
      'Please fill in your company information in the "My Info" sheet and your clients in the "Contragents" sheet.',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    // Show error message
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    SpreadsheetApp.getUi().alert('Error during initialization: ' + errorMessage);
    console.error('Initialization error:', error);
  }
}

/**
 * Creates the My Info sheet with proper formatting and headers
 */
function createMyInfoSheet(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): GoogleAppsScript.Spreadsheet.Sheet {
  // Create new sheet
  const sheet = spreadsheet.insertSheet('My Info');
  
  // Set up headers
  const headers = ['Name', 'Address', 'Email', 'Phone', 'Payment method', 'Google Drive'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f3f3f3');
  headerRange.setBorder(true, true, true, true, true, true, '#d9d9d9', SpreadsheetApp.BorderStyle.SOLID);
  
  // Auto-size columns
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  // Set column widths to minimum reasonable size
  sheet.setColumnWidth(1, 150); // Name
  sheet.setColumnWidth(2, 200); // Address
  sheet.setColumnWidth(3, 150); // Email
  sheet.setColumnWidth(4, 120); // Phone
  sheet.setColumnWidth(5, 150); // Payment method
  sheet.setColumnWidth(6, 150); // Google Drive
  
  // Add sample data in row 2
  const sampleData = [
    'My Company',
    '123 Business St, City, Country',
    'contact@mycompany.com',
    '+1 234 567 8901',
    'Bank Transfer',
    'Invoices'
  ];
  
  sheet.getRange(2, 1, 1, sampleData.length).setValues([sampleData]);
  
  // Add help text in cell A3
  sheet.getRange(3, 1).setValue('↑ Edit the row above with your company information');
  sheet.getRange(3, 1, 1, headers.length).merge();
  sheet.getRange(3, 1).setFontStyle('italic');
  sheet.getRange(3, 1).setFontColor('#666666');
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  return sheet;
}

/**
 * Creates the Contragents sheet with proper formatting and headers
 */
function createContragentsSheet(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): GoogleAppsScript.Spreadsheet.Sheet {
  // Create new sheet
  const sheet = spreadsheet.insertSheet('Contragents');
  
  // Set up headers
  const headers = [
    'Company Name',
    'Address',
    'Email',
    'Phone',
    'Discount',
    'Tax Rate',
    'Default Currency',
    'Personal',
    'Google Drive Folder',
    'Invoice Number'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f3f3f3');
  headerRange.setBorder(true, true, true, true, true, true, '#d9d9d9', SpreadsheetApp.BorderStyle.SOLID);
  
  // Auto-size columns
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  // Set column widths to minimum reasonable size
  sheet.setColumnWidth(1, 150); // Company Name
  sheet.setColumnWidth(2, 200); // Address
  sheet.setColumnWidth(3, 150); // Email
  sheet.setColumnWidth(4, 120); // Phone
  sheet.setColumnWidth(5, 80);  // Discount
  sheet.setColumnWidth(6, 80);  // Tax Rate
  sheet.setColumnWidth(7, 100); // Default Currency
  sheet.setColumnWidth(8, 200); // Personal
  sheet.setColumnWidth(9, 150); // Google Drive Folder
  sheet.setColumnWidth(10, 100); // Invoice Number
  
  // Add sample data in row 2
  const sampleData = [
    'Client Company',
    '456 Client St, Client City, Country',
    'contact@clientcompany.com',
    '+1 987 654 3210',
    '0',
    '20',
    'USD',
    'Thank you for your business!',
    'ClientCompany',
    '1001'
  ];
  
  sheet.getRange(2, 1, 1, sampleData.length).setValues([sampleData]);
  
  // Add help text in cell A3
  sheet.getRange(3, 1).setValue('↑ Edit the row above or add more rows with your client information');
  sheet.getRange(3, 1, 1, headers.length).merge();
  sheet.getRange(3, 1).setFontStyle('italic');
  sheet.getRange(3, 1).setFontColor('#666666');
  
  // Set data validation for Default Currency column (G)
  const currencyRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'], true)
    .build();
  sheet.getRange(2, 7, sheet.getMaxRows() - 1, 1).setDataValidation(currencyRule);
  
  // Set number format for Discount and Tax Rate columns
  sheet.getRange(2, 5, sheet.getMaxRows() - 1, 1).setNumberFormat('0.00"%"');
  sheet.getRange(2, 6, sheet.getMaxRows() - 1, 1).setNumberFormat('0.00"%"');
  
  // Set number format for Invoice Number column
  sheet.getRange(2, 10, sheet.getMaxRows() - 1, 1).setNumberFormat('@'); // Text format
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  return sheet;
}

/**
 * Moves a sheet to the specified position in the spreadsheet
 */
function moveSheetToPosition(sheet: GoogleAppsScript.Spreadsheet.Sheet, position: number): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = spreadsheet.getSheets();
  
  // Find the current position of the sheet
  const currentPosition = sheets.findIndex(s => s.getSheetId() === sheet.getSheetId());
  
  // If the sheet is already at the desired position, do nothing
  if (currentPosition === position) {
    return;
  }
  
  // Move the sheet to the desired position
  spreadsheet.moveActiveSheet(position + 1);
}

/**
 * Creates a sample invoice data sheet as an example
 */
function createSampleInvoiceSheet(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  // Only create if there's no third sheet already
  if (spreadsheet.getSheets().length <= 2) {
    const sheet = spreadsheet.insertSheet('Sample Invoice');
    
    // Set up headers
    const headers = ['Description', 'Quantity', 'Unit Price'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f3f3f3');
    headerRange.setBorder(true, true, true, true, true, true, '#d9d9d9', SpreadsheetApp.BorderStyle.SOLID);
    
    // Add sample data
    const sampleData = [
      ['Website Development', 1, 1500],
      ['Content Creation', 5, 100],
      ['SEO Optimization', 1, 500],
      ['Hosting (monthly)', 12, 15]
    ];
    
    sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);
    
    // Format the Unit Price column with currency format
    sheet.getRange(2, 3, sheet.getMaxRows() - 1, 1).setNumberFormat('$#,##0.00');
    
    // Set column widths
    sheet.setColumnWidth(1, 250); // Description
    sheet.setColumnWidth(2, 100); // Quantity
    sheet.setColumnWidth(3, 100); // Unit Price
    
    // Add a note
    sheet.getRange(sampleData.length + 2, 1).setValue('This is a sample invoice sheet. Select the rows with data and use the "Generate Invoice" option from the "Invoice Generator" menu.');
    sheet.getRange(sampleData.length + 2, 1, 1, headers.length).merge();
    sheet.getRange(sampleData.length + 2, 1).setFontStyle('italic');
    sheet.getRange(sampleData.length + 2, 1).setFontColor('#666666');
  }
}
