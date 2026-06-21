package com.marketfit.post.api.report;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.marketfit.post.api.post.dto.PostResponse;
import com.marketfit.post.api.report.dto.CreateLlmReportRequest;
import com.marketfit.post.application.report.LlmReportApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/post-reports")
@RequiredArgsConstructor
@Tag(name = "post-reports")
@SecurityRequirement(name = "bearerAuth")
public class LlmReportController {

    private final LlmReportApplicationService reportApplicationService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(operationId = "createLlmPostReport", summary = "크롤링 결과를 요약해 Post로 저장")
    public PostResponse create(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateLlmReportRequest request
    ) {
        String name = jwt.getClaimAsString("name");
        return PostResponse.from(reportApplicationService.createReport(
                request,
                jwt.getSubject(),
                name == null || name.isBlank() ? jwt.getSubject() : name
        ));
    }
}
