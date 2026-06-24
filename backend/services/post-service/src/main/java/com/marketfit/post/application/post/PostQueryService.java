package com.marketfit.post.application.post;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.marketfit.post.api.post.dto.MainPostSectionResponse;
import com.marketfit.post.api.post.dto.MyPostSummaryResponse;
import com.marketfit.post.api.post.dto.PostResponse;
import com.marketfit.post.api.post.dto.PostSummaryResponse;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostSourceType;
import com.marketfit.post.core.post.PostStatus;
import com.marketfit.post.core.post.PostVisibility;
import com.marketfit.post.infrastructure.persistence.PostRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostQueryService {

    private static final int MAX_PAGE_SIZE = 50;

    private final PostRepository postRepository;

    public Page<PostSummaryResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "publishedAt").and(Sort.by(Sort.Direction.DESC, "id"))
        );
        return postRepository
                .findByVisibilityAndStatusAndDeletedAtIsNullOrderByPublishedAtDescIdDesc(
                        PostVisibility.PUBLIC,
                        PostStatus.PUBLISHED,
                        pageable
                )
                .map(PostSummaryResponse::from);
    }

    public PostResponse findById(UUID id, String currentUserId) {
        var post = postRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "게시글을 찾을 수 없습니다."
                ));
        if (post.getVisibility() == PostVisibility.PRIVATE
                && !post.isWrittenBy(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "게시글을 찾을 수 없습니다.");
        }
        return PostResponse.from(post);
    }

    public List<MainPostSectionResponse> findMainSections() {
        return Arrays.stream(PostCategory.values())
                .map(category -> new MainPostSectionResponse(
                        category.name().toLowerCase(),
                        sectionTitle(category),
                        sectionDescription(category),
                        category,
                        postRepository.findTop6ByCategoryAndSourceTypeAndVisibilityAndStatusAndDeletedAtIsNullOrderByPublishedAtDescIdDesc(
                                        category,
                                        PostSourceType.LLM_REPORT,
                                        PostVisibility.PUBLIC,
                                        PostStatus.PUBLISHED
                                )
                                .stream()
                                .map(PostSummaryResponse::from)
                                .toList()
                ))
                .toList();
    }

    public MyPostSummaryResponse findMySummary(String authorId) {
        Instant monthStart = Instant.now()
                .atZone(ZoneOffset.UTC)
                .with(TemporalAdjusters.firstDayOfMonth())
                .toLocalDate()
                .atStartOfDay(ZoneOffset.UTC)
                .toInstant();
        return new MyPostSummaryResponse(
                postRepository.countByAuthorIdAndDeletedAtIsNull(authorId),
                postRepository.countByAuthorIdAndDeletedAtIsNullAndPublishedAtAfter(authorId, monthStart),
                postRepository.countByAuthorIdAndSourceTypeAndDeletedAtIsNull(
                        authorId,
                        PostSourceType.LLM_REPORT
                ),
                postRepository.findTop5ByAuthorIdAndDeletedAtIsNullOrderByPublishedAtDescIdDesc(authorId)
                        .stream()
                        .map(PostSummaryResponse::from)
                        .toList()
        );
    }

    private String sectionTitle(PostCategory category) {
        return switch (category) {
            case TREND -> "트렌드 예측 리포트";
            case GUIDE -> "창업 실무 가이드";
            case POLICY -> "정책/법률 업데이트";
        };
    }

    private String sectionDescription(PostCategory category) {
        return switch (category) {
            case TREND -> "상권 변화와 신규 업종 흐름을 빠르게 읽는 게시글입니다.";
            case GUIDE -> "초기 창업자가 바로 써먹을 수 있는 실행 체크리스트입니다.";
            case POLICY -> "창업 비용과 리스크에 직접 영향을 주는 제도 변경입니다.";
        };
    }
}
