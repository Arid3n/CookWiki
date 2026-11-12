# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users
One person, the owner, on their own Android phone. They look up per-100g calories and macros for foods and dishes, often in the middle of cooking or shopping, and want the answers they already got to be easy to find again instead of asking a generic AI chat every time.

## Product Purpose
CookWiki is a personal food library fed by a Gemini chat. Ask about a food, say "save it", and it is stored with per-100g nutrition (including variants such as brands or preparations). Success is a quick lookup: open the app, find a saved food or ask a new one, get the numbers, move on.

## Positioning
A private library of the user's own saved nutrition answers, with chat, nutrition-label scanning and a calculator built around the per-100g workflow, rather than a general-purpose food database or tracking app.

## Operating Context
Used one-handed on a phone, often briefly. Data is stored locally (SQLite) and synced to the owner's Supabase; the app works from the local copy offline. The owner supplies their own Gemini API key in Settings. Camera is used to scan nutrition labels. Typed values may use a decimal comma (`180,5`).

## Capabilities and Constraints
- Screens: library (search, tags, smart search), chat, food detail (variants, pinning, portion calculator), label scan, settings, login, calculator.
- Expo 54 / React Native 0.81, expo-router, Supabase auth and storage, Gemini via the user's own key.
- Fonts bundled in assets/fonts: Harmera (personal-use licence only), Rubik, Geist.
- Whether anyone other than the owner will ever use it is not planned; do not design for multi-user onboarding or sharing.

## Brand Commitments
Established topographic dark-brown look: burnt-orange contour-line header, peach accents, rounded dark surfaces (restyle spec: docs/superpowers/specs/2026-11-11-cookwiki-restyle-design.md). The owner has not asked to change it. Lowercase display titles are part of the current identity.

## Evidence on Hand
No testimonials, customers or metrics exist and none should be invented. The repository holds the design specs and device checklist under docs/superpowers/.

## Product Principles
- Speed of lookup beats feature breadth.
- Saved answers are the product; chat feeds the library, not the other way round.
- Work offline from the local copy; never claim something saved when it was not.
- Be honest about estimates and anything unverified.
- Personal tool: low friction over ceremony.

## Accessibility & Inclusion
No product-specific requirement stated. Existing practice: accessibility labels on controls and touch targets of about 48dp.
