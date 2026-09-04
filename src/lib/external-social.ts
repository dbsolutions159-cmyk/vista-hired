import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Stable identifier for an imported job: source + external id. */
export function externalJobKey(source: string, externalId: string) {
  return `${source}:${externalId}`;
}

export interface SocialCounts {
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
}

type Pending = { key: string; resolve: (c: SocialCounts) => void };

let queue: Pending[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/** Micro-batches count lookups so a feed of cards makes one request. */
function fetchCounts(key: string): Promise<SocialCounts> {
  return new Promise((resolve) => {
    queue.push({ key, resolve });
    if (timer) return;
    timer = setTimeout(async () => {
      const batch = queue;
      queue = [];
      timer = null;
      const keys = Array.from(new Set(batch.map((b) => b.key)));
      const { data } = await supabase.rpc("external_job_social_counts", { _keys: keys });
      const map = new Map<string, SocialCounts>();
      (data ?? []).forEach((r) =>
        map.set(r.external_job_id, {
          like_count: Number(r.like_count ?? 0),
          comment_count: Number(r.comment_count ?? 0),
          liked_by_me: !!r.liked_by_me,
        }),
      );
      batch.forEach((b) =>
        b.resolve(map.get(b.key) ?? { like_count: 0, comment_count: 0, liked_by_me: false }),
      );
    }, 40);
  });
}

export function useExternalJobSocial(key: string, userId?: string) {
  const [counts, setCounts] = useState<SocialCounts>({ like_count: 0, comment_count: 0, liked_by_me: false });

  const refresh = useCallback(() => {
    let active = true;
    void fetchCounts(key).then((c) => active && setCounts(c));
    return () => {
      active = false;
    };
  }, [key, userId]);

  useEffect(() => refresh(), [refresh]);

  const toggleLike = useCallback(async () => {
    if (!userId) return false;
    const liked = counts.liked_by_me;
    setCounts((c) => ({ ...c, liked_by_me: !liked, like_count: Math.max(0, c.like_count + (liked ? -1 : 1)) }));
    const { error } = liked
      ? await supabase.from("external_job_likes").delete().eq("external_job_id", key).eq("user_id", userId)
      : await supabase.from("external_job_likes").insert({ external_job_id: key, user_id: userId });
    if (error) {
      setCounts((c) => ({ ...c, liked_by_me: liked, like_count: Math.max(0, c.like_count + (liked ? 1 : -1)) }));
      return false;
    }
    return true;
  }, [counts.liked_by_me, key, userId]);

  const setCommentCount = useCallback((n: number) => setCounts((c) => ({ ...c, comment_count: n })), []);

  return { ...counts, toggleLike, setCommentCount, refresh };
}
