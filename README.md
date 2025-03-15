# Google Sheets Invoice Generator

A Google Apps Script project that allows you to generate professional invoices from your Google Sheets data.

## Overview

This project provides a simple and efficient way to create PDF invoices directly from your Google Sheets. It's designed for freelancers, small businesses, or anyone who needs to generate invoices regularly without the need for additional software.

## Features

- Generate PDF invoices from Google Sheets data
- Choose from multiple invoice templates (Default, Modern, and Printer-Friendly)
- Store company and client information in your spreadsheet
- Customize invoice details (invoice number, currency, etc.)
- Easy-to-use interface through Google Sheets sidebar

## Project Structure

- `build/` - Contains the compiled JavaScript files for Google Apps Script
- `src/` - Source TypeScript files
- `assets/templates/` - HTML templates for different invoice styles:
  - `DefaultTemplate.html` - Standard invoice template
  - `ModernTemplate.html` - Clean, contemporary design
  - `PrinterFriendlyTemplate.html` - Optimized for printing

## Spreadsheet Structure

The Google Sheet should have the following structure:

1. **First sheet (Companies)**: Contains information about your companies (one company per row)
2. **Second sheet (Clients)**: Contains information about your clients/contragents (one client per row)
3. **Subsequent sheets**: Line items for invoices (tasks, products, services, etc.)

## Setup Instructions

### Prerequisites

- Google account
- Google Sheets
- [clasp](https://github.com/google/clasp) (Google's Command Line Apps Script Projects tool) - for development only

### Installation

1. Create a new Google Sheet or open an existing one
2. Set up your sheet structure:
   - First sheet: Companies information (name, address, etc.)
   - Second sheet: Clients information (name, address, contact, etc.)
   - Additional sheets: Invoice line items

3. From the Google Sheet:
   - Go to Extensions > Apps Script
   - Copy and paste the code from the `build` directory into the Apps Script editor, or use clasp to push the project

### For Developers

If you want to modify or contribute to the project:

1. Clone this repository
```bash
git clone https://github.com/yourusername/invoice-generator.git
cd invoice-generator
```

2. Install dependencies
```bash
npm install
```

3. Login to clasp and create a new project or clone the existing one
```bash
npx clasp login
npx clasp create --title "Invoice Generator" --type sheets
# or
npx clasp clone "YOUR_SCRIPT_ID"
```

4. Build the project
```bash
npm run build
```

5. Push the code to Google Apps Script
```bash
npx clasp push
```

## Usage

1. Open your Google Sheet
2. Look for the custom menu "Invoice Generator" (appears after the script is loaded)
3. Click on "Generate Invoice"
4. In the dialog that appears:
   - Select your company from the dropdown
   - Select the client
   - Enter the invoice number
   - Choose a currency
   - Select a template
   - Click "Generate Invoice"
5. The script will create a PDF invoice based on your selected data and template

## Customizing Templates

You can modify the HTML templates in the `assets/templates` folder to match your branding or specific requirements. Each template uses HTML and CSS for layout, with special placeholders like `<?= company.name ?>` that get replaced with actual data when generating the invoice.

## Available Templates

1. **Default Template**: A clean, standard invoice layout
2. **Modern Template**: A contemporary design with a professional look
3. **Printer-Friendly Template**: Optimized for printing with minimal colors

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

- If you encounter issues with permissions, ensure you have granted the necessary Google Apps Script permissions
- For development issues, check the clasp documentation at [github.com/google/clasp](https://github.com/google/clasp)
- Make sure your spreadsheet structure matches the expected format
