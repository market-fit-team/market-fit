package com.eodigage.market.application.importer.csv;

import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(100)
public class MarketCsvImportRunner implements ApplicationRunner {

    private final MarketCsvImportService marketCsvImportService;

    @Value("${market.data-import.enabled:false}")
    private boolean enabled;

    @Value("${market.data-import.directory:/app/data}")
    private String dataDirectory;

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }

        log.info("Starting market CSV import from {}", dataDirectory);
        MarketCsvImportResult result = marketCsvImportService.importDirectory(Path.of(dataDirectory));
        log.info(
                "Finished market CSV import. files={}, rows={}",
                result.importedFiles(),
                result.importedRows()
        );
    }
}
