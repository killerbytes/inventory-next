"use client";

import { cx } from "class-variance-authority";
import React, { ReactNode, useState, useRef, useEffect } from "react";

export default function ShowMore({
  height = "200px",
  children,
}: {
  height?: string;
  children: ReactNode;
}) {
  const [show, setShow] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (wrapperRef.current && !show) {
        setIsOverflowing(
          wrapperRef.current.scrollHeight > wrapperRef.current.clientHeight
        );
      }
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    if (wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }

    return () => observer.disconnect();
  }, [children, show]);

  const onClick = () => {
    if (isOverflowing) {
      setShow((prev) => !prev);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cx("overflow-hidden relative transition-all")}
      style={{ maxHeight: show ? "none" : height }}
      onClick={onClick}
    >
      {children}
      {isOverflowing && (
        <>
          <div
            className={cx(
              "absolute inset-x-0 bottom-0 h-[100px] pointer-events-none transition-opacity",
              !show
                ? "bg-gradient-to-b from-transparent to-background"
                : "hidden"
            )}
          />
          <div className="flex items-end justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShow((prev) => !prev);
              }}
              className={cx(
                "z-10 rounded-md px-2 py-0.5 text-xs border shadow-sm mt-2 transition-colors hover:bg-accent",
                show ? "" : "absolute bottom-0 right-2 bg-background"
              )}
            >
              {show ? "Show less..." : "Show more..."}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
