"use client";

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      {/* Gradient blobs */}
      <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/20 dark:bg-primary/10 blur-[120px]" />
      <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-secondary/20 dark:bg-secondary/10 blur-[120px]" />
      <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-accent/15 dark:bg-accent/10 blur-[120px]" />
    </div>
  );
}
