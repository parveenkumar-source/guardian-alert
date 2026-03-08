import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Trash2, Loader2 } from "lucide-react";

interface Comment {
  id: string;
  report_id: string;
  user_id: string;
  display_name: string;
  content: string;
  created_at: string;
}

interface ReportCommentsProps {
  reportId: string;
  isOpen: boolean;
  onToggle: () => void;
  commentCount: number;
}

const ReportComments = ({ reportId, isOpen, onToggle, commentCount }: ReportCommentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("report_comments")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
    setLoading(false);
  }, [reportId]);

  useEffect(() => {
    if (isOpen) fetchComments();
  }, [isOpen, fetchComments]);

  // Realtime subscription for this report's comments
  useEffect(() => {
    if (!isOpen) return;
    const channel = supabase
      .channel(`comments-${reportId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "report_comments", filter: `report_id=eq.${reportId}` },
        (payload) => {
          setComments((prev) => {
            if (prev.some((c) => c.id === (payload.new as Comment).id)) return prev;
            return [...prev, payload.new as Comment];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "report_comments", filter: `report_id=eq.${reportId}` },
        (payload) => {
          setComments((prev) => prev.filter((c) => c.id !== (payload.old as any).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, reportId]);

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to comment.", variant: "destructive" });
      return;
    }
    const trimmed = newComment.trim();
    if (!trimmed || trimmed.length > 500) return;

    setSubmitting(true);

    // Get display name from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    const displayName = profile?.display_name || user.email?.split("@")[0] || "Anonymous";

    const { data: inserted, error } = await supabase.from("report_comments").insert({
      report_id: reportId,
      user_id: user.id,
      display_name: displayName,
      content: trimmed,
    }).select().single();

    if (error) {
      toast({ title: "Error", description: "Failed to post comment.", variant: "destructive" });
    } else {
      setNewComment("");
      // Optimistically add to local state in case realtime doesn't fire
      if (inserted) {
        setComments((prev) => prev.some((c) => c.id === inserted.id) ? prev : [...prev, inserted]);
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from("report_comments").delete().eq("id", commentId);
  };

  const timeSince = (d: string) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {commentCount > 0 ? `${commentCount} comment${commentCount !== 1 ? "s" : ""}` : "Comment"}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Comments list */}
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading…
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 group">
                  <div className="flex-1 bg-secondary/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{c.display_name}</span>
                      <span className="text-[10px] text-muted-foreground">{timeSince(c.created_at)}</span>
                      {user && c.user_id === user.id && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                          aria-label="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment */}
          {user && (
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a tip or warning…"
                maxLength={500}
                className="text-xs h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !newComment.trim()}
                className="h-8 px-3 shrink-0"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportComments;
