package com.marketfit.post.application.notification;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostSourceType;
import com.marketfit.post.core.post.PostStatus;
import com.marketfit.post.core.post.PostVisibility;

@Service
public class PublicPostReportEventService {

    public static final String EVENT_NAME = "post-report.created";
    private static final long TIMEOUT_MILLIS = Duration.ofHours(1).toMillis();

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter connect() {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MILLIS);
        register(UUID.randomUUID().toString(), emitter);
        return emitter;
    }

    public void publishIfPublicReport(Post post) {
        if (post.getSourceType() != PostSourceType.LLM_REPORT
                || post.getStatus() != PostStatus.PUBLISHED
                || post.getVisibility() != PostVisibility.PUBLIC) {
            return;
        }

        PublicPostReportEvent event = new PublicPostReportEvent(
                "NEW_AI_REPORT",
                Instant.now()
        );
        emitters.forEach((emitterId, emitter) -> send(emitterId, emitter, event));
    }

    void register(String emitterId, SseEmitter emitter) {
        emitters.put(emitterId, emitter);
        emitter.onCompletion(() -> emitters.remove(emitterId));
        emitter.onTimeout(() -> emitters.remove(emitterId));
        emitter.onError(error -> emitters.remove(emitterId));

        try {
            emitter.send(SseEmitter.event().name("connected").data("connected"));
        } catch (IOException | IllegalStateException exception) {
            emitters.remove(emitterId);
        }
    }

    private void send(
            String emitterId,
            SseEmitter emitter,
            PublicPostReportEvent event
    ) {
        try {
            emitter.send(SseEmitter.event()
                    .name(EVENT_NAME)
                    .data(event));
        } catch (IOException | IllegalStateException exception) {
            emitters.remove(emitterId);
        }
    }

    public record PublicPostReportEvent(
            String eventType,
            Instant occurredAt
    ) {
    }
}
