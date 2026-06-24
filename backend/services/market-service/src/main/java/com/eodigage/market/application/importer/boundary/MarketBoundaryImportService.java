package com.eodigage.market.application.importer.boundary;

import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

import org.geotools.api.data.FileDataStore;
import org.geotools.api.data.FileDataStoreFinder;
import org.geotools.api.data.SimpleFeatureSource;
import org.geotools.api.referencing.crs.CoordinateReferenceSystem;
import org.geotools.api.referencing.operation.MathTransform;
import org.geotools.data.shapefile.ShapefileDataStore;
import org.geotools.data.simple.SimpleFeatureCollection;
import org.geotools.data.simple.SimpleFeatureIterator;
import org.geotools.geometry.jts.JTS;
import org.geotools.referencing.CRS;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.WKTWriter;
import org.springframework.stereotype.Service;

import com.eodigage.market.infrastructure.persistence.importer.boundary.MarketBoundaryImportJdbcRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketBoundaryImportService {

    private static final Charset SHAPEFILE_CHARSET = Charset.forName("MS949");
    private static final String SIGUNGU_SOURCE_CODE = "shp:market-admin-sigungu-boundary";
    private static final String DONG_SOURCE_CODE = "shp:market-admin-dong-boundary";
    private static final Map<String, String> SEOUL_SIGUNGU_CODE_BY_BOUNDARY_CODE = Map.ofEntries(
            Map.entry("11010", "11110"),
            Map.entry("11020", "11140"),
            Map.entry("11030", "11170"),
            Map.entry("11040", "11200"),
            Map.entry("11050", "11215"),
            Map.entry("11060", "11230"),
            Map.entry("11070", "11260"),
            Map.entry("11080", "11290"),
            Map.entry("11090", "11305"),
            Map.entry("11100", "11320"),
            Map.entry("11110", "11350"),
            Map.entry("11120", "11380"),
            Map.entry("11130", "11410"),
            Map.entry("11140", "11440"),
            Map.entry("11150", "11470"),
            Map.entry("11160", "11500"),
            Map.entry("11170", "11530"),
            Map.entry("11180", "11545"),
            Map.entry("11190", "11560"),
            Map.entry("11200", "11590"),
            Map.entry("11210", "11620"),
            Map.entry("11220", "11650"),
            Map.entry("11230", "11680"),
            Map.entry("11240", "11710"),
            Map.entry("11250", "11740")
    );

    private final MarketBoundaryImportJdbcRepository marketBoundaryImportJdbcRepository;
    private final ObjectMapper objectMapper;
    private final WKTWriter wktWriter = new WKTWriter();

    public MarketBoundaryImportResult importDirectory(Path dataDirectory) {
        Path sigunguShp = dataDirectory.resolve("BND_SIGUNGU_PG").resolve("BND_SIGUNGU_PG.shp");
        Path dongShp = dataDirectory.resolve("BND_ADM_DONG_PG").resolve("BND_ADM_DONG_PG.shp");

        long sigunguRows = importSigungu(sigunguShp);
        marketBoundaryImportJdbcRepository.assignDongSigunguByCodePrefix();
        long dongRows = importDongs(dongShp);

        return new MarketBoundaryImportResult(sigunguRows, dongRows);
    }

    private long importSigungu(Path shapefile) {
        Long sourceId = marketBoundaryImportJdbcRepository.upsertDataSource(
                SIGUNGU_SOURCE_CODE,
                shapefile.getFileName().toString()
        );
        marketBoundaryImportJdbcRepository.deleteAllSigungu();
        Long batchId = marketBoundaryImportJdbcRepository.createIngestBatch(sourceId, shapefile.toString());

        long rows = readShapefile(shapefile, feature -> {
            String boundaryCode = required(feature.properties(), "SIGUNGU_CD", "SIG_CD", "sigungu_cd");
            String code = officialSigunguCode(boundaryCode);
            if (code == null) {
                return false;
            }
            String name = required(feature.properties(), "SIGUNGU_NM", "SIG_KOR_NM", "sigungu_nm");
            marketBoundaryImportJdbcRepository.upsertSigungu(
                    sourceId,
                    batchId,
                    stringValue(feature.properties(), "BASE_DATE", "base_date"),
                    code,
                    name,
                    feature.wkt(),
                    toJson(feature.properties())
            );
            return true;
        });

        marketBoundaryImportJdbcRepository.finishIngestBatch(batchId, rows);
        return rows;
    }

    private long importDongs(Path shapefile) {
        Long sourceId = marketBoundaryImportJdbcRepository.upsertDataSource(
                DONG_SOURCE_CODE,
                shapefile.getFileName().toString()
        );
        marketBoundaryImportJdbcRepository.deleteAllDongBoundaries();
        Long batchId = marketBoundaryImportJdbcRepository.createIngestBatch(sourceId, shapefile.toString());

        long rows = readShapefile(shapefile, feature -> {
            String boundaryCode = required(feature.properties(), "ADM_DR_CD", "ADM_CD", "adm_dr_cd");
            String code = officialDongCode(boundaryCode);
            if (code == null) {
                return false;
            }
            String name = required(feature.properties(), "ADM_DR_NM", "ADM_NM", "adm_dr_nm");
            marketBoundaryImportJdbcRepository.upsertDong(
                    sourceId,
                    batchId,
                    stringValue(feature.properties(), "BASE_DATE", "base_date"),
                    code,
                    name,
                    feature.wkt(),
                    toJson(feature.properties())
            );
            return true;
        });

        marketBoundaryImportJdbcRepository.finishIngestBatch(batchId, rows);
        return rows;
    }

    private String officialSigunguCode(String boundarySigunguCode) {
        return SEOUL_SIGUNGU_CODE_BY_BOUNDARY_CODE.get(boundarySigunguCode);
    }

    private String officialDongCode(String boundaryDongCode) {
        if (boundaryDongCode.length() != 8) {
            return null;
        }
        String officialSigunguCode = officialSigunguCode(boundaryDongCode.substring(0, 5));
        if (officialSigunguCode == null) {
            return null;
        }
        return officialSigunguCode + boundaryDongCode.substring(5);
    }

    private long readShapefile(Path shapefile, BoundaryFeatureConsumer consumer) {
        if (!Files.isRegularFile(shapefile)) {
            throw new IllegalStateException("Boundary shapefile does not exist. path=" + shapefile);
        }

        FileDataStore store = null;
        try {
            store = FileDataStoreFinder.getDataStore(shapefile.toFile());
            if (store instanceof ShapefileDataStore shapefileDataStore) {
                shapefileDataStore.setCharset(SHAPEFILE_CHARSET);
            }

            SimpleFeatureSource featureSource = store.getFeatureSource();
            CoordinateReferenceSystem sourceCrs = featureSource.getSchema().getCoordinateReferenceSystem();
            CoordinateReferenceSystem targetCrs = CRS.decode("EPSG:4326", true);
            MathTransform transform = CRS.findMathTransform(sourceCrs, targetCrs, true);
            SimpleFeatureCollection collection = featureSource.getFeatures();

            long rows = 0;
            try (SimpleFeatureIterator iterator = collection.features()) {
                while (iterator.hasNext()) {
                    org.geotools.api.feature.simple.SimpleFeature feature = iterator.next();
                    Geometry sourceGeometry = (Geometry) feature.getDefaultGeometry();
                    Geometry transformedGeometry = JTS.transform(sourceGeometry, transform);
                    Map<String, Object> properties = properties(feature);
                    boolean imported = consumer.accept(new BoundaryFeature(wktWriter.write(transformedGeometry), properties));
                    if (!imported) {
                        continue;
                    }
                    rows++;
                    if (rows % 1_000 == 0) {
                        log.info("Importing boundary shapefile. file={}, rows={}", shapefile, rows);
                    }
                }
            }

            log.info("Imported boundary shapefile. file={}, rows={}", shapefile, rows);
            return rows;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to import boundary shapefile. path=" + shapefile, exception);
        } finally {
            if (store != null) {
                store.dispose();
            }
        }
    }

    private Map<String, Object> properties(org.geotools.api.feature.simple.SimpleFeature feature) {
        Map<String, Object> properties = new LinkedHashMap<>();
        feature.getProperties().forEach(property -> {
            String name = property.getName().toString();
            if (!name.equals(feature.getDefaultGeometryProperty().getName().toString())) {
                properties.put(name, property.getValue());
            }
        });
        return properties;
    }

    private String toJson(Map<String, Object> properties) {
        try {
            return objectMapper.writeValueAsString(properties);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to serialize boundary properties.", exception);
        }
    }

    private String required(Map<String, Object> properties, String... keys) {
        String value = stringValue(properties, keys);
        if (value == null) {
            throw new IllegalArgumentException("Required boundary property is missing.");
        }
        return value;
    }

    private String stringValue(Map<String, Object> properties, String... keys) {
        for (String key : keys) {
            Object value = properties.get(key);
            if (value != null && !value.toString().isBlank()) {
                return value.toString().trim();
            }
        }
        return null;
    }

    private record BoundaryFeature(String wkt, Map<String, Object> properties) {
    }

    @FunctionalInterface
    private interface BoundaryFeatureConsumer {
        boolean accept(BoundaryFeature feature);
    }
}
