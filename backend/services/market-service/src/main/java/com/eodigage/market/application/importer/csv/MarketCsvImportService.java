package com.eodigage.market.application.importer.csv;

import java.io.IOException;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;

import com.eodigage.market.infrastructure.persistence.importer.csv.MarketCsvImportJdbcRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketCsvImportService {

    private static final Charset[] CSV_CHARSETS = {
            Charset.forName("MS949"),
            StandardCharsets.UTF_8
    };

    private final MarketCsvImportJdbcRepository marketCsvImportJdbcRepository;

    public MarketCsvImportResult importDirectory(Path directory) {
        if (!Files.isDirectory(directory)) {
            log.warn("Market CSV import directory does not exist. directory={}", directory);
            return new MarketCsvImportResult(0, 0);
        }

        List<Path> csvFiles = findCsvFiles(directory);
        int importedFiles = 0;
        long importedRows = 0;
        ImportContext context = new ImportContext();

        for (Path csvFile : csvFiles) {
            FileImportResult result = importFile(csvFile, context);
            if (result.importedRows() > 0) {
                importedFiles++;
                importedRows += result.importedRows();
            }
        }

        return new MarketCsvImportResult(importedFiles, importedRows);
    }

    private List<Path> findCsvFiles(Path directory) {
        try (Stream<Path> paths = Files.walk(directory)) {
            return paths.filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().toLowerCase().endsWith(".csv"))
                    .sorted(Comparator.comparing(Path::toString))
                    .toList();
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to scan market CSV directory.", exception);
        }
    }

    private FileImportResult importFile(Path csvFile, ImportContext context) {
        CSVParser parser = openCsv(csvFile);
        try (parser) {
            Set<String> headers = canonicalHeaders(parser.getHeaderMap().keySet());
            DatasetType datasetType = DatasetType.detect(headers);
            if (datasetType == DatasetType.UNKNOWN) {
                log.warn("Skipping unknown market CSV file. file={}, headers={}", csvFile, headers);
                return new FileImportResult(0);
            }

            Long sourceId = marketCsvImportJdbcRepository.upsertDataSource(
                    datasetType.sourceCode(),
                    csvFile.getFileName().toString()
            );
            Long batchId = marketCsvImportJdbcRepository.createIngestBatch(sourceId, csvFile.toString());

            long rowCount = 0;
            for (CSVRecord record : parser) {
                Map<String, String> row = canonicalRow(record.toMap());
                importRow(datasetType, row, sourceId, batchId, context);
                rowCount++;
                if (rowCount % 10_000 == 0) {
                    log.info(
                            "Importing market CSV file. file={}, dataset={}, rows={}",
                            csvFile,
                            datasetType,
                            rowCount
                    );
                }
            }

            marketCsvImportJdbcRepository.finishIngestBatch(batchId, rowCount);
            log.info("Imported market CSV file. file={}, dataset={}, rows={}", csvFile, datasetType, rowCount);
            return new FileImportResult(rowCount);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to close market CSV parser.", exception);
        }
    }

    private Set<String> canonicalHeaders(Set<String> headers) {
        return headers.stream()
                .map(this::canonicalColumn)
                .collect(java.util.stream.Collectors.toSet());
    }

    private Map<String, String> canonicalRow(Map<String, String> row) {
        Map<String, String> canonical = new HashMap<>();
        row.forEach((key, value) -> canonical.put(canonicalColumn(key), value));
        return canonical;
    }

    private String canonicalColumn(String column) {
        String normalized = column == null ? "" : column.replace("\uFEFF", "").trim();
        return HEADER_ALIASES.getOrDefault(normalized, normalized);
    }

    private CSVParser openCsv(Path csvFile) {
        List<RuntimeException> failures = new ArrayList<>();

        for (Charset charset : CSV_CHARSETS) {
            try {
                Reader reader = Files.newBufferedReader(csvFile, charset);
                return CSVFormat.DEFAULT.builder()
                        .setHeader()
                        .setSkipHeaderRecord(true)
                        .setTrim(true)
                        .build()
                        .parse(reader);
            } catch (RuntimeException | IOException exception) {
                failures.add(new IllegalStateException(
                        "Failed to read CSV with charset " + charset,
                        exception
                ));
            }
        }

        IllegalStateException exception = new IllegalStateException("Failed to open CSV file: " + csvFile);
        failures.forEach(exception::addSuppressed);
        throw exception;
    }

    private void importRow(
            DatasetType datasetType,
            Map<String, String> row,
            Long sourceId,
            Long batchId,
            ImportContext context
    ) {
        String periodCode = required(row, "STDR_YYQU_CD");
        String dongCode = required(row, "ADSTRD_CD");
        Long periodId = context.periodIds.computeIfAbsent(
                periodCode,
                marketCsvImportJdbcRepository::upsertPeriod
        );
        Long dongId = context.dongIds.computeIfAbsent(
                dongCode,
                code -> marketCsvImportJdbcRepository.upsertDong(code, adminDongName(row))
        );

        switch (datasetType) {
            case FLOATING_POPULATION -> marketCsvImportJdbcRepository.upsertFloatingPopulation(
                    periodId,
                    dongId,
                    sourceId,
                    batchId,
                    row
            );
            case RESIDENT_POPULATION -> marketCsvImportJdbcRepository.upsertResidentPopulation(
                    periodId,
                    dongId,
                    sourceId,
                    batchId,
                    row
            );
            case INDUSTRY_SALES -> {
                Long industryId = upsertIndustry(row, context);
                marketCsvImportJdbcRepository.upsertIndustrySales(
                        periodId,
                        dongId,
                        industryId,
                        sourceId,
                        batchId,
                        row
                );
            }
            case INDUSTRY_STORES -> {
                Long industryId = upsertIndustry(row, context);
                marketCsvImportJdbcRepository.upsertIndustryStores(
                        periodId,
                        dongId,
                        industryId,
                        sourceId,
                        batchId,
                        row
                );
            }
            case TRADE_AREA_CHANGE -> marketCsvImportJdbcRepository.upsertTradeAreaChange(
                    periodId,
                    dongId,
                    sourceId,
                    batchId,
                    row
            );
            case UNKNOWN -> throw new IllegalArgumentException("Unknown dataset type cannot be imported.");
        }
    }

    private Long upsertIndustry(Map<String, String> row, ImportContext context) {
        String industryCode = required(row, "SVC_INDUTY_CD");
        return context.industryIds.computeIfAbsent(
                industryCode,
                code -> marketCsvImportJdbcRepository.upsertIndustry(code, value(row, "SVC_INDUTY_CD_NM"))
        );
    }

    private String required(Map<String, String> row, String key) {
        String value = value(row, key);
        if (value == null) {
            throw new IllegalArgumentException("Required CSV column is blank. column=" + key);
        }
        return value;
    }

    private String value(Map<String, String> row, String key) {
        String value = row.get(key);
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String adminDongName(Map<String, String> row) {
        String dongName = value(row, "ADSTRD_CD_NM");
        if (dongName == null) {
            return null;
        }
        return dongName.replaceAll("(?<=\\d)\\?(?=\\d)", "\u00B7");
    }

    public static Long longValue(Map<String, String> row, String key) {
        String value = normalizeNumber(row.get(key));
        if (value == null) {
            return null;
        }
        return new BigDecimal(value).longValue();
    }

    public static BigDecimal decimalValue(Map<String, String> row, String key) {
        String value = normalizeNumber(row.get(key));
        if (value == null) {
            return null;
        }
        return new BigDecimal(value);
    }

    private static String normalizeNumber(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().replace(",", "");
    }

    private record FileImportResult(long importedRows) {
    }

    private static final class ImportContext {
        private final Map<String, Long> periodIds = new HashMap<>();
        private final Map<String, Long> dongIds = new HashMap<>();
        private final Map<String, Long> industryIds = new HashMap<>();
    }

    private static final Map<String, String> HEADER_ALIASES = Map.ofEntries(
            Map.entry("기준_년분기_코드", "STDR_YYQU_CD"),
            Map.entry("행정동_코드", "ADSTRD_CD"),
            Map.entry("행정동_코드_명", "ADSTRD_CD_NM"),
            Map.entry("서비스_업종_코드", "SVC_INDUTY_CD"),
            Map.entry("서비스_업종_코드_명", "SVC_INDUTY_CD_NM"),

            Map.entry("총_유동인구_수", "TOT_FLPOP_CO"),
            Map.entry("남성_유동인구_수", "ML_FLPOP_CO"),
            Map.entry("여성_유동인구_수", "FML_FLPOP_CO"),
            Map.entry("연령대_10_유동인구_수", "AGRDE_10_FLPOP_CO"),
            Map.entry("연령대_20_유동인구_수", "AGRDE_20_FLPOP_CO"),
            Map.entry("연령대_30_유동인구_수", "AGRDE_30_FLPOP_CO"),
            Map.entry("연령대_40_유동인구_수", "AGRDE_40_FLPOP_CO"),
            Map.entry("연령대_50_유동인구_수", "AGRDE_50_FLPOP_CO"),
            Map.entry("연령대_60_이상_유동인구_수", "AGRDE_60_ABOVE_FLPOP_CO"),
            Map.entry("시간대_00_06_유동인구_수", "TMZON_00_06_FLPOP_CO"),
            Map.entry("시간대_06_11_유동인구_수", "TMZON_06_11_FLPOP_CO"),
            Map.entry("시간대_11_14_유동인구_수", "TMZON_11_14_FLPOP_CO"),
            Map.entry("시간대_14_17_유동인구_수", "TMZON_14_17_FLPOP_CO"),
            Map.entry("시간대_17_21_유동인구_수", "TMZON_17_21_FLPOP_CO"),
            Map.entry("시간대_21_24_유동인구_수", "TMZON_21_24_FLPOP_CO"),
            Map.entry("월요일_유동인구_수", "MON_FLPOP_CO"),
            Map.entry("화요일_유동인구_수", "TUES_FLPOP_CO"),
            Map.entry("수요일_유동인구_수", "WED_FLPOP_CO"),
            Map.entry("목요일_유동인구_수", "THUR_FLPOP_CO"),
            Map.entry("금요일_유동인구_수", "FRI_FLPOP_CO"),
            Map.entry("토요일_유동인구_수", "SAT_FLPOP_CO"),
            Map.entry("일요일_유동인구_수", "SUN_FLPOP_CO"),

            Map.entry("총_상주인구_수", "TOT_REPOP_CO"),
            Map.entry("남성_상주인구_수", "ML_REPOP_CO"),
            Map.entry("여성_상주인구_수", "FML_REPOP_CO"),
            Map.entry("연령대_10_상주인구_수", "AGRDE_10_REPOP_CO"),
            Map.entry("연령대_20_상주인구_수", "AGRDE_20_REPOP_CO"),
            Map.entry("연령대_30_상주인구_수", "AGRDE_30_REPOP_CO"),
            Map.entry("연령대_40_상주인구_수", "AGRDE_40_REPOP_CO"),
            Map.entry("연령대_50_상주인구_수", "AGRDE_50_REPOP_CO"),
            Map.entry("연령대_60_이상_상주인구_수", "AGRDE_60_ABOVE_REPOP_CO"),
            Map.entry("남성연령대_10_상주인구_수", "MAG_10_REPOP_CO"),
            Map.entry("남성연령대_20_상주인구_수", "MAG_20_REPOP_CO"),
            Map.entry("남성연령대_30_상주인구_수", "MAG_30_REPOP_CO"),
            Map.entry("남성연령대_40_상주인구_수", "MAG_40_REPOP_CO"),
            Map.entry("남성연령대_50_상주인구_수", "MAG_50_REPOP_CO"),
            Map.entry("남성연령대_60_이상_상주인구_수", "MAG_60_ABOVE_REPOP_CO"),
            Map.entry("여성연령대_10_상주인구_수", "FAG_10_REPOP_CO"),
            Map.entry("여성연령대_20_상주인구_수", "FAG_20_REPOP_CO"),
            Map.entry("여성연령대_30_상주인구_수", "FAG_30_REPOP_CO"),
            Map.entry("여성연령대_40_상주인구_수", "FAG_40_REPOP_CO"),
            Map.entry("여성연령대_50_상주인구_수", "FAG_50_REPOP_CO"),
            Map.entry("여성연령대_60_이상_상주인구_수", "FAG_60_ABOVE_REPOP_CO"),
            Map.entry("총_가구_수", "TOT_HSHLD_CO"),
            Map.entry("아파트_가구_수", "APT_HSHLD_CO"),
            Map.entry("비_아파트_가구_수", "NON_APT_HSHLD_CO"),

            Map.entry("당월_매출_금액", "THSMON_SELNG_AMT"),
            Map.entry("당월_매출_건수", "THSMON_SELNG_CO"),
            Map.entry("주중_매출_금액", "MDWK_SELNG_AMT"),
            Map.entry("주말_매출_금액", "WKEND_SELNG_AMT"),
            Map.entry("월요일_매출_금액", "MON_SELNG_AMT"),
            Map.entry("화요일_매출_금액", "TUES_SELNG_AMT"),
            Map.entry("수요일_매출_금액", "WED_SELNG_AMT"),
            Map.entry("목요일_매출_금액", "THUR_SELNG_AMT"),
            Map.entry("금요일_매출_금액", "FRI_SELNG_AMT"),
            Map.entry("토요일_매출_금액", "SAT_SELNG_AMT"),
            Map.entry("일요일_매출_금액", "SUN_SELNG_AMT"),
            Map.entry("시간대_00~06_매출_금액", "TMZON_00_06_SELNG_AMT"),
            Map.entry("시간대_06~11_매출_금액", "TMZON_06_11_SELNG_AMT"),
            Map.entry("시간대_11~14_매출_금액", "TMZON_11_14_SELNG_AMT"),
            Map.entry("시간대_14~17_매출_금액", "TMZON_14_17_SELNG_AMT"),
            Map.entry("시간대_17~21_매출_금액", "TMZON_17_21_SELNG_AMT"),
            Map.entry("시간대_21~24_매출_금액", "TMZON_21_24_SELNG_AMT"),
            Map.entry("남성_매출_금액", "ML_SELNG_AMT"),
            Map.entry("여성_매출_금액", "FML_SELNG_AMT"),
            Map.entry("연령대_10_매출_금액", "AGRDE_10_SELNG_AMT"),
            Map.entry("연령대_20_매출_금액", "AGRDE_20_SELNG_AMT"),
            Map.entry("연령대_30_매출_금액", "AGRDE_30_SELNG_AMT"),
            Map.entry("연령대_40_매출_금액", "AGRDE_40_SELNG_AMT"),
            Map.entry("연령대_50_매출_금액", "AGRDE_50_SELNG_AMT"),
            Map.entry("연령대_60_이상_매출_금액", "AGRDE_60_ABOVE_SELNG_AMT"),
            Map.entry("주중_매출_건수", "MDWK_SELNG_CO"),
            Map.entry("주말_매출_건수", "WKEND_SELNG_CO"),
            Map.entry("월요일_매출_건수", "MON_SELNG_CO"),
            Map.entry("화요일_매출_건수", "TUES_SELNG_CO"),
            Map.entry("수요일_매출_건수", "WED_SELNG_CO"),
            Map.entry("목요일_매출_건수", "THUR_SELNG_CO"),
            Map.entry("금요일_매출_건수", "FRI_SELNG_CO"),
            Map.entry("토요일_매출_건수", "SAT_SELNG_CO"),
            Map.entry("일요일_매출_건수", "SUN_SELNG_CO"),
            Map.entry("시간대_건수~06_매출_건수", "TMZON_00_06_SELNG_CO"),
            Map.entry("시간대_건수~11_매출_건수", "TMZON_06_11_SELNG_CO"),
            Map.entry("시간대_건수~14_매출_건수", "TMZON_11_14_SELNG_CO"),
            Map.entry("시간대_건수~17_매출_건수", "TMZON_14_17_SELNG_CO"),
            Map.entry("시간대_건수~21_매출_건수", "TMZON_17_21_SELNG_CO"),
            Map.entry("시간대_건수~24_매출_건수", "TMZON_21_24_SELNG_CO"),
            Map.entry("남성_매출_건수", "ML_SELNG_CO"),
            Map.entry("여성_매출_건수", "FML_SELNG_CO"),
            Map.entry("연령대_10_매출_건수", "AGRDE_10_SELNG_CO"),
            Map.entry("연령대_20_매출_건수", "AGRDE_20_SELNG_CO"),
            Map.entry("연령대_30_매출_건수", "AGRDE_30_SELNG_CO"),
            Map.entry("연령대_40_매출_건수", "AGRDE_40_SELNG_CO"),
            Map.entry("연령대_50_매출_건수", "AGRDE_50_SELNG_CO"),
            Map.entry("연령대_60_이상_매출_건수", "AGRDE_60_ABOVE_SELNG_CO"),

            Map.entry("전체_점포_수", "SIMILR_INDUTY_STOR_CO"),
            Map.entry("일반_점포_수", "STOR_CO"),
            Map.entry("프랜차이즈_점포_수", "FRC_STOR_CO"),
            Map.entry("개업_율", "OPBIZ_RT"),
            Map.entry("개업_점포_수", "OPBIZ_STOR_CO"),
            Map.entry("폐업_률", "CLSBIZ_RT"),
            Map.entry("폐업_점포_수", "CLSBIZ_STOR_CO"),

            Map.entry("상권_변화_지표", "TRDAR_CHNGE_IX"),
            Map.entry("상권_변화_지표_명", "TRDAR_CHNGE_IX_NM"),
            Map.entry("운영_영업_개월_평균", "OPR_SALE_MT_AVRG"),
            Map.entry("폐업_영업_개월_평균", "CLS_SALE_MT_AVRG"),
            Map.entry("서울_운영_영업_개월_평균", "SU_OPR_SALE_MT_AVRG"),
            Map.entry("서울_폐업_영업_개월_평균", "SU_CLS_SALE_MT_AVRG")
    );

    private enum DatasetType {
        FLOATING_POPULATION("csv:market-floating-population"),
        RESIDENT_POPULATION("csv:market-resident-population"),
        INDUSTRY_SALES("csv:market-industry-sales"),
        INDUSTRY_STORES("csv:market-industry-stores"),
        TRADE_AREA_CHANGE("csv:market-trade-area-change"),
        UNKNOWN("csv:market-unknown");

        private final String sourceCode;

        DatasetType(String sourceCode) {
            this.sourceCode = sourceCode;
        }

        String sourceCode() {
            return sourceCode;
        }

        static DatasetType detect(Set<String> headers) {
            if (headers.contains("TOT_FLPOP_CO")) {
                return FLOATING_POPULATION;
            }
            if (headers.contains("TOT_REPOP_CO")) {
                return RESIDENT_POPULATION;
            }
            if (headers.contains("THSMON_SELNG_AMT")) {
                return INDUSTRY_SALES;
            }
            if (headers.contains("SIMILR_INDUTY_STOR_CO")) {
                return INDUSTRY_STORES;
            }
            if (headers.contains("TRDAR_CHNGE_IX")) {
                return TRADE_AREA_CHANGE;
            }
            return UNKNOWN;
        }
    }
}
