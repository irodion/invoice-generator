# Changelog

All notable changes to the Google Sheets Invoice Generator project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enhanced TypeScript interfaces to fully support all required data fields:
  - Added `paymentMethod` to `Company` interface
  - Added `discount`, `defaultCurrency`, `personalNote`, and `invoiceNumber` to `Contragent` interface
  - Extended `InvoiceData` interface with new fields for invoice customization
- Discount calculation before tax application
- Personal note support for invoices
- Invoice number auto-incrementing functionality
- Payment method selection in invoice generation dialog

### Changed
- Updated data retrieval functions to handle new fields from spreadsheets
- Improved invoice generation dialog with additional fields and options
- Enhanced template variable assignment for more customizable invoices

### Fixed
- Proper handling of nested Google Drive folder structures
- Correct indexing for column data in spreadsheets

## [1.0.0] - 2025-04-15

### Added
- Initial release of Google Sheets Invoice Generator
- Basic invoice generation from Google Sheets data
- Template system with multiple invoice styles
- Google Drive integration for invoice storage
- Basic company and contragent management
