package com.marketfit.post.api.post;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.marketfit.post.api.post.dto.MainPostResponse;
import com.marketfit.post.application.post.MainPostService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@Tag(name = "posts")
public class MainPostController {

    private final MainPostService mainPostService;

    @GetMapping("/main")
    @Operation(operationId = "getMainPosts", summary = "메인 AI 리포트 조회")
    public List<MainPostResponse> findMainPosts(
            @RequestParam(required = false) Integer limit
    ) {
        return mainPostService.findMainPosts(limit);
    }
}
