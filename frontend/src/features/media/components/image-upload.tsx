"use client";

import { useRef } from "react";
import { useUploadMediaAttachment } from "@/shared/api/generated/community/endpoints/media/media";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type ImageUploadProps = {
  onUploadSuccess: (mediaId: number) => void;
};

export function ImageUpload({ onUploadSuccess }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: uploadMedia, isPending } = useUploadMediaAttachment({
    mutation: {
      onSuccess: (response) => {
        const { id } = response.data;
        if (id) {
          onUploadSuccess(id);
        }
      },
      onError: (error) => {
        console.error("Upload failed:", error);
        alert("업로드 실패");
      },
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMedia({ data: { file } });
  };

  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <Input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        disabled={isPending}
      />
      <Button onClick={handleClear} variant="secondary" disabled={isPending}>
        초기화
      </Button>
    </div>
  );
}
