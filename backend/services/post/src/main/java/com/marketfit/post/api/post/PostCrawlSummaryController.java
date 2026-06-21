package com.marketfit.post.api.post;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;

import com.marketfit.post.api.post.dto.CrawlSummaryRequest;
import com.marketfit.post.api.post.dto.CrawlSummaryResponse;
import com.marketfit.post.application.report.PostCrawlSummaryFacade;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@Tag(name = "posts")
@Validated
public class PostCrawlSummaryController {

    private final PostCrawlSummaryFacade crawlSummaryFacade;

    @PostMapping("/crawl-summary")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(operationId = "createCrawlSummary", summary = "크롤링 원문을 LLM로 요약해 Post 생성")
    public CrawlSummaryResponse create(
            @RequestHeader("X-User-Id") @NotBlank String userId,
            @Valid @RequestBody CrawlSummaryRequest request
    ) {
        return CrawlSummaryResponse.from(crawlSummaryFacade.create(userId, request));
    }
}
