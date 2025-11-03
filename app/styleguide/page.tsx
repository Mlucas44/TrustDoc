"use client";

import { FileCheck, Shield, Zap } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ClausesTable } from "@/src/components/analysis/ClausesTable";
import { ExportButtons } from "@/src/components/analysis/ExportButtons";
import { RedFlagList } from "@/src/components/analysis/RedFlagList";
import { RiskGauge } from "@/src/components/analysis/RiskGauge";
import { RiskScoreBadge } from "@/src/components/analysis/RiskScoreBadge";
import { toUiClause } from "@/src/lib/clause-utils";
import { type UiRedFlag } from "@/src/types/red-flag";

import type { Clause } from "@/src/types/clause";

export default function StyleguidePage() {
  const { toast } = useToast();

  // Sample clauses data
  const sampleClauses: Clause[] = [
    {
      type: "Parties",
      text: 'Article 1 - Parties: Le présent contrat est conclu entre la société ACME Corp, SAS au capital de 100 000€, immatriculée au RCS de Paris sous le numéro 123 456 789, dont le siège social est situé au 123 Avenue des Champs-Élysées, 75008 Paris, représentée par M. Jean Dupont en qualité de Directeur Général, ci-après dénommée "le Client", d\'une part, et la société FreelancePro, EURL au capital de 10 000€, immatriculée au RCS de Lyon sous le numéro 987 654 321, dont le siège social est situé au 456 Rue de la République, 69002 Lyon, représentée par Mme Marie Martin en qualité de Gérante, ci-après dénommée "le Prestataire", d\'autre part.',
    },
    {
      type: "Objet du contrat",
      text: "Article 2 - Objet: Le présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire s'engage à réaliser pour le compte du Client une mission de développement d'une application web de gestion commerciale, incluant la conception, le développement, les tests et la mise en production.",
    },
    {
      type: "Durée",
      text: "Article 3 - Durée: Le présent contrat est conclu pour une durée déterminée de 6 mois à compter de sa signature, soit du 1er janvier 2025 au 30 juin 2025. Il pourra être renouvelé par accord express des deux parties, formalisé par avenant signé au moins 30 jours avant l'échéance.",
    },
    {
      type: "Résiliation",
      text: "Article 8 - Résiliation: Chaque partie pourra résilier le présent contrat de plein droit, sans indemnité, en cas de manquement grave de l'autre partie à l'une quelconque de ses obligations contractuelles, après mise en demeure restée infructueuse pendant un délai de 15 jours. En cas de résiliation pour faute, la partie responsable devra indemniser l'autre partie du préjudice subi.",
    },
    {
      type: "Conditions de paiement",
      text: "Article 4 - Modalités de paiement: Le montant global de la prestation est fixé à 45 000€ HT (cinquante-quatre mille euros TTC). Le paiement s'effectuera en trois échéances: 30% à la signature (13 500€), 40% à la validation de la phase de développement (18 000€), et 30% à la livraison finale (13 500€). Les factures seront payables à 30 jours fin de mois par virement bancaire.",
    },
    {
      type: "Limitation de responsabilité",
      text: "Article 9 - Responsabilité: La responsabilité du Prestataire ne pourra être engagée qu'en cas de faute prouvée et sera limitée au montant des sommes effectivement versées au titre du présent contrat. Le Prestataire ne saurait être tenu responsable des dommages indirects, pertes d'exploitation, manques à gagner ou pertes de données.",
    },
    {
      type: "Propriété Intellectuelle",
      text: "Article 6 - Propriété intellectuelle: Les droits de propriété intellectuelle sur les développements réalisés dans le cadre de la mission seront transférés au Client à compter du paiement intégral du prix. Le Prestataire conserve néanmoins le droit d'utiliser les techniques, méthodes et savoir-faire généraux développés dans le cadre de cette mission pour d'autres projets.",
    },
    {
      type: "Confidentialité",
      text: "Article 7 - Confidentialité: Les parties s'engagent à conserver strictement confidentielles toutes les informations de nature commerciale, technique, financière ou stratégique dont elles auraient connaissance dans le cadre de l'exécution du présent contrat. Cette obligation de confidentialité perdurera pendant toute la durée du contrat et pendant une période de 3 ans après sa cessation.",
    },
    {
      type: "Protection des données personnelles",
      text: "Article 10 - RGPD: Dans le cadre de l'exécution du présent contrat, le Prestataire s'engage à respecter la réglementation en vigueur applicable au traitement de données à caractère personnel et, en particulier, le Règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016 (RGPD). Le Prestataire s'engage à ne traiter les données personnelles que sur instruction documentée du Client et à mettre en œuvre les mesures techniques et organisationnelles appropriées.",
    },
    {
      type: "Loi applicable et juridiction",
      text: "Article 12 - Juridiction compétente: Le présent contrat est régi par le droit français. Tout litige relatif à l'interprétation ou à l'exécution du présent contrat sera soumis à la compétence exclusive du Tribunal de Commerce de Paris, auquel les parties attribuent compétence territoriale, quel que soit le lieu d'exécution du contrat ou le domicile du défendeur.",
    },
    {
      type: "Clause de non-concurrence",
      text: "Article 11 - Non-concurrence: Pendant la durée du présent contrat et pendant une période de 12 mois suivant sa cessation, le Prestataire s'interdit de travailler directement ou indirectement pour tout concurrent du Client opérant sur le même secteur d'activité (logiciels de gestion commerciale) dans un rayon géographique de 100 km autour du siège social du Client.",
    },
    {
      type: "Cession du contrat",
      text: "Article 13 - Cession: Le présent contrat est conclu intuitu personae. En conséquence, aucune des parties ne pourra céder, transférer ou sous-traiter tout ou partie de ses droits et obligations au titre du présent contrat sans l'accord préalable et écrit de l'autre partie. Toute cession effectuée en violation de cette clause sera nulle et de nul effet.",
    },
  ];

  const uiClauses = sampleClauses.map(toUiClause);

  // Sample red flags data
  const sampleRedFlags: UiRedFlag[] = [
    {
      id: "rf_1",
      title: "Unlimited Liability Clause",
      severity: "high",
      why: "This clause exposes you to unlimited financial liability for damages beyond your control, which could result in catastrophic financial loss.",
      clause_excerpt:
        'Section 7.3: "The Contractor shall be liable for any and all damages, losses, costs, and expenses arising from or related to the performance of this Agreement, without limitation as to amount or type. This liability shall extend to indirect, consequential, and punitive damages."',
    },
    {
      id: "rf_2",
      title: "Unclear Termination Conditions",
      severity: "medium",
      why: "The termination clause is ambiguous about what constitutes a valid reason for contract termination, potentially leading to disputes.",
      clause_excerpt:
        'Section 9.1: "Either party may terminate this Agreement for convenience with notice to the other party. The terminating party shall provide reasonable notice under the circumstances."',
    },
    {
      id: "rf_3",
      title: "Intellectual Property Ambiguity",
      severity: "medium",
      why: "The ownership of work products and intellectual property created during the project is not clearly defined, which may lead to disputes.",
      clause_excerpt:
        'Section 5.2: "All work products shall be considered jointly owned by both parties. Each party retains rights to use such work products in their respective businesses."',
    },
    {
      id: "rf_4",
      title: "Non-Standard Payment Terms",
      severity: "low",
      why: "Payment terms deviate from industry standard (Net 30), but are still reasonable and clearly defined.",
      clause_excerpt:
        'Section 4.1: "Payment shall be made within 60 days of invoice receipt. Late payments will incur a 1% monthly interest charge."',
    },
  ];

  return (
    <div className="space-y-12">
      <PageHeader title="Style Guide" description="Aperçu de tous les composants UI disponibles" />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Boutons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">
            <Shield className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-4">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Cards</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Card Title</CardTitle>
              </div>
              <CardDescription>Card description goes here</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">This is the card content area.</p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Action</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Simple Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">A simple card without footer or icons.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle>Icon Card</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Card with an icon in the header.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Form Elements</h2>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Example Form</CardTitle>
            <CardDescription>Form elements showcase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Enter your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Type your message here" />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Submit</Button>
          </CardFooter>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Dialog</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your account and remove
                your data from our servers.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Tabs</h2>
        <Tabs defaultValue="account" className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>Make changes to your account here.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="username">Name</Label>
                  <Input id="username" defaultValue="Pedro Duarte" />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="password" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Change your password here.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="current">Current password</Label>
                  <Input id="current" type="password" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new">New password</Label>
                  <Input id="new" type="password" />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save password</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Toast</h2>
        <div className="flex gap-4">
          <Button
            onClick={() => {
              toast({
                title: "Success!",
                description: "Your action was completed successfully.",
              });
            }}
          >
            Show Toast
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: "There was a problem with your request.",
              });
            }}
          >
            Show Error Toast
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Typography (Prose)</h2>
        <div className="prose dark:prose-invert">
          <h1>Heading 1</h1>
          <h2>Heading 2</h2>
          <h3>Heading 3</h3>
          <p>
            This is a paragraph with <strong>bold text</strong> and <a href="#">a link</a>. Lorem
            ipsum dolor sit amet, consectetur adipiscing elit.
          </p>
          <blockquote>
            This is a blockquote. It can be used to highlight important information.
          </blockquote>
          <ul>
            <li>First item</li>
            <li>Second item</li>
            <li>Third item</li>
          </ul>
          <p>
            Inline <code>code example</code> within text.
          </p>
          <pre>
            <code>const example = &quot;code block&quot;;</code>
          </pre>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Icons</h2>
        <div className="flex gap-4">
          <Shield className="h-8 w-8 text-primary" />
          <FileCheck className="h-8 w-8 text-primary" />
          <Zap className="h-8 w-8 text-primary" />
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">Risk Visualization</h2>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Risk Score Badges</h3>
          <p className="text-sm text-muted-foreground">
            Display risk levels with color-coded badges. Supports three risk levels: Low (0-33),
            Medium (34-66), High (67-100).
          </p>
          <div className="flex flex-wrap gap-6 items-center">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Small</p>
              <div className="flex gap-2">
                <RiskScoreBadge score={25} size="sm" />
                <RiskScoreBadge score={50} size="sm" />
                <RiskScoreBadge score={85} size="sm" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Medium (default)</p>
              <div className="flex gap-2">
                <RiskScoreBadge score={25} />
                <RiskScoreBadge score={50} />
                <RiskScoreBadge score={85} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Large</p>
              <div className="flex gap-2">
                <RiskScoreBadge score={25} size="lg" />
                <RiskScoreBadge score={50} size="lg" />
                <RiskScoreBadge score={85} size="lg" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">With Score</p>
              <div className="flex gap-2">
                <RiskScoreBadge score={25} showScore />
                <RiskScoreBadge score={50} showScore />
                <RiskScoreBadge score={85} showScore />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Risk Gauge</h3>
          <p className="text-sm text-muted-foreground">
            Complete risk visualization with animated progress bar, score display, and optional
            justification text.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Low Risk Example</CardTitle>
              </CardHeader>
              <CardContent>
                <RiskGauge
                  score={25}
                  justification="Contract has standard terms with clear termination clauses and reasonable notice periods."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Medium Risk Example</CardTitle>
              </CardHeader>
              <CardContent>
                <RiskGauge
                  score={57}
                  justification="Multiple unclear clauses regarding payment terms and intellectual property rights require clarification."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">High Risk Example</CardTitle>
              </CardHeader>
              <CardContent>
                <RiskGauge
                  score={89}
                  justification="Serious concerns identified: unlimited liability clause, no termination rights, and highly unfavorable payment terms."
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Usage Example</h3>
          <Card>
            <CardHeader>
              <CardTitle>Contract Analysis Result</CardTitle>
              <CardDescription>Example integration in analysis page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h4 className="font-semibold">Freelance Agreement.pdf</h4>
                  <p className="text-sm text-muted-foreground">Analyzed 2 hours ago</p>
                </div>
                <RiskScoreBadge score={42} showScore size="lg" />
              </div>
              <RiskGauge
                score={42}
                justification="The contract contains some ambiguous clauses regarding project scope and payment milestones. Review sections 3.2 and 5.1 carefully before signing."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Red Flags Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Red Flags List</h2>
          <p className="text-muted-foreground">
            Display contract red flags with severity levels, search, and filtering capabilities.
          </p>
        </div>

        <div className="space-y-8">
          {/* Full Example */}
          <div>
            <h3 className="text-lg font-medium mb-4">Full Example with All Features</h3>
            <RedFlagList items={sampleRedFlags} />
          </div>

          {/* Filtered by High Severity */}
          <div>
            <h3 className="text-lg font-medium mb-4">Pre-filtered by High Severity</h3>
            <RedFlagList items={sampleRedFlags} defaultSeverity="high" />
          </div>

          {/* Empty State */}
          <div>
            <h3 className="text-lg font-medium mb-4">Empty State</h3>
            <RedFlagList items={[]} />
          </div>
        </div>
      </section>

      {/* Clauses Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Clauses clés</h2>
          <p className="text-muted-foreground">
            Tableau responsive des clauses extraites d&apos;un contrat avec recherche, filtres et
            actions.
          </p>
        </div>

        <div className="space-y-8">
          {/* Full Example */}
          <div>
            <h3 className="text-lg font-medium mb-4">Exemple complet</h3>
            <ClausesTable clauses={uiClauses} />
          </div>

          {/* Empty State */}
          <div>
            <h3 className="text-lg font-medium mb-4">État vide</h3>
            <ClausesTable clauses={[]} />
          </div>
        </div>
      </section>

      {/* Export Buttons Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Export de l&apos;analyse</h2>
          <p className="text-muted-foreground">
            Boutons pour exporter l&apos;analyse complète en JSON ou Markdown.
          </p>
        </div>

        <div className="space-y-8">
          {/* Default Size */}
          <div>
            <h3 className="text-lg font-medium mb-4">Taille par défaut</h3>
            <ExportButtons analysisId="sample-123" />
          </div>

          {/* Small Size */}
          <div>
            <h3 className="text-lg font-medium mb-4">Petite taille</h3>
            <ExportButtons analysisId="sample-123" size="sm" />
          </div>

          {/* Large Size */}
          <div>
            <h3 className="text-lg font-medium mb-4">Grande taille</h3>
            <ExportButtons analysisId="sample-123" size="lg" />
          </div>
        </div>
      </section>
    </div>
  );
}
