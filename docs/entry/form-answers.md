# famuse — Cerebral Valley 提出フォーム回答集（コピペ用）

## Team Name（必須）
famuse

## Which track are you submitting to?（必須）
Indie Developer Track

## Which problem statement did you build towards?（必須）
Build for Your World

## Most Viral Track X post link（任意）
https://x.com/anotherbrain/status/2117978797832339872

## Project Description（必須）
※ Live demo欄がフォームに無いので、文中に本番URLを入れること。

famuse (family + Muse, made for family use) is an open-source private family
hub where Muse joins the family as @famuse — an AI butler living inside the
conversation.

Problem: family chats drown in "what's for dinner?", "did anyone walk the
dog?", and photos lost in the scroll — while AI assistants sit in a separate
app, outside the family's world. When Muse becomes a member of the household,
the whole house runs happier.

What it does: real-time family rooms with presence and typing indicators;
@famuse answers dinner ideas, pet status, and catch-up digests in context; a
Pet Care plugin logs walks and meals from chat; photo sharing with a fullscreen
viewer; shared household checklists. Fully responsive — the same rooms, photos,
and tasks run on phones, so the family stays in sync from the couch or the
soccer field. One-command deploy to your own Cloudflare
account (Workers + Durable Objects + D1 + R2), so family photos and messages
stay in infrastructure you control. MIT licensed, built during the hackathon.

Live demo: https://famuse.a10n.workers.dev — sign in with a demo account and
ask @famuse anything.

## Public GitHub Repository（必須）
https://github.com/hisayan/famuse

## 3-Minute Demo Video（必須）
https://youtu.be/3SXRY-c3ze8

## Describe your use of Meta products（必須）

@famuse is powered by Muse Spark (muse-spark-1.3) through the Meta Model API's
OpenAI-compatible chat/completions endpoint, called directly from Cloudflare
Workers. We tuned it for family chat with reasoning_effort: low and a measured
token budget, and ship a deterministic local assistant as offline fallback.
The entire project — server, client, tests, CI — was built with the Muse Code
agentic coding agent.

## Why are Meta's models important to your solution?（必須）

famuse IS Muse as a family member: without a strong conversational model there
is no @famuse, just static templates (our offline fallback proves the gap —
the difference is night and day). Muse Spark follows household context across
rooms, answers open-ended family questions, and stays in character as the
family butler. The OpenAI-compatible API also made integration into Workers
trivial, which is why a solo builder could ship a live multi-user product in
the event window.

## Partner tech feedback（任意）
Did not use partner inference (Baseten/Modal/Fireworks) — called the Meta
Model API directly from Cloudflare Workers.

## How likely are you to build with Meta Model API?（必須）
推奨: Very likely

## Overall opinion of Meta Model API?（必須）
推奨: Very favorable（互換APIで1日で本番投入できた。推論トークンの注意点はobstacle欄で報告）

## Permission checkbox
推奨: チェックする（プロモ利用の許諾。受賞時の露出に必要）

## NPS: recommend Meta Model API（任意）
推奨: 5

## NPS: recommend Muse Code（任意）
推奨: 5（本プロジェクト全体をMuse Codeで構築した実績あり）

## Biggest obstacle（任意）
推奨: Something else —
"Muse Spark's hidden reasoning tokens consumed the max_tokens budget and
returned empty replies until we measured real usage (~170–270 reasoning tokens
per answer) and raised the budget. Better docs on reasoning-token budgeting
would have saved hours."
（自由記述不可なら代替: "Code or answers from the model that were wrong or
not useful"）

## Meta models vs other models（任意）
推奨: We haven't used other models for this kind of work

## What matters most when choosing a model/tool（任意）
推奨: Easy integration such as SDKs or an OpenAI-compatible API

## Hardest to switch（任意）
推奨: Nothing, switching is easy for us

## What would stop production use of Meta's models（任意）
推奨: Price or unpredictable costs（hidden reasoning tokens make per-request
costs harder to predict — 体験に基づく正直な回答）
※ 注意: 貼り付けHTMLでは "Model quality isn't good enough yet" が選択済みに
見える。品質は問題なかったので、上記への変更を推奨。
