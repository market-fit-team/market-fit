package com.marketfit.post.application.post;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostDraft;
import com.marketfit.post.core.post.PostVisibility;
import com.marketfit.post.infrastructure.persistence.PostRepository;

class PostQueryServiceTest {

    private final PostRepository repository = org.mockito.Mockito.mock(PostRepository.class);
    private final PostQueryService service = new PostQueryService(repository);

    @Test
    void 비공개_Post는_작성자가_아니면_노출하지_않는다() {
        UUID id = UUID.randomUUID();
        Post post = Post.create(
                "owner-1",
                "작성자",
                PostDraft.manual("제목", "요약", "본문", PostCategory.TREND, 1)
        );
        ReflectionTestUtils.setField(post, "id", id);
        ReflectionTestUtils.setField(post, "visibility", PostVisibility.PRIVATE);
        when(repository.findByIdAndDeletedAtIsNull(id)).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> service.findById(id, "other-user"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(exception -> org.assertj.core.api.Assertions.assertThat(
                        ((ResponseStatusException) exception).getStatusCode()
                ).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
