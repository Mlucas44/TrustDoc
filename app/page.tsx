import { FileCheck, Shield, Zap } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="text-center space-y-6 py-12">
        <Badge variant="outline" className="mb-4">
          Plateforme de vérification
        </Badge>
        <PageHeader
          title="TrustDoc"
          description="Vérifiez l'authenticité et l'intégrité de vos documents en toute confiance"
          className="max-w-3xl mx-auto"
        />
        <div className="flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/dashboard">Analyser un contrat</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/docs">Documentation</Link>
          </Button>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Sécurisé</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Vos documents sont analysés avec les dernières technologies de cryptographie et de
              vérification d&apos;intégrité.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>Rapide</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Obtenez des résultats en quelques secondes. Notre infrastructure est optimisée pour la
              performance.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <CardTitle>Fiable</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Algorithmes éprouvés et conformité aux standards internationaux pour une vérification
              de confiance.
            </CardDescription>
          </CardContent>
        </Card>
      </section>

      <section className="prose dark:prose-invert max-w-none">
        <h2>Comment ça marche ?</h2>
        <ol>
          <li>
            <strong>Téléchargez</strong> votre document (PDF, Word, etc.)
          </li>
          <li>
            <strong>Analysez</strong> - Notre système vérifie l&apos;intégrité et
            l&apos;authenticité
          </li>
          <li>
            <strong>Recevez</strong> un rapport détaillé avec le niveau de confiance
          </li>
        </ol>
      </section>
    </div>
  );
}
