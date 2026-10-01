import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return <EmptyState icon="search" title="Page not found" text="That discussion or community doesn't exist, or has moved." action={<Button href="/">Back to Home</Button>} />;
}
