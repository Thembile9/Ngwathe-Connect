import { useSession } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMyReports() {
  const { session } = useSession();
  const id = session?.user.id;

  const { data } = useQuery({
    queryKey: ["resident-references", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return [];

      const result = await supabase
        .from("complaints")
        .select("reference")
        .eq("resident_user_id", id);

      if (result.error) throw result.error;

      return result.data.map((row) => row.reference);
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  return data ?? [];
}
