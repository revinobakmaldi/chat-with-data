"use client";

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Gradient blobs */}
      <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-secondary/15 blur-[120px]" />
      <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-accent/15 blur-[120px]" />
    </div>
  );
}
