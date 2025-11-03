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
import { RedFlagList } from "@/src/components/analysis/RedFlagList";
import { RiskGauge } from "@/src/components/analysis/RiskGauge";
import { RiskScoreBadge } from "@/src/components/analysis/RiskScoreBadge";
import { type UiRedFlag } from "@/src/types/red-flag";

export default function StyleguidePage() {
  const { toast } = useToast();

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
    </div>
  );
}
