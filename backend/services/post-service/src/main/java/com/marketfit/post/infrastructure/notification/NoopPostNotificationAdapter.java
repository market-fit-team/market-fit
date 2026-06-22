package com.marketfit.post.infrastructure.notification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.marketfit.post.application.notification.PostLlmReportNotificationAdapter;
import com.marketfit.post.application.notification.PostLlmReportNotificationEvent;

import lombok.extern.slf4j.Slf4j;

@Component
@ConditionalOnProperty(
        name = "app.notification.mode",
        havingValue = "NOOP",
        matchIfMissing = true
)
@Slf4j
public class NoopPostNotificationAdapter implements PostLlmReportNotificationAdapter {

    @Override
    public void publish(PostLlmReportNotificationEvent event) {
        log.info(
                "[PostEvent] Noop eventType={}, category={}, postId={}, userId={}",
                event.eventType(),
                event.data().category(),
                event.data().postId(),
                event.data().userId()
        );
    }
}
