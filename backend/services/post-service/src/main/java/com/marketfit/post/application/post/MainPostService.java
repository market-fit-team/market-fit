package com.marketfit.post.application.post;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.marketfit.post.api.post.dto.MainPostResponse;
import com.marketfit.post.core.post.PostStatus;
import com.marketfit.post.core.post.PostSourceType;
import com.marketfit.post.core.post.PostVisibility;
import com.marketfit.post.infrastructure.persistence.PostRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MainPostService {

    static final int DEFAULT_LIMIT = 10;
    static final int MAX_LIMIT = 20;

    private final PostRepository postRepository;

    public List<MainPostResponse> findMainPosts(Integer requestedLimit) {
        int limit = normalizeLimit(requestedLimit);
        PageRequest pageRequest = PageRequest.of(
                0,
                limit,
                Sort.by(Sort.Direction.DESC, "createdAt")
                        .and(Sort.by(Sort.Direction.DESC, "id"))
        );
        return postRepository.findByVisibilityAndStatusAndSourceTypeAndDeletedAtIsNull(
                        PostVisibility.PUBLIC,
                        PostStatus.PUBLISHED,
                        PostSourceType.LLM_REPORT,
                        pageRequest
                )
                .stream()
                .map(MainPostResponse::from)
                .toList();
    }

    private int normalizeLimit(Integer requestedLimit) {
        if (requestedLimit == null) {
            return DEFAULT_LIMIT;
        }
        return Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);
    }
}
