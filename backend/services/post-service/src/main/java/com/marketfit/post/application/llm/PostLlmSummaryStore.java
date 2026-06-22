package com.marketfit.post.application.llm;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.marketfit.post.core.llm.LlmSummaryResult;
import com.marketfit.post.core.llm.PostLlmSummary;
import com.marketfit.post.infrastructure.persistence.PostLlmSummaryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PostLlmSummaryStore {

    private final PostLlmSummaryRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PostLlmSummary createRequested(
            String provider,
            String model,
            String prompt
    ) {
        return repository.saveAndFlush(PostLlmSummary.requested(provider, model, prompt));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markSummarized(UUID id, LlmSummaryResult result) {
        repository.getReferenceById(id).markSummarized(result);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(UUID id, String errorMessage) {
        repository.getReferenceById(id).markFailed(errorMessage);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void linkPost(UUID id, UUID postId) {
        repository.getReferenceById(id).linkPost(postId);
    }
}
