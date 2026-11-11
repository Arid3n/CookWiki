@[/bmad-review-edge-case-hunter]

Please perform an Edge Case Hunter adversarial review on the following code diff. You may read the project repository to find unhandled states.

<diff>
diff --git a/App.tsx b/App.tsx
deleted file mode 100644
index 0329d0c..0000000
--- a/App.tsx
+++ /dev/null
@@ -1,20 +0,0 @@
-import { StatusBar } from 'expo-status-bar';
-import { StyleSheet, Text, View } from 'react-native';
-
-export default function App() {
-  return (
-    <View style={styles.container}>
-      <Text>Open up App.tsx to start working on your app!</Text>
-      <StatusBar style="auto" />
-    </View>
-  );
-}
-
-const styles = StyleSheet.create({
-  container: {
-    flex: 1,
-    backgroundColor: '#fff',
-    alignItems: 'center',
-    justifyContent: 'center',
-  },
-});
diff --git a/app.json b/app.json
index 88d978c..edc21a6 100644
--- a/app.json
+++ b/app.json
@@ -25,6 +25,10 @@
     },
     "web": {
       "favicon": "./assets/favicon.png"
-    }
+    },
+    "plugins": [
+      "expo-router",
+      "expo-sqlite"
+    ]
   }
 }
diff --git a/app/_layout.tsx b/app/_layout.tsx
new file mode 100644
index 0000000..2608639
--- /dev/null
+++ b/app/_layout.tsx
@@ -0,0 +1,9 @@
+import { Stack } from "expo-router";
+
+export default function RootLayout() {
+  return (
+    <Stack>
+      <Stack.Screen name="index" options={{ headerShown: false }} />
+    </Stack>
+  );
+}
diff --git a/app/index.tsx b/app/index.tsx
new file mode 100644
index 0000000..0bb316f
--- /dev/null
+++ b/app/index.tsx
@@ -0,0 +1,9 @@
+import { Text, View } from "react-native";
+
+export default function Index() {
+  return (
+    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
+      <Text>CookWiki App Init</Text>
+    </View>
+  );
+}
diff --git a/babel.config.js b/babel.config.js
new file mode 100644
index 0000000..011ffdf
--- /dev/null
+++ b/babel.config.js
@@ -0,0 +1,11 @@
+module.exports = function(api) {
+  api.cache(true);
+  return {
+    presets: ['babel-preset-expo'],
+    plugins: [
+      ['babel-plugin-inline-import', {
+        extensions: ['.sql']
+      }]
+    ]
+  };
+};
diff --git a/db/index.ts b/db/index.ts
new file mode 100644
index 0000000..4894190
--- /dev/null
+++ b/db/index.ts
@@ -0,0 +1,11 @@
+import { drizzle } from "drizzle-orm/expo-sqlite";
+import { openDatabaseSync } from "expo-sqlite";
+import * as schema from "./schema";
+
+const DATABASE_NAME = "cookwiki.db";
+
+// Singleton SQLite db connection
+export const expoDb = openDatabaseSync(DATABASE_NAME);
+
+// Drizzle ORM instance
+export const db = drizzle(expoDb, { schema });
diff --git a/db/schema.ts b/db/schema.ts
new file mode 100644
index 0000000..5298a96
--- /dev/null
+++ b/db/schema.ts
@@ -0,0 +1,25 @@
+import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
+
+export const ingredients = sqliteTable('ingredients', {
+  id: text('id').primaryKey(),
+  name: text('name').notNull(),
+  protein: real('protein').default(0).notNull(),
+  carbs: real('carbs').default(0).notNull(),
+  fat: real('fat').default(0).notNull(),
+  calories: real('calories').default(0).notNull(),
+  isGlobal: integer('isGlobal', { mode: 'boolean' }).default(false).notNull(),
+  isDeleted: integer('isDeleted', { mode: 'boolean' }).default(false).notNull(),
+  createdAt: integer('createdAt').notNull(),
+  updatedAt: integer('updatedAt').notNull(),
+});
+
+export const recipes = sqliteTable('recipes', {
+  id: text('id').primaryKey(),
+  title: text('title').notNull(),
+  description: text('description'),
+  instructions: text('instructions'),
+  isGlobal: integer('isGlobal', { mode: 'boolean' }).default(false).notNull(),
+  isDeleted: integer('isDeleted', { mode: 'boolean' }).default(false).notNull(),
+  createdAt: integer('createdAt').notNull(),
+  updatedAt: integer('updatedAt').notNull(),
+});
diff --git a/index.ts b/index.ts
deleted file mode 100644
index 1d6e981..0000000
--- a/index.ts
+++ /dev/null
@@ -1,8 +0,0 @@
-import { registerRootComponent } from 'expo';
-
-import App from './App';
-
-// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
-// It also ensures that whether you load the app in Expo Go or in a native build,
-// the environment is set up appropriately
-registerRootComponent(App);
diff --git a/package.json b/package.json
index b48e41e..85f607c 100644
--- a/package.json
+++ b/package.json
@@ -1,7 +1,7 @@
 {
   "name": "cw_temp",
   "version": "1.0.0",
-  "main": "index.ts",
+  "main": "expo-router/entry",
   "scripts": {
     "start": "expo start",
     "android": "expo start --android",
@@ -9,13 +9,22 @@
     "web": "expo start --web"
   },
   "dependencies": {
+    "drizzle-orm": "^0.45.2",
     "expo": "~54.0.33",
+    "expo-constants": "~18.0.13",
+    "expo-linking": "~8.0.11",
+    "expo-router": "~6.0.23",
+    "expo-sqlite": "~16.0.10",
     "expo-status-bar": "~3.0.9",
     "react": "19.1.0",
-    "react-native": "0.81.5"
+    "react-native": "0.81.5",
+    "react-native-safe-area-context": "~5.6.0",
+    "react-native-screens": "~4.16.0"
   },
   "devDependencies": {
     "@types/react": "~19.1.0",
+    "babel-plugin-inline-import": "^3.0.0",
+    "drizzle-kit": "^0.31.10",
     "typescript": "~5.9.2"
   },
   "private": true
diff --git a/tsconfig.json b/tsconfig.json
index b9567f6..84d97cb 100644
--- a/tsconfig.json
+++ b/tsconfig.json
@@ -1,6 +1,10 @@
 {
   "extends": "expo/tsconfig.base",
   "compilerOptions": {
-    "strict": true
+    "strict": true,
+    "baseUrl": ".",
+    "paths": {
+      "@/*": ["./*"]
+    }
   }
 }
</diff>
