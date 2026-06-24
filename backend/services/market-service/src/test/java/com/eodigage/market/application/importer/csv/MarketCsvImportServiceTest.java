package com.eodigage.market.application.importer.csv;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.eodigage.market.infrastructure.persistence.importer.csv.MarketCsvImportJdbcRepository;

@ExtendWith(MockitoExtension.class)
class MarketCsvImportServiceTest {

    @Mock
    private MarketCsvImportJdbcRepository repository;

    @InjectMocks
    private MarketCsvImportService service;

    @Test
    void longValue는_콤마_공백_null을_정규화한다() {
        Map<String, String> row = new HashMap<>();
        row.put("AMT", "1,234,567");
        row.put("BLANK", "   ");
        row.put("DECIMAL", "12.0");

        assertThat(MarketCsvImportService.longValue(row, "AMT")).isEqualTo(1_234_567L);
        assertThat(MarketCsvImportService.longValue(row, "BLANK")).isNull();
        assertThat(MarketCsvImportService.longValue(row, "MISSING")).isNull();
        assertThat(MarketCsvImportService.longValue(row, "DECIMAL")).isEqualTo(12L);
    }

    @Test
    void decimalValue는_콤마를_제거하고_BigDecimal로_변환한다() {
        Map<String, String> row = new HashMap<>();
        row.put("RATE", "1,234.56");
        row.put("BLANK", "");

        assertThat(MarketCsvImportService.decimalValue(row, "RATE"))
                .isEqualByComparingTo(new BigDecimal("1234.56"));
        assertThat(MarketCsvImportService.decimalValue(row, "BLANK")).isNull();
        assertThat(MarketCsvImportService.decimalValue(row, "MISSING")).isNull();
    }

    @Test
    void 존재하지_않는_디렉토리는_빈_결과를_반환한다() {
        MarketCsvImportResult result = service.importDirectory(Path.of("no-such-directory-xyz"));

        assertThat(result.importedFiles()).isZero();
        assertThat(result.importedRows()).isZero();
    }

    @Test
    void 유동인구_CSV를_감지해_행단위로_적재한다(@TempDir Path directory) throws Exception {
        writeFloatingPopulationCsv(directory.resolve("floating.csv"));
        given(repository.upsertDataSource(any(), any())).willReturn(1L);
        given(repository.createIngestBatch(eq(1L), any())).willReturn(2L);
        given(repository.upsertPeriod(any())).willReturn(3L);
        given(repository.upsertDong(any(), any())).willReturn(4L);

        MarketCsvImportResult result = service.importDirectory(directory);

        assertThat(result.importedFiles()).isEqualTo(1);
        assertThat(result.importedRows()).isEqualTo(2);
        verify(repository, times(2))
                .upsertFloatingPopulation(eq(3L), eq(4L), eq(1L), eq(2L), any());
        verify(repository).finishIngestBatch(eq(2L), eq(2L));
    }

    @Test
    void 알_수_없는_헤더의_CSV는_건너뛴다(@TempDir Path directory) throws Exception {
        Files.writeString(
                directory.resolve("unknown.csv"),
                "FOO,BAR\n1,2\n",
                StandardCharsets.UTF_8
        );

        MarketCsvImportResult result = service.importDirectory(directory);

        assertThat(result.importedFiles()).isZero();
        assertThat(result.importedRows()).isZero();
    }

    @Test
    void 필수_컬럼이_없으면_IllegalArgumentException을_던진다(@TempDir Path directory) throws Exception {
        // TOT_FLPOP_CO 로 유동인구로 인식되지만 필수 컬럼 ADSTRD_CD 가 빠진 CSV
        Files.writeString(
                directory.resolve("invalid.csv"),
                "STDR_YYQU_CD,TOT_FLPOP_CO\n20241,1000\n",
                StandardCharsets.UTF_8
        );
        given(repository.upsertDataSource(any(), any())).willReturn(1L);
        given(repository.createIngestBatch(eq(1L), any())).willReturn(2L);

        assertThatThrownBy(() -> service.importDirectory(directory))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ADSTRD_CD");
    }

    private void writeFloatingPopulationCsv(Path file) throws Exception {
        String csv = String.join("\n",
                "STDR_YYQU_CD,ADSTRD_CD,ADSTRD_CD_NM,TOT_FLPOP_CO,ML_FLPOP_CO,FML_FLPOP_CO",
                "20241,11680511,개포3동,1000,400,600",
                "20241,11680510,개포2동,2000,900,1100"
        ) + "\n";
        Files.writeString(file, csv, StandardCharsets.UTF_8);
    }
}
