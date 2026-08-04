import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, HeartHandshake, Target } from "lucide-react";
import { Layout, WhatsAppIcon } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";
import logo from "@/assets/fa-logo.png.asset.json";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — FA Course Institute" },
      {
        name: "description",
        content:
          "FA Course Institute has been teaching practical, affordable skill courses in Urdu since 2023. Learn about our mission and teaching style.",
      },
      { property: "og:title", content: "About FA Course Institute" },
      { property: "og:description", content: "Practical skill training in Urdu since 2023." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: settings } = useQuery({
    queryKey: ["settings-about"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key,value");
      return Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? ""]));
    },
  });

  return (
    <Layout>
      <section className="border-b border-border bg-soft">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-8 px-4 py-14">
          <img src={logo.url} alt="FA Course Institute logo" className="h-24 w-auto" />
          <div>
            <h1 className="text-4xl font-bold text-foreground">About {SITE.name}</h1>
            <p className="mt-2 text-muted-foreground">
              {SITE.tagline} — serving students since {settings?.["since"] || SITE.since}.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 py-12">
        <p className="text-lg leading-relaxed text-foreground">
          {settings?.["about_text"] ||
            "FA Course Institute has been teaching students since 2023 with practical, easy-to-follow courses."}
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Target, title: "Our mission", text: "Make quality skill education affordable for every Pakistani student." },
            { icon: Award, title: "Our method", text: "Short, practical lessons in Urdu with real assignments and live support." },
            { icon: HeartHandshake, title: "Our promise", text: "Free courses stay free, and paid students always get direct help." },
          ].map((i) => (
            <div key={i.title} className="rounded-xl border border-border bg-card p-6 shadow-soft">
              <i.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-base font-semibold text-foreground">{i.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{i.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/courses">Browse courses</Link>
          </Button>
          <Button asChild variant="outline">
            <a href={settings?.["whatsapp_channel"] || SITE.whatsapp} target="_blank" rel="noreferrer">
              <WhatsAppIcon className="h-4 w-4 text-success" /> WhatsApp channel
            </a>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
