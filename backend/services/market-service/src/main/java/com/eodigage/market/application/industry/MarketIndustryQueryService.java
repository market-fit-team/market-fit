package com.eodigage.market.application.industry;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.eodigage.market.api.industry.dto.IndustryCategoriesResponse;
import com.eodigage.market.api.industry.dto.IndustryCategoriesResponse.Category;
import com.eodigage.market.api.industry.dto.IndustryCategoriesResponse.IndustryItem;
import com.eodigage.market.infrastructure.persistence.industry.MarketIndustryJdbcRepository;
import com.eodigage.market.infrastructure.persistence.industry.MarketIndustryJdbcRepository.IndustryRow;

import lombok.RequiredArgsConstructor;

/** 상권분석 업종을 대분류(CS1 외식 / CS2 서비스 / CS3 도소매)별로 묶어 제공한다. */
@Service
@RequiredArgsConstructor
public class MarketIndustryQueryService {

    /** 업종코드 접두 -> 대분류명. */
    private static final Map<String, String> CATEGORY_NAMES = Map.of(
            "CS1", "외식",
            "CS2", "서비스",
            "CS3", "도소매"
    );

    private final MarketIndustryJdbcRepository marketIndustryJdbcRepository;

    public IndustryCategoriesResponse getIndustryCategories() {
        // 코드 오름차순으로 조회되므로 LinkedHashMap이 대분류 순서(CS1->CS2->CS3)를 유지한다.
        Map<String, List<IndustryItem>> grouped = new LinkedHashMap<>();
        for (IndustryRow row : marketIndustryJdbcRepository.findAllIndustries()) {
            String categoryCode = categoryCodeOf(row.code());
            grouped.computeIfAbsent(categoryCode, key -> new ArrayList<>())
                    .add(new IndustryItem(row.code(), row.name()));
        }

        List<Category> categories = grouped.entrySet().stream()
                .map(entry -> new Category(
                        entry.getKey(),
                        CATEGORY_NAMES.getOrDefault(entry.getKey(), entry.getKey()),
                        entry.getValue()
                ))
                .toList();
        return new IndustryCategoriesResponse(categories);
    }

    /** 업종코드 접두 3자(CS1/CS2/CS3)를 대분류 코드로 사용한다. */
    private static String categoryCodeOf(String industryCode) {
        if (industryCode == null || industryCode.length() < 3) {
            return "ETC";
        }
        return industryCode.substring(0, 3);
    }
}
