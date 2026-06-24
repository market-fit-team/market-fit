package com.marketfit.post.api.post;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.marketfit.post.application.notification.PublicPostReportEventService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@Tag(name = "posts")
public class PublicPostReportEventController {

    private final PublicPostReportEventService eventService;

    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(operationId = "streamPublicPostReportEvents", summary = "공개 AI 리포트 생성 이벤트 구독")
    public SseEmitter stream() {
        return eventService.connect();
    }
}
