package com.example.server.api.postlike;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.server.application.auth.CurrentUserService;
import com.example.server.core.user.User;
import com.example.server.core.postlike.PostLikeCommandService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
@Tag(name = "post-likes")
@SecurityRequirement(name = "bearerAuth")
public class PostLikeController {

    private final PostLikeCommandService postLikeService;
    private final CurrentUserService currentUserService;

    @PostMapping("/{postId}/likes")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "likePost", summary = "게시글 좋아요")
    public void like(
            @PathVariable Long postId,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        postLikeService.like(postId, currentUser);
    }

    @DeleteMapping("/{postId}/likes")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "unlikePost", summary = "게시글 좋아요 취소")
    public void unlike(
            @PathVariable Long postId,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        postLikeService.unlike(postId, currentUser);
    }
}
