"use client";

import { Trash2 } from "lucide-react";
import { deleteCryptoEntry } from "@/actions/cryptoEntryActions";
import { useRouter } from "next/navigation";

export function DeleteCryptoEntryButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const result = await deleteCryptoEntry(id);
    if (!result.success) {
      alert(result.message);
    } else {
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleDelete}
      title="Delete entry"
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
