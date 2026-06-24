package com.eodigage.market.application.importer.csv;

public record MarketCsvImportResult(
        int importedFiles,
        long importedRows
) {
}
