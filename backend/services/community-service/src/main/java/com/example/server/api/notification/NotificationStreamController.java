package com.example.server.api.notification;

import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.example.server.application.auth.CurrentUserService;
import com.example.server.application.notification.NotificationSseService;
import com.example.server.core.user.User;

import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/notifications")
@Tag(name = "notification-stream")
@SecurityRequirement(name = "bearerAuth")
public class NotificationStreamController {

    private final CurrentUserService currentUserService;
    private final NotificationSseService notificationSseService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(operationId = "streamNotifications", summary = "알림 SSE 스트림 구독")
    @ApiResponse(
            responseCode = "200",
            description = "text/event-stream SSE 응답",
            content = @Content(
                    mediaType = MediaType.TEXT_EVENT_STREAM_VALUE,
                    schema = @Schema(type = "string")
            )
    )
    public SseEmitter stream(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        return notificationSseService.connect(currentUser);
    }
}
