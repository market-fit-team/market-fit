package com.marketfit.post.api.post;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.marketfit.post.api.post.dto.MainPostSectionResponse;
import com.marketfit.post.api.post.dto.MyPostSummaryResponse;
import com.marketfit.post.api.post.dto.PostResponse;
import com.marketfit.post.api.post.dto.PostSummaryResponse;
import com.marketfit.post.api.post.dto.PostWriteRequest;
import com.marketfit.post.application.post.PostQueryService;
import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCommandService;
import com.marketfit.post.core.post.PostDraft;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@Tag(name = "posts")
public class PostController {

    private final PostCommandService postCommandService;
    private final PostQueryService postQueryService;

    @GetMapping
    @Operation(operationId = "getPosts", summary = "게시글 목록 조회")
    public Page<PostSummaryResponse> findPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return postQueryService.findPage(page, size);
    }

    @GetMapping("/{id}")
    @Operation(operationId = "getPost", summary = "게시글 단건 조회")
    public PostResponse findById(
            @PathVariable UUID id,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        return postQueryService.findById(id, jwt == null ? null : jwt.getSubject());
    }

    @GetMapping("/main-carousel")
    @Operation(operationId = "getMainPostCarousel", summary = "메인 게시글 캐러셀 조회")
    public List<MainPostSectionResponse> findMainCarousel() {
        return postQueryService.findMainSections();
    }

    @GetMapping("/me/summary")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(operationId = "getMyPostSummary", summary = "내 게시글 요약 조회")
    public MyPostSummaryResponse findMySummary(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        return postQueryService.findMySummary(jwt.getSubject());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(operationId = "createPost", summary = "게시글 생성")
    public PostResponse create(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PostWriteRequest request
    ) {
        Post post = postCommandService.create(
                toDraft(request),
                jwt.getSubject(),
                authorName(jwt),
                request.thumbnailUrl(),
                request.status(),
                request.visibility()
        );
        return PostResponse.from(post);
    }

    @PatchMapping("/{id}")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(operationId = "updatePost", summary = "게시글 수정")
    public PostResponse update(
            @PathVariable UUID id,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PostWriteRequest request
    ) {
        return PostResponse.from(postCommandService.update(
                id,
                toDraft(request),
                jwt.getSubject(),
                request.thumbnailUrl(),
                request.status(),
                request.visibility()
        ));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(operationId = "deletePost", summary = "게시글 삭제")
    public void delete(
            @PathVariable UUID id,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        postCommandService.delete(id, jwt.getSubject());
    }

    private PostDraft toDraft(PostWriteRequest request) {
        return PostDraft.manual(
                request.title(),
                request.summary(),
                request.content(),
                request.category(),
                request.readTimeMinutes()
        );
    }

    private String authorName(Jwt jwt) {
        String name = jwt.getClaimAsString("name");
        return name == null || name.isBlank() ? jwt.getSubject() : name;
    }
}
