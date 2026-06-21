package com.marketfit.post.infrastructure.notification;

import static org.mockito.Mockito.verify;

import java.lang.reflect.Field;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostChangedEvent;
import com.marketfit.post.core.post.PostDraft;

class PostNotificationAdapterTest {

    @Test
    void 도메인_이벤트를_실시간_알림_메시지로_변환한다() throws Exception {
        RabbitTemplate rabbitTemplate = org.mockito.Mockito.mock(RabbitTemplate.class);
        PostNotificationAdapter adapter = new PostNotificationAdapter(rabbitTemplate);
        Field exchange = PostNotificationAdapter.class.getDeclaredField("exchange");
        exchange.setAccessible(true);
        exchange.set(adapter, "pickly.events.exchange");
        Post post = Post.create(
                "user-1",
                "테스터",
                PostDraft.manual("제목", "요약", "내용", PostCategory.TREND, 5)
        );
        PostChangedEvent event = PostChangedEvent.of("post.created", post);

        adapter.publish(event);

        verify(rabbitTemplate).convertAndSend(
                org.mockito.ArgumentMatchers.eq("pickly.events.exchange"),
                org.mockito.ArgumentMatchers.eq("post.created"),
                org.mockito.ArgumentMatchers.any(PostNotificationMessage.class)
        );
    }
}
