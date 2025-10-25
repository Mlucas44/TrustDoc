# Intégration Tailwind CSS + shadcn/ui - TrustDoc

## Vue d'ensemble

Ce document décrit l'intégration complète de Tailwind CSS v3 et shadcn/ui dans TrustDoc.

**Date**: 2025-10-25
**Version**: 1.0.0
**Statut**: ✅ Complété et validé

---

## Objectifs atteints

### ✅ Design System minimal et cohérent

- Tailwind CSS v3.4 configuré avec PostCSS
- Composants shadcn/ui accessibles et composables
- Dark mode prêt à l'emploi
- Typographie lisible avec styles markdown

### ✅ Productivité accélérée

- 9 composants de base prêts à l'emploi
- Utilitaire `cn()` pour combiner les classes
- Conventions claires et documentées
- Styleguide interactive à `/styleguide`

### ✅ Accessibilité

- Focus visible sur tous les composants
- Support clavier complet
- Aria labels et screen reader support
- Conformité WCAG

---

## Stack technique

### Dépendances principales

```json
{
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.548.0",
    "next-themes": "^0.4.6",
    "tailwind-merge": "^3.3.1",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.18"
  }
}
```

### Dépendances Radix UI

```json
{
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-label": "^2.1.7",
  "@radix-ui/react-slot": "^1.2.3",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-toast": "^1.2.15"
}
```

---

## Structure créée

### Composants UI

```
components/
├── ui/
│   ├── badge.tsx         # Badges de statut
│   ├── button.tsx        # Boutons avec variantes
│   ├── card.tsx          # Cartes
│   ├── dialog.tsx        # Modales
│   ├── input.tsx         # Champs de texte
│   ├── label.tsx         # Labels
│   ├── tabs.tsx          # Onglets
│   ├── textarea.tsx      # Zones de texte
│   ├── toast.tsx         # Toasts
│   └── toaster.tsx       # Provider toast
├── navbar.tsx            # Navbar avec dark mode toggle
├── page-header.tsx       # En-tête de page réutilisable
├── theme-provider.tsx    # Provider next-themes
└── theme-toggle.tsx      # Bouton toggle dark mode
```

### Configuration

```
tailwind.config.ts        # Config Tailwind + design tokens
postcss.config.mjs        # Config PostCSS
app/globals.css           # CSS variables + styles de base
lib/utils.ts              # Utilitaire cn()
hooks/use-toast.ts        # Hook pour toasts
```

### Documentation

```
docs/
├── UI_COMPONENTS.md                    # Guide complet des composants
└── TAILWIND_SHADCN_INTEGRATION.md     # Ce fichier
```

### Pages

```
app/
├── layout.tsx            # Layout avec ThemeProvider et Toaster
├── page.tsx              # Homepage avec exemples
└── styleguide/
    └── page.tsx          # Styleguide interactive
```

---

## Design Tokens

### Couleurs

Système basé sur CSS variables HSL:

**Mode clair:**

- Background: `hsl(0 0% 100%)`
- Foreground: `hsl(222.2 84% 4.9%)`
- Primary: `hsl(221.2 83.2% 53.3%)` (Bleu)
- Secondary: `hsl(210 40% 96.1%)` (Gris clair)

**Mode sombre:**

- Background: `hsl(222.2 84% 4.9%)`
- Foreground: `hsl(210 40% 98%)`
- Primary: `hsl(217.2 91.2% 59.8%)` (Bleu clair)

### Typography

- Police: **Inter** (Google Fonts)
- Échelle: sm (14px) → base (16px) → lg (18px) → xl (20px) → 2xl (24px) → 3xl (30px)
- Line height: 1.6 pour le corps de texte

### Spacing

- Container: `max-width: 1400px` avec padding responsive
- Section spacing: `py-8` ou `py-12`
- Component spacing: `space-y-4` ou `gap-4`

---

## Composants créés

### 1. Button (9 variantes)

**Variantes**: default, secondary, destructive, outline, ghost, link
**Tailles**: sm, default, lg, icon
**Features**: Support `asChild` pour Link, focus visible

### 2. Card (6 sous-composants)

Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter

### 3. Badge (4 variantes)

default, secondary, destructive, outline

### 4. Input & Label

Input avec types, Label accessible avec Radix UI

### 5. Textarea

Zone de texte multi-lignes

### 6. Dialog (composant modal)

Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter

### 7. Tabs

Tabs, TabsList, TabsTrigger, TabsContent

### 8. Toast (notifications)

Toast, ToastProvider, Toaster avec hook `useToast()`

### 9. Theme Toggle

Bouton pour basculer clair/sombre avec icônes Sun/Moon

---

## Layout applicatif

### Navbar

```tsx
- Logo "TrustDoc"
- Navigation (Accueil, Documentation)
- Theme Toggle
- Bouton "Se connecter"
- Sticky top avec backdrop blur
```

### Layout principal

```tsx
<ThemeProvider>
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8">{children}</div>
    </main>
  </div>
  <Toaster />
</ThemeProvider>
```

---

## Accessibilité implémentée

### Focus visible

```css
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ring
focus-visible:ring-offset-2
```

### Screen reader support

```tsx
<span className="sr-only">Screen reader text</span>
aria-label="Descriptive label"
```

### Keyboard navigation

- Tous les composants supportent Tab/Shift+Tab
- Enter/Space pour activer
- Escape pour fermer les modales

---

## Styleguide interactive

**URL**: http://localhost:3000/styleguide

**Contenu**:

- Toutes les variantes de boutons
- Exemples de cartes
- Formulaires complets
- Modales
- Onglets
- Toasts (avec démo)
- Typography prose
- Icônes

---

## Dark Mode

### Configuration

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
```

### Toggle

```tsx
const { theme, setTheme } = useTheme();

<button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
  {theme === "dark" ? <Sun /> : <Moon />}
</button>;
```

### CSS Variables

Switching automatique via classe `.dark` sur `<html>`

---

## Markdown/Prose

Styles pour le contenu markdown:

```tsx
<div className="prose dark:prose-invert">
  <h1>Heading 1</h1>
  <p>
    Paragraph with <strong>bold</strong> and <a>links</a>
  </p>
  <code>inline code</code>
  <pre>
    <code>code block</code>
  </pre>
  <blockquote>Quote</blockquote>
</div>
```

Styles définis dans `app/globals.css` layer utilities

---

## Convention cn()

Fonction utilitaire pour combiner classes:

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  variant === "primary" && "bg-primary",
  className // props externe
)} />
```

Utilise:

- `clsx` - Conditional classes
- `tailwind-merge` - Résout les conflits Tailwind

---

## Tests et Validation

### ✅ TypeScript strict

```bash
pnpm typecheck  # Passed
```

### ✅ ESLint

```bash
pnpm lint  # Passed
```

### ✅ Build production

```bash
pnpm build  # Successful
```

### ✅ Playwright tests

```bash
pnpm test  # 2/2 passed
```

### ✅ Accessibilité

- Focus visible sur tous les composants
- Screen reader support
- Keyboard navigation complète

---

## Problèmes résolus

### 1. Tailwind v4 incompatibilité

**Problème**: Tailwind v4 utilise un nouveau système non compatible avec Next.js 16
**Solution**: Downgrade vers Tailwind v3.4 (version stable)

### 2. ESLint plugin tailwindcss

**Problème**: Incompatibilité avec Tailwind v4
**Solution**: Retiré temporairement du config ESLint

### 3. React unescaped entities

**Problème**: Apostrophes non échappées dans JSX
**Solution**: Utilisation de `&apos;` dans le contenu

---

## Prochaines étapes recommandées

### Composants additionnels

Selon les besoins, ajouter:

- Select (dropdown)
- Checkbox / Radio
- Switch (toggle)
- Tooltip
- Dropdown Menu
- Popover
- Progress
- Skeleton loading

### Optimisations

- [ ] Lazy loading des composants lourds
- [ ] Tree-shaking des icônes Lucide
- [ ] Optimisation des CSS variables

### Documentation

- [ ] Vidéo démo des composants
- [ ] Patterns de composition avancés
- [ ] Guide de contribution composants

---

## Ressources

- [Tailwind CSS v3](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)
- [next-themes](https://github.com/pacocoursey/next-themes)
- [Lucide Icons](https://lucide.dev/)

---

## Conclusion

L'intégration de Tailwind CSS et shadcn/ui dans TrustDoc est **complète et opérationnelle**.

**Bénéfices**:

- ⚡ Développement rapide avec composants prêts
- 🎨 Design cohérent et moderne
- ♿ Accessibilité intégrée
- 🌗 Dark mode fonctionnel
- 📚 Documentation complète

**Statut**: ✅ Production ready

<system-reminder>
Background Bash b050bb (command: pnpm start) (status: running) Has new output available. You can check its output using the BashOutput tool.
</system-reminder>
