package com.marketfit.post.application.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostSourceType;
import com.marketfit.post.core.post.PostStatus;
import com.marketfit.post.core.post.PostVisibility;
import com.marketfit.post.infrastructure.persistence.PostRepository;

class MainPostServiceTest {

    private final PostRepository repository = org.mockito.Mockito.mock(PostRepository.class);
    private final MainPostService service = new MainPostService(repository);

    @Test
    void limit이_없으면_기본값_10으로_공개_발행_Post를_조회한다() {
        when(repository.findByVisibilityAndStatusAndSourceTypeAndDeletedAtIsNull(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        )).thenReturn(List.of());

        service.findMainPosts(null);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findByVisibilityAndStatusAndSourceTypeAndDeletedAtIsNull(
                org.mockito.ArgumentMatchers.eq(PostVisibility.PUBLIC),
                org.mockito.ArgumentMatchers.eq(PostStatus.PUBLISHED),
                org.mockito.ArgumentMatchers.eq(PostSourceType.LLM_REPORT),
                pageable.capture()
        );
        assertThat(pageable.getValue().getPageSize()).isEqualTo(10);
        assertThat(pageable.getValue().getSort().getOrderFor("createdAt").getDirection())
                .isEqualTo(Sort.Direction.DESC);
        assertThat(pageable.getValue().getSort().getOrderFor("id").getDirection())
                .isEqualTo(Sort.Direction.DESC);
    }

    @Test
    void limit은_최대_20으로_제한한다() {
        when(repository.findByVisibilityAndStatusAndSourceTypeAndDeletedAtIsNull(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        )).thenReturn(List.of());

        service.findMainPosts(100);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findByVisibilityAndStatusAndSourceTypeAndDeletedAtIsNull(
                org.mockito.ArgumentMatchers.eq(PostVisibility.PUBLIC),
                org.mockito.ArgumentMatchers.eq(PostStatus.PUBLISHED),
                org.mockito.ArgumentMatchers.eq(PostSourceType.LLM_REPORT),
                pageable.capture()
        );
        assertThat(pageable.getValue().getPageSize()).isEqualTo(20);
    }

    @Test
    void limit이_0이하면_1로_보정한다() {
        when(repository.findByVisibilityAndStatusAndSourceTypeAndDeletedAtIsNull(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        )).thenReturn(List.of());

        service.findMainPosts(0);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findByVisibilityAndStatusAndSourceTypeAndDeletedAtIsNull(
                org.mockito.ArgumentMatchers.eq(PostVisibility.PUBLIC),
                org.mockito.ArgumentMatchers.eq(PostStatus.PUBLISHED),
                org.mockito.ArgumentMatchers.eq(PostSourceType.LLM_REPORT),
                pageable.capture()
        );
        assertThat(pageable.getValue().getPageSize()).isEqualTo(1);
    }
}
