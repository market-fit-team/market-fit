package com.eodigage.market.infrastructure.persistence.industry;

import java.util.List;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

/** 서울시 상권분석 서비스 업종(market_service_industries) 조회 리포지토리. */
@Repository
@RequiredArgsConstructor
public class MarketIndustryJdbcRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    /** 전체 업종을 코드 오름차순으로 조회한다(코드 접두 CS1/CS2/CS3 순서가 대분류 순서가 됨). */
    public List<IndustryRow> findAllIndustries() {
        String sql = """
                SELECT svc_induty_cd, svc_induty_cd_nm
                FROM market_service_industries
                ORDER BY svc_induty_cd
                """;
        return jdbcTemplate.query(
                sql,
                new MapSqlParameterSource(),
                (rs, rowNum) -> new IndustryRow(
                        rs.getString("svc_induty_cd"),
                        rs.getString("svc_induty_cd_nm")
                )
        );
    }

    public record IndustryRow(String code, String name) {
    }
}
