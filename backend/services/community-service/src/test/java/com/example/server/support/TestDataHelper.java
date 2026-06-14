package com.example.server.support;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.example.server.infrastructure.persistence.session.DbSessionContext;
import com.example.server.core.post.Post;
import com.example.server.infrastructure.persistence.post.PostRepository;
import com.example.server.core.user.User;
import com.example.server.infrastructure.persistence.user.UserRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class TestDataHelper {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final DbSessionContext dbSessionContext;
    private final TransactionTemplate transactionTemplate;
    private final JdbcTemplate jdbcTemplate;

    public User createAuthentikUser(String subject, String email) {
        return userRepository.save(User.createExternalUser(
                "authentik",
                subject,
                email,
                true,
                email,
                "https://example.com/profile.png"
        ));
    }

    public Long createPost(User author, String content) {
        return createRootPost(author, content);
    }

    public Long createRootPost(User author, String content) {
        return transactionTemplate.execute(status -> {
            dbSessionContext.setCurrentUserId(author.getId());
            Post post = Post.createRoot(content, author);
            Post saved = postRepository.saveAndFlush(post);
            saved.markAsRoot();
            return saved.getId();
        });
    }

    public Long createReply(User author, Long parentId, String content) {
        return transactionTemplate.execute(status -> {
            dbSessionContext.setCurrentUserId(author.getId());
            Post parent = postRepository.findById(parentId).orElseThrow();
            Post reply = Post.createReply(content, author, parent);
            Post saved = postRepository.saveAndFlush(reply);
            return saved.getId();
        });
    }

    public void softDeletePost(User author, Long postId) {
        transactionTemplate.executeWithoutResult(status -> {
            dbSessionContext.setCurrentUserId(author.getId());
            Post post = postRepository.findById(postId).orElseThrow();
            post.softDelete();
        });
    }

    public void likePost(User user, Long postId) {
        transactionTemplate.executeWithoutResult(status -> {
            dbSessionContext.setCurrentUserId(user.getId());
            jdbcTemplate.update(
                    "insert into post_likes(post_id, user_id) values (?, ?) on conflict do nothing",
                    postId,
                    user.getId()
            );
        });
    }

    public Long createAttachedMedia(User owner, Long postId, String objectKey) {
        return transactionTemplate.execute(status -> {
            dbSessionContext.setCurrentUserId(owner.getId());
            return jdbcTemplate.queryForObject("""
                    insert into post_media_attachments (
                        owner_user_id,
                        post_id,
                        bucket,
                        object_key,
                        original_filename,
                        content_type,
                        byte_size,
                        width,
                        height,
                        alt_text,
                        status,
                        sort_order,
                        attached_at
                    )
                    values (?, ?, 'pickle-post-images', ?, 'image.png', 'image/png', 12345, 640, 480, 'alt text', 'ATTACHED', 0, now())
                    returning id
                    """, Long.class, owner.getId(), postId, objectKey);
        });
    }

    public Long createUploadedMedia(User owner, String objectKey) {
        return transactionTemplate.execute(status -> {
            dbSessionContext.setCurrentUserId(owner.getId());
            return jdbcTemplate.queryForObject("""
                    insert into post_media_attachments (
                        owner_user_id,
                        bucket,
                        object_key,
                        original_filename,
                        content_type,
                        byte_size,
                        width,
                        height,
                        alt_text,
                        status,
                        sort_order
                    )
                    values (?, 'pickle-post-images', ?, 'image.png', 'image/png', 12345, 640, 480, 'alt text', 'UPLOADED', 0)
                    returning id
                    """, Long.class, owner.getId(), objectKey);
        });
    }
}
