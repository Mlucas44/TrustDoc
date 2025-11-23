import { ArrowLeft, HelpCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "FAQ PDF - TrustDoc",
  description: "Questions fréquentes sur les problèmes PDF : mot de passe, scans, taille",
};

export default function PdfFaqPage() {
  return (
    <div className="container max-w-4xl py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">FAQ - Questions fréquentes sur les PDF</h1>
        </div>
        <p className="text-muted-foreground">
          Résolution des problèmes courants liés aux documents PDF
        </p>
      </div>

      {/* Quick Links */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Accès rapide</CardTitle>
          <CardDescription>Cliquez sur un sujet pour accéder directement</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            <li>
              <a href="#password" className="text-primary hover:underline">
                🔒 PDF protégé par mot de passe
              </a>
            </li>
            <li>
              <a href="#scanned" className="text-primary hover:underline">
                📄 PDF scanné (image)
              </a>
            </li>
            <li>
              <a href="#size" className="text-primary hover:underline">
                📏 Taille et complexité
              </a>
            </li>
            <li>
              <a href="#errors" className="text-primary hover:underline">
                ⚡ Erreurs courantes
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* PDF protégé */}
      <section id="password" className="mb-12">
        <h2 className="text-2xl font-bold mb-4">🔒 PDF protégé par mot de passe</h2>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Pourquoi mon PDF n&apos;est pas accepté ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Si vous voyez ce message d&apos;erreur :</p>
            <div className="rounded-md bg-destructive/10 border border-destructive/50 p-4">
              <p className="text-sm font-medium text-destructive">
                &quot;Ce PDF est protégé par mot de passe. Veuillez fournir le mot de passe dans le
                champ pdfPassword.&quot;
              </p>
            </div>
            <p>
              Cela signifie que votre PDF est <strong>chiffré</strong> et nécessite un mot de passe
              pour être lu.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Comment fournir le mot de passe ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-medium">Lors de l&apos;upload :</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Recherchez le champ &quot;Mot de passe PDF (optionnel)&quot;</li>
              <li>Entrez le mot de passe du document</li>
              <li>Cliquez sur &quot;Analyser le document&quot;</li>
            </ol>

            <div className="rounded-md bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/50 dark:border-yellow-900 p-4">
              <p className="text-sm font-medium mb-2">⚠️ Si le mot de passe est incorrect :</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Vérifiez que vous utilisez le bon mot de passe</li>
                <li>• Attention aux majuscules/minuscules</li>
                <li>• Vérifiez qu&apos;il n&apos;y a pas d&apos;espaces avant/après</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Je n&apos;ai pas le mot de passe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-medium">Solutions :</p>
            <div className="space-y-3">
              <div className="rounded-md bg-muted p-4">
                <p className="font-medium mb-2">1. Demandez au créateur du document</p>
                <p className="text-sm text-muted-foreground">
                  La personne qui a créé ou chiffré le PDF devrait avoir le mot de passe
                </p>
              </div>
              <div className="rounded-md bg-muted p-4">
                <p className="font-medium mb-2">
                  2. Retirez la protection (si vous êtes le propriétaire)
                </p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside ml-2">
                  <li>Ouvrez le PDF dans Adobe Acrobat Reader</li>
                  <li>Entrez le mot de passe</li>
                  <li>Fichier → Propriétés → Sécurité → &quot;Aucune sécurité&quot;</li>
                  <li>Enregistrez et ré-uploadez</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* PDF scanné */}
      <section id="scanned" className="mb-12">
        <h2 className="text-2xl font-bold mb-4">📄 PDF scanné (image)</h2>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Pourquoi TrustDoc ne peut pas lire mon PDF ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Si vous voyez ce message :</p>
            <div className="rounded-md bg-destructive/10 border border-destructive/50 p-4">
              <p className="text-sm font-medium text-destructive">
                &quot;Ce PDF semble être une image scannée. Veuillez fournir un PDF avec du texte
                sélectionnable.&quot;
              </p>
            </div>
            <p>
              Cela signifie que votre PDF est une <strong>image scannée</strong> et non un document
              avec du texte extractible.
            </p>

            <div className="rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-950/50 dark:border-blue-900 p-4">
              <p className="font-medium mb-2">Comment vérifier ?</p>
              <ol className="text-sm space-y-1 list-decimal list-inside ml-2">
                <li>Ouvrez votre PDF</li>
                <li>Essayez de sélectionner du texte avec la souris</li>
                <li>Si vous ne pouvez pas sélectionner → c&apos;est un scan</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Solutions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-green-50 border border-green-200 dark:bg-green-950/50 dark:border-green-900 p-4">
              <p className="font-medium mb-2">✅ Option 1 : Version numérique originale (Recommandé)</p>
              <p className="text-sm text-muted-foreground">
                Si possible, demandez le document numérique original (Word, Pages, PDF natif).
                C&apos;est la meilleure option pour une analyse précise.
              </p>
            </div>

            <div className="rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-950/50 dark:border-blue-900 p-4">
              <p className="font-medium mb-2">🔄 Option 2 : OCR - Reconnaissance de texte (Bientôt)</p>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Fonctionnalité en développement</strong> : TrustDoc intégrera bientôt
                l&apos;OCR pour analyser les documents scannés.
              </p>
              <p className="text-sm font-medium mb-2">En attendant, utilisez un service OCR :</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-2">
                <li>Adobe Scan (mobile)</li>
                <li>Google Drive (Ouvrir avec Google Docs)</li>
                <li>Microsoft OneNote</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Taille et complexité */}
      <section id="size" className="mb-12">
        <h2 className="text-2xl font-bold mb-4">📏 Taille et complexité du PDF</h2>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Limites de taille</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-muted p-4">
                <p className="font-medium mb-1">Taille maximale</p>
                <p className="text-2xl font-bold text-primary">10 MB</p>
              </div>
              <div className="rounded-md bg-muted p-4">
                <p className="font-medium mb-1">Pages maximum</p>
                <p className="text-2xl font-bold text-primary">500 pages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Solutions pour documents trop volumineux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="rounded-md bg-muted p-4">
                <p className="font-medium mb-2">Compresser le PDF</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-2">
                  <li>Smallpdf Compresser</li>
                  <li>ILovePDF Compresser</li>
                  <li>Adobe Acrobat : PDF de taille réduite</li>
                </ul>
              </div>
              <div className="rounded-md bg-muted p-4">
                <p className="font-medium mb-2">Diviser le document</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside ml-2">
                  <li>Utilisez Smallpdf ou ILovePDF pour diviser</li>
                  <li>Analysez chaque section séparément</li>
                  <li>Combinez les résultats manuellement</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Erreurs courantes */}
      <section id="errors" className="mb-12">
        <h2 className="text-2xl font-bold mb-4">⚡ Erreurs courantes et solutions rapides</h2>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                &quot;Trop de requêtes. Veuillez réessayer dans X secondes&quot;
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Cause :</strong> Protection anti-spam (limite : 5 analyses par minute)
              </p>
              <p className="text-sm">
                <strong>Solution :</strong> Attendez quelques secondes et réessayez
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">&quot;Fichier non trouvé dans le stockage&quot;</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Causes possibles :</strong>
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4 mb-3">
                <li>Fichier supprimé automatiquement (durée de vie : 30 minutes)</li>
                <li>Problème de connexion pendant l&apos;upload</li>
              </ul>
              <p className="text-sm">
                <strong>Solution :</strong> Re-uploadez votre document
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                &quot;Le PDF est peut-être corrompu ou dans un format non supporté&quot;
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Causes :</strong> Fichier endommagé, format non standard, téléchargement incomplet
              </p>
              <p className="text-sm mb-2">
                <strong>Solutions :</strong>
              </p>
              <ol className="text-sm space-y-1 list-decimal list-inside ml-4">
                <li>Vérifiez que le fichier s&apos;ouvre dans Adobe Reader</li>
                <li>Utilisez un service de réparation PDF (iLovePDF Réparer)</li>
                <li>Convertissez au format standard dans Adobe Acrobat</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Support */}
      <Card className="bg-primary/5">
        <CardHeader>
          <CardTitle>🆘 Toujours un problème ?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Si aucune de ces solutions ne fonctionne :</p>
          <div className="space-y-2">
            <div>
              <p className="font-medium text-sm">Documentation technique</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>
                  • <Link href="/docs/tech/API_PARSE_V2_TESTING" className="text-primary hover:underline">Guide des erreurs API</Link>
                </li>
                <li>
                  • <Link href="/docs/tech/PDF_CONFIG" className="text-primary hover:underline">Configuration PDF</Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-sm">Contactez le support</p>
              <p className="text-sm text-muted-foreground">
                Email : support@trustdoc.com (incluez le message d&apos;erreur complet)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Dernière mise à jour : Novembre 2024 • Version 1.0</p>
      </div>
    </div>
  );
}
