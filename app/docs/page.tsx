/**
 * Documentation Page
 *
 * Provides user documentation for TrustDoc platform.
 */

import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Documentation"
        description="Guide complet pour utiliser TrustDoc et analyser vos contrats"
      />

      <Tabs defaultValue="getting-started" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="getting-started">Démarrage</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="credits">Crédits</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        {/* Getting Started Tab */}
        <TabsContent value="getting-started" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bienvenue sur TrustDoc</CardTitle>
              <CardDescription>
                TrustDoc est une plateforme d&apos;analyse de contrats propulsée par IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose dark:prose-invert max-w-none">
                <h3>Comment ça marche ?</h3>
                <ol>
                  <li>
                    <strong>Créez un compte</strong> - Inscrivez-vous gratuitement et recevez des
                    crédits offerts
                  </li>
                  <li>
                    <strong>Téléchargez votre contrat</strong> - Format PDF uniquement, 10 Mo
                    maximum
                  </li>
                  <li>
                    <strong>Lancez l&apos;analyse</strong> - L&apos;IA analyse votre document en
                    10-20 secondes
                  </li>
                  <li>
                    <strong>Consultez les résultats</strong> - Points d&apos;attention, clauses
                    clés, score de risque
                  </li>
                </ol>

                <h3>Types de contrats supportés</h3>
                <ul>
                  <li>Contrats de freelance</li>
                  <li>Conditions Générales d&apos;Utilisation (CGU)</li>
                  <li>Accords de Non-Divulgation (NDA)</li>
                  <li>Contrats de travail</li>
                  <li>Accords de partenariat</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Guide d&apos;upload</CardTitle>
              <CardDescription>
                Tout ce qu&apos;il faut savoir pour uploader vos documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose dark:prose-invert max-w-none">
                <h3>Formats acceptés</h3>
                <p>
                  TrustDoc accepte uniquement les fichiers <strong>PDF</strong>. Les autres formats
                  (Word, images, etc.) ne sont pas supportés pour le moment.
                </p>

                <h3>Taille maximale</h3>
                <p>
                  La taille maximale par fichier est de <strong>10 Mo</strong>. Si votre document
                  est plus lourd, essayez de le compresser.
                </p>

                <h3>Temps d&apos;analyse</h3>
                <p>
                  L&apos;analyse prend généralement entre <strong>10 et 20 secondes</strong> selon
                  la longueur du document.
                </p>

                <h3>Coût</h3>
                <p>
                  Chaque analyse consomme <strong>1 crédit</strong>. Vous pouvez acheter des packs
                  de crédits à tout moment.
                </p>
              </div>

              <Alert>
                <AlertDescription>
                  💡 Astuce : Vos crédits n&apos;expirent jamais ! Achetez uniquement ce dont vous
                  avez besoin.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Système de crédits</CardTitle>
              <CardDescription>
                Comprendre comment fonctionnent les crédits sur TrustDoc
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose dark:prose-invert max-w-none">
                <h3>Qu&apos;est-ce qu&apos;un crédit ?</h3>
                <p>
                  Un crédit permet de réaliser <strong>une analyse complète</strong> de document.
                </p>

                <h3>Comment obtenir des crédits ?</h3>
                <ul>
                  <li>
                    <strong>Inscription</strong> : Crédits offerts à la création de compte
                  </li>
                  <li>
                    <strong>Achat</strong> : Packs disponibles (Starter, Pro, Scale)
                  </li>
                </ul>

                <h3>Les crédits expirent-ils ?</h3>
                <p>
                  Non ! Vos crédits restent valables <strong>indéfiniment</strong>. Utilisez-les
                  quand vous voulez.
                </p>

                <h3>Remboursements</h3>
                <p>
                  Si une analyse échoue pour une raison technique, le crédit est automatiquement
                  remboursé.
                </p>
              </div>

              <Button asChild className="w-full">
                <Link href="/credits">Voir les offres de crédits</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Questions fréquentes</CardTitle>
              <CardDescription>Réponses aux questions les plus courantes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Mes données sont-elles sécurisées ?</h4>
                <p className="text-sm text-muted-foreground">
                  Oui. Vos documents sont chiffrés en transit et au repos. Nous ne partageons jamais
                  vos données avec des tiers.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Puis-je supprimer mes analyses ?</h4>
                <p className="text-sm text-muted-foreground">
                  Oui. Depuis votre historique, vous pouvez supprimer n&apos;importe quelle analyse.
                  La suppression est définitive après 30 jours.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">L&apos;IA peut-elle faire des erreurs ?</h4>
                <p className="text-sm text-muted-foreground">
                  Oui. TrustDoc est un outil d&apos;aide à la décision, pas un remplacement pour un
                  avocat. Vérifiez toujours les points importants avec un professionnel.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Puis-je analyser des contrats en anglais ?</h4>
                <p className="text-sm text-muted-foreground">
                  Oui. TrustDoc supporte les contrats en français et en anglais.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Comment contacter le support ?</h4>
                <p className="text-sm text-muted-foreground">
                  Pour toute question, contactez-nous à{" "}
                  <a href="mailto:support@trustdoc.com" className="text-primary underline">
                    support@trustdoc.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Prêt à commencer ?</CardTitle>
            <CardDescription>Analysez votre premier contrat maintenant</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard">Accéder au dashboard</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Besoin d&apos;aide ?</CardTitle>
            <CardDescription>Consultez votre historique ou achetez des crédits</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/history">Historique</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/credits">Crédits</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
