package com.marketfit.post.api.notification;

import java.util.List;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.marketfit.post.api.notification.dto.NotificationResponse;
import com.marketfit.post.application.notification.CommentNotificationService;
import com.marketfit.post.application.notification.NotificationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final CommentNotificationService commentNotificationService;

    @GetMapping
    @SecurityRequirement(name = "bearerAuth")
    @Operation(operationId = "getNotifications", summary = "댓글 알림 목록 조회")
    public List<NotificationResponse> findMine(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        return notificationService.findMine(jwt.getSubject());
    }

    @PatchMapping("/{notificationId}/read")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(operationId = "markNotificationRead", summary = "알림 읽음 처리")
    public NotificationResponse markRead(
            @PathVariable UUID notificationId,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        return notificationService.markRead(notificationId, jwt.getSubject());
    }

    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(operationId = "streamNotifications", summary = "댓글 알림 이벤트 구독")
    public SseEmitter stream(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        return commentNotificationService.connect(jwt.getSubject());
    }
}
