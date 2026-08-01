import { createFileRoute } from "@tanstack/react-router";
import { CandidateDetail } from "@/components/CandidateDetail";

export const Route = createFileRoute("/_authenticated/hiring/candidates/$appId")({
  component: () => <CandidateDetail applicationId={Route.useParams().appId} />,
});
