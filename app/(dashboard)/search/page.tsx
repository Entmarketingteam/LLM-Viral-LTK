"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon } from "lucide-react";

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search & Discovery</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Text and vector similarity search
        </p>
      </div>
      <Card className="p-6">
        <div className="flex gap-2 max-w-xl">
          <Input placeholder="Search creatives, captions, hashtags…" className="flex-1" />
          <Button>
            <SearchIcon className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </Card>
      <Card className="p-12 text-center text-gray-500">
        Search results and vector similarity (image upload) coming next.
      </Card>
    </div>
  );
}
