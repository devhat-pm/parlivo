import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME, TAGLINE } from "@/lib/site";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: TAGLINE,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
