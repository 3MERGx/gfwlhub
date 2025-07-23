import { Metadata } from "next";
import Accordion from "@/components/Accordion";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ - GFWL Hub",
  description:
    "Frequently asked questions about Games for Windows LIVE issues and fixes.",
};

export default function FAQ() {
  const faqItems = [
    {
      question: "I'm having issues with the GFWL Keygen. Where can I get help?",
      answer: (
        <div>
          <p>
            → Please join the{" "}
            <Link
              className="text-blue-500 hover:underline"
              href="https://discord.gg/PR75T8xMWS"
              target="_blank"
              rel="noopener noreferrer"
            >
              GFWL Hub Discord
            </Link>{" "}
            and ask for assistance there. We will try to help you troubleshoot
            any issues you encounter with the keygen.
          </p>
        </div>
      ),
    },
    {
      question: "DirectX Installation",
      answer: (
        <div>
          <p>
            → Download the DirectX Installer{" "}
            <Link
              className="text-blue-500"
              href="https://www.microsoft.com/en-us/download/details.aspx?id=35"
            >
              here
            </Link>
          </p>
        </div>
      ),
    },

    {
      question: 'When will games marked as "Testing" work?',
      answer: (
        <div>
          <p>
            → When kind folks confirm they have working CD-KEY + PCID pairs for
            that specific game. If you can help — contact me below.
          </p>
        </div>
      ),
    },
    {
      question: "What is PCID and how does GFWL activation work?",
      answer: (
        <div>
          <p>
            → PCID is a unique ID for your computer that GFWL uses to check if a
            CD key has already been activated on that system. If the combination
            of your PCID + CD key was previously activated, the game will launch
            normally. But if it wasn&apos;t — GFWL tries to activate it online.
            And since the servers are now offline, new activations no longer
            work. That&apos;s why using an already activated PCID helps bypass
            the issue.
          </p>
        </div>
      ),
    },
    {
      question:
        "If I already have a working GFWL game installed, do I still need to use the fix? What happens if I reinstall Windows or upgrade hardware later?",
      answer: (
        <div>
          <p>
            → If the game is already working and you can log into your GFWL
            profile — you&apos;re fine for now. But the moment you reinstall
            Windows, change hardware, or move to a new system, GFWL will try to
            activate again — and fail, because the activation servers are gone.
            That&apos;s why it&apos;s critical to back up your current PCID and
            CD-Key while everything is still working. The tool in the guide lets
            you use old pre-activated combos — but only if you&apos;ve saved
            them in time. Think of it as &quot;immunizing&quot; your game before
            it breaks.
          </p>
        </div>
      ),
    },
    {
      question:
        "Why do I have to keep entering the key, will it be easier someday?",
      answer: (
        <div>
          <p>→ Yes, a better solution is being worked on by BlackAnt02.</p>
          <p>For now, this is the best we&apos;ve got.</p>
        </div>
      ),
    },
    {
      question: "How long will GFWL last?",
      answer: (
        <div>
          <p>
            → No one knows. Could be a week. Could be 10 years. Use it while
            it&apos;s up.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#202020] p-8 rounded-lg shadow-xl mb-8">
          <h1 className="text-3xl font-bold mb-6 text-center text-white">
            Frequently Asked Questions
          </h1>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <Accordion
                key={index}
                title={item.question}
                content={item.answer}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
