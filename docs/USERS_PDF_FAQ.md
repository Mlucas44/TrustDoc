# FAQ - Questions fréquentes sur les PDF

**Aide TrustDoc** - Résolution des problèmes courants liés aux documents PDF

---

## 🔒 PDF protégé par mot de passe

### Pourquoi mon PDF n'est pas accepté ?

Si vous voyez ce message d'erreur :

> "Ce PDF est protégé par mot de passe. Veuillez fournir le mot de passe dans le champ pdfPassword."

Cela signifie que votre PDF est **chiffré** et nécessite un mot de passe pour être lu.

### Comment fournir le mot de passe ?

1. **Lors de l'upload** :
   - Recherchez le champ "Mot de passe PDF (optionnel)" sous le sélecteur de fichier
   - Entrez le mot de passe du document
   - Cliquez sur "Analyser le document"

2. **Si le mot de passe est incorrect** :
   - Vérifiez que vous utilisez le bon mot de passe
   - Attention aux majuscules/minuscules
   - Vérifiez qu'il n'y a pas d'espaces avant/après

### Je n'ai pas le mot de passe

**Solutions** :

1. **Demandez au créateur du document** : La personne qui a créé ou chiffré le PDF devrait avoir le mot de passe

2. **Retirez la protection** (si vous êtes le propriétaire) :
   - Ouvrez le PDF dans Adobe Acrobat Reader
   - Entrez le mot de passe
   - Fichier → Propriétés → Sécurité → Méthode de sécurité → "Aucune sécurité"
   - Enregistrez le PDF sans protection
   - Ré-uploadez sur TrustDoc

3. **Alternatives** :
   - Demandez une version non protégée du document
   - Utilisez un outil de déchiffrement PDF (si vous êtes autorisé)

---

## 📄 PDF scanné (image)

### Pourquoi TrustDoc ne peut pas lire mon PDF ?

Si vous voyez ce message :

> "Ce PDF semble être une image scannée. Veuillez fournir un PDF avec du texte sélectionnable."

Cela signifie que votre PDF est une **image scannée** et non un document avec du texte extractible.

### Qu'est-ce qu'un PDF scanné ?

Un PDF scanné est essentiellement une **photo** d'un document papier convertie en PDF. Le texte n'est pas "sélectionnable" - c'est juste une image.

**Comment vérifier** :
1. Ouvrez votre PDF
2. Essayez de sélectionner du texte avec la souris
3. Si vous ne pouvez pas sélectionner de texte → **c'est un scan**

### Solutions

#### Option 1 : Obtenez la version numérique originale ✅ (Recommandé)

- Si possible, demandez le **document numérique original** (Word, Pages, PDF natif)
- C'est la meilleure option pour une analyse précise

#### Option 2 : OCR - Reconnaissance de texte 🔄 (Disponible prochainement)

**Fonctionnalité en développement** : TrustDoc intégrera bientôt l'OCR (Optical Character Recognition) pour analyser les documents scannés.

En attendant, vous pouvez :

1. **Utiliser un service OCR gratuit** :
   - [Adobe Scan](https://www.adobe.com/acrobat/mobile/scanner-app.html) (mobile)
   - [Google Drive](https://support.google.com/drive/answer/176692) (Ouvrir avec Google Docs → Fichier → Télécharger → PDF)
   - [Microsoft OneNote](https://support.microsoft.com/fr-fr/office/copier-le-texte-à-partir-d-images-ou-d-impressions-de-fichiers-2df0408b-7f71-4f5e-b31d-f14a6c58a076) (intégré)

2. **Re-scannez avec OCR** :
   - Utilisez un scanner moderne avec OCR intégré
   - Assurez-vous que l'option "Texte sélectionnable" est activée

3. **Convertissez l'image en PDF avec texte** :
   - [Smallpdf OCR](https://smallpdf.com/fr/ocr-pdf)
   - [ILovePDF OCR](https://www.ilovepdf.com/fr/ocr-pdf)

#### Option 3 : Retapez le document

Pour de courts documents, il peut être plus rapide de :
- Recréer le document dans Word/Google Docs
- L'exporter en PDF
- L'uploader sur TrustDoc

---

## 📏 Taille et complexité du PDF

### Limites de taille

**Taille maximale** : 10 MB par document

**Nombre de pages maximum** : 500 pages

Si votre PDF dépasse ces limites, vous verrez :

> "PDF trop volumineux: X MB (max: 10 MB)"

ou

> "PDF a trop de pages: X pages (max: 500)"

### Solutions pour les documents trop volumineux

#### Réduire la taille du fichier

1. **Compresser le PDF** :
   - [Smallpdf Compresser](https://smallpdf.com/fr/compresser-pdf)
   - [ILovePDF Compresser](https://www.ilovepdf.com/fr/compresser_pdf)
   - Adobe Acrobat : Fichier → Enregistrer sous autre → PDF de taille réduite

2. **Optimiser les images** :
   - Si le PDF contient des images haute résolution, réduisez leur qualité
   - Utilisez Adobe Acrobat : Fichier → Enregistrer sous autre → PDF optimisé

3. **Retirer les éléments inutiles** :
   - Supprimez les pages vierges
   - Retirez les annexes non essentielles

#### Diviser un document volumineux

Si votre contrat fait plus de 500 pages ou 10 MB :

1. **Divisez le PDF en sections** :
   - [Smallpdf Diviser](https://smallpdf.com/fr/diviser-pdf)
   - [ILovePDF Diviser](https://www.ilovepdf.com/fr/diviser_pdf)
   - Adobe Acrobat : Outils → Organiser les pages → Diviser

2. **Analysez chaque section séparément** sur TrustDoc

3. **Combinez les résultats** manuellement

### Conseils pour les PDF complexes

**Temps de traitement** : Les PDF complexes peuvent prendre plus de temps à analyser.

**Signes de complexité** :
- Mise en page élaborée (tableaux, graphiques)
- Nombreuses polices et styles
- Images embarquées
- Annotations et formulaires

**Que faire ?**

1. **Soyez patient** : L'analyse peut prendre jusqu'à 1-2 minutes pour les documents complexes

2. **Simplifiez si possible** :
   - Convertissez en format texte simple avant de ré-exporter en PDF
   - Supprimez les éléments graphiques non essentiels

3. **Si le délai expire** :
   - Message : "La page est trop complexe à extraire"
   - Solution : Divisez le document en sections plus petites

---

## ⚡ Erreurs courantes et solutions rapides

### "Trop de requêtes. Veuillez réessayer dans X secondes"

**Cause** : Protection anti-spam (limite : 5 analyses par minute)

**Solution** : Attendez quelques secondes et réessayez

---

### "Fichier non trouvé dans le stockage"

**Causes possibles** :
- Le fichier a été automatiquement supprimé (durée de vie : 30 minutes)
- Problème de connexion pendant l'upload

**Solution** : Re-uploadez votre document

---

### "Le PDF est peut-être corrompu ou dans un format non supporté"

**Causes** :
- Fichier PDF endommagé
- Format PDF non standard
- Fichier tronqué (téléchargement incomplet)

**Solutions** :

1. **Vérifiez le fichier** :
   - Ouvrez-le avec Adobe Reader pour vérifier qu'il fonctionne
   - Si Adobe Reader ne peut pas l'ouvrir → fichier corrompu

2. **Réparez le PDF** :
   - [iLovePDF Réparer](https://www.ilovepdf.com/fr/reparer-pdf)
   - Ou ré-exportez depuis l'application source

3. **Convertissez au format standard** :
   - Ouvrez dans Adobe Acrobat
   - Fichier → Enregistrer sous → PDF standard

---

## 🆘 Toujours un problème ?

Si aucune de ces solutions ne fonctionne :

1. **Vérifiez notre documentation technique** :
   - [Guide des erreurs API](/docs/tech/API_PARSE_V2_TESTING.md)
   - [Configuration PDF](/docs/tech/PDF_CONFIG.md)

2. **Contactez le support** :
   - Email : support@trustdoc.com
   - Incluez le message d'erreur complet
   - Joignez une capture d'écran si possible

3. **Créez un ticket GitHub** (pour les problèmes techniques) :
   - [Issues TrustDoc](https://github.com/your-org/trustdoc/issues)

---

## 📚 Ressources utiles

### Outils PDF gratuits

- **Compression** : [Smallpdf](https://smallpdf.com/fr), [ILovePDF](https://www.ilovepdf.com/fr)
- **OCR** : [Adobe Scan](https://www.adobe.com/acrobat/mobile/scanner-app.html), Google Drive
- **Réparation** : [iLovePDF Réparer](https://www.ilovepdf.com/fr/reparer-pdf)
- **Division** : [Smallpdf Diviser](https://smallpdf.com/fr/diviser-pdf)

### Formats de contrats acceptés

- ✅ PDF natif (créé numériquement)
- ✅ PDF avec texte sélectionnable
- ✅ PDF protégé par mot de passe (si mot de passe fourni)
- ⏳ PDF scanné (OCR à venir)
- ❌ Images (JPG, PNG) - convertissez en PDF d'abord

### Bonnes pratiques

1. **Privilégiez les PDF natifs** : Créez vos contrats directement en PDF plutôt que de scanner
2. **Évitez les protections inutiles** : Ne protégez pas par mot de passe si ce n'est pas nécessaire
3. **Optimisez la taille** : Compressez avant d'uploader
4. **Nommez clairement vos fichiers** : "contrat-bail-2024.pdf" plutôt que "scan001.pdf"

---

**Dernière mise à jour** : Novembre 2024

**Version** : 1.0

**Besoin d'aide ?** Consultez notre [documentation technique](/docs) ou contactez-nous à support@trustdoc.com
