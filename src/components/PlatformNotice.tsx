import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getBillingSummary } from "@/lib/billing";
export function PlatformNotice() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["platform-notice", user?.id],
    queryFn: getBillingSummary,
    enabled: !!user,
    staleTime: 60000,
    retry: false,
  });
  if (!data?.controls.announcement) return null;
  return (
    <div
      role="status"
      className="bg-teal-950 text-teal-50 px-4 py-2 text-sm text-center"
    >
      {data.controls.announcement}
    </div>
  );
}
