---
name: canvas-design
description: "캔버스 기반 비주얼 레이아웃 설계, 타이포그래피 계층 구조, 8px 그리드, HSL 색상 시스템 및 고품질 시각 에셋 제작 지침을 제공하는 디자이너 전담 스킬입니다."
---

# 🎨 Canvas Design & Visual Layout Guidelines

본 스킬은 **민희(Lead Designer)**를 위한 전문 비주얼 설계 지침입니다. 모든 디자인 산출물은 '단순한 와이어프레임'을 넘어 프로덕션급의 시각적 완성도(High Design Quality)를 만족해야 합니다.

## 1. Z-Axis 공간감 및 Depth 원칙
- **Layering**: 평면적인 구성을 지양하고, Base Background (`#0B0F17`), Surface (`#0F172A`), Floating Card (`rgba(30, 41, 59, 0.7)`), Focus Elements 간의 명확한 Z-Axis 깊이감을 구성합니다.
- **Glassmorphism**: `backdrop-filter: blur(12px)`와 `border: 1px solid rgba(255, 255, 255, 0.08)`를 조합하여 은은하고 고급스러운 질감을 연출합니다.
- **Subtle Glow**: 주요 액션 요소 주변에 브랜드 컬러 기반의 부드러운 Glow(`box-shadow: 0 0 20px rgba(99, 102, 241, 0.25)`)를 배치합니다.

## 2. HSL 기반 색상 엔지니어링 (Color Harmony)
- 브라우저 기본 원색(Pure Red, Pure Blue 등) 사용을 엄격히 금지합니다.
- **Dark Theme Tokens**:
  - Primary Background: `hsl(222, 47%, 7%)`
  - Card Surface: `hsl(217, 33%, 17%)`
  - Accent Indigo: `hsl(239, 84%, 67%)`
  - Accent Cyan: `hsl(188, 94%, 43%)`
  - Emerald Green (Success): `hsl(160, 84%, 39%)`
  - Amber (Warning): `hsl(38, 92%, 50%)`
  - Rose (Error): `hsl(348, 89%, 60%)`

## 3. 8px 그리드 시스템 및 타이포그래피 계층
- 모든 여백(`padding`, `margin`, `gap`)과 크기는 **8의 배수(4px, 8px, 16px, 24px, 32px, 48px)**로 정렬합니다.
- **Font Hierarchy**:
  - Display / Title: `Outfit`, `Inter` (700 Bold, tracking -0.02em)
  - Body Text: `Inter`, `Roboto` (400 Regular / 500 Medium, line-height 1.6)
  - Code / Numbers: `JetBrains Mono` (Tabular figures)
