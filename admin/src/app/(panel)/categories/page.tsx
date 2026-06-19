"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X, FolderTree } from "lucide-react";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type AdminCategory,
} from "@/lib/admin";
import { apiError } from "@/lib/api";
import { useConfirm } from "@/components/confirm-dialog";
import { useAuth } from "@/lib/store/auth";

export default function CategoriesPage() {
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["categories"] });

  const createMut = useMutation({
    mutationFn: () => createCategory(name.trim()),
    onSuccess: () => {
      setName("");
      setErr(null);
      invalidate();
    },
    onError: (e) => setErr(apiError(e)),
  });

  const updateMut = useMutation({
    mutationFn: () => updateCategory(editId!, editName.trim()),
    onSuccess: () => {
      setEditId(null);
      setErr(null);
      invalidate();
    },
    onError: (e) => setErr(apiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: invalidate,
    onError: (e) => setErr(apiError(e)),
  });

  if (role !== "SUPERADMIN") {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center text-sm text-muted-foreground">
        Bu bo&apos;lim faqat super admin uchun.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 flex items-center gap-2">
        <FolderTree className="h-6 w-6 text-primary" />
        <h1 className="font-serif text-3xl font-medium tracking-tight">Kategoriyalar</h1>
      </header>

      {/* Yangi qo'shish */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length >= 2) createMut.mutate();
        }}
        className="mb-6 flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Yangi kategoriya nomi"
          minLength={2}
          maxLength={50}
          className="flex-1 rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
        <button
          type="submit"
          disabled={createMut.isPending || name.trim().length < 2}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Qo&apos;shish
        </button>
      </form>

      {err && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {err}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Hozircha kategoriya yo&apos;q.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {data.map((c: AdminCategory) => (
            <li key={c.id} className="flex items-center gap-3 bg-card px-4 py-3">
              {editId === c.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    minLength={2}
                    maxLength={50}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => editName.trim().length >= 2 && updateMut.mutate()}
                    disabled={updateMut.isPending}
                    className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                    title="Saqlash"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                    title="Bekor qilish"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      /{c.slug} · {c.articleCount} ta e&apos;lon qilingan maqola
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditId(c.id);
                      setEditName(c.name);
                      setErr(null);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Qayta nomlash"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Kategoriyani o'chirish",
                        description: `"${c.name}" o'chiriladi.`,
                        confirmText: "O'chirish",
                        danger: true,
                      });
                      if (ok) deleteMut.mutate(c.id);
                    }}
                    disabled={deleteMut.isPending}
                    className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    title="O'chirish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
