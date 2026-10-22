"use client";

import { App, ConfigProvider } from "antd";
import type { ReactNode } from "react";

/** Plain Ant Design 6 defaults; the design system arrives in a later prompt. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <App>{children}</App>
    </ConfigProvider>
  );
}
