package com.example.server.api.post;

import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.server.api.post.dto.CursorPageResponse;
import com.example.server.api.post.dto.PostResponse;
import com.example.server.api.post.dto.PostSummaryResponse;
import com.example.server.api.post.dto.PostThreadResponse;
import com.example.server.application.auth.CurrentUserService;
import com.example.server.application.post.query.PostQueryService;
import com.example.server.core.user.User;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
@Tag(name = "posts")
public class PostQueryController {

    private final PostQueryService postQueryService;
    private final CurrentUserService currentUserService;

    @GetMapping
    @Operation(operationId = "getPosts", summary = "게시글 페이지 조회")
    public Page<PostSummaryResponse> findOffsetPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        // NOTE: 게시글 조회는 SecurityConfig에서 permitAll입니다.
        // 비로그인 사용자는 null로 전달하고, 로그인 사용자는 likedByMe 계산을 위해 User를 사용합니다.
        User currentUser = currentUserService.getOptionalUser(jwt).orElse(null);
        return postQueryService.findOffsetPage(page, size, currentUser);
    }

    @GetMapping("/cursor")
    @Operation(operationId = "getPostsByCursor", summary = "게시글 커서 페이지 조회")
    public CursorPageResponse<PostSummaryResponse> findCursorPage(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        // NOTE: 공개 피드는 비로그인 접근을 허용합니다. 로그인 사용자는 개인화 필드(likedByMe)에만 사용됩니다.
        User currentUser = currentUserService.getOptionalUser(jwt).orElse(null);
        return postQueryService.findCursorPage(cursor, size, currentUser);
    }

    @GetMapping("/{id}")
    @Operation(operationId = "getPost", summary = "게시글 단건 조회")
    public PostResponse findById(
            @PathVariable Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        // NOTE: 단건 조회도 공개 조회입니다. currentUser가 없으면 likedByMe 등 개인화 값은 false/null 기준으로 처리됩니다.
        User currentUser = currentUserService.getOptionalUser(jwt).orElse(null);
        return postQueryService.findById(id, currentUser);
    }

    @GetMapping("/{postId}/replies")
    @Operation(operationId = "getPostReplies", summary = "게시글 답글 목록 조회")
    public CursorPageResponse<PostSummaryResponse> findReplies(
            @PathVariable Long postId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        // NOTE: 답글 조회는 공개 조회입니다. 로그인 사용자인 경우에만 DB session user id를 설정합니다.
        User currentUser = currentUserService.getOptionalUser(jwt).orElse(null);
        return postQueryService.findRepliesCursorPage(postId, cursor, size, currentUser);
    }

    @GetMapping("/{postId}/thread")
    @Operation(operationId = "getPostThread", summary = "게시글 스레드 조회")
    public PostThreadResponse findThread(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "20") int size,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        // NOTE: 스레드 조회는 공개 조회입니다. 로그인 사용자인 경우에만 개인화 필드를 계산합니다.
        User currentUser = currentUserService.getOptionalUser(jwt).orElse(null);
        return postQueryService.findThread(postId, size, currentUser);
    }
}
