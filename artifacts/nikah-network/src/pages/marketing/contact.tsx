import { Mail, Phone, MapPin, Clock } from "lucide-react";
import PublicLayout from '@/components/layout/PublicLayout';

export default function Contact() {
  return (
    <PublicLayout navAlwaysSolid>
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-serif font-bold mb-3">Contact Us</h1>
      <p className="text-lg text-muted-foreground mb-10">
        Get in touch with the Falah Khandan Center team. We're happy to help families
        through every step of the process.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <a href="mailto:info.fkcenter@gmail.com"
           className="flex items-start gap-3 rounded-xl border p-5 hover:border-primary transition-colors">
          <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="block font-semibold">Email</span>
            <span className="text-sm text-muted-foreground">info.fkcenter@gmail.com</span>
          </span>
        </a>

        <a href="tel:+923366964964"
           className="flex items-start gap-3 rounded-xl border p-5 hover:border-primary transition-colors">
          <Phone className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="block font-semibold">Phone</span>
            <span className="text-sm text-muted-foreground">0336-6964964 (Cell) · 042-32488223 (Office)</span>
          </span>
        </a>

        <div className="flex items-start gap-3 rounded-xl border p-5">
          <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="block font-semibold">Address</span>
            <span className="text-sm text-muted-foreground">
              Falah Khandan Center (Women Commission), Lahore, Pakistan
            </span>
          </span>
        </div>

        <div className="flex items-start gap-3 rounded-xl border p-5">
          <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="block font-semibold">Office Hours</span>
            <span className="text-sm text-muted-foreground">Monday – Saturday, 10:00 AM – 6:00 PM</span>
          </span>
        </div>
      </div>
    </div>
    </PublicLayout>
  );
}
