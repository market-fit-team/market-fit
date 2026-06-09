"use client";

import { useState } from "react";
import { useCreatePost } from "@/shared/api/generated/community/endpoints/posts/posts";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { ImageUpload } from "@/features/media/components/image-upload";
import { useQueryClient } from "@tanstack/react-query";

export function CreatePost() {
  const [content, setContent] = useState("");
  const [mediaAttachmentIds, setMediaAttachmentIds] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const { mutate: createPost, isPending } = useCreatePost({
    mutation: {
      onSuccess: () => {
        setContent("");
        setMediaAttachmentIds([]);
        // invalidate post list
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey.includes("/api/v1/posts"),
        });
        alert("게시글 작성 완료");
      },
      onError: (error) => {
        console.error("Create post failed", error);
        alert("게시글 작성 실패");
      },
    },
  });

  const handleUploadSuccess = (mediaId: number) => {
    setMediaAttachmentIds((prev) => [...prev, mediaId]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && mediaAttachmentIds.length === 0) return;

    createPost({
      data: {
        content: content,
        mediaAttachmentIds: mediaAttachmentIds,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요"
        disabled={isPending}
      />
      <ImageUpload onUploadSuccess={handleUploadSuccess} />
      <Button type="submit" disabled={isPending}>
        등록
      </Button>
    </form>
  );
}
