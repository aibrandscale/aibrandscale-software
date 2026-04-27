import { PageHeader } from "@/components/dashboard/page-shell";
import { SupportForm } from "./_components/support-form";

export const metadata = { title: "Support — AI BrandScale" };

const FAQ = [
  {
    q: "How are credits counted?",
    a: "Credits are deducted up-front when you click Generate. If a generation fails, the credits are fully refunded. Different generators cost different amounts — the form shows the cost before you submit.",
  },
  {
    q: "Why do my credits reset to a flat number each month?",
    a: "On every renewal, your credit balance is set back to the plan's monthly allowance. Credits do not roll over — use them or they're gone.",
  },
  {
    q: "Can I generate in multiple languages?",
    a: "Yes — pick the languages on each brand, then choose the language at generation time. The model writes the entire output in the chosen language.",
  },
  {
    q: "Does the static generator return real images?",
    a: "Not yet. It returns DALL-E-ready prompts plus headline / subheadline / CTA copy. Direct image generation is on the roadmap.",
  },
  {
    q: "Who can invite teammates?",
    a: "Owners and admins can invite. Members can read-only the workspace.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Open the Stripe customer portal from the Subscription page and cancel there. You keep access until the end of the current billing period.",
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Support"
        description="Find answers below or send us a message."
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Frequently asked
        </h2>
        <ul className="flex flex-col gap-3">
          {FAQ.map((item) => (
            <li
              key={item.q}
              className="rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <h3 className="text-sm font-semibold">{item.q}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.a}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Contact us
        </h2>
        <SupportForm />
      </section>
    </div>
  );
}
