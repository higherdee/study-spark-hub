import { createFileRoute } from "@tanstack/react-router";
import { PdfWorkshop } from "@/components/native-web/pdf-workshop";
export const Route = createFileRoute("/_authenticated/dashboard/pdf")({
  head: () => ({ meta: [{ title: "PDF workshop — Syllaboss" }] }),
  component: PdfWorkshop,
});
