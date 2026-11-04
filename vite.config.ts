import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { voidPlugin } from "void";
import { voidReact } from "@void/react/plugin";

export default defineConfig({
  plugins: [
    tailwindcss(),
    voidPlugin(),
    voidReact({ react: { compiler: true } }),
  ],
  server: {
    // Listen on every interface (reachable from outside localhost too).
    host: "0.0.0.0",
  },
});
