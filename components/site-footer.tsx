"use client";

import { Compass, Github, Instagram, Mail, MapPin, Twitter } from "lucide-react";
import Link from "next/link";

const footerSections = [
  {
    title: "Product",
    links: [
      { label: "Explore Restaurants", href: "/#explore-section" },
      { label: "My Bookings", href: "/dashboard" },
      { label: "AI Concierge", href: "/ai-concierge" },
      { label: "Live Map", href: "/#explore-section" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About DineUp", href: "/about" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Careers", href: "/careers" },
      { label: "Press Kit", href: "/press" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/help-center" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Service", href: "/terms-of-service" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
];

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Github, href: "https://github.com/yugrajmangate-dev/DINEUP", label: "GitHub" },
  { icon: Mail, href: "mailto:dineupservices@gmail.com", label: "Email" },
];

export function SiteFooter() {
  return (
    <footer id="about" className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-450 px-6 py-16 sm:px-8 lg:px-12">
        {/* ── Top section ──────────────────────────────────── */}
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="max-w-xs space-y-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-[#FF6B35]">
                <Compass className="h-4 w-4" />
              </div>
              <span className="font-display text-xl tracking-wide text-slate-900">DineUp</span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-500">
              Curated dining experiences powered by AI. Discover the city&apos;s finest tables and reserve in seconds.
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="h-3 w-3" />
              Pune, India
            </div>
          </div>

          {/* Link sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-slate-900">
                {section.title}
              </p>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 transition-colors hover:text-slate-900"
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
        <div className="my-12 h-px bg-gray-200" />

        {/* ── Bottom bar ──────────────────────────────────── */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-slate-500">
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
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-slate-500 transition-all hover:border-orange-200 hover:text-[#FF6B35]"
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

