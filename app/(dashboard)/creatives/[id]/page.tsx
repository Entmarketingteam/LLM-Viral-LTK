"use client";

import { useParams } from "next/navigation";
import { CreativeDetail } from "@/components/creatives/CreativeDetail";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CreativeDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  if (!id) {
    return (
      <div className="space-y-4">
        <Link href="/explorer">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Explorer
          </Button>
        </Link>
        <p className="text-gray-500">No creative ID provided.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/explorer">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Explorer
        </Button>
      </Link>
      <CreativeDetail creativeId={id} />
    </div>
  );
}
