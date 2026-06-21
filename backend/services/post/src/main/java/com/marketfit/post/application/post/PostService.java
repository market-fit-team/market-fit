package com.marketfit.post.application.post;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.marketfit.post.core.crawling.CrawledContent;
import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCommandService;
import com.marketfit.post.core.post.PostDraft;
import com.marketfit.post.core.post.PostVisibility;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostCommandService postCommandService;

    @Transactional
    public Post createCrawlSummary(
            String userId,
            PostDraft draft,
            CrawledContent crawledContent,
            PostVisibility visibility
    ) {
        return postCommandService.createCrawlSummary(
                draft,
                userId,
                userId,
                crawledContent,
                visibility
        );
    }
}
