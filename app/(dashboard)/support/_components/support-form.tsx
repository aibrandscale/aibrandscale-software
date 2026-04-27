"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitSupportRequest } from "@/app/actions/support";

export function SupportForm() {
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await submitSupportRequest(formData);
      if (res.ok) {
        toast.success("Message sent. We'll be in touch.");
        setSubject("");
        setMessage("");
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <form
      action={onSubmit}
      className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="support-subject">Subject</Label>
        <Input
          id="support-subject"
          name="subject"
          required
          maxLength={120}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="support-message">Message</Label>
        <Textarea
          id="support-message"
          name="message"
          required
          rows={6}
          minLength={10}
          maxLength={5000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe what you're running into. Screenshots help — paste any error messages."
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
