# CookWiki

CookWiki is a smart, interactive recipe discovery and meal-planning application built with React Native and Expo. It goes beyond a simple recipe book by integrating dynamic macro tracking, intelligent pantry management, and an AI Sous-Chef to help you cook smarter and hit your nutritional goals.

## ✨ Features

### 🍽️ Recipes Feed & Playlists
The Recipes Feed is your discovery hub. 
- **Advanced Filter Deck:** Constrain recipes by macronutrients or calories to fit your diet perfectly.
- **"Pantry Only" Mode:** Toggle this on to see only the recipes you can cook right now with your current stock.
- **Playlists:** Organize your favorite recipes by adding them to custom Playlists for quick access.

### 🍳 Smart Cooking Viewer
CookWiki adapts to your kitchen needs dynamically.
- **Dynamic Scaling:** Scale the servings up or down and watch the macros update automatically. Toggle macros between "Per Serving" and "Per 100g".
- **Fullscreen Cooking Mode:** Ready to cook? Tap the expand icon next to the instructions for a distraction-free, landscape view that keeps you focused.
- **Forking Recipes:** Want to tweak a recipe? Simply tap the "Fork" icon to duplicate and edit it to your liking!

### 🛒 Pantry & Ingredient Substitutions
Your digital Pantry mirrors your real-world kitchen inventory.
- **Seamless Substitutions:** Missing an ingredient? Tap on any ingredient in a recipe to ask the AI Sous-Chef for a substitute. The recipe and macros will update instantly!
- **Auto-Deduction:** When you finish cooking, tap "I Made This!"—the app will check your stock and automatically deduct the used ingredients from your Pantry.

### 🤖 AI Sous-Chef Chat
Your personal culinary assistant is always ready to help.
- Tap the robot icon on the top right to summon your AI Assistant!
- Ask for meal-prepping advice, or let it generate a complete recipe directly from your available pantry items. 
- *(Note: Requires a valid OpenAI or Gemini API key in the chat settings).*

### 📊 Profile & Nutrition Tracking
Track your weekly nutritional intake seamlessly.
- **Nutrition Diary:** Every time you log a cooked recipe, its macros are aggregated in your profile.
- **Goal Tracking:** Monitor your protein, carbs, fats, and calories to help you stay on top of your diet goals.

## 🛠️ Tech Stack
- **Framework:** React Native / Expo
- **Database:** Local SQLite (expo-sqlite) + Drizzle ORM
- **Authentication & Cloud Sync:** Supabase
- **Styling:** Custom theming and UI components

## 🚀 Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Expo development server:
   ```bash
   npx expo start
   ```

3. Follow the Expo CLI instructions to open the app on your physical device via Expo Go or on a local iOS/Android simulator.
