package com.example.server.api.scheduledpost;

import com.example.server.application.auth.CurrentUserService;
import com.example.server.api.scheduledpost.dto.CreateScheduledPostRequest;
import com.example.server.api.scheduledpost.dto.ScheduledPostResponse;
import com.example.server.api.scheduledpost.dto.UpdateScheduledPostRequest;
import com.example.server.core.post.PostDraft;
import com.example.server.core.scheduledpost.ScheduledPostCommandService;
import com.example.server.core.scheduledpost.ScheduledPost;
import com.example.server.core.user.User;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/scheduled-posts")
@Tag(name = "scheduled-posts")
@SecurityRequirement(name = "bearerAuth")
public class ScheduledPostCommandController {

    private final ScheduledPostCommandService scheduledPostCommandService;
    private final CurrentUserService currentUserService;

    @PostMapping
    @Operation(operationId = "createScheduledPost", summary = "예약 게시글 생성")
    public ResponseEntity<ScheduledPostResponse> create(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateScheduledPostRequest request
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        ScheduledPostResponse response = ScheduledPostResponse.from(
                scheduledPostCommandService.create(
                        currentUser,
                        new PostDraft(request.content(), request.safeMediaAttachmentIds()),
                        request.parentId(),
                        request.scheduledAt()
                )
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @Operation(operationId = "updateScheduledPost", summary = "예약 게시글 수정")
    public ScheduledPostResponse update(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @Valid @RequestBody UpdateScheduledPostRequest request
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        ScheduledPost scheduledPost = scheduledPostCommandService.update(
                id,
                currentUser,
                request.content(),
                request.scheduledAt()
        );
        return ScheduledPostResponse.from(scheduledPost);
    }

    @DeleteMapping("/{id}")
    @Operation(operationId = "cancelScheduledPost", summary = "예약 게시글 취소")
    public ResponseEntity<Void> cancel(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        scheduledPostCommandService.cancel(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
