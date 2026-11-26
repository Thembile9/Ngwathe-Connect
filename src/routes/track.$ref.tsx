import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/track/$ref")({ beforeLoad: () => { throw redirect({ to: "/app/reports" }); } });
