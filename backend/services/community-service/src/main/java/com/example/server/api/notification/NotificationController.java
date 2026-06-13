package com.example.server.api.notification;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.server.application.auth.CurrentUserService;
import com.example.server.application.notification.NotificationQueryService;
import com.example.server.api.notification.dto.NotificationCursorPageResponse;
import com.example.server.api.notification.dto.NotificationResponse;
import com.example.server.api.notification.dto.UnreadNotificationCountResponse;
import com.example.server.core.notification.NotificationReadCommandService;
import com.example.server.core.user.User;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/notifications")
@Tag(name = "notifications")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final CurrentUserService currentUserService;
    private final NotificationQueryService notificationQueryService;
    private final NotificationReadCommandService notificationReadCommandService;

    @GetMapping
    @Operation(operationId = "getNotifications", summary = "알림 목록 조회")
    public NotificationCursorPageResponse<NotificationResponse> findNotifications(
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String cursor,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        return notificationQueryService.findNotifications(currentUser, size, cursor);
    }

    @GetMapping("/unread-count")
    @Operation(operationId = "getUnreadNotificationCount", summary = "읽지 않은 알림 개수 조회")
    public UnreadNotificationCountResponse unreadCount(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        return notificationQueryService.countUnread(currentUser);
    }

    @PatchMapping("/{notificationId}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "markNotificationAsRead", summary = "알림 읽음 처리")
    public void markAsRead(
            @PathVariable Long notificationId,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        notificationReadCommandService.markAsRead(notificationId, currentUser);
    }

    @PatchMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "markAllNotificationsAsRead", summary = "모든 알림 읽음 처리")
    public void markAllAsRead(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        notificationReadCommandService.markAllAsRead(currentUser);
    }

    @DeleteMapping("/{notificationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "deleteNotification", summary = "알림 삭제")
    public void delete(
            @PathVariable Long notificationId,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        notificationReadCommandService.delete(notificationId, currentUser);
    }
}
