package com.example.server.application.post.query;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.server.api.post.dto.CursorPageResponse;
import com.example.server.api.post.dto.PostResponse;
import com.example.server.api.post.dto.PostSummaryResponse;
import com.example.server.api.post.dto.PostThreadResponse;
import com.example.server.application.post.query.support.PostCursorCodec;
import com.example.server.core.post.Post;
import com.example.server.infrastructure.persistence.session.DbSessionContext;
import com.example.server.infrastructure.persistence.post.PostRepository;
import com.example.server.infrastructure.persistence.post.query.PostSummaryRepository;
import com.example.server.infrastructure.persistence.post.query.PostSummaryView;
import com.example.server.infrastructure.persistence.post.query.PostThreadRepository;
import com.example.server.core.user.User;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostQueryService {

    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 50;

    private final PostSummaryRepository postSummaryRepository;
    private final PostThreadRepository postThreadRepository;
    private final PostCursorCodec postCursorCodec;
    private final PostRepository postRepository;
    private final DbSessionContext dbSessionContext;
    private final com.example.server.application.media.MediaQueryService mediaQueryService;

    @Cacheable(value = "post", key = "#id")
    public PostResponse findById(Long id, User currentUser) {
        setCurrentUserIdIfAuthenticated(currentUser);

        Post post = postRepository.findWithUserById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "게시글을 찾을 수 없습니다. id=" + id
                ));

        if (post.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제된 게시글입니다. id=" + id);
        }

        List<com.example.server.api.media.dto.MediaAttachmentResponse> mediaAttachments = mediaQueryService.findResponsesByPostIds(List.of(post.getId()))
                .getOrDefault(post.getId(), List.of());
        return PostResponse.from(post, mediaAttachments);
    }

    public Page<PostSummaryResponse> findOffsetPage(int page, int size, User currentUser) {
        setCurrentUserIdIfAuthenticated(currentUser);

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                normalizeSize(size),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))
        );

        Page<PostSummaryView> viewPage = postSummaryRepository.findByParentIdIsNullAndDeletedFalse(pageable);
        List<Long> postIds = viewPage.getContent().stream().map(PostSummaryView::getId).toList();
        Map<Long, List<com.example.server.api.media.dto.MediaAttachmentResponse>> mediaByPostId = mediaQueryService.findResponsesByPostIds(postIds);

        return viewPage.map(post -> toSummaryResponse(post, mediaByPostId));
    }

    public CursorPageResponse<PostSummaryResponse> findCursorPage(String cursor, int size, User currentUser) {
        setCurrentUserIdIfAuthenticated(currentUser);

        int normalizedSize = normalizeSize(size);
        PostCursorCodec.CursorToken token = postCursorCodec.decode(cursor);
        Pageable limit = PageRequest.of(0, normalizedSize + 1);

        List<PostSummaryView> rows = token.isFirstPage()
                ? postSummaryRepository.findFirstFeedCursorPage(limit)
                : postSummaryRepository.findNextFeedCursorPage(token.createdAt(), token.id(), limit);

        return toCursorResponse(rows, normalizedSize);
    }

    public CursorPageResponse<PostSummaryResponse> findRepliesCursorPage(Long postId, String cursor, int size, User currentUser) {
        setCurrentUserIdIfAuthenticated(currentUser);

        int normalizedSize = normalizeSize(size);
        PostCursorCodec.CursorToken token = postCursorCodec.decode(cursor);
        Pageable limit = PageRequest.of(0, normalizedSize + 1);

        List<PostSummaryView> rows = token.isFirstPage()
                ? postSummaryRepository.findFirstRepliesCursorPage(postId, limit)
                : postSummaryRepository.findNextRepliesCursorPage(postId, token.createdAt(), token.id(), limit);

        return toCursorResponse(rows, normalizedSize);
    }

    public PostThreadResponse findThread(Long postId, int replySize, User currentUser) {
        setCurrentUserIdIfAuthenticated(currentUser);

        PostSummaryView center = postSummaryRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "게시글을 찾을 수 없습니다. id=" + postId));

        List<Long> ancestorIds = postThreadRepository.findAncestorIds(postId);
        List<PostSummaryResponse> ancestors = new ArrayList<>();
        if (!ancestorIds.isEmpty()) {
            Map<Long, List<com.example.server.api.media.dto.MediaAttachmentResponse>> mediaByPostId = mediaQueryService.findResponsesByPostIds(ancestorIds);
            Map<Long, PostSummaryResponse> ancestorMap = postSummaryRepository.findByIdIn(ancestorIds)
                    .stream()
                    .map(post -> toSummaryResponse(post, mediaByPostId))
                    .collect(Collectors.toMap(PostSummaryResponse::id, Function.identity()));
            ancestorIds.stream()
                    .map(ancestorMap::get)
                    .filter(a -> a != null)
                    .sorted(Comparator.comparingInt(PostSummaryResponse::depth))
                    .forEach(ancestors::add);
        }

        Map<Long, List<com.example.server.api.media.dto.MediaAttachmentResponse>> centerMedia = mediaQueryService.findResponsesByPostIds(List.of(center.getId()));
        PostSummaryResponse centerResponse = toSummaryResponse(center, centerMedia);

        CursorPageResponse<PostSummaryResponse> replies = findRepliesCursorPage(postId, null, replySize, currentUser);

        return new PostThreadResponse(ancestors, centerResponse, replies);
    }


    private void setCurrentUserIdIfAuthenticated(User currentUser) {
        /**
         * NOTE: posts 조회 API는 공개 API입니다.
         * 비로그인 요청에서는 currentUser가 null이고, 이때 DB session variable을 설정하지 않습니다.
         * PostgreSQL app_current_user_id()는 설정값이 없으면 null을 반환하므로 liked_by_me는 자연스럽게 false가 됩니다.
         * 로그인 요청에서는 현재 user id를 transaction-local 값으로 설정해 RLS/likedByMe 계산에 사용합니다.
         */
        if (currentUser != null) {
            dbSessionContext.setCurrentUserId(currentUser.getId());
        }
    }

    private CursorPageResponse<PostSummaryResponse> toCursorResponse(List<PostSummaryView> rows, int size) {
        boolean hasNext = rows.size() > size;
        List<PostSummaryView> pageRows = hasNext ? rows.subList(0, size) : rows;

        List<Long> postIds = pageRows.stream().map(PostSummaryView::getId).toList();
        Map<Long, List<com.example.server.api.media.dto.MediaAttachmentResponse>> mediaByPostId = mediaQueryService.findResponsesByPostIds(postIds);

        List<PostSummaryResponse> items = pageRows.stream()
                .map(post -> toSummaryResponse(post, mediaByPostId))
                .toList();

        String nextCursor = null;
        if (hasNext && !pageRows.isEmpty()) {
            PostSummaryView last = pageRows.get(pageRows.size() - 1);
            nextCursor = postCursorCodec.encode(last.getCreatedAt(), last.getId());
        }

        return new CursorPageResponse<>(items, nextCursor, hasNext);
    }

    private PostSummaryResponse toSummaryResponse(
            PostSummaryView post,
            Map<Long, List<com.example.server.api.media.dto.MediaAttachmentResponse>> mediaByPostId
    ) {
        List<com.example.server.api.media.dto.MediaAttachmentResponse> mediaAttachments = post.isDeleted()
                ? List.of()
                : mediaByPostId.getOrDefault(post.getId(), List.of());
        return PostSummaryResponse.from(post, mediaAttachments);
    }

    private int normalizeSize(int size) {
        if (size <= 0) {
            return DEFAULT_SIZE;
        }
        return Math.min(size, MAX_SIZE);
    }
}
