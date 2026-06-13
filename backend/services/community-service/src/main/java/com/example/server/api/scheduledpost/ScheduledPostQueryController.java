package com.example.server.api.scheduledpost;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.server.api.scheduledpost.dto.ScheduledPostResponse;
import com.example.server.application.auth.CurrentUserService;
import com.example.server.application.scheduledpost.ScheduledPostQueryService;
import com.example.server.core.user.User;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/scheduled-posts")
@Tag(name = "scheduled-posts")
@SecurityRequirement(name = "bearerAuth")
public class ScheduledPostQueryController {

    private final ScheduledPostQueryService scheduledPostQueryService;
    private final CurrentUserService currentUserService;

    @GetMapping
    @Operation(operationId = "getScheduledPosts", summary = "내 예약 게시글 목록 조회")
    public Page<ScheduledPostResponse> list(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            Pageable pageable
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        return scheduledPostQueryService.findMine(currentUser, pageable);
    }
}
