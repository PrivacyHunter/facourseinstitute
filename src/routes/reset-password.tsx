import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — FA Course Institute" },
      { name: "description", content: "Set a new password for your FA Course Institute account." },
      { property: "og:title", content: "Reset Password — FA Course Institute" },
      { property: "og:description", content: "Choose a new password for your account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    void navigate({ to: "/profile" });
  };

  return (
    <Layout>
      <section className="mx-auto w-full max-w-md px-4 py-16">
        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
          <h1 className="text-xl font-semibold text-foreground">Set a new password</h1>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" required minLength={6} maxLength={72} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Update password"}
            </Button>
          </form>
        </div>
      </section>
    </Layout>
  );
}
