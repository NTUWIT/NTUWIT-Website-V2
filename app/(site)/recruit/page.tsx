import { permanentRedirect } from "next/navigation";

// Keep existing bookmarks working; membership is now the only joining page.
export default function LegacyJoinPage() {
  permanentRedirect("/membership");
}
