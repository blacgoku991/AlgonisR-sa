<#
.SYNOPSIS
    Crée ou met à jour les salles de réunion et les véhicules dans Exchange Online pour Réza.

.DESCRIPTION
    Lit un fichier CSV (voir resources.example.csv) et, pour chaque ligne :
      - crée la boîte aux lettres de ressource (salle = Room, véhicule = Equipment) si elle n'existe pas ;
      - active l'acceptation automatique des réservations, en refusant les conflits ;
      - renseigne capacité, bâtiment, étage et équipements des salles (Set-Place → Places API) ;
      - regroupe les salles dans une liste de salles par bâtiment (Outlook « Recherche de salles ») ;
      - rend les créneaux lisibles par tous (organisateur visible dans le planning Réza).
    Le script est idempotent : il peut être relancé sans risque après modification du CSV.

    Colonnes du CSV :
      Type      : Salle | Vehicule
      Alias     : partie gauche de l'adresse e-mail (ex. salle.everest)
      Name      : nom affiché
      Capacity  : nombre de personnes / places
      Building  : bâtiment (salles)
      Floor     : étage, nombre entier (salles)
      Features  : liste séparée par « ; » parmi screen, video, phone, whiteboard, accessible
                  (électrique, utilitaire… des véhicules : à déclarer dans public/catalog.json)
      Model, Plate, Location : informations véhicule (reportées dans catalog.json par -CatalogOut)

.PARAMETER CsvPath
    Chemin du fichier CSV.
.PARAMETER Domain
    Domaine e-mail de l'entreprise (ex. contoso.com).
.PARAMETER ShowSubjects
    Conserve l'objet des réunions dans le calendrier des ressources (sinon seul l'organisateur est visible).
.PARAMETER CatalogOut
    Écrit un fichier catalog.json prêt à copier dans public/ (véhicules + compléments des salles).

.EXAMPLE
    Install-Module ExchangeOnlineManagement -Scope CurrentUser
    Connect-ExchangeOnline -UserPrincipalName admin@contoso.com
    .\New-RezaResources.ps1 -CsvPath .\resources.csv -Domain contoso.com -CatalogOut ..\..\public\catalog.json
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)] [string] $CsvPath,
    [Parameter(Mandatory)] [string] $Domain,
    [int] $BookingWindowInDays = 180,
    [switch] $ShowSubjects,
    [switch] $SkipRoomLists,
    [string] $CatalogOut
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command Get-EXOMailbox -ErrorAction SilentlyContinue)) {
    throw "Module ExchangeOnlineManagement introuvable. Exécutez : Install-Module ExchangeOnlineManagement ; Connect-ExchangeOnline"
}

$rows = Import-Csv -Path $CsvPath -Encoding UTF8
$catalogRooms = @()
$catalogVehicles = @()

function Invoke-WithRetry([scriptblock] $Action, [string] $What) {
    for ($i = 1; $i -le 4; $i++) {
        try { & $Action; return }
        catch {
            if ($i -eq 4) { Write-Warning "  $What : échec ($($_.Exception.Message)). Relancez le script dans quelques minutes."; return }
            Write-Host "  … $What : nouvelle tentative dans 20 s (propagation Exchange)" -ForegroundColor DarkGray
            Start-Sleep -Seconds 20
        }
    }
}

foreach ($row in $rows) {
    $isRoom = $row.Type -match '^(salle|room)$'
    $email = "$($row.Alias)@$Domain".ToLower()
    $capacity = if ($row.Capacity) { [int]$row.Capacity } else { $null }
    $features = @($row.Features -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ })

    Write-Host "`n▸ $($row.Name) <$email>" -ForegroundColor Cyan

    # 1. Boîte aux lettres de ressource
    $mailbox = Get-EXOMailbox -Identity $email -ErrorAction SilentlyContinue
    if (-not $mailbox) {
        if ($PSCmdlet.ShouldProcess($email, "Créer la boîte aux lettres")) {
            $params = @{ Name = $row.Name; DisplayName = $row.Name; Alias = $row.Alias; PrimarySmtpAddress = $email }
            if ($capacity) { $params.ResourceCapacity = $capacity }
            if ($isRoom) { New-Mailbox @params -Room | Out-Null } else { New-Mailbox @params -Equipment | Out-Null }
            Write-Host "  ✔ Boîte aux lettres créée" -ForegroundColor Green
        }
    } else {
        Write-Host "  • Boîte aux lettres existante"
        if ($capacity) { Set-Mailbox -Identity $email -ResourceCapacity $capacity }
    }

    # 2. Traitement automatique des réservations
    if ($PSCmdlet.ShouldProcess($email, "Configurer l'acceptation automatique")) {
        Invoke-WithRetry -What "Set-CalendarProcessing" -Action {
            Set-CalendarProcessing -Identity $email `
                -AutomateProcessing AutoAccept `
                -AllowConflicts $false `
                -AllowRecurringMeetings $true `
                -BookingWindowInDays $BookingWindowInDays `
                -MaximumDurationInMinutes $(if ($isRoom) { 1440 } else { 20160 }) `
                -AddOrganizerToSubject $true `
                -DeleteSubject $(-not $ShowSubjects) `
                -DeleteComments $false `
                -RemovePrivateProperty $true `
                -ProcessExternalMeetingMessages $false
            Write-Host "  ✔ Acceptation automatique (sans conflit) activée" -ForegroundColor Green
        }
    }

    # 3. Visibilité du calendrier (nom du dossier localisé : Calendar, Calendrier…)
    Invoke-WithRetry -What "Droits du calendrier" -Action {
        $folder = Get-MailboxFolderStatistics -Identity $email -FolderScope Calendar | Where-Object { $_.FolderType -eq "Calendar" } | Select-Object -First 1
        Set-MailboxFolderPermission -Identity "$($email):\$($folder.Name)" -User Default -AccessRights LimitedDetails | Out-Null
        Write-Host "  ✔ Créneaux visibles par les collaborateurs (LimitedDetails)" -ForegroundColor Green
    }

    if ($isRoom) {
        # 4. Métadonnées Places (capacité, bâtiment, étage, équipements)
        $place = @{ Identity = $email }
        if ($capacity) { $place.Capacity = $capacity }
        if ($row.Building) { $place.Building = $row.Building }
        if ($row.Floor -match '^-?\d+$') { $place.Floor = [int]$row.Floor }
        if ($features -contains "screen") { $place.DisplayDeviceName = "Écran" }
        if ($features -contains "video") { $place.VideoDeviceName = "Visioconférence" }
        if ($features -contains "phone") { $place.AudioDeviceName = "Audio" }
        if ($features -contains "accessible") { $place.IsWheelChairAccessible = $true }
        if ($features -contains "whiteboard") { $place.Tags = @("Tableau blanc") }
        if ($PSCmdlet.ShouldProcess($email, "Set-Place")) {
            Invoke-WithRetry -What "Set-Place" -Action { Set-Place @place; Write-Host "  ✔ Capacité / bâtiment / équipements renseignés" -ForegroundColor Green }
        }

        # 5. Liste de salles par bâtiment
        if (-not $SkipRoomLists -and $row.Building) {
            $listName = "Salles - $($row.Building)"
            $list = Get-DistributionGroup -Identity $listName -ErrorAction SilentlyContinue
            if (-not $list -and $PSCmdlet.ShouldProcess($listName, "Créer la liste de salles")) {
                $list = New-DistributionGroup -Name $listName -RoomList
                Write-Host "  ✔ Liste de salles « $listName » créée" -ForegroundColor Green
            }
            if ($list) {
                $members = Get-DistributionGroupMember -Identity $listName | ForEach-Object { $_.PrimarySmtpAddress.ToString().ToLower() }
                if ($members -notcontains $email) {
                    Add-DistributionGroupMember -Identity $listName -Member $email
                    Write-Host "  ✔ Ajoutée à « $listName »" -ForegroundColor Green
                }
            }
        }

        $catalogRooms += [ordered]@{ email = $email; name = $row.Name; capacity = $capacity; building = $row.Building; features = $features }
    } else {
        $catalogVehicles += [ordered]@{
            email = $email; name = $row.Name; model = $row.Model; plate = $row.Plate
            capacity = $capacity; features = $features; location = $row.Location
        }
    }
}

if ($CatalogOut) {
    $catalog = [ordered]@{
        rooms    = [ordered]@{ source = "both"; hide = @(); items = $catalogRooms }
        vehicles = $catalogVehicles
    }
    $catalog | ConvertTo-Json -Depth 6 | Set-Content -Path $CatalogOut -Encoding UTF8
    Write-Host "`n✔ Catalogue écrit : $CatalogOut" -ForegroundColor Green
}

Write-Host "`nTerminé. Les salles apparaissent dans l'API Places (et donc dans Réza) sous 24 h environ ;" -ForegroundColor Yellow
Write-Host "elles sont déjà réservables immédiatement si elles figurent dans catalog.json." -ForegroundColor Yellow
