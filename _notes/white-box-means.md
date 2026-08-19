---
layout: primer
title: "ARC White-Box Estimation Challenge 2026 - Phase 1"
lead: "The goal was last-layer ReLU means of a 256×32 random MLP, under a FLOP cap. I started with the closed form, then let each result decide the next experiment."
permalink: /primer/
date: 2026-08-19
updated: 2026-08-19
author: Uday Phalak
tags:
  - White-box estimation
  - Random MLPs
  - Cubature
scripts:
  - kit.js
  - whitebox.js
detector:
  gptzero: ""
  pangram: ""
glossary:
  - term: Estimand
    def: "E[ReLU(h_ℓ)] for every neuron, every layer, with X ~ N(0, I). Only the last layer is scored."
  - term: He init
    def: "Weights iid N(0, 2/n), no biases. Keeps post-ReLU variance from exploding or dying at this width."
  - term: Cov-prop
    def: "Track a mean and a covariance, push them through ReLU with a gain. Cheap. Biased at depth 32."
  - term: Multiplier floor
    def: "adjusted = raw MSE × max(0.1, C/B). The first 10% of the FLOP budget is free."
  - term: Homogeneity
    def: "ReLU(c z) = c ReLU(z) for c > 0. A Gaussian factors as radius times direction. The radius has a closed-form mean."
  - term: Kerdock / MUB
    def: "A union of mutually unbiased Hadamard bases. I compared signed Hadamards to real chirps at the same row count. They are not the same object."
  - term: Error dynamics
    def: "A one-layer formula can be accurate and still fail when you chain it. Exact pairwise ReLU seconds sat at 10⁻¹⁰ offline and moved chained last-layer MSE by 0.8%."
---

<div class="tldr">
<p>TLDR</p>
<ul>
  <li>Goal: last-layer <code>E[ReLU(h)]</code> for width-256, depth-32 He-init ReLU MLPs, <code>X ~ N(0,I)</code>, billed in FLOPs.</li>
  <li>Layer 1 is closed form: <code>σ/√(2π)</code>. Sampling it does not help the score.</li>
  <li>Exact pairwise ReLU second moments: <code>10⁻¹⁰</code> offline, +0.8% chained MSE, 5.6× FLOPs. The kit's gain map was not the bottleneck.</li>
  <li>Score is <code>MSE × max(0.1, C/B)</code>. Spend the free 10%. Extra FLOPs have to buy more MSE than they cost.</li>
  <li>What I would rerun: last-layer ×0.99187, 5,500 antithetic Gaussians, adaptive blend. Local adjusted <code>3.42×10⁻⁷</code> at C/B ≈ 0.098.</li>
  <li>Signed Hadamards at that N: 5× worse. Real Kerdock prefix at that N: a 4% tick inside local GT noise. Not a promotion.</li>
</ul>
</div>

## The goal

You get the weights of a random MLP. You have to report, for every neuron, the mean post-ReLU activation when the input is standard Gaussian. They score the last layer only, and they bill FLOPs.[^1]

Phase 1 is width 256, depth 32, He-Gaussian weights, no biases.[^7] Small enough to hold in RAM, and deep enough that a Gaussian story for layer 1 does not automatically extend to layer 32, which is the whole reason this is a contest and not a homework problem.[^4][^8]

I wanted a problem where using the structure of the net has a number attached. If a method is wrong, the score says so.

Phase 2's width, depth, and budget were still unset when I wrote this. A trick that only works at 256×32 is not a result I would bet on.

## Layer 1 is closed form

I start with the simplest claim that could be true.

Layer 1 pre-activations are Gaussian: `h = W x` with `x ~ N(0,I)` and iid Gaussian `W`, so for a zero-mean coordinate with width σ you get `E[ReLU(h)] = σ / √(2π)` and there is nothing left to estimate on that layer.[^2]

If I implement that and last-layer MSE barely moves, I was not losing the score on layer 1. Then I should stop touching layer 1.

Click Before / After / The mean on one neuron. I needed to see that the mean is a formula, not a sample, before I spent FLOPs on layer 1.

<figure>
  <div class="mode-row" id="relu-modes">
    <button class="mbtn active" type="button" data-mode="pre">Before ReLU</button>
    <button class="mbtn" type="button" data-mode="relu">After ReLU</button>
    <button class="mbtn" type="button" data-mode="mean">The mean</button>
  </div>
  <div class="canvas-wrap">
    <canvas id="cv-relu" width="680" height="260"></canvas>
  </div>
  <figcaption>Why this: the closed form is visible. Sampling this layer is wasted FLOPs.</figcaption>
</figure>

That is 256 neurons of free accuracy. I don't get extra credit for Monte Carlo on a formula.

## The kit as a baseline

The starter kit is covariance propagation: keep a mean vector and a covariance, push them through ReLU with a gain, which is the finite-width cousin of Cho and Saul's arcsine kernel and the thing the kit already ships, so it is the right dumb baseline.[^2][^9]

Two things could be true at once.

Hypothesis A: the chain is "Gaussian enough" at width 256, so better second-order matching will cut last-layer MSE.

Hypothesis B: after ReLU, `h_{ℓ+1} = W_{ℓ+1} ReLU(h_ℓ)` is a sum of truncated, correlated Gaussians — skewed, not Gaussian — and that mismatch grows with depth, so a two-moment state is the wrong object to carry for thirty-two layers.[^4][^8]

Layer 2 is already the second object. Width 256 makes A look tempting. Depth 32 is why B might win.

Click Layer 1, then The rest. I wanted a picture of where the Gaussian story stops, because that is the line between homework and the contest.

<figure>
  <div class="mode-row" id="stack-modes">
    <button class="mbtn active" type="button" data-mode="l1">Layer 1</button>
    <button class="mbtn" type="button" data-mode="rest">The rest</button>
  </div>
  <div class="canvas-wrap">
    <canvas id="cv-stack" width="680" height="220"></canvas>
  </div>
  <figcaption>Why this: eight boxes stand in for 32. Layer 1 is closed form. After that, the pre-activations are no longer Gaussian.</figcaption>
</figure>

I ran the kit. Local last-layer MSE `8.93×10⁻⁵`, adjusted `8.93×10⁻⁶` (the 0.1 floor). The grader came back `6.62×10⁻⁶` on the same config. Direction matches. I treat the local three-net split as a kill-switch, not a leaderboard.

That is the baseline. Next experiment has to beat it, or die.

## Better second moments did not help

I thought the leak was the gain map `cov_ij ≈ Φ(α_i)Φ(α_j) cov_ij`.

If A is right, replacing that with exact pairwise `E[ReLU_i ReLU_j]` should move chained last-layer MSE by more than the extra FLOPs cost, because otherwise I am paying for digits that the score never sees.[^3] I checked the pairs offline against the zero-mean arcsine formula and against Monte Carlo. Accuracy around `10⁻¹⁰`.

Chained, last-layer MSE went from `8.93×10⁻⁵` to `8.86×10⁻⁵`. Eight tenths of a percent. FLOPs went from `3.26×10⁹` to `1.84×10¹⁰` per MLP. 5.6×.

A died. That is a finding. The pairs were never the score.

Click Pairs, then Chained, then FLOPs, in that order. The pair test and the score are different numbers, and the third view is why I refused to keep paying for the first.

<figure>
  <div class="mode-row" id="chain-modes">
    <button class="mbtn active" type="button" data-mode="pair">Pairs</button>
    <button class="mbtn" type="button" data-mode="chain">Chained</button>
    <button class="mbtn" type="button" data-mode="flops">FLOPs</button>
  </div>
  <div class="canvas-wrap">
    <canvas id="cv-chain" width="680" height="200"></canvas>
  </div>
  <figcaption>Why this: pairwise accuracy is not chained last-layer MSE. The second view is scored. The third view is the bill.</figcaption>
</figure>

Why it failed, as far as I can tell: even if μ is perfect, `E[ReLU] = σ φ(α) + μ Φ(α)` with `α = μ/σ`, so a wrong σ still poisons the mean, and correlations you drop at layer 6 come back as variance error at layer 12.[^2] The state is missing skewness and kurtosis. Wu et al. write the companion paper for this problem in cumulants and Hermite expansions of ReLU, which is the natural next object if you want a better *closure*, and I did not implement a K-cumulant propagator for Phase 1 because I wanted a cheaper test first.[^10]

A correction trained on true incoming moments will also fail for the usual reason: at test time you are rolling out *your* chain, not the true one, so a one-step formula that looks perfect on oracle inputs is still allowed to rot when you feed it its own outputs.[^11]

I stopped looking for a prettier one-step map.

## Then I read the score

A better closure that ignores the meter is a result about a different problem.

The formula, as implemented:[^5]

> `adjusted = final_layer_mse × max(0.1, C/B)`
>
> `C = F + 10¹¹ × residual_wall_s`
>
> `B = 2.72×10¹¹` FLOPs per MLP in Phase 1.

The website still said 0.5 in places. The installed scorer says 0.1. I trusted the code.

The first 10% of the budget is free, and between 10% and 100% extra compute is a linear tax on MSE, so spending 2× FLOPs for a 1.5× MSE cut is a net loss even before you count the Python you forgot to bill. 0.1 s of unmetered Python is `10¹⁰` FLOPs, about 3.7% of B, even if you never wrote a matmul.

Hold the raw MSE fixed and click the four tax rates. Under the floor the adjusted bar does not move, which is why sitting at C/B ≈ 0.074 was leaving free accuracy on the table, and above it the bar grows linearly so extra FLOPs have to buy more MSE than they cost.

<figure>
  <div class="mode-row" id="tax-modes">
    <button class="mbtn" type="button" data-mode="0.05">C/B = 0.05</button>
    <button class="mbtn active" type="button" data-mode="0.10">0.10 floor</button>
    <button class="mbtn" type="button" data-mode="0.25">0.25</button>
    <button class="mbtn" type="button" data-mode="1.00">full budget</button>
  </div>
  <div class="canvas-wrap">
    <canvas id="cv-tax" width="680" height="240"></canvas>
  </div>
  <figcaption>Why this: same raw MSE, four tax rates. Under the floor you get 0.1. Above it, extra FLOPs have to buy more than they cost.</figcaption>
</figure>

Plain Monte Carlo at the floor is about 6,500 full forwards. MSE around `2.5×10⁻⁵`. Full budget, still unbiased: maybe `2.5×10⁻⁶`. Everything I shipped that beat that was biased on purpose.

The next experiments had to sit at C/B ≈ 0.1, or prove the raw MSE fell faster than the multiplier rose.

## A last-layer scale, then a blend

Cov-prop overestimates the final mean. I tried a per-layer scale in the chain. Last-layer MSE went to `3×10⁻²`. Dead. That matches the compounding-error picture: you cannot correct a trajectory using a multiplier fit on the true states.[^11]

I tried the same idea on the readout only. Offline, across 13 seeds, ×0.99187 on the last layer cut MSE by about 3.5×, which is an ugly constant I would rather derive than fit, and I still don't have a derivation. Local adjusted went to `2.18×10⁻⁶`. It survived the in-chain kill-test. I kept it.

The sampler was still sitting at C/B ≈ 0.074. Free floor I wasn't using. I added antithetic Gaussian Monte Carlo and blended it with the analytic, first at a frozen λ=0.45.[^12] Local adjusted `7.83×10⁻⁷`. Then I let `λ_i = b² / (b² + Var[MC_i])` with `b² = 4×10⁻⁵`, and raised N from 4,000 to 5,500 so I actually spent the 10%, because sitting at C/B ≈ 0.074 was leaving free accuracy on the table.[^13] Local adjusted `3.42×10⁻⁷` at C/B ≈ 0.098.

Adaptive beat a frozen 0.65. The blend also stops a bad sampler from replacing a decent analytic. That is the champion I would rerun tomorrow: exact layer 1, last-layer ×0.99187, 5,500 antithetic Gaussians, adaptive blend.

In-chain scaling and a last-layer constant look like the same multiplier. They are not. Click them in order, then the two blends. Log scale, because `3×10⁻²` would eat the plot.

<figure>
  <div class="mode-row" id="blend-modes">
    <button class="mbtn" type="button" data-mode="inchain">In-chain</button>
    <button class="mbtn" type="button" data-mode="readout">Readout</button>
    <button class="mbtn" type="button" data-mode="frozen">Frozen λ</button>
    <button class="mbtn active" type="button" data-mode="adaptive">Adaptive</button>
  </div>
  <div class="canvas-wrap">
    <canvas id="cv-blend" width="680" height="280"></canvas>
  </div>
  <figcaption>Why this: a scale inside the chain and a scale on the readout are different objects. The two blends are what used the free 10%.</figcaption>
</figure>

<div class="aside"><strong>NOTE.</strong> Local <code>whest run --seed 42 --n-mlps 3</code> uses GT at N = 2.56×10⁶. Fine for catching a 5× collapse. Not fine for calling a 4% improvement. Below about 10⁻⁵ raw I don't trust that split.</div>

## Is the sphere doing the work?

ReLU is homogeneous: `ReLU(c z) = c ReLU(z)` for `c > 0`. A standard Gaussian is a radius times a direction, and `E[χ_256] ≈ 15.984` is a ratio of gammas, so the radial integral is free and whatever is left of the estimator is an integral on the sphere.[^14]

If cubature is doing the work, a spherical design at the same row count as my Gaussian sampler should beat it. If it doesn't, I have not tested cubature. I have tested a small set of directions.

It does **not** make a 5-design exact for a depth-32 ReLU net. The integrand is piecewise linear and the cells depend on the particular weights.

Click Radius, then Angles, then Both. If the radius is free, the remaining work is the directions, and that is the only reason a spherical design was even a candidate.

<figure>
  <div class="mode-row" id="sphere-modes">
    <button class="mbtn" type="button" data-mode="radius">Radius</button>
    <button class="mbtn" type="button" data-mode="angles">Angles</button>
    <button class="mbtn active" type="button" data-mode="both">Both</button>
  </div>
  <div class="canvas-wrap">
    <canvas id="cv-sphere" width="680" height="280"></canvas>
  </div>
  <figcaption>Why this: X = R · U. The radius has a formula. The directions are the remaining integral.</figcaption>
</figure>

First test: Sylvester Hadamard, identity, a few column-sign flips, scaled to `E[χ_256]`, antipodes, N ≈ 5,500 so the comparison was fair.[^15] Adjusted MSE went from `3.42×10⁻⁷` to `1.64×10⁻⁶`. Five times worse. The scaling was fine. Those directions are not a mutually unbiased basis.

Second test, same N, same blend: real Kerdock chirps (Carlet's quadratic on GF(2⁷)×GF(2)), nested prefix of 10 bases plus the coordinate basis plus antipodes, 5,632 points, first layer an unnormalized FWHT, local `3.27×10⁻⁷` against `3.42×10⁻⁷`.[^6][^16] A 4% tick, inside the noise of local GT at `N = 2.56×10⁶`. I am not promoting it. A fake bank and a real prefix are not the same object, and a tie at this N is not a finding that cubature wins.

Click the three carriers. Same row count is the only fair test I could afford, because a prettier set of directions at a different N is a different bill.

<figure>
  <div class="mode-row" id="carrier-modes">
    <button class="mbtn active" type="button" data-mode="gauss">Gaussian</button>
    <button class="mbtn" type="button" data-mode="costume">Signed Hadamard</button>
    <button class="mbtn" type="button" data-mode="chirp">Real chirps</button>
  </div>
  <div class="canvas-wrap">
    <canvas id="cv-carrier" width="680" height="260"></canvas>
  </div>
  <figcaption>Why this: same N, three carriers, seed 42, three nets. Signed Hadamards lose. The real prefix ties the Gaussian.</figcaption>
</figure>

I did not drop bases at random to save FLOPs. A prefix of 11 was never going to reproduce a 66,048-point design. The FWHT saves work on layer 1 and almost nothing on the bill, because 31 of 32 layers are still `X @ W`, and at 5,632 rows I sat at C/B ≈ 0.098, same as Gaussian. You cannot 12× the sample count at the floor without deleting work.

The next honest test is the full design, billed, at the 0.1 floor — or it isn't a test of cubature.

## What I actually ran

Each row is the experiment that the previous result forced. The ones that died are findings too.

Scientific notation hides a 26× drop from the kit to v4.2 and a 5× collapse on signed Hadamards, so click a step: the bars are log-scale local adjusted MSE, and the table under it is the reason I moved.

<figure>
  <div class="mode-row" id="path-modes">
    <button class="mbtn" type="button" data-mode="1">Kit</button>
    <button class="mbtn" type="button" data-mode="2">Pairs</button>
    <button class="mbtn" type="button" data-mode="3">Scale</button>
    <button class="mbtn" type="button" data-mode="4">Frozen</button>
    <button class="mbtn active" type="button" data-mode="4.2">Adapt</button>
    <button class="mbtn" type="button" data-mode="6">Hadamard</button>
    <button class="mbtn" type="button" data-mode="7">Chirps</button>
  </div>
  <div class="canvas-wrap">
    <canvas id="cv-path" width="680" height="280"></canvas>
  </div>
  <figcaption>Why this: the table is the reasons. The bars are the size of the jumps, including the ones that went the wrong way.</figcaption>
</figure>

| Step | What I tried | Local adjusted | Why I moved |
|---|---|---|---|
| 1 | Cov-prop (kit) | `8.93×10⁻⁶` | Baseline. Grader `6.62×10⁻⁶`. |
| 2 | Exact bivariate ReLU seconds | `8.86×10⁻⁶` | Pairs were not the chain. Stop closing better at order 2. |
| 3 | Last-layer ×0.99187 | `2.18×10⁻⁶` | In-chain scale exploded (`3×10⁻²`). Readout-only survived. |
| 4 | Antithetic MC + frozen blend | `7.83×10⁻⁷` | Sampler has to sit on the analytic. |
| 4.2 | N=5,500, adaptive λ | `3.42×10⁻⁷` | Spend the free floor. Let λ follow the variance. |
| 6 | Signed Hadamards, same N | `1.64×10⁻⁶` | Those directions are worse than Gaussian. |
| 7 | Real chirp prefix, same N | `3.27×10⁻⁷` | Tie. Not a jump. Don't promote. |

Local `whest run --seed 42 --n-mlps 3`.

I have not shown that 66k directions × 32 layers fit in 10% of B, and I doubt it does without dropping dead neurons and folding always-on last layers into linear maps, which is a next experiment I have not run.

What would kill v4.2: a fresh-seed worst-decile 2× worse than local, or a carrier at the same C/B that beats it by more than GT noise. If I can't name that, I don't have a next idea yet.

The work that moved the score was the work that matched an error I could point at — layer 1, the meter, the readout bias — and then refused to keep paying FLOPs to the other ones, including the ones that looked more like research.

[^1]: [ARC White-Box Estimation Challenge 2026](https://www.aicrowd.com/challenges/arc-white-box-estimation-challenge-2026). The framing is white-box estimation under a sampling budget; see also ARC, [Competing with sampling](https://www.alignment.org/blog/competing-with-sampling/).

[^2]: Cho & Saul, "Kernel Methods for Deep Learning," NeurIPS 2009. For a coordinate of `N(0, σ²)`, `E[ReLU] = σ/√(2π)`. The arcsine kernel is the exact ReLU covariance map under Gaussian input.

[^3]: "Exact Gaussian Moment Matching for Residual Networks: a Second-Order Method," [arXiv:2601.22307](https://arxiv.org/abs/2601.22307). This is the hypothesis I tested for pairwise ReLU seconds. The paper is written for residual nets; I still used the cross-moments as a number I could check.

[^4]: "Random Fully Connected Neural Networks as Perturbatively Solvable Hierarchies," JMLR 25 (23-0643). Joint cumulants of wide random nets form a 1/n hierarchy with depth recursions. Two-moment matching is a truncation of that hierarchy.

[^5]: Installed `whestbench/scoring.py` in the starter kit: `adjusted = final_layer_mse × max(0.1, C/B)`, `C = F + 1e11 × residual_wall_s`, `B = 2.72e11` FLOPs per MLP in Phase 1. The public website text still said 0.5 in places. I used the code.

[^6]: Carlet, *Boolean Functions for Cryptography and Coding Theory* (Cambridge, 2021), on quadratic Boolean functions / Kerdock-type constructions. The 128-coset chirps I ran are that family on GF(2⁷)×GF(2), not a signed-Hadamard substitute.

[^7]: He, Zhang, Ren, Sun, "Delving Deep into Rectifiers," ICCV 2015. He init: `W_ij ~ N(0, 2/n_in)` for ReLU, so post-activation variance stays order-1. Phase 1 uses this, with no biases.

[^8]: Poole, Lahiri, Raghu, Sohl-Dickstein, Ganguli, "Exponential expressivity in deep neural networks through transient chaos," NeurIPS 2016; Schoenholz, Gilmer, Ganguli, Sohl-Dickstein, "Deep Information Propagation," ICLR 2017. Depth makes correlations and higher moments fragile. Width 256 does not cancel that at depth 32.

[^9]: Gast & Roth, "Lightweight Probabilistic Deep Networks," CVPR 2018. Practical mean/variance chaining through ReLU. The kit is this family, not a new algorithm.

[^10]: Wu et al., "Estimating the expected output of wide random MLPs more efficiently than sampling," [arXiv:2605.05179](https://arxiv.org/abs/2605.05179). Companion paper for this estimand: cumulant propagation and Hermite expansions of ReLU.

[^11]: Ross, Gordon, Bagnell, "A Reduction of Imitation Learning and Structured Prediction to No-Regret Online Learning," AISTATS 2011 (DAgger). Training a corrector on the expert's state distribution does not control error when you roll out the learner. That is why in-chain per-layer scaling died and why a readout-only scale is a different object.

[^12]: Hammersley & Handscomb, *Monte Carlo Methods* (1964), on antithetic variates. Pairing `x` with `-x` is the cheapest symmetry the Gaussian has; ReLU is not even, so this is variance reduction, not a free lunch.

[^13]: Inverse-variance weighting is the MSE-optimal mix of two *unbiased* independent estimators. The analytic here is biased, so `λ_i = b² / (b² + Var[MC_i])` is a heuristic with `b²` fit as an analytic-error scale, not a theorem. It still beat a frozen 0.65 on the runs I have.

[^14]: For `R = ‖X‖` with `X ~ N(0,I_n)`, `R ~ χ_n` and `E[R] = √2 Γ((n+1)/2) / Γ(n/2)`. At n=256 that is about 15.984. Combined with ReLU homogeneity, `E[net(X)] = E[R] E[net(U)]` for the positive-homogeneous map through the net.

[^15]: Sylvester's construction of Hadamard matrices (1867): Kronecker iteration from `[[1,1],[1,-1]]`. Column sign flips of that matrix are not a Kerdock set of mutually unbiased bases.

[^16]: The fast Walsh–Hadamard transform is `O(n log n)` for `H diag(c) x` when `H` is the Sylvester/Walsh matrix. It only hits layer 1 of this net. See Fino & Algazi, "Unified Matrix Treatment of the Fast Walsh–Hadamard Transform," IEEE Trans. Computers 1976.
