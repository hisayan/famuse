import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { voidPlugin } from "void";
import { voidReact } from "@void/react/plugin";

export default defineConfig(({ mode }) => {
  // Hosts allowed to reach the dev server (Vite blocks unknown Host headers
  // with 403). Comma-separated list in .env, e.g. Tailscale machine names.
  const env = loadEnv(mode, process.cwd(), "");
  const allowedHosts = (env.VITE_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter((host) => host.length > 0);

  return {
    plugins: [
      tailwindcss(),
      voidPlugin(),
      voidReact({ react: { compiler: true } }),
    ],
    server: {
      // Listen on every interface (reachable from outside localhost too).
      host: "0.0.0.0",
      allowedHosts,
    },
  };
});
