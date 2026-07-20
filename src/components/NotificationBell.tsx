import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@tanstack/react-router";
import { timeAgo } from "@/lib/jobs";

interface Notif {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const unread = items.filter((n) => !n.read).length;

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id,title,body,link,read,created_at")
      .order("created_at", { ascending: false })
      .limit(15);
    setItems((data as Notif[]) || []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    load();
  };

  if (!user) return null;

  return (
    <Popover onOpenChange={(o) => { if (o) markAllRead(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b p-3 font-medium">Notifications</div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</div>}
          {items.map((n) => {
            const inner = (
              <div className={`space-y-0.5 border-b p-3 text-sm last:border-b-0 ${n.read ? "" : "bg-primary/5"}`}>
                <div className="font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{timeAgo(n.created_at)}</div>
              </div>
            );
            return n.link ? <Link key={n.id} to={n.link}>{inner}</Link> : <div key={n.id}>{inner}</div>;
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
