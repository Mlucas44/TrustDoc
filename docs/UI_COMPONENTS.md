# Guide des Composants UI - TrustDoc

Ce guide explique comment utiliser les composants shadcn/ui et Tailwind CSS dans TrustDoc.

## Table des matières

- [Introduction](#introduction)
- [Design System](#design-system)
- [Composants disponibles](#composants-disponibles)
- [Thème et Dark Mode](#thème-et-dark-mode)
- [Ajouter un nouveau composant](#ajouter-un-nouveau-composant)
- [Conventions](#conventions)

---

## Introduction

TrustDoc utilise:
- **Tailwind CSS v3** - Framework CSS utilitaire
- **shadcn/ui** - Collection de composants React accessibles et personnalisables
- **next-themes** - Gestion du dark mode
- **Lucide React** - Bibliothèque d'icônes

### Philosophie

- **Composants personnalisables**: Tous les composants sont copiés dans le projet (pas de dépendance NPM)
- **Accessibilité**: Composants conformes aux standards WCAG
- **Cohérence**: Design tokens CSS variables pour un thème unifié

---

## Design System

### Couleurs

Les couleurs utilisent des CSS variables HSL définies dans `app/globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  /* ... */
}
```

**Utilisation:**
```tsx
<div className="bg-background text-foreground">
  <h1 className="text-primary">Titre</h1>
</div>
```

### Typographie

Styles de base:
- Police: Inter (Google Fonts)
- Échelle: text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl

**Prose (Markdown):**
```tsx
<div className="prose dark:prose-invert">
  <h1>Titre</h1>
  <p>Paragraphe avec styling automatique</p>
</div>
```

### Spacing

Container standardisé:
```tsx
<div className="container mx-auto px-4 py-8">
  {/* Contenu */}
</div>
```

---

## Composants disponibles

### Button

**Localisation**: `components/ui/button.tsx`

**Variantes**:
- `default` - Bouton principal (bleu)
- `secondary` - Bouton secondaire (gris)
- `destructive` - Action destructive (rouge)
- `outline` - Contour transparent
- `ghost` - Transparent au hover
- `link` - Style lien

**Tailles**: `sm`, `default`, `lg`, `icon`

**Exemples:**
```tsx
import { Button } from "@/components/ui/button";

<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline" size="sm">Small Outline</Button>
<Button size="icon"><Icon /></Button>

// En tant que lien
<Button asChild>
  <Link href="/about">À propos</Link>
</Button>
```

---

### Card

**Localisation**: `components/ui/card.tsx`

**Sous-composants**:
- `Card` - Container principal
- `CardHeader` - En-tête
- `CardTitle` - Titre
- `CardDescription` - Description
- `CardContent` - Contenu principal
- `CardFooter` - Pied de page

**Exemple:**
```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Titre de la carte</CardTitle>
    <CardDescription>Description optionnelle</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Contenu principal</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

### Badge

**Localisation**: `components/ui/badge.tsx`

**Variantes**: `default`, `secondary`, `destructive`, `outline`

**Exemple:**
```tsx
import { Badge } from "@/components/ui/badge";

<Badge>New</Badge>
<Badge variant="secondary">Beta</Badge>
<Badge variant="destructive">Error</Badge>
```

---

### Input & Label

**Localisation**: `components/ui/input.tsx`, `components/ui/label.tsx`

**Exemple:**
```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="email@example.com" />
</div>
```

---

### Textarea

**Localisation**: `components/ui/textarea.tsx`

**Exemple:**
```tsx
import { Textarea } from "@/components/ui/textarea";

<Textarea placeholder="Votre message..." />
```

---

### Dialog

**Localisation**: `components/ui/dialog.tsx`

**Sous-composants**:
- `Dialog` - Container principal
- `DialogTrigger` - Élément déclencheur
- `DialogContent` - Contenu du dialog
- `DialogHeader` - En-tête
- `DialogTitle` - Titre
- `DialogDescription` - Description
- `DialogFooter` - Pied de page

**Exemple:**
```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Ouvrir</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Titre</DialogTitle>
      <DialogDescription>Description du dialog</DialogDescription>
    </DialogHeader>
    <div>Contenu</div>
    <DialogFooter>
      <Button variant="outline">Annuler</Button>
      <Button>Confirmer</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Tabs

**Localisation**: `components/ui/tabs.tsx`

**Sous-composants**:
- `Tabs` - Container principal
- `TabsList` - Liste des onglets
- `TabsTrigger` - Bouton d'onglet
- `TabsContent` - Contenu d'un onglet

**Exemple:**
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

<Tabs defaultValue="account">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">
    Contenu account
  </TabsContent>
  <TabsContent value="password">
    Contenu password
  </TabsContent>
</Tabs>
```

---

### Toast

**Localisation**: `components/ui/toast.tsx`, `hooks/use-toast.ts`

**Setup**: Le `<Toaster />` est déjà inclus dans le layout principal.

**Exemple:**
```tsx
"use client";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export function MyComponent() {
  const { toast } = useToast();

  return (
    <Button
      onClick={() => {
        toast({
          title: "Succès!",
          description: "Votre action a été effectuée.",
        });
      }}
    >
      Afficher toast
    </Button>
  );
}
```

**Toast destructive:**
```tsx
toast({
  variant: "destructive",
  title: "Erreur!",
  description: "Une erreur s'est produite.",
});
```

---

## Thème et Dark Mode

### ThemeProvider

Le `ThemeProvider` est déjà configuré dans `app/layout.tsx`:

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

### Toggle Theme

Le composant `ThemeToggle` est disponible dans la navbar:

```tsx
import { ThemeToggle } from "@/components/theme-toggle";

<ThemeToggle />
```

### CSS Variables

Les couleurs s'adaptent automatiquement au dark mode via la classe `.dark`:

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

---

## Ajouter un nouveau composant

### Méthode manuelle

1. **Créer le fichier** dans `components/ui/`
2. **Copier le code** depuis [shadcn/ui](https://ui.shadcn.com/)
3. **Adapter** les imports si nécessaire
4. **Installer les dépendances** Radix UI si besoin

### Exemple: Ajouter Accordion

```bash
# 1. Installer la dépendance Radix
pnpm add @radix-ui/react-accordion

# 2. Créer components/ui/accordion.tsx
# 3. Copier le code depuis ui.shadcn.com/docs/components/accordion
```

---

## Conventions

### Utilitaire `cn()`

**Localisation**: `lib/utils.ts`

Combine et fusionne les classes Tailwind:

```tsx
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  className // Props externe
)} />
```

### Structure des composants

```
components/
├── ui/              # Composants shadcn/ui
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── navbar.tsx       # Composants métier
├── page-header.tsx
└── theme-provider.tsx
```

### Naming

- Composants UI: PascalCase (`Button`, `Card`)
- Fichiers: kebab-case (`button.tsx`, `page-header.tsx`)
- Classes Tailwind: kebab-case natif

### Accessibilité

Tous les composants incluent:
- `aria-label` ou `sr-only` pour screen readers
- States focus visibles (`focus-visible:ring`)
- Support clavier complet
- Rôles ARIA appropriés

### Exemple de composant accessible

```tsx
<Button
  variant="ghost"
  size="icon"
  aria-label="Toggle theme"
>
  <Sun className="h-5 w-5" />
  <span className="sr-only">Toggle theme</span>
</Button>
```

---

## Styleguide

Une page styleguide est disponible à `/styleguide` pour visualiser tous les composants:

```bash
http://localhost:3000/styleguide
```

Cette page démontre:
- Toutes les variantes de boutons
- Exemples de cartes
- Formulaires
- Dialogs
- Tabs
- Toasts
- Typography

---

## Ressources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)

<system-reminder>
Background Bash b050bb (command: pnpm start) (status: running) Has new output available. You can check its output using the BashOutput tool.
</system-reminder>