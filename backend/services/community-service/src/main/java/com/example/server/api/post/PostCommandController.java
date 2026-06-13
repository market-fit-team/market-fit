package com.example.server.api.post;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.server.api.post.dto.CreatePostRequest;
import com.example.server.api.post.dto.CreateReplyRequest;
import com.example.server.api.post.dto.PostResponse;
import com.example.server.api.post.dto.UpdatePostRequest;
import com.example.server.application.auth.CurrentUserService;
import com.example.server.application.post.query.PostQueryService;
import com.example.server.core.post.Post;
import com.example.server.core.post.PostCommandService;
import com.example.server.core.post.PostDraft;
import com.example.server.core.user.User;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
@Tag(name = "posts")
@SecurityRequirement(name = "bearerAuth")
public class PostCommandController {

    private final PostCommandService postCommandService;
    private final PostQueryService postQueryService;
    private final CurrentUserService currentUserService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(operationId = "createPost", summary = "게시글 생성")
    public PostResponse create(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreatePostRequest request
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        Post post = postCommandService.create(
                new PostDraft(request.getContent(), request.safeMediaAttachmentIds()),
                currentUser
        );
        return postQueryService.findById(post.getId(), currentUser);
    }

    @PostMapping("/{parentId}/replies")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(operationId = "createPostReply", summary = "게시글 답글 생성")
    public PostResponse createReply(
            @PathVariable Long parentId,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateReplyRequest request
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        Post post = postCommandService.createReply(
                parentId,
                new PostDraft(request.getContent(), request.safeMediaAttachmentIds()),
                currentUser
        );
        return postQueryService.findById(post.getId(), currentUser);
    }

    @PutMapping("/{id}")
    @Operation(operationId = "updatePost", summary = "게시글 수정")
    public PostResponse update(
            @PathVariable Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdatePostRequest request
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        Post post = postCommandService.update(id, request.getContent(), currentUser);
        return postQueryService.findById(post.getId(), currentUser);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "deletePost", summary = "게시글 삭제")
    public void delete(
            @PathVariable Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        postCommandService.delete(id, currentUser);
    }
}
