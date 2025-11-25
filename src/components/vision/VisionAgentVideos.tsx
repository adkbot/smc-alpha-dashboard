import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Video, CheckCircle, Clock, XCircle } from "lucide-react";

export const VisionAgentVideos = () => {
  const { user } = useAuth();

  const { data: videos, isLoading } = useQuery({
    queryKey: ["visionVideos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("vision_videos_processed")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-3 w-3" />;
      case "PROCESSING":
        return <Clock className="h-3 w-3" />;
      case "ERROR":
        return <XCircle className="h-3 w-3" />;
      default:
        return <Video className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500";
      case "PROCESSING":
        return "bg-blue-500";
      case "ERROR":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Processed Videos</h3>
        <ScrollArea className="h-[200px]">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading videos...</p>
          ) : videos && videos.length > 0 ? (
            <div className="space-y-2">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="p-2 rounded border border-border/50 space-y-1"
                >
                  <div className="flex items-start gap-2">
                    <Video className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {video.video_title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {video.channel_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(video.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(video.status)}
                        {video.status}
                      </span>
                    </Badge>
                    {video.signals_detected !== null && (
                      <Badge variant="outline" className="text-xs">
                        {video.signals_detected} signals
                      </Badge>
                    )}
                  </div>
                  {video.status === "PROCESSING" && (
                    <p className="text-xs text-muted-foreground">
                      {video.frames_processed} / {video.total_frames} frames
                    </p>
                  )}
                  {video.status === "ERROR" && video.error_message && (
                    <p className="text-xs text-red-500">
                      {video.error_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No videos processed yet
            </p>
          )}
        </ScrollArea>
      </div>
    </Card>
  );
};
