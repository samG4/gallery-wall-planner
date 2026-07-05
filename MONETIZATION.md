# Monetization — realistic picture (research-backed, July 2026)

Status: **NOT implemented.** This is a decision doc. Hosting is prepped (see DEPLOY.md);
no ad or affiliate code exists yet.

## TL;DR
Both AdSense and affiliate earn **little until you have traffic**. For a single-page tool,
the bottleneck is not ad code — it's (a) getting *found* (SEO/content) and (b) AdSense will
likely **reject a bare tool** as "low value content" until you add articles + policy pages.
The same content you'd write to pass AdSense is also what pulls affiliate traffic. So the
first real investment is **content + SEO**, not monetization plumbing.

## Key fact that hurts tools specifically
AdSense RPM is quoted **per 1000 page views**. A blog reader opens many pages; a tool user
opens ~1 page and stays in it. So a tool with 10k visits ≈ 10k page views, whereas a blog
with 10k visits might have 25k+. Tools structurally earn less per visitor from display ads.
Tool audiences (DIY/tech-savvy) also run ad-blockers more, shaving another 20–40%.

## AdSense — the numbers
Average **Page RPM 2025**: general/informational sites ~$2–8; US traffic averages higher
(~$12 all-niche), India/emerging markets lower in practice for non-finance niches; home-decor
is mid-to-low. Finance/insurance is the only >$20 tier — not us.

Rough monthly display-ad revenue for THIS tool (1 page view/visit, blended low RPM, minus
ad-block shrink):

| Monthly visits | ~RPM $2 | ~RPM $5 |
|---|---|---|
| 10,000  | ~$15–20  | ~$40–50   |
| 50,000  | ~$75–100 | ~$200–250 |
| 100,000 | ~$150–200| ~$400–500 |

**Approval gate (this is the real blocker):** common rejection reason is "low value content."
Requirements: original helpful content (10–15 articles, ~800–1200+ words each), plus
**About, Privacy Policy, and Contact** pages. A tool with no articles usually gets rejected.
No hard minimum traffic, but no content = no approval.

## Affiliate — the numbers
- **Amazon Associates** home/furniture/decor commission is now **3%** (cut from 8% in 2020).
  Frames are cheap ($10–40), so 3% ≈ $0.30–$1.20 per item. Low unless order values are high.
- **Average affiliate conversion rate** ~1–2% of visitors; highly relevant/high-intent audiences
  reach 5–10%. This tool IS high-intent (people actively planning a frame purchase), so it can
  land at the better end — its main advantage over ads.
- Retail/e-commerce programs generally pay **3–10%**; print services and decor brands (non-Amazon)
  often pay more than Amazon's 3% and have higher order values — worth preferring over Amazon.

Rough monthly affiliate revenue (high-intent: assume 3% of visitors click out, ~5% of those buy,
blended $2 net commission/sale — conservative for cheap frames):

| Monthly visits | est. sales | est. revenue |
|---|---|---|
| 10,000  | ~15  | ~$30    |
| 50,000  | ~75  | ~$150   |
| 100,000 | ~150 | ~$300   |

Revenue jumps a lot if you steer users to higher-value baskets (multi-frame gallery sets,
print services with 8–15% programs) instead of single cheap Amazon frames.

## Honest comparison for THIS app
- Neither pays meaningfully below ~50k visits/month.
- Affiliate fits the product better (contextual, high purchase intent, no cookie-consent banner
  needed — just an FTC/Amazon disclosure line).
- AdSense adds compliance overhead (privacy policy + cookie consent) and an approval gate.
- Both live or die on **traffic**, which for a niche tool comes from **SEO content** — the same
  content that unlocks AdSense approval. So content is the shared prerequisite.

## Recommended sequence (when you decide to monetize)
1. Ship the tool on a custom domain (done-ready).
2. Write 8–15 gallery-wall guide articles (SEO): "gallery wall layout ideas", "standard frame
   sizes", "how high to hang art", etc. This drives traffic AND satisfies AdSense.
3. Add About / Privacy / Contact pages.
4. Add affiliate links (frames, print services) with a visible disclosure — start earning first.
5. Once content + traffic exist, apply to AdSense; place ad slots off the canvas.
6. Measure real RPM/conversion for a month, then decide where to lean.

## Sources
- AdSense RPM by country/niche 2025: https://www.techconda.com/2026/02/adsense-rpm-benchmarks.html , https://www.superwebtricks.com/adsense-earnings-per-views/
- AdSense approval requirements 2025: https://support.google.com/adsense/answer/9724 , https://www.adpushup.com/blog/google-adsense-approval/
- Amazon Associates commission rates (home/furniture 3%): https://helpingmerchants.com/amazon-affiliate-commission-rates-by-category/ , https://azonpress.com/amazon-affiliate-commission-rates/
- Affiliate conversion benchmarks 2025: https://totalproductmarketing.com/marketing-insights/conversion-rate-affiliate-marketing-all-industries/ , https://www.partnero.com/articles/21-essential-affiliate-marketing-benchmarks--kpis-for-success-in-2025
