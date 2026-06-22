package com.marketfit.post.core.post;

import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.marketfit.post.infrastructure.persistence.PostRepository;
import com.marketfit.post.core.crawling.CrawledContent;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostCommandService {

    private final PostRepository postRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public Post create(
            PostDraft draft,
            String authorId,
            String authorName,
            String thumbnailUrl,
            PostStatus status,
            PostVisibility visibility
    ) {
        Post post = Post.create(authorId, authorName, draft);
        post.configureManualPublication(thumbnailUrl, status, visibility);
        Post saved = postRepository.save(post);
        eventPublisher.publishEvent(PostChangedEvent.of("post.created", saved));
        return saved;
    }

    @Transactional
    public Post createCrawlSummary(
            PostDraft draft,
            String authorId,
            String authorName,
            CrawledContent crawledContent,
            PostVisibility visibility
    ) {
        Post post = Post.create(authorId, authorName, draft);
        post.configureCrawlSource(crawledContent.sourceId(), visibility);
        Post saved = postRepository.save(post);
        eventPublisher.publishEvent(PostChangedEvent.of("post.created", saved));
        return saved;
    }

    @Transactional
    public Post update(
            UUID id,
            PostDraft draft,
            String currentUserId,
            String thumbnailUrl,
            PostStatus status,
            PostVisibility visibility
    ) {
        Post post = getActivePost(id);
        validateOwner(post, currentUserId);
        post.update(
                draft.title(),
                draft.summary(),
                draft.content(),
                draft.category(),
                draft.readTimeMinutes()
        );
        post.updateManualPublication(thumbnailUrl, status, visibility);
        eventPublisher.publishEvent(PostChangedEvent.of("post.updated", post));
        return post;
    }

    @Transactional
    public void delete(UUID id, String currentUserId) {
        Post post = getActivePost(id);
        validateOwner(post, currentUserId);
        post.delete();
        eventPublisher.publishEvent(PostChangedEvent.of("post.deleted", post));
    }

    private Post getActivePost(UUID id) {
        return postRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "게시글을 찾을 수 없습니다."));
    }

    private void validateOwner(Post post, String currentUserId) {
        if (!post.isWrittenBy(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "자신의 게시글만 수정하거나 삭제할 수 있습니다.");
        }
    }
}
