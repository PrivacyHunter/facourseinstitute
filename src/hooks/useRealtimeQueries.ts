import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeQueries(tables: string[], queryKeys: QueryKey[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel(`live-${tables.join("-")}-${Math.random().toString(36).slice(2)}`);
    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => queryKeys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey })),
      );
    });
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, tables.join("|"), queryKeys.map((key) => JSON.stringify(key)).join("|")]);
}