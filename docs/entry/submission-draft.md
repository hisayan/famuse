# famuse — ハッカソン提出ドラフト
Meta Global AI Developer Hackathon / Indie developer track / Theme: Build for Your World
締切: 11/5 11:00 JST（= 11/4 21:00 ET）。提出先: Cerebral Valley イベントページのプロジェクト提出フォーム。

## 提出リンク（3点セット）
- GitHub: https://github.com/hisayan/famuse
- Live demo: https://famuse.a10n.workers.dev
- Demo video: https://youtu.be/3SXRY-c3ze8
  ※ 要件確定：フォーム名 "3-Minute Demo Video"＝3分以内必須

## 採点配分への当て方
- Impact 30% → 毎日の家族の摩擦（夕飯・犬の散歩・写真迷子）を消す
- Creative use of Meta AI 25% → Muse Spark が家族の一員(@famuse)として会話に参加
- Demo + video 25% → 本番URL + 実機録画3分
- Technical depth 20% → DO/D1/R2、推論トークンの解析、E2Eテスト

---

## Project title
famuse — Muse joins your family

## Tagline（一行）
Muse joins your family: an AI butler for dinner, pets, and everything in between.

*The name says it all: **fam**ily + **Muse**, made for **fam**ily **use**.*

## Description（本文・英語）

**The idea: what if Muse joined your family?**

Every family chat is the same: "what's for dinner?" at 6pm, "did anyone walk
the dog?", birthday photos lost in the scroll. AI assistants exist — but they
live in a separate app, outside the family's world.

famuse flips that. **Muse doesn't visit your family. It joins it.** Inside a
private family hub, Muse Spark is @famuse — a member of the household who knows
the dog's name, tonight's plan, and what you missed. Ask it anything, right in
the conversation, and the whole house runs a little happier. When every family
has its Muse, the world gets a little warmer. That's the future we're building.

**What it does**

- **Real-time family rooms** — living-room, groceries, pet-care, announcements,
  each with presence and typing indicators.
- **@famuse, the household butler** — dinner ideas, pet status, catch-up
  digests, and everyday questions, answered in context.
- **Pet Care plugin** — Buddy's walks, meals, and potty breaks logged from
  chat, with overdue nudges.
- **Photos & tasks** — photo sharing with a fullscreen viewer, plus shared
  household checklists.
- **Your cloud, your data** — open-source (MIT), one-command deploy to your
  own Cloudflare account. Family photos and messages live in infrastructure
  you control, not on someone else's server.

**How we built it**

- **Muse Spark via the Meta Model API** (OpenAI-compatible chat/completions)
  powers @famuse, with tool-style context and a deterministic local assistant
  as offline fallback. Built fast with the **Muse Code** agentic coding agent.
- **Cloudflare Workers + Durable Objects** (one hibernating DO per channel),
  **D1** for history, **R2** for photos — the whole stack deploys with one
  command on the **Void** full-stack framework.
- React + Tailwind client, typed WebSocket rooms, Playwright E2E (desktop +
  mobile), CI that deploys on every push.

**What we learned**

Muse Spark is a reasoning model: it burns hundreds of hidden reasoning tokens
per call, so naive `max_tokens` budgets returned empty replies. We measured
real token usage (~170–270 reasoning tokens per answer) and tuned the budget
with `reasoning_effort: low` for snappy family-chat replies.

**What's next**

More family plugins (calendar, chores, groceries), push notifications, and
multi-household support — always with Muse at the dinner table.

## Built with（タグ）
muse-spark, meta-model-api, muse-code, cloudflare-workers, durable-objects,
d1, r2, void, react, typescript, playwright

## Track / Theme 選択
- Track: **Indie developer track**（個人ビルダー）
- Theme: **Build for Your World**（身近な問題を自分のドメインで解く）
