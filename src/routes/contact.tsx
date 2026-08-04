import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { Layout, WhatsAppIcon } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — FA Course Institute" },
      {
        name: "description",
        content:
          "Questions about a course, payment or live session? Contact the FA Course Institute team by email, WhatsApp or the contact form.",
      },
      { property: "og:title", content: "Contact FA Course Institute" },
      { property: "og:description", content: "Get in touch about courses, payments and sessions." },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(5, "Please write your message").max(1000),
});

function ContactPage() {
  const [loading, setLoading] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["settings-contact"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key,value");
      return Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? ""]));
    },
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = schema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      subject: fd.get("subject") ?? "",
      message: fd.get("message"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject ?? "",
      message: parsed.data.message,
    });
    setLoading(false);
    if (error) {
      toast.error("Could not send your message. Please try again.");
      return;
    }
    toast.success("Message sent! We'll reply soon.");
    form.reset();
  };

  return (
    <Layout>
      <section className="border-b border-border bg-soft">
        <div className="mx-auto w-full max-w-6xl px-4 py-14">
          <h1 className="text-4xl font-bold text-foreground">Contact us</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Ask about a course, payment approval or live session — we usually reply within a day.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-12 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          {settings?.["contact_email"] && (
            <a
              href={`mailto:${settings["contact_email"]}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:bg-accent"
            >
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">{settings["contact_email"]}</p>
              </div>
            </a>
          )}
          {settings?.["contact_phone"] && (
            <a
              href={`tel:${settings["contact_phone"]}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:bg-accent"
            >
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Phone</p>
                <p className="text-sm text-muted-foreground">{settings["contact_phone"]}</p>
              </div>
            </a>
          )}
          <a
            href={settings?.["whatsapp_channel"] || SITE.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:bg-accent"
          >
            <WhatsAppIcon className="h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-medium text-foreground">WhatsApp channel</p>
              <p className="text-sm text-muted-foreground">Announcements & free classes</p>
            </div>
          </a>
        </div>

        <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <MessageSquare className="h-5 w-5 text-primary" /> Send a message
          </h2>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" required maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" name="message" required rows={5} maxLength={1000} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send message"}
            </Button>
          </div>
        </form>
      </section>
    </Layout>
  );
}
