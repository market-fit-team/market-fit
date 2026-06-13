package com.example.server.api.media;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.server.api.media.dto.MediaAttachmentResponse;
import com.example.server.api.media.dto.UpdateMediaAttachmentRequest;
import com.example.server.application.auth.CurrentUserService;
import com.example.server.application.media.MediaAttachmentApplicationService;
import com.example.server.application.media.MediaQueryService;
import com.example.server.core.user.User;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/media")
@Tag(name = "media")
@SecurityRequirement(name = "bearerAuth")
public class MediaAttachmentController {

    private final CurrentUserService currentUserService;
    private final MediaAttachmentApplicationService mediaAttachmentApplicationService;
    private final MediaQueryService mediaQueryService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(operationId = "uploadMediaAttachment", summary = "미디어 첨부파일 업로드")
    public MediaAttachmentResponse upload(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(required = true, schema = @Schema(type = "string", format = "binary"))
            @RequestPart("file") MultipartFile file,
            @Parameter(schema = @Schema(nullable = true))
            @RequestParam(value = "altText", required = false) String altText
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        return mediaAttachmentApplicationService.upload(currentUser, file, altText);
    }

    @GetMapping("/{id}")
    @Operation(operationId = "getMediaAttachment", summary = "미디어 첨부파일 조회")
    public MediaAttachmentResponse get(
            @PathVariable Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        return mediaQueryService.getOwnedResponse(currentUser, id);
    }

    @PatchMapping("/{id}")
    @Operation(operationId = "updateMediaAttachment", summary = "미디어 첨부파일 수정")
    public MediaAttachmentResponse update(
            @PathVariable Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @RequestBody UpdateMediaAttachmentRequest request
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        return mediaAttachmentApplicationService.updateAltText(currentUser, id, request.altText());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "deleteMediaAttachment", summary = "미디어 첨부파일 삭제")
    public void delete(
            @PathVariable Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        User currentUser = currentUserService.getRequiredUser(jwt);
        mediaAttachmentApplicationService.deleteUnattached(currentUser, id);
    }
}
