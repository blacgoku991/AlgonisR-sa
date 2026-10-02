# Guide d'installation — Microsoft 365, Teams et Outlook

Ce guide s'adresse à l'administrateur Microsoft 365. Comptez environ **1 heure** (hors délai de propagation Exchange).

Exemple utilisé : domaine `contoso.com`, application publiée sur `https://reservations.contoso.com`. Remplacez par vos valeurs.

**Rôles nécessaires** : administrateur Exchange (étape 1), administrateur d'applications ou administrateur général (étape 2), administrateur Teams (étape 5).

---

## Étape 1 — Créer les salles et les véhicules dans Exchange

Réza réserve des **boîtes aux lettres de ressource** Exchange :

| Ressource | Type Exchange | Où apparaît-elle ? |
|---|---|---|
| Salle de réunion | Boîte aux lettres de **salle** (*Room*) | Découverte automatiquement (API Places) |
| Véhicule | Boîte aux lettres d'**équipement** (*Equipment*) | Déclarée dans `public/catalog.json` |

Ces boîtes ne nécessitent **aucune licence**.

### Méthode recommandée : script PowerShell

1. Copiez `scripts/exchange/resources.example.csv` en `resources.csv` et décrivez vos ressources :

   ```csv
   Type,Alias,Name,Capacity,Building,Floor,Features,Model,Plate,Location
   Salle,salle.everest,Salle Everest,14,Siège,5,screen;video;phone;accessible,,,
   Vehicule,vehicule.megane,Renault Mégane E-Tech,5,,,electric;automatic;gps,Berline électrique,GH-482-KT,Parking -1 · Place 12
   ```

2. Exécutez (PowerShell 7 recommandé) :

   ```powershell
   Install-Module ExchangeOnlineManagement -Scope CurrentUser
   Connect-ExchangeOnline -UserPrincipalName admin@contoso.com
   cd scripts/exchange
   .\New-RezaResources.ps1 -CsvPath .\resources.csv -Domain contoso.com -CatalogOut ..\..\public\catalog.json
   ```

Le script (relançable sans risque) :

- crée les boîtes aux lettres manquantes ;
- active **l'acceptation automatique** et **refuse les conflits** (deux personnes ne peuvent pas réserver le même créneau) ;
- renseigne capacité, bâtiment, étage et équipements des salles (`Set-Place`) ;
- crée une **liste de salles** par bâtiment (utile aussi dans Outlook) ;
- rend les créneaux visibles par tous (droit *LimitedDetails* : horaires + organisateur) ;
- génère `public/catalog.json` avec vos véhicules.

Options : `-ShowSubjects` pour afficher aussi l'objet des réunions dans le planning (sinon seul l'organisateur est visible), `-BookingWindowInDays 365` pour autoriser les réservations à un an, `-WhatIf` pour simuler.

### Méthode manuelle (centre d'administration Exchange)

1. <https://admin.exchange.microsoft.com> › **Destinataires** › **Ressources** › **Ajouter une ressource** › *Salle* (ou *Équipement* pour un véhicule).
2. Onglet **Réservation** : *Accepter automatiquement les demandes de réunion*, et décochez *Autoriser les demandes de réunion répétées en conflit*.
3. Capacité / bâtiment / étage d'une salle (PowerShell) :

   ```powershell
   Set-Place -Identity salle.everest@contoso.com -Capacity 14 -Building "Siège" -Floor 5 `
     -DisplayDeviceName "Écran" -VideoDeviceName "Visio" -IsWheelChairAccessible $true
   ```

> ⏱️ Les nouvelles salles peuvent mettre **jusqu'à 24 h** à apparaître dans l'API Places. En attendant, ajoutez-les dans `rooms.items` de `public/catalog.json` : elles sont réservables immédiatement.

---

## Étape 2 — Inscrire l'application dans Microsoft Entra ID

### Méthode recommandée : script PowerShell

```powershell
Install-Module Microsoft.Graph.Applications, Microsoft.Graph.Identity.SignIns -Scope CurrentUser
cd scripts/entra
.\Register-RezaApp.ps1 -AppUrl https://reservations.contoso.com -IncludeLocalhost
```

Le script crée l'application, déclare les URI de redirection, demande les autorisations et **accorde le consentement administrateur**. Il affiche les valeurs à copier dans `.env.local`.

### Méthode manuelle (portail Entra)

1. <https://entra.microsoft.com> › **Applications** › **Inscriptions d'applications** › **Nouvelle inscription**.
   - Nom : `Réza – Réservations`
   - Types de comptes : *Comptes dans cet annuaire d'organisation uniquement*
   - URI de redirection : plateforme **Application monopage (SPA)** → `https://reservations.contoso.com/redirect.html`
2. **Authentification** › plateforme *Application monopage* › ajoutez :
   - `brk-multihub://reservations.contoso.com` (authentification unique dans Teams / Outlook / Microsoft 365)
   - `http://localhost:5173/redirect.html` (facultatif, pour le développement)
3. **Autorisations de l'API** › *Ajouter une autorisation* › **Microsoft Graph** › **Autorisations déléguées** :

   | Autorisation | Utilisation |
   |---|---|
   | `User.Read` | Profil de l'utilisateur connecté |
   | `User.ReadBasic.All` | Photos et recherche des collègues |
   | `People.Read` | Suggestions d'invités |
   | `Calendars.ReadWrite` | Disponibilités, création et annulation des réservations |
   | `Place.Read.All` | Liste des salles |

4. Cliquez sur **Accorder un consentement d'administrateur pour …**.
5. Notez l'**ID d'application (client)** et l'**ID de l'annuaire (locataire)** (page *Vue d'ensemble*).

> Il s'agit uniquement d'autorisations **déléguées** : l'application agit au nom de l'utilisateur connecté et ne peut rien faire de plus que lui. Aucun secret client n'est créé.

---

## Étape 3 — Configurer l'application

```bash
cp .env.example .env.local
```

```ini
VITE_AZURE_CLIENT_ID=<ID d'application>
VITE_AZURE_TENANT_ID=<ID du locataire>
VITE_APP_NAME=Réza
VITE_COMPANY_NAME=AlgonisR
APP_PUBLIC_URL=https://reservations.contoso.com
TEAMS_APP_ID=<un GUID, généré au premier « npm run teams:package »>
```

Vérifiez `public/catalog.json` (véhicules, compléments des salles) — voir le [README](../README.md#configuration).

Test local : `npm run dev`, puis <http://localhost:5173> (nécessite l'URI `http://localhost:5173/redirect.html` à l'étape 2).

---

## Étape 4 — Déployer

L'application est un site statique (`npm run build` → dossier `dist/`). Exigences de l'hébergement :

- **HTTPS** obligatoire ;
- autoriser l'affichage dans Teams/Outlook (en-tête `Content-Security-Policy: frame-ancestors …`, sans `X-Frame-Options: DENY`) ;
- servir `redirect.html` avec `Cache-Control: no-store`.

### Azure Static Web Apps (recommandé, offre gratuite)

La configuration `staticwebapp.config.json` fournie applique déjà ces en-têtes.

1. Portail Azure › **Créer une ressource** › **Static Web App** › offre *Free*.
2. Source : ce dépôt GitHub, branche principale. Préréglage de build : **Custom** ; *App location* `/` ; *Output location* `dist`.
3. Azure ajoute un workflow GitHub Actions. Les variables `VITE_*` étant lues **à la compilation**, ajoutez-les à l'étape de build de ce workflow (ce ne sont pas des secrets : ce sont des identifiants publics) :

   ```yaml
   - name: Build And Deploy
     uses: Azure/static-web-apps-deploy@v1
     env:
       VITE_AZURE_CLIENT_ID: ${{ vars.VITE_AZURE_CLIENT_ID }}
       VITE_AZURE_TENANT_ID: ${{ vars.VITE_AZURE_TENANT_ID }}
       VITE_COMPANY_NAME: AlgonisR
     with:
       # … paramètres générés par Azure …
       app_location: "/"
       output_location: "dist"
   ```

   et créez les variables `VITE_AZURE_CLIENT_ID` / `VITE_AZURE_TENANT_ID` dans *GitHub › Settings › Secrets and variables › Actions › Variables*.
4. (Facultatif) **Domaines personnalisés** › `reservations.contoso.com`.

### Autres hébergements

IIS, Nginx, Netlify, Vercel… conviennent : reproduisez les en-têtes de `staticwebapp.config.json`.

---

## Étape 5 — Publier dans Teams et Outlook

1. Générez le package :

   ```bash
   npm run teams:package
   ```

   → `teams/build/reza-teams.zip` (manifeste + icônes). Conservez le `TEAMS_APP_ID` affiché dans `.env.local` pour les mises à jour.

2. <https://admin.teams.microsoft.com> › **Applications Teams** › **Gérer les applications** › **Charger une nouvelle application** › sélectionnez le `.zip`.
3. **Applications Teams** › **Stratégies de configuration** › *Global (par défaut à l'échelle de l'organisation)* › **Applications épinglées** › *Ajouter des applications* › Réza. L'application apparaît dans la barre latérale de Teams de tous les collaborateurs (propagation : quelques heures).
4. **Outlook et Microsoft 365** : rien à faire. Les applications personnelles Teams sont automatiquement disponibles dans Outlook (web et nouvel Outlook pour Windows) et sur microsoft365.com, rubrique **Applications**.

Dans Teams et Outlook, la connexion est automatique (*Nested App Authentication*) : aucun écran de connexion supplémentaire.

> Pour un test avant diffusion : Teams › **Applications** › **Gérer vos applications** › **Charger une application** › *Charger une application personnalisée* (si la stratégie le permet).

---

## Ce que voient les utilisateurs

1. **Réserver** : choix du jour, de l'heure et de la durée → les ressources libres s'affichent en premier.
2. **Panneau de réservation** : objet, invités (avec leur disponibilité), option *Réunion Teams*, message.
3. **Validation** : l'événement est créé dans leur calendrier ; les invités reçoivent l'invitation Outlook ; la salle ou le véhicule confirme automatiquement.
4. **Mes réservations** : rejoindre, ouvrir dans Outlook, annuler (les invités sont prévenus et la ressource est libérée).

---

## Dépannage

| Symptôme | Cause probable / solution |
|---|---|
| « Aucune salle configurée » | Salles pas encore visibles dans l'API Places (attendre 24 h) ou consentement `Place.Read.All` manquant → ajoutez-les dans `rooms.items` de `catalog.json`. |
| Carte « Indisponible » | L'adresse e-mail de la ressource est erronée ou la boîte n'existe pas (vérifiez `catalog.json`). |
| Réservation « En attente » qui reste ainsi | La boîte de ressource n'est pas en acceptation automatique : `Set-CalendarProcessing -Identity <adresse> -AutomateProcessing AutoAccept`. |
| Réservation « Refusée » | Créneau déjà pris, hors fenêtre de réservation (`BookingWindowInDays`) ou durée trop longue (`MaximumDurationInMinutes`). |
| `AADSTS50011` (redirect URI mismatch) | L'URI `https://<domaine>/redirect.html` n'est pas déclarée en plateforme **SPA** dans Entra ID. |
| `AADSTS65001` (consentement) | Accordez le consentement administrateur (étape 2). |
| Écran blanc dans Teams | Le domaine n'est pas dans `validDomains` (régénérez le package avec le bon `APP_PUBLIC_URL`) ou l'hébergeur bloque l'affichage en iframe (`frame-ancestors`). |
| Pas de photo de profil | Normal pour les invités externes ; sinon vérifiez `User.ReadBasic.All`. |
