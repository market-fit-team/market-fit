"use client";

import { useGetPostsByCursorSuspenseInfinite } from "@/shared/api/generated/community/endpoints/posts/posts";
import { Button } from "@/shared/components/ui/button";


export function PostList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetPostsByCursorSuspenseInfinite(
      {},
      { query: { getNextPageParam: (lastPage) => lastPage.data.nextCursor } }
    );

  return (
    <div>
      <div>
        {data.pages.map((page, i) => (
          <div key={i}>
            {page.data.items?.map((post) => (
              <div key={post.id}>
                <p>{post.content}</p>
                <small suppressHydrationWarning>{new Date(post.createdAt!).toLocaleString("ko-KR")}</small>
              </div>
            ))}
          </div>
        ))}
      </div>
      {hasNextPage && (
        <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "로딩 중..." : "더 보기"}
        </Button>
      )}
    </div>
  );
}


