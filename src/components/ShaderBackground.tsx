import { GrainGradient } from "@paper-design/shaders-react";

const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Ambient field: warm amber grain waves on near-black.
// Preset: shaders.paper.design/grain-gradient (colors c6750c, wave, rot 24).
export default function ShaderBackground() {
  const fill = { position: "absolute" as const, inset: 0, width: "100%", height: "100%" };

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden" style={{ background: "#0a0a0a" }}>
      <GrainGradient
        style={fill}
        colors={["#c6750c"]}
        colorBack="#0a0a0a"
        softness={0.83}
        intensity={0.69}
        noise={0.69}
        shape="wave"
        rotation={24}
        scale={1}
        offsetX={0}
        offsetY={0}
        speed={reduceMotion ? 0 : 1}
      />
      {/* Gentle scrim so dense stats stay legible over the moving grain */}
      <div style={fill} className="pointer-events-none bg-[radial-gradient(130%_100%_at_50%_0%,rgba(10,10,10,0.35),rgba(10,10,10,0.62))]" />
    </div>
  );
}
