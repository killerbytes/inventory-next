import React from "react";
import { cx } from "class-variance-authority";
import { LoaderPinwheel } from "lucide-react";

export default function Loader({ isLoading = true }: { isLoading?: boolean }) {
  return (
    <div
      className={cx(
        "h-full w-full bg-white dark:bg-zinc-950 absolute left-0 top-0 opacity-90 items-center justify-center z-50",
        isLoading && "flex",
        !isLoading && "hidden"
      )}
    >
      <LoaderPinwheel className="animate-spin text-primary" size="30" />
    </div>
  );
}
