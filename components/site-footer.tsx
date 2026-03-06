"use client";

import { Compass, Github, Instagram, Mail, MapPin, Twitter } from "lucide-react";
import Link from "next/link";

const footerSections = [
  {
    title: "Product",
    links: [
      { label: "Explore Restaurants", href: "#explore-section" },
      { label: "My Bookings", href: "/dashboard" },
      { label: "AI Concierge", href: "#" },
      { label: "Live Map", href: "#explore-section" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About DineUp", href: "#about" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Careers", href: "#" },
      { label: "Press Kit", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Contact Us", href: "#" },
    ],
  },
];

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Github, href: "https://github.com/yugrajmangate-dev/DINEUP", label: "GitHub" },
  { icon: Mail, href: "#", label: "Email" },
];

export function SiteFooter() {
  return (
    <footer id="about" className="border-t border-[#E8E4DC] bg-white">
      <div className="mx-auto max-w-[1800px] px-6 py-16 sm:px-8 lg:px-12">
        {/* ── Top section ──────────────────────────────────── */}
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="max-w-xs space-y-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F9F6F0] text-[#D4AF37]">
                <Compass className="h-4 w-4" />
              </div>
              <span className="font-display text-xl tracking-wide text-[#1A1A1A]">DineUp</span>
            </Link>
            <p className="text-sm leading-relaxed text-[#5C5C5C]">
              Curated dining experiences powered by AI. Discover the city&apos;s finest tables and reserve in seconds.
            </p>
            <div className="flex items-center gap-1 text-xs text-[#5C5C5C]/60">
              <MapPin className="h-3 w-3" />
              Pune, India
            </div>
          </div>

          {/* Link sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-[#1A1A1A]">
                {section.title}
              </p>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#5C5C5C] transition-colors hover:text-[#1A1A1A]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Divider ─────────────────────────────────────── */}
        <div className="my-12 h-px bg-[#E8E4DC]" />

        {/* ── Bottom bar ──────────────────────────────────── */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-[#5C5C5C]">
            &copy; {new Date().getFullYear()} DineUp. All rights reserved.
          </p>

          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E4DC] bg-[#F9F6F0] text-[#5C5C5C] transition-all hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
              >
                <social.icon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
