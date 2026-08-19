---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality for the 2026 era. Use this skill when building web components, pages, spatial artifacts, or intelligent applications. Generates creative, polished code that leverages Spatial UI (depth, texture, tactile feedback) and Agentic UX (proactive, goal-oriented interfaces) to avoid generic "AI slop" aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides the creation of next-generation, production-grade frontend interfaces that define the 2026 digital landscape. Implement real working code with exceptional attention to spatial depth, tactile realism, and intelligent agency.

## Design Thinking 2026

Before coding, commit to a BOLD, context-aware direction:
- **Spatiality & Depth**: Go beyond the "flat" screen. How do elements exist in Z-space? Use depth layering, dynamic parallax, and liquid glass (Glassmorphism v2).
- **Agentic UX**: Modern interfaces aren't just tools; they are proactive agents. Design for "conversation-first" or "intent-aware" flows where the UI anticipates the next step or handles goals directly.
- **Tone**: Pick an extreme: Spatial Minimal (Airy, depth-focused), Neo-Brutalist (Raw, tactile), Organic Tech (Fluid, biomimetic), or Luxury Refined (Precision, high-gloss).
- **Differentiation**: Identify the "Hero Interaction"—the one unique spatial or intelligent moment that makes the experience unforgettable.

## Frontend Aesthetics Guidelines (2026 Edition)

### 1. Spatial Composition (Z-Axis First)
- **Layering**: Elements should feel like they are stacked in physical space. Use `backdrop-filter: blur()`, `z-index` layering with varying shadow depths, and translucent materials.
- **Tactile Texture**: Avoid flat colors. Use noise overlays, mesh gradients, and subtle grain to give surfaces a physical "feel".
- **Dynamic Parallax**: Implement scroll-driven or mouse-reactive spatial movements that reveal hidden layers of content (e.g., using `Perspective` and `TranslateZ`).

### 2. Agentic & Personalizable UX
- **Proactive UI**: Components should have "states of intelligence". Use loaders that feel like the AI is "thinking" and adaptive layouts that change based on user session behavior.
- **Adaptive Personalization**: Use CSS variables and logic to adjust tone, density, and color themes mid-session based on intent data.
- **Goal-Oriented Flow**: Design UIs that allow users to declare a goal rather than manually navigating through a static menu.

### 3. Motion & Interaction
- **Micro-animations**: Every click/hover must provide localized tactile feedback. Use `cubic-bezier` transitions that feel "heavy" or "bouncy" depending on the material.
- **Scroll-Triggered Spatiality**: Content shouldn't just "appear"; it should "arrive" from the background or glide through space.
- **Hover States that Surprise**: Interaction should feel like touching a physical object (subtle glow, slight rotation, or scale shift).

### 4. Typography & Color
- **Characterful Choices**: Avoid "safe" fonts like Inter or Roboto. Opt for characterful display fonts (e.g., high-contrast serifs, custom geometric sans) paired with ultra-refined, high-legibility body type.
- **High-Impact Palettes**: Use dominant, curated colors with razor-sharp accents. Prefer HSL-tailored schemes over flat RGB.

### 5. Performance (Edge-First)
- **Zero-Wait UX**: Prioritize Edge-side rendering and optimistic UI updates.
- **Optimized Assets**: Use modern formats (WebP, AVIF, Lottie) and ensure all spatial effects are hardware-accelerated (`will-change`, `transform`).

## NEVER List (2026 Cliches to Avoid)
- **"AI Slop" Aesthetics**: Generic purple/blue gradients with white text, cookie-cutter "modern" dashboards, and uninspired grid layouts.
- **System Fonts**: Never default to system fonts (Arial, San Francisco) unless building a strictly utilitarian tool.
- **Static Grids**: Avoid rigid, non-reactive layouts that feel like they belong in the early 2020s.
- **Zero-Depth UI**: Flat designs that lack shadows, layering, or tactile feedback.

Interpret requirements creatively. Every interface should feel like a custom-designed environment, not a generated template. Vary between spatial themes and ensure every project has a clear, memorable character.

## ⚡ Harness Engineering Protocols
1. **Circuit Breaker (MAX 3)**: 동일 렌더링/스타일 에러 3회 연속 실패 시 즉시 중단하고 인간에게 보고한다. 무한 재시도 금지.
2. **Context Firewall**: 디자인 리서치/에셋 분석 시 결론+핵심 스니펫(max 20줄)만 메인 컨텍스트에 전달.
3. **Hard Boundaries**: 기존 디자인 시스템(CSS 변수, 폰트 설정 등)은 명시적 승인 없이 수정 금지.
4. **Verification Gate**: UI 컴포넌트 수정 후 반드시 브라우저 렌더링 확인. 깨진 레이아웃은 즉시 수정 → Circuit Breaker.
5. **Progressive Disclosure**: 전체 컴포넌트 일괄 로드 금지. 수정 대상만 `view_file`로 정밀 확인.
