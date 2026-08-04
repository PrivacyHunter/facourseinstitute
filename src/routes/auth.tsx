import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/fa-logo.png.asset.json";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Login or Sign Up — FA Course Institute" },
      {
        name: "description",
        content:
          "Create your free FA Course Institute account to access free courses, submit payments and join live sessions.",
      },
      { property: "og:title", content: "Login or Sign Up — FA Course Institute" },
      { property: "og:description", content: "Access your courses and live sessions." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function AuthPage() {
  const { mode, next } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">(mode === "signup" ? "signup" : "login");

  useEffect(() => {
    if (user) void navigate({ to: next && next.startsWith("/") ? next : "/profile" });
  }, [user, navigate, next]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      full_name: form.get("full_name"),
      email: form.get("email"),
      phone: form.get("phone") ?? "",
      password: form.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/profile`,
        data: { full_name: parsed.data.full_name, phone: parsed.data.phone ?? "" },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSent(true);
      toast.success("Account created — check your email to verify it.");
    } else {
      toast.success("Account created!");
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
  };

  const handleReset = async () => {
    const email = window.prompt("Enter your account email to receive a reset link:");
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent to your email.");
  };

  return (
    <Layout>
      <section className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16">
        <img src={logo.url} alt="FA Course Institute" className="h-16 w-auto" />
        <div className="mt-6 w-full rounded-xl border border-border bg-card p-6 shadow-soft">
          {sent ? (
            <div className="space-y-3 text-center">
              <h1 className="text-xl font-semibold text-foreground">Verify your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a verification link to your inbox. Click it to activate your account, then
                come back and log in.
              </p>
              <Button variant="outline" onClick={() => setSent(false)} className="w-full">
                Back to login
              </Button>
            </div>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-5">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" name="email" type="email" required maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      required
                      maxLength={72}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Please wait..." : "Login"}
                  </Button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-5">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Full name</Label>
                    <Input id="su-name" name="full_name" required maxLength={80} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" name="email" type="email" required maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-phone">WhatsApp number (optional)</Label>
                    <Input id="su-phone" name="phone" maxLength={30} placeholder="03xx-xxxxxxx" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-password">Password</Label>
                    <Input
                      id="su-password"
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      maxLength={72}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Please wait..." : "Create account"}
                  </Button>
                </form>
              </TabsContent>

              <div className="mt-5">
                <div className="relative py-2 text-center text-xs text-muted-foreground">
                  <span className="bg-card px-2">or continue with</span>
                </div>
                <Button variant="outline" className="w-full" onClick={handleGoogle}>
                  Continue with Google
                </Button>
              </div>
            </Tabs>
          )}
        </div>
      </section>
    </Layout>
  );
}
