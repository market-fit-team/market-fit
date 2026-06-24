package com.eodigage.market.application.importer.boundary;

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
@Order(200)
public class MarketBoundaryImportRunner implements ApplicationRunner {

    private final MarketBoundaryImportService marketBoundaryImportService;

    @Value("${market.boundary-import.enabled:false}")
    private boolean enabled;

    @Value("${market.boundary-import.directory:/app/data}")
    private String boundaryDirectory;

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }

        log.info("Starting market boundary import from {}", boundaryDirectory);
        MarketBoundaryImportResult result = marketBoundaryImportService.importDirectory(
                Path.of(boundaryDirectory)
        );
        log.info(
                "Finished market boundary import. sigunguRows={}, dongRows={}",
                result.sigunguRows(),
                result.dongRows()
        );
    }
}
