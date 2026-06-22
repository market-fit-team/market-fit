package com.marketfit.post.infrastructure.notification;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.marketfit.post.core.post.PostChangedEvent;
import com.marketfit.post.application.notification.PostLlmReportNotificationAdapter;
import com.marketfit.post.application.notification.PostLlmReportNotificationEvent;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.notification.mode", havingValue = "RABBIT")
public class PostNotificationAdapter implements PostLlmReportNotificationAdapter {

    private final RabbitTemplate rabbitTemplate;

    @Value("${app.notification.exchange}")
    private String exchange;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publish(PostChangedEvent event) {
        rabbitTemplate.convertAndSend(
                exchange,
                event.eventType(),
                new PostNotificationMessage(
                        event.eventId(),
                        event.eventType(),
                        event.postId(),
                        event.actorId(),
                        event.actorName(),
                        event.category(),
                        event.sourceType(),
                        event.occurredAt()
                )
        );
    }

    @Override
    public void publish(PostLlmReportNotificationEvent event) {
        rabbitTemplate.convertAndSend(
                exchange,
                event.eventType().name(),
                event
        );
    }
}
