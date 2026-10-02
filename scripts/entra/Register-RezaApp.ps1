<#
.SYNOPSIS
    Inscrit l'application Réza dans Microsoft Entra ID et accorde le consentement administrateur.

.DESCRIPTION
    - Crée l'inscription d'application (plateforme « Application monopage / SPA ») ;
    - déclare les URI de redirection : navigateur (/redirect.html) et Teams/Outlook (brk-multihub://) ;
    - demande les autorisations Microsoft Graph déléguées nécessaires ;
    - accorde le consentement administrateur pour toute l'organisation ;
    - affiche les valeurs à copier dans .env.local.

    Autorisations déléguées (l'application agit uniquement au nom de l'utilisateur connecté) :
      User.Read           Profil de l'utilisateur connecté
      User.ReadBasic.All  Photos et recherche de collègues
      People.Read         Suggestions de participants
      Calendars.ReadWrite Disponibilités, création et annulation des réservations
      Calendars.ReadWrite.Shared  Accueil : suivi des clés sur le calendrier des véhicules
                          (n'ouvre aucun accès en soi : Exchange ne l'autorise qu'au groupe Accueil)
      Place.Read.All      Liste des salles de réunion Exchange

.PARAMETER AppUrl
    URL HTTPS publique de l'application, sans « / » final (ex. https://reservations.contoso.com).

.EXAMPLE
    Install-Module Microsoft.Graph.Applications, Microsoft.Graph.Identity.SignIns -Scope CurrentUser
    .\Register-RezaApp.ps1 -AppUrl https://reservations.contoso.com -IncludeLocalhost
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [ValidatePattern('^https://[^/]+$')] [string] $AppUrl,
    [string] $DisplayName = "Réza – Réservations",
    [switch] $IncludeLocalhost
)

$ErrorActionPreference = "Stop"
Import-Module Microsoft.Graph.Applications
Import-Module Microsoft.Graph.Identity.SignIns

Connect-MgGraph -Scopes "Application.ReadWrite.All", "DelegatedPermissionGrant.ReadWrite.All" -NoWelcome

$graphAppId = "00000003-0000-0000-c000-000000000000"
$graphSp = Get-MgServicePrincipal -Filter "appId eq '$graphAppId'"
$scopes = @("User.Read", "User.ReadBasic.All", "People.Read", "Calendars.ReadWrite", "Calendars.ReadWrite.Shared", "Place.Read.All")

$resourceAccess = foreach ($name in $scopes) {
    $scope = $graphSp.Oauth2PermissionScopes | Where-Object { $_.Value -eq $name }
    if (-not $scope) { throw "Autorisation Graph introuvable : $name" }
    @{ Id = $scope.Id; Type = "Scope" }
}

$appHost = ([Uri]$AppUrl).Host
$redirectUris = @("$AppUrl/redirect.html", "brk-multihub://$appHost")
if ($IncludeLocalhost) { $redirectUris += "http://localhost:5173/redirect.html" }

Write-Host "Création de l'application « $DisplayName »…" -ForegroundColor Cyan
$app = New-MgApplication -DisplayName $DisplayName `
    -SignInAudience "AzureADMyOrg" `
    -GroupMembershipClaims "SecurityGroup" `
    -Spa @{ RedirectUris = $redirectUris } `
    -RequiredResourceAccess @(@{ ResourceAppId = $graphAppId; ResourceAccess = $resourceAccess })

$sp = New-MgServicePrincipal -AppId $app.AppId

Write-Host "Consentement administrateur pour l'organisation…" -ForegroundColor Cyan
New-MgOauth2PermissionGrant -BodyParameter @{
    ClientId    = $sp.Id
    ConsentType = "AllPrincipals"
    ResourceId  = $graphSp.Id
    Scope       = ($scopes -join " ")
} | Out-Null

$tenantId = (Get-MgContext).TenantId

Write-Host "`n✔ Application inscrite. Ajoutez ces lignes à .env.local :`n" -ForegroundColor Green
Write-Host "VITE_AZURE_CLIENT_ID=$($app.AppId)"
Write-Host "VITE_AZURE_TENANT_ID=$tenantId"
Write-Host "APP_PUBLIC_URL=$AppUrl"
Write-Host "VITE_RECEPTION_GROUP_ID=<ID d'objet du groupe Accueil>  (Entra › Groupes › Accueil › ID d'objet)"
Write-Host "`nURI de redirection déclarés :" -ForegroundColor DarkGray
$redirectUris | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
