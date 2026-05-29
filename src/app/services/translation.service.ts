import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface Translations { [key: string]: { [key: string]: string } }

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private translations: Translations = {
    en: {
      // Nav
      logo: 'AGOCAR', dashboard: 'Dashboard', myCars: 'My Cars',
      bureaus: 'Bureaus', profile: 'Profile', settings: 'Settings',
      logout: 'Logout', language: 'Language', hello: 'Hello',
      welcome: 'Welcome to AGOCAR',

      // Common actions
      view: 'View', edit: 'Edit', delete: 'Delete', save: 'Save',
      saving: 'Saving...', cancel: 'Cancel', close: 'Close',
      retry: 'Retry', previous: 'Previous', next: 'Next', all: 'All',
      add: 'Add', search: 'Search', confirm: 'Confirm',

      // Common states
      loading: 'Loading...', noData: 'No data found',
      loadError: 'Failed to load data. Please try again.',
      carAlreadyReserved: 'This vehicle is already reserved for the selected dates.',
      booked: 'Booked',

      // Calendar
      today: 'Today', thisMonth: 'This Month', fleetCalendar: 'Fleet Calendar',
      confirmed: 'Confirmed', inProgress: 'In Progress', pending: 'Pending',
      cancelled: 'Cancelled', more: 'more',

      // Top header
      newClient: 'New Client', newBooking: 'New Booking', netProfit: 'Net Profit', clientsOwed: 'Clients Owe',
      calendar: 'Calendar',

      // Dashboard
      available: 'Available', activeRentals: 'Active Rentals',
      totalRevenue: 'Total Revenue', recentReservations: 'Recent Reservations',
      client: 'Client', car: 'Car', date: 'Date',
      noReservations: 'No recent reservations',
      expenses: 'Expenses', revenue: 'Revenue', occupancyRate: 'Occupancy',
      activeBookings: 'Active Bookings', totalCars: 'Total Cars',
      monthlySummary: 'Monthly Summary', fleetStatus: 'Fleet Status',
      paymentDistribution: 'Payment Distribution', paymentStatus: 'Payment Status', recentBookings: 'Recent Bookings',
      bookedCars: 'Booked', availableCars: 'Available', soldCars: 'Sold',
      financialOverview: 'Financial Overview', bookingStats: 'Booking Statistics',
      lastReservations: 'Last 10 Reservations', upcoming: 'Upcoming', done: 'Completed',

      // Reservation create/list
      dailyRate: 'Daily Rate', numberOfDays: 'Number of Days',
      totalAmount: 'Total Amount', amountPaid: 'Amount Paid', remaining: 'Remaining',
      createBooking: 'Create Booking', searchClient: 'Search client...',
      clientSearchPlaceholder: 'Search by name, email, CIN, driver license...',
      addNewClient: 'Add New Client', selectVehicle: 'Select Vehicle',
      accessories: 'Accessories', paymentMethod: 'Payment Method',
      activeContracts: 'Active Contracts', upcomingDepartures: 'Upcoming Departures',
      historicalRecords: 'Historical Records', startDate: 'Start Date', endDate: 'End Date',
      duration: 'Duration', days: 'days', paid: 'Paid', unpaid: 'Unpaid', partial: 'Partial',
      notes: 'Notes', returnDate: 'Return Date', departureDate: 'Departure Date',

      // Voiture
      addCar: 'Add Vehicle', list: 'List', finance: 'Finance', users: 'Users',
      noCars: 'No vehicles found.',
      vehicleDetails: 'Vehicle Details', editVehicle: 'Edit Vehicle',
      brand: 'Brand', model: 'Model', year: 'Year', pricePerDay: 'Price/day',
      mileage: 'Mileage', fuel: 'Fuel type', color: 'Color', ac: 'Air conditioning',
      status: 'Status', uploadImage: 'Upload vehicle photo',
      addNewVehicle: 'Add New Vehicle',
      disponible: 'Available', louee: 'Rented', maintenance: 'Maintenance',
      essence: 'Gasoline', diesel: 'Diesel', hybride: 'Hybrid', electrique: 'Electric',

      // Bureau
      manageOffices: 'Manage your office locations',
      addBureau: 'Add Bureau', searchByName: 'Search by name...',
      active: 'Active', inactive: 'Inactive',
      actif: 'Active', inactif: 'Inactive',
      loadingBureaus: 'Loading bureaus...', noBureaus: 'No bureaus found',
      name: 'Name', address: 'Address', created: 'Created', updated: 'Updated',
      bureauDetails: 'Bureau Details', editBureau: 'Edit Bureau',
      confirmDelete: 'Confirm Delete',
      deleteWarning: 'Are you sure you want to delete this item? This action cannot be undone.',
      cannotDelete: 'Cannot delete: this vehicle has associated records (contracts, reservations…). Archive it instead.',
      archiveInstead: 'Archive instead',
      nameRequired: 'Name is required',
      actions: 'Actions', yes: 'Yes', no: 'No',

      // Sidebar groups
      groupOperations: 'Operations', groupFleet: 'Fleet',
      groupMaintenance: 'Maintenance', groupFinance: 'Finance', groupAdmin: 'Admin',

      // Entity names (plural)
      clients: 'Clients', reservations: 'Reservations', contrats: 'Contracts',
      paiements: 'Payments', clientPayments: 'Client Payments', addPayment: 'Add Payment', totalCollected: 'Total Collected', reservationDates: 'Reservation Dates', payments: 'Payments',
      reparations: 'Repairs', vidanges: 'Oil Changes',
      adblue: 'AdBlue', suiviTechnique: 'Technical Inspection', assurances: 'Insurance',
      depenses: 'Expenses', credits: 'Credits', infractions: 'Infractions',
      accessoires: 'Accessories', utilisateurs: 'Users', vignettes: 'Vignettes',

      // Entity names (singular)
      reservation: 'Reservation', contrat: 'Contract', paiement: 'Payment',
      reparation: 'Repair', vidange: 'Oil Change', assurance: 'Insurance',
      depense: 'Expense', credit: 'Credit', infraction: 'Infraction',
      accessoire: 'Accessory', utilisateur: 'User', vignette: 'Vignette',

      // Form fields
      montant: 'Amount', dateDebut: 'Start Date', dateFin: 'End Date',
      compagnie: 'Company', numeroPolice: 'Policy Number',
      quantiteLitres: 'Quantity (L)', cout: 'Cost', garage: 'Garage',
      modePaiement: 'Payment Method', cin: 'CIN', telephone: 'Phone',
      prenom: 'First Name', permisConduire: 'Driver License',
      passeport: 'Passport', nationalite: 'Nationality', allNationalities: 'All Nationalities',
      categorie: 'Category', kilometrage: 'Mileage',
      prochainKilometrage: 'Next Mileage', type: 'Type', description: 'Description',
      voitureId: 'Vehicle ID', clientId: 'Client ID', contratId: 'Contract ID', depenseId: 'Expense ID',
      filtreAir: 'Air Filter', filtreHuile: 'Oil Filter', filtreCarburant: 'Fuel Filter',
      numeroContrat: 'Contract No.',
      dateEntree: 'Entry Date', dateSortie: 'Exit Date', datePaiement: 'Payment Date',
      prixJour: 'Price/Day', annee: 'Year', montantTotal: 'Total Amount',
      mensualite: 'Monthly Payment', dureeMois: 'Months', apport: 'Down Payment', dernierMensualite: 'Last Month', months: 'months',
      describeInfraction: 'Describe the infraction...',

      // Forms
      required: 'required', invalidEmail: 'Invalid email',
      passwordMin: 'Password must be at least 8 characters',
      passwordMismatch: 'Passwords do not match',
      emailLabel: 'Email', passwordLabel: 'Password',
      confirmPasswordLabel: 'Confirm Password',
      loginBtn: 'Login', registerBtn: 'Register',
      loginTitle: 'Sign in to AGOCAR', registerTitle: 'Create Account',
      noAccount: "Don't have an account?", hasAccount: 'Already have an account?',
      loginLink: 'Sign in', registerLink: 'Register',

      // ── Fleet Management ──────────────────────────────────────────────────
      fleetManagement: 'Fleet Management', fleetManagementDesc: 'Manage and monitor all vehicles in your fleet.', fleetOverview: 'Fleet Overview',
      vehicleProfile: 'Vehicle Profile', addVehicle: 'Add Vehicle',
      viewFleet: 'View Fleet', select: 'Select',

      // Status labels
      horsService: 'Document Problem', vendu: 'Sold', archive: 'Archived',
      hors_service: 'Document Problem',

      // Technical fields
      version: 'Version / Trim', vin: 'VIN / Chassis',
      immatriculation: 'License Plate', licensePlate: 'License Plate',
      transmission: 'Transmission', manuelle: 'Manual', automatique: 'Automatic',
      puissanceCv: 'Engine Power (hp)', enginePower: 'Engine Power',
      places: 'Seats', portes: 'Doors', vehicleCategory: 'Category',
      plate: 'Plate', hp: 'HP',

      // Financial fields
      purchaseDate: 'Purchase Date', dateAchat: 'Purchase Date',
      purchasePrice: 'Purchase Price', prixAchat: 'Purchase Price',
      weeklyRate: 'Weekly Rate', prixSemaine: 'Weekly Rate',
      monthlyRate: 'Monthly Rate', prixMois: 'Monthly Rate',
      deposit: 'Security Deposit', caution: 'Security Deposit',
      daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',

      // Administrative / Document fields
      insuranceExpiry: 'Insurance Expiry', dateExpirationAssurance: 'Insurance Expiry',
      vignetteExpiry: 'Vignette Expiry', dateExpirationVignette: 'Vignette Expiry',
      technicalExpiry: 'Technical Inspection', dateExpirationVisite: 'Technical Inspection',
      insuranceDoc: 'Insurance', vignetteDoc: 'Vignette', technicalDoc: 'Technical Inspection',
      registration: 'Registration',

      // Alerts
      alertExpired: 'Expired', alertExpiring: 'Expiring Soon',
      expiresIn: 'Expires in', expiredSince: 'Expired since',
      daysLeft: 'days left', daysAgo: 'days ago',
      noAlerts: 'No alerts', noExpiry: 'No expiry date', documentAlerts: 'Document Alerts',
      alertsPanel: 'Alerts & Notifications',
      expiredDocuments: 'Expired Documents', dueThisMonth: 'Due This Month',
      carsInRepair: 'Cars in Repair', ongoing: 'Ongoing',

      // Fleet stats & UI
      totalFleet: 'Total Fleet', filterByStatus: 'Filter by status',
      filterByFuel: 'Filter by fuel', allFuelTypes: 'Fuel: All Types',
      allTransmissions: 'Transmission: All', allBodyStyles: 'Body Style: All',
      resetFilters: 'Reset Filters',
      gridView: 'Grid', tableView: 'Table',
      currentStatus: 'Current Status', changeStatus: 'Change Status',
      selectStatus: 'Select Status', lastUpdate: 'Last Updated',
      noImages: 'No images', dropImages: 'Drop images here or click to upload',
      vehicleImages: 'Vehicle Images', mainImage: 'Main Image', changeImage: 'Change Image',
      addImages: 'Add Images', gallery: 'Gallery', imageManagement: 'Image Management',

      // Detail page tabs
      overview: 'Overview', technical: 'Technical', financial: 'Financial',
      administrative: 'Administrative', documents: 'Documents',
      technicalSpecs: 'Technical Specs', technicalInfo: 'Technical Info',
      financialInfo: 'Financial Info', adminInfo: 'Administrative Info',
      vehicleInfo: 'Vehicle Info', insuranceInfo: 'Insurance Info',

      // Fleet actions
      duplicateVehicle: 'Duplicate', archiveVehicle: 'Archive',
      markAsSold: 'Mark as Sold', restoreVehicle: 'Restore',
      exportData: 'Export',

      // Insurance Management page
      insuranceManagement: 'Insurance Management',
      managePoliciesDesc: 'Manage vehicle insurance contracts, expirations, and coverage status',
      activePolicies: 'Active Policies', expiringSoon: 'Expiring Soon',
      expiredPolicies: 'Expired', totalInsuranceCost: 'Total Insurance Cost',
      addInsurance: 'Add Insurance', renewInsurance: 'Renew',
      typeAssurance: 'Coverage Type', allStatuses: 'All Statuses',
      allCompanies: 'All Companies', noPolicies: 'No insurance policies found',
      addFirstPolicy: 'Add your first insurance contract to get started.',
      policyAlerts: 'Attention Required', requireAttention: 'policies',
      overdue: 'Overdue', policies: 'policies',
      currentExpiry: 'Current expiry', confirmRenew: 'Confirm Renewal',
      policyDetails: 'Policy Details', dates: 'Dates',

      // Vehicle Sales page
      ventes: 'Vehicle Sales', vente: 'Sale',
      sellCar: 'Sell', sellCarDesc: 'Record and manage sold vehicles.',
      saleDate: 'Sale Date', salePrice: 'Sale Price',
      buyer: 'Buyer', buyerName: 'Buyer name...',
      soldVehicles: 'Sold Vehicles', availableToSell: 'Available to Sell',
      confirmSale: 'Confirm Sale',
      noCarsToSell: 'No vehicles available to sell.',
      noSoldCars: 'No sold vehicles recorded yet.',
      sellWarning: 'This will mark the vehicle as sold. The status change is recorded in the vehicle file.',
      soldCar: 'Sold Vehicle', profit: 'Profit',

      // Finance / stats
      profitability: 'Profitability', roi: 'ROI',
      totalRentals: 'Total Rentals', avgDailyRevenue: 'Avg Daily Revenue',
      totalExpenses: 'Total Expenses',
      revenueGenerated: 'Revenue Generated',

      // Availability filter
      availabilityFilter: 'Availability check',
      checkAvailability: 'Results updated for selected period',
      clearDates: 'Clear dates',
      from: 'From', to: 'To',
      availableForPeriod: 'Free', bookedForPeriod: 'Booked',

      // Vehicle detail page extras
      photos: 'Photos', reservationHistory: 'Reservation History',
      moreActions: 'More', monthlyEstimate: 'Monthly Estimate',
      occupancyEst: 'Occupancy Est.', noVehicleReservations: 'No reservations for this vehicle.',
      expiresOn: 'Expires on', renewDoc: 'Renew', uploadDoc: 'Upload',
      vehicleSummary: 'Vehicle Summary', technicalSummary: 'Technical Summary',
      financialSummary: 'Financial Summary', docStatus: 'Document Status',

      // Calendar mobile views
      month: 'Month', week: 'Week', day: 'Day', agenda: 'Agenda',
      noBookingsForDay: 'No bookings for this day.',
      noUpcomingReservations: 'No upcoming reservations.',

      // ── Car Purchase & Financing ──────────────────────────────────────────
      groupPurchases: 'Purchases',
      carPurchases: 'Car Purchases', carPurchase: 'Car Purchase',
      suppliers: 'Suppliers', supplier: 'Supplier',
      supplierDetails: 'Supplier Details',
      monthlyPayments: 'Monthly Payments',
      companyName: 'Company Name', contactPerson: 'Contact Person',
      taxId: 'Tax ID (ICE)', bankInfo: 'Bank Information', city: 'City',
      purchaseDetails: 'Purchase Details',
      financingType: 'Financing Type', creditDetails: 'Credit Details',
      comptant: 'Cash', creditFinancing: 'Credit Financing', leasing: 'Leasing',
      tauxInteret: 'Interest Rate (%)', dateDebutCredit: 'Credit Start Date',
      resteAFinancer: 'Amount to Finance',
      financingSummary: 'Financing Summary',
      paymentSchedule: 'Payment Schedule',
      installmentNum: 'Installment #', dueDate: 'Due Date',
      monthlyAmount: 'Amount', remainingBalance: 'Remaining Balance',
      installments: 'Installments',
      brouillon: 'Draft',
      achatActif: 'Active', achatTermine: 'Completed',
      achatAnnule: 'Cancelled',
      achat_brouillon: 'Draft', achat_actif: 'Active',
      achat_termine: 'Completed', achat_annule: 'Cancelled', achat_archive: 'Archived',
      pay_pending: 'Pending', pay_paid: 'Paid', pay_late: 'Overdue', pay_partial: 'Partial',
      allTypes: 'All Types', allVehicles: 'All Vehicles',
      markAsPaid: 'Mark Paid', recordPayment: 'Record Payment',
      confirmPayment: 'Confirm Payment', totalDue: 'Total Due',
      uploadInvoice: 'Upload Invoice', previewInvoice: 'Preview', downloadInvoice: 'Download',
      replaceInvoice: 'Replace', removeInvoice: 'Remove', invoice: 'Invoice',
      chooseFile: 'Choose File', upload: 'Upload',
      noInstallments: 'No installments to display.',
      totalFinanced: 'Financed', remainingDebt: 'Remaining Debt',
      monthlyPaymentTotal: 'Monthly Due', overduePayments: 'Overdue',
      outstanding: 'outstanding', perMonth: 'per month', vehicles: 'vehicles',
    },

    fr: {
      logo: 'AGOCAR', dashboard: 'Tableau de Bord', myCars: 'Mes Voitures',
      bureaus: 'Bureaux', profile: 'Profil', settings: 'Paramètres',
      logout: 'Déconnexion', language: 'Langue', hello: 'Bonjour',
      welcome: 'Bienvenue sur AGOCAR',

      view: 'Voir', edit: 'Modifier', delete: 'Supprimer', save: 'Enregistrer',
      saving: 'Enregistrement...', cancel: 'Annuler', close: 'Fermer',
      retry: 'Réessayer', previous: 'Précédent', next: 'Suivant', all: 'Tout',
      add: 'Ajouter', search: 'Chercher', confirm: 'Confirmer',

      loading: 'Chargement...', noData: 'Aucune donnée trouvée',
      loadError: 'Échec du chargement. Veuillez réessayer.',
      carAlreadyReserved: 'Ce véhicule est déjà réservé pour les dates sélectionnées.',
      booked: 'Réservé',

      // Calendrier
      today: "Aujourd'hui", thisMonth: 'Ce Mois', fleetCalendar: 'Calendrier Flotte',
      confirmed: 'Confirmé', inProgress: 'En Cours', pending: 'En Attente',
      cancelled: 'Annulé', more: 'de plus',

      // Top header
      newClient: 'Nouveau client', newBooking: 'Nouvelle réservation', netProfit: 'Bénéfice net', clientsOwed: 'Dû par clients',
      calendar: 'Calendrier',

      available: 'Disponible', activeRentals: 'Locations actives',
      totalRevenue: 'Revenus totaux', recentReservations: 'Réservations récentes',
      client: 'Client', car: 'Véhicule', date: 'Date',
      noReservations: 'Aucune réservation récente',
      expenses: 'Dépenses', revenue: 'Revenus', occupancyRate: 'Occupation',
      activeBookings: 'Réservations actives', totalCars: 'Total véhicules',
      monthlySummary: 'Résumé mensuel', fleetStatus: 'État de la flotte',
      paymentDistribution: 'Répartition des paiements', paymentStatus: 'Statut paiement', recentBookings: 'Réservations récentes',
      bookedCars: 'Louées', availableCars: 'Disponibles', soldCars: 'Vendues',
      financialOverview: 'Aperçu financier', bookingStats: 'Statistiques de réservation',
      lastReservations: '10 Dernières Réservations', upcoming: 'À venir', done: 'Terminé',

      // Reservation create/list
      dailyRate: 'Tarif journalier', numberOfDays: 'Nombre de jours',
      totalAmount: 'Montant total', amountPaid: 'Montant payé', remaining: 'Reste à payer',
      createBooking: 'Créer une réservation', searchClient: 'Rechercher un client...',
      clientSearchPlaceholder: 'Rechercher par nom, email, CIN, permis...',
      addNewClient: 'Ajouter un client', selectVehicle: 'Sélectionner un véhicule',
      accessories: 'Accessoires', paymentMethod: 'Mode de paiement',
      activeContracts: 'Contrats actifs', upcomingDepartures: 'Départs prochains',
      historicalRecords: 'Historique', startDate: 'Date début', endDate: 'Date fin',
      duration: 'Durée', days: 'jours', paid: 'Payé', unpaid: 'Non payé', partial: 'Partiel',
      notes: 'Notes', returnDate: 'Date retour', departureDate: 'Date départ',

      addCar: 'Ajouter un véhicule', list: 'Liste', finance: 'Finance', users: 'Utilisateurs',
      noCars: 'Aucun véhicule trouvé.',
      vehicleDetails: 'Détails du véhicule', editVehicle: 'Modifier le véhicule',
      brand: 'Marque', model: 'Modèle', year: 'Année', pricePerDay: 'Prix/jour',
      mileage: 'Kilométrage', fuel: 'Carburant', color: 'Couleur', ac: 'Climatisation',
      status: 'Statut', uploadImage: 'Télécharger une photo',
      addNewVehicle: 'Nouveau Véhicule',
      disponible: 'Disponible', louee: 'Louée', maintenance: 'Maintenance',
      essence: 'Essence', diesel: 'Diesel', hybride: 'Hybride', electrique: 'Électrique',

      manageOffices: 'Gérer vos bureaux',
      addBureau: 'Ajouter un bureau', searchByName: 'Rechercher par nom...',
      active: 'Actif', inactive: 'Inactif',
      actif: 'Actif', inactif: 'Inactif',
      loadingBureaus: 'Chargement des bureaux...', noBureaus: 'Aucun bureau trouvé',
      name: 'Nom', address: 'Adresse', created: 'Créé', updated: 'Modifié',
      bureauDetails: 'Détails du bureau', editBureau: 'Modifier le bureau',
      confirmDelete: 'Confirmer la suppression',
      deleteWarning: 'Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.',
      cannotDelete: 'Impossible de supprimer : ce véhicule possède des enregistrements liés (contrats, réservations…). Archivez-le plutôt.',
      archiveInstead: 'Archiver à la place',
      nameRequired: 'Le nom est requis',
      actions: 'Actions', yes: 'Oui', no: 'Non',

      groupOperations: 'Opérations', groupFleet: 'Flotte',
      groupMaintenance: 'Maintenance', groupFinance: 'Finance', groupAdmin: 'Admin',

      clients: 'Clients', reservations: 'Réservations', contrats: 'Contrats',
      paiements: 'Paiements', clientPayments: 'Paiements clients', addPayment: 'Ajouter paiement', totalCollected: 'Total encaissé', reservationDates: 'Dates réservation', payments: 'Paiements',
      reparations: 'Réparations', vidanges: 'Vidanges',
      adblue: 'AdBlue', suiviTechnique: 'Contrôle Technique', assurances: 'Assurances',
      depenses: 'Dépenses', credits: 'Crédits', infractions: 'Infractions',
      accessoires: 'Accessoires', utilisateurs: 'Utilisateurs', vignettes: 'Vignettes',

      reservation: 'Réservation', contrat: 'Contrat', paiement: 'Paiement',
      reparation: 'Réparation', vidange: 'Vidange', assurance: 'Assurance',
      depense: 'Dépense', credit: 'Crédit', infraction: 'Infraction',
      accessoire: 'Accessoire', utilisateur: 'Utilisateur', vignette: 'Vignette',

      montant: 'Montant', dateDebut: 'Date début', dateFin: 'Date fin',
      compagnie: 'Compagnie', numeroPolice: 'Numéro police',
      quantiteLitres: 'Quantité (L)', cout: 'Coût', garage: 'Garage',
      modePaiement: 'Mode paiement', cin: 'CIN', telephone: 'Téléphone',
      prenom: 'Prénom', permisConduire: 'Permis de conduire',
      passeport: 'Passeport', nationalite: 'Nationalité', allNationalities: 'Toutes les nationalités',
      categorie: 'Catégorie', kilometrage: 'Kilométrage',
      prochainKilometrage: 'Prochain kilométrage', type: 'Type', description: 'Description',
      voitureId: 'ID Véhicule', clientId: 'ID Client', contratId: 'ID Contrat', depenseId: 'ID Dépense',
      filtreAir: 'Filtre à air', filtreHuile: 'Filtre à huile', filtreCarburant: 'Filtre carburant',
      numeroContrat: 'N° Contrat',
      dateEntree: 'Date entrée', dateSortie: 'Date sortie', datePaiement: 'Date paiement',
      prixJour: 'Prix/Jour', annee: 'Année', montantTotal: 'Montant total',
      mensualite: 'Mensualité', dureeMois: 'Mois', apport: 'Apport', dernierMensualite: 'Dernier mois', months: 'mois',
      describeInfraction: "Décrire l'infraction...",

      required: 'requis', invalidEmail: 'Email invalide',
      passwordMin: 'Le mot de passe doit comporter au moins 8 caractères',
      passwordMismatch: 'Les mots de passe ne correspondent pas',
      emailLabel: 'Email', passwordLabel: 'Mot de passe',
      confirmPasswordLabel: 'Confirmer le mot de passe',
      loginBtn: 'Connexion', registerBtn: "S'inscrire",
      loginTitle: 'Connexion à AGOCAR', registerTitle: 'Créer un compte',
      noAccount: 'Pas encore de compte ?', hasAccount: 'Déjà un compte ?',
      loginLink: 'Se connecter', registerLink: "S'inscrire",

      // ── Gestion de flotte ──────────────────────────────────────────────────
      fleetManagement: 'Gestion de flotte', fleetManagementDesc: 'Gérez et surveillez tous les véhicules de votre flotte.', fleetOverview: 'Vue d\'ensemble',
      vehicleProfile: 'Fiche véhicule', addVehicle: 'Ajouter un véhicule',
      viewFleet: 'Voir la flotte', select: 'Sélectionner',

      horsService: 'Problème de documents', vendu: 'Vendu', archive: 'Archivé',
      hors_service: 'Problème de documents',

      version: 'Version / Finition', vin: 'N° Chassis / VIN',
      immatriculation: 'Immatriculation', licensePlate: 'Immatriculation',
      transmission: 'Transmission', manuelle: 'Manuelle', automatique: 'Automatique',
      puissanceCv: 'Puissance (CV)', enginePower: 'Puissance moteur',
      places: 'Places', portes: 'Portes', vehicleCategory: 'Catégorie',
      plate: 'Immat.', hp: 'CV',

      purchaseDate: 'Date d\'achat', dateAchat: 'Date d\'achat',
      purchasePrice: 'Prix d\'achat', prixAchat: 'Prix d\'achat',
      weeklyRate: 'Tarif semaine', prixSemaine: 'Tarif semaine',
      monthlyRate: 'Tarif mois', prixMois: 'Tarif mois',
      deposit: 'Caution', caution: 'Caution',
      daily: 'Jour', weekly: 'Semaine', monthly: 'Mois',

      insuranceExpiry: 'Expiration assurance', dateExpirationAssurance: 'Expiration assurance',
      vignetteExpiry: 'Expiration vignette', dateExpirationVignette: 'Expiration vignette',
      technicalExpiry: 'Contrôle technique', dateExpirationVisite: 'Contrôle technique',
      insuranceDoc: 'Assurance', vignetteDoc: 'Vignette', technicalDoc: 'Contrôle technique',
      registration: 'Immatriculation',

      alertExpired: 'Expiré', alertExpiring: 'Expire bientôt',
      expiresIn: 'Expire dans', expiredSince: 'Expiré depuis',
      daysLeft: 'jours restants', daysAgo: 'jours',
      noAlerts: 'Aucune alerte', noExpiry: 'Pas de date d\'expiration', documentAlerts: 'Alertes documents',
      alertsPanel: 'Alertes & Notifications',
      expiredDocuments: 'Documents Expirés', dueThisMonth: 'Échéances ce mois',
      carsInRepair: 'Véhicules en réparation', ongoing: 'En cours',

      totalFleet: 'Total flotte', filterByStatus: 'Filtrer par statut',
      filterByFuel: 'Filtrer par carburant', allFuelTypes: 'Carburant : Tous',
      allTransmissions: 'Transmission : Toutes', allBodyStyles: 'Carrosserie : Toutes',
      resetFilters: 'Réinitialiser',
      gridView: 'Grille', tableView: 'Tableau',
      currentStatus: 'Statut actuel', changeStatus: 'Changer le statut',
      selectStatus: 'Choisir le statut', lastUpdate: 'Dernière mise à jour',
      noImages: 'Aucune image', dropImages: 'Glissez des images ici ou cliquez pour télécharger',
      vehicleImages: 'Photos du véhicule', mainImage: 'Photo principale', changeImage: 'Changer la photo',
      addImages: 'Ajouter des photos', gallery: 'Galerie', imageManagement: 'Gestion des images',

      overview: 'Vue générale', technical: 'Technique', financial: 'Financier',
      administrative: 'Administratif', documents: 'Documents',
      technicalSpecs: 'Spécifications', technicalInfo: 'Info technique',
      financialInfo: 'Info financière', adminInfo: 'Info administrative',
      vehicleInfo: 'Info véhicule', insuranceInfo: 'Info assurance',

      duplicateVehicle: 'Dupliquer', archiveVehicle: 'Archiver',
      markAsSold: 'Marquer vendu', restoreVehicle: 'Restaurer',
      exportData: 'Exporter',

      // Insurance Management page
      insuranceManagement: 'Gestion des assurances',
      managePoliciesDesc: 'Gérez les contrats d\'assurance, expirations et couvertures',
      activePolicies: 'Polices actives', expiringSoon: 'Expire bientôt',
      expiredPolicies: 'Expirées', totalInsuranceCost: 'Coût total assurances',
      addInsurance: 'Ajouter assurance', renewInsurance: 'Renouveler',
      typeAssurance: 'Type de couverture', allStatuses: 'Tous les statuts',
      allCompanies: 'Toutes les compagnies', noPolicies: 'Aucune assurance trouvée',
      addFirstPolicy: 'Ajoutez votre premier contrat d\'assurance pour commencer.',
      policyAlerts: 'Attention requise', requireAttention: 'polices',
      overdue: 'En retard', policies: 'polices',
      currentExpiry: 'Expiration actuelle', confirmRenew: 'Confirmer le renouvellement',
      policyDetails: 'Détails de la police', dates: 'Dates',

      // Vehicle Sales page
      ventes: 'Ventes', vente: 'Vente',
      sellCar: 'Vendre', sellCarDesc: 'Enregistrer et gérer les véhicules vendus.',
      saleDate: 'Date de vente', salePrice: 'Prix de vente',
      buyer: 'Acheteur', buyerName: "Nom de l'acheteur...",
      soldVehicles: 'Véhicules vendus', availableToSell: 'À vendre',
      confirmSale: 'Confirmer la vente',
      noCarsToSell: 'Aucun véhicule disponible à la vente.',
      noSoldCars: 'Aucun véhicule vendu enregistré.',
      sellWarning: 'Cette action marque le véhicule comme vendu. Le changement est enregistré dans la fiche véhicule.',
      soldCar: 'Véhicule vendu', profit: 'Bénéfice',

      profitability: 'Rentabilité', roi: 'ROI',
      totalRentals: 'Total locations', avgDailyRevenue: 'Revenu moy./jour',
      totalExpenses: 'Total dépenses',
      revenueGenerated: 'Revenus générés',

      // Filtre disponibilité
      availabilityFilter: 'Vérifier disponibilité',
      checkAvailability: 'Résultats mis à jour pour la période sélectionnée',
      clearDates: 'Effacer les dates',
      from: 'Du', to: 'Au',
      availableForPeriod: 'Libre', bookedForPeriod: 'Réservée',

      // Vehicle detail page extras
      photos: 'Photos', reservationHistory: 'Historique des réservations',
      moreActions: 'Plus', monthlyEstimate: 'Estimation mensuelle',
      occupancyEst: "Taux d'occupation", noVehicleReservations: 'Aucune réservation pour ce véhicule.',
      expiresOn: 'Expire le', renewDoc: 'Renouveler', uploadDoc: 'Télécharger',
      vehicleSummary: 'Résumé du véhicule', technicalSummary: 'Résumé technique',
      financialSummary: 'Résumé financier', docStatus: 'État des documents',

      // Vues mobiles calendrier
      month: 'Mois', week: 'Semaine', day: 'Jour', agenda: 'Agenda',
      noBookingsForDay: 'Aucune réservation pour ce jour.',
      noUpcomingReservations: 'Aucune réservation à venir.',

      // ── Achats & Financement ──────────────────────────────────────────────
      groupPurchases: 'Achats',
      carPurchases: 'Achats Véhicules', carPurchase: 'Achat Véhicule',
      suppliers: 'Fournisseurs', supplier: 'Fournisseur',
      supplierDetails: 'Détails fournisseur',
      monthlyPayments: 'Mensualités',
      companyName: 'Raison sociale', contactPerson: 'Contact',
      taxId: 'ICE / SIRET', bankInfo: 'Informations bancaires', city: 'Ville',
      purchaseDetails: "Détails de l'achat",
      financingType: 'Type de financement', creditDetails: 'Détails crédit',
      comptant: 'Comptant', creditFinancing: 'Crédit', leasing: 'Leasing',
      tauxInteret: 'Taux d\'intérêt (%)', dateDebutCredit: 'Début du crédit',
      resteAFinancer: 'Reste à financer',
      financingSummary: 'Résumé financement',
      paymentSchedule: 'Échéancier',
      installmentNum: 'N° échéance', dueDate: 'Date échéance',
      monthlyAmount: 'Montant', remainingBalance: 'Solde restant',
      installments: 'Échéances',
      brouillon: 'Brouillon',
      achatActif: 'Actif', achatTermine: 'Terminé',
      achatAnnule: 'Annulé',
      achat_brouillon: 'Brouillon', achat_actif: 'Actif',
      achat_termine: 'Terminé', achat_annule: 'Annulé', achat_archive: 'Archivé',
      pay_pending: 'En attente', pay_paid: 'Payé', pay_late: 'En retard', pay_partial: 'Partiel',
      allTypes: 'Tous les types', allVehicles: 'Tous les véhicules',
      markAsPaid: 'Marquer payé', recordPayment: 'Enregistrer paiement',
      confirmPayment: 'Confirmer', totalDue: 'Total dû',
      uploadInvoice: 'Joindre facture', previewInvoice: 'Aperçu', downloadInvoice: 'Télécharger',
      replaceInvoice: 'Remplacer', removeInvoice: 'Supprimer', invoice: 'Facture',
      chooseFile: 'Choisir fichier', upload: 'Joindre',
      noInstallments: 'Aucune échéance à afficher.',
      totalFinanced: 'Financés', remainingDebt: 'Reste dû',
      monthlyPaymentTotal: 'Mensualités', overduePayments: 'En retard',
      outstanding: 'en cours', perMonth: 'par mois', vehicles: 'véhicules',
    },

    ar: {
      logo: 'AGOCAR', dashboard: 'لوحة التحكم', myCars: 'سياراتي',
      bureaus: 'المكاتب', profile: 'الملف الشخصي', settings: 'الإعدادات',
      logout: 'تسجيل الخروج', language: 'اللغة', hello: 'مرحبا',
      welcome: 'مرحبا بك في AGOCAR',

      view: 'عرض', edit: 'تعديل', delete: 'حذف', save: 'حفظ',
      saving: 'جاري الحفظ...', cancel: 'إلغاء', close: 'إغلاق',
      retry: 'إعادة المحاولة', previous: 'السابق', next: 'التالي', all: 'الكل',
      add: 'إضافة', search: 'بحث', confirm: 'تأكيد',

      loading: 'جاري التحميل...', noData: 'لا توجد بيانات',
      loadError: 'فشل التحميل. حاول مرة أخرى.',
      carAlreadyReserved: 'هذه السيارة محجوزة بالفعل في التواريخ المحددة.',
      booked: 'محجوز',

      // التقويم
      today: 'اليوم', thisMonth: 'هذا الشهر', fleetCalendar: 'تقويم الأسطول',
      confirmed: 'مؤكد', inProgress: 'جاري', pending: 'قيد الانتظار',
      cancelled: 'ملغى', more: 'المزيد',

      // Top header
      newClient: 'عميل جديد', newBooking: 'حجز جديد', netProfit: 'صافي الربح', clientsOwed: 'مستحق من العملاء',
      calendar: 'التقويم',

      available: 'متاح', activeRentals: 'الإيجارات النشطة',
      totalRevenue: 'إجمالي الإيرادات', recentReservations: 'الحجوزات الأخيرة',
      client: 'العميل', car: 'السيارة', date: 'التاريخ',
      noReservations: 'لا توجد حجوزات حديثة',
      expenses: 'المصاريف', revenue: 'الإيرادات', occupancyRate: 'نسبة الإشغال',
      activeBookings: 'الحجوزات النشطة', totalCars: 'إجمالي السيارات',
      monthlySummary: 'ملخص شهري', fleetStatus: 'حالة الأسطول',
      paymentDistribution: 'توزيع المدفوعات', paymentStatus: 'حالة الدفع', recentBookings: 'الحجوزات الأخيرة',
      bookedCars: 'مؤجرة', availableCars: 'متاحة', soldCars: 'مباعة',
      financialOverview: 'النظرة المالية', bookingStats: 'إحصائيات الحجز',
      lastReservations: 'آخر 10 حجوزات', upcoming: 'قادم', done: 'منتهي',

      // Reservation create/list
      dailyRate: 'السعر اليومي', numberOfDays: 'عدد الأيام',
      totalAmount: 'المبلغ الإجمالي', amountPaid: 'المبلغ المدفوع', remaining: 'المتبقي',
      createBooking: 'إنشاء حجز', searchClient: 'البحث عن عميل...',
      clientSearchPlaceholder: 'ابحث بالاسم، الإيميل، CIN، رخصة القيادة...',
      addNewClient: 'إضافة عميل جديد', selectVehicle: 'اختر سيارة',
      accessories: 'الملحقات', paymentMethod: 'طريقة الدفع',
      activeContracts: 'العقود النشطة', upcomingDepartures: 'المغادرات القادمة',
      historicalRecords: 'السجلات التاريخية', startDate: 'تاريخ البداية', endDate: 'تاريخ النهاية',
      duration: 'المدة', days: 'أيام', paid: 'مدفوع', unpaid: 'غير مدفوع', partial: 'جزئي',
      notes: 'ملاحظات', returnDate: 'تاريخ الإرجاع', departureDate: 'تاريخ المغادرة',

      addCar: 'إضافة سيارة', list: 'القائمة', finance: 'المالية', users: 'المستخدمون',
      noCars: 'لا توجد سيارات.',
      vehicleDetails: 'تفاصيل السيارة', editVehicle: 'تعديل السيارة',
      brand: 'الماركة', model: 'الموديل', year: 'السنة', pricePerDay: 'السعر/يوم',
      mileage: 'عداد المسافة', fuel: 'نوع الوقود', color: 'اللون', ac: 'التكييف',
      status: 'الحالة', uploadImage: 'رفع صورة السيارة',
      addNewVehicle: 'إضافة سيارة جديدة',
      disponible: 'متاحة', louee: 'مؤجرة', maintenance: 'صيانة',
      essence: 'بنزين', diesel: 'ديزل', hybride: 'هجين', electrique: 'كهربائي',

      manageOffices: 'إدارة مكاتبك',
      addBureau: 'إضافة مكتب', searchByName: 'البحث بالاسم...',
      active: 'نشط', inactive: 'غير نشط',
      actif: 'نشط', inactif: 'غير نشط',
      loadingBureaus: 'جاري تحميل المكاتب...', noBureaus: 'لا توجد مكاتب',
      name: 'الاسم', address: 'العنوان', created: 'تاريخ الإنشاء', updated: 'آخر تحديث',
      bureauDetails: 'تفاصيل المكتب', editBureau: 'تعديل المكتب',
      confirmDelete: 'تأكيد الحذف',
      deleteWarning: 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذه العملية.',
      cannotDelete: 'لا يمكن الحذف: هذه المركبة مرتبطة بسجلات أخرى (عقود، حجوزات…). أرشفتها عوضاً عن ذلك.',
      archiveInstead: 'أرشفة عوضاً عن ذلك',
      nameRequired: 'الاسم مطلوب',
      actions: 'الإجراءات', yes: 'نعم', no: 'لا',

      groupOperations: 'العمليات', groupFleet: 'الأسطول',
      groupMaintenance: 'الصيانة', groupFinance: 'المالية', groupAdmin: 'الإدارة',

      clients: 'العملاء', reservations: 'الحجوزات', contrats: 'العقود',
      paiements: 'المدفوعات', clientPayments: 'مدفوعات العملاء', addPayment: 'إضافة دفعة', totalCollected: 'إجمالي المحصل', reservationDates: 'تواريخ الحجز', payments: 'مدفوعات',
      reparations: 'الإصلاحات', vidanges: 'تغيير الزيت',
      adblue: 'أدبلو', suiviTechnique: 'الفحص التقني', assurances: 'التأمينات',
      depenses: 'المصاريف', credits: 'الائتمانات', infractions: 'المخالفات',
      accessoires: 'الملحقات', utilisateurs: 'المستخدمون', vignettes: 'الضريبة',

      reservation: 'الحجز', contrat: 'العقد', paiement: 'الدفع',
      reparation: 'الإصلاح', vidange: 'تغيير الزيت', assurance: 'التأمين',
      depense: 'المصروف', credit: 'الائتمان', infraction: 'المخالفة',
      accessoire: 'الملحق', utilisateur: 'المستخدم', vignette: 'الضريبة',

      montant: 'المبلغ', dateDebut: 'تاريخ البداية', dateFin: 'تاريخ النهاية',
      compagnie: 'الشركة', numeroPolice: 'رقم الوثيقة',
      quantiteLitres: 'الكمية (ل)', cout: 'التكلفة', garage: 'الكراج',
      modePaiement: 'طريقة الدفع', cin: 'بطاقة التعريف', telephone: 'الهاتف',
      prenom: 'الاسم الأول', permisConduire: 'رخصة القيادة',
      passeport: 'جواز السفر', nationalite: 'الجنسية', allNationalities: 'كل الجنسيات',
      categorie: 'الفئة', kilometrage: 'عداد المسافة',
      prochainKilometrage: 'العداد القادم', type: 'النوع', description: 'الوصف',
      voitureId: 'معرف السيارة', clientId: 'معرف العميل', contratId: 'معرف العقد', depenseId: 'معرف المصروف',
      filtreAir: 'فلتر الهواء', filtreHuile: 'فلتر الزيت', filtreCarburant: 'فلتر الوقود',
      numeroContrat: 'رقم العقد',
      dateEntree: 'تاريخ الدخول', dateSortie: 'تاريخ الخروج', datePaiement: 'تاريخ الدفع',
      prixJour: 'السعر/يوم', annee: 'السنة', montantTotal: 'المبلغ الإجمالي',
      mensualite: 'القسط الشهري', dureeMois: 'الأشهر', apport: 'الدفعة الأولى', dernierMensualite: 'آخر شهر', months: 'أشهر',
      describeInfraction: 'وصف المخالفة...',

      required: 'مطلوب', invalidEmail: 'البريد الإلكتروني غير صالح',
      passwordMin: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل',
      passwordMismatch: 'كلمتا المرور غير متطابقتين',
      emailLabel: 'البريد الإلكتروني', passwordLabel: 'كلمة المرور',
      confirmPasswordLabel: 'تأكيد كلمة المرور',
      loginBtn: 'تسجيل الدخول', registerBtn: 'إنشاء حساب',
      loginTitle: 'تسجيل الدخول إلى AGOCAR', registerTitle: 'إنشاء حساب جديد',
      noAccount: 'ليس لديك حساب؟', hasAccount: 'لديك حساب بالفعل؟',
      loginLink: 'تسجيل الدخول', registerLink: 'إنشاء حساب',

      // ── إدارة الأسطول ──────────────────────────────────────────────────────
      fleetManagement: 'إدارة الأسطول', fleetManagementDesc: 'إدارة ومراقبة جميع سيارات الأسطول.', fleetOverview: 'نظرة عامة على الأسطول',
      vehicleProfile: 'ملف السيارة', addVehicle: 'إضافة سيارة',
      viewFleet: 'عرض الأسطول', select: 'اختر',

      horsService: 'مشكلة وثائق', vendu: 'مباعة', archive: 'مؤرشفة',
      hors_service: 'مشكلة وثائق',

      version: 'الإصدار / التجهيز', vin: 'رقم الهيكل / VIN',
      immatriculation: 'رقم اللوحة', licensePlate: 'رقم اللوحة',
      transmission: 'ناقل الحركة', manuelle: 'يدوي', automatique: 'أوتوماتيك',
      puissanceCv: 'القوة (حصان)', enginePower: 'قوة المحرك',
      places: 'عدد المقاعد', portes: 'عدد الأبواب', vehicleCategory: 'الفئة',
      plate: 'اللوحة', hp: 'حصان',

      purchaseDate: 'تاريخ الشراء', dateAchat: 'تاريخ الشراء',
      purchasePrice: 'سعر الشراء', prixAchat: 'سعر الشراء',
      weeklyRate: 'السعر الأسبوعي', prixSemaine: 'السعر الأسبوعي',
      monthlyRate: 'السعر الشهري', prixMois: 'السعر الشهري',
      deposit: 'مبلغ الضمان', caution: 'مبلغ الضمان',
      daily: 'يوم', weekly: 'أسبوع', monthly: 'شهر',

      insuranceExpiry: 'انتهاء التأمين', dateExpirationAssurance: 'انتهاء التأمين',
      vignetteExpiry: 'انتهاء الضريبة', dateExpirationVignette: 'انتهاء الضريبة',
      technicalExpiry: 'الفحص التقني', dateExpirationVisite: 'الفحص التقني',
      insuranceDoc: 'التأمين', vignetteDoc: 'الضريبة', technicalDoc: 'الفحص التقني',
      registration: 'التسجيل',

      alertExpired: 'منتهية الصلاحية', alertExpiring: 'تنتهي قريباً',
      expiresIn: 'تنتهي خلال', expiredSince: 'منتهية منذ',
      daysLeft: 'أيام متبقية', daysAgo: 'أيام',
      noAlerts: 'لا تنبيهات', noExpiry: 'لا تاريخ انتهاء', documentAlerts: 'تنبيهات الوثائق',
      alertsPanel: 'التنبيهات والإشعارات',
      expiredDocuments: 'وثائق منتهية الصلاحية', dueThisMonth: 'مستحق هذا الشهر',
      carsInRepair: 'سيارات في الإصلاح', ongoing: 'جارٍ',

      totalFleet: 'إجمالي الأسطول', filterByStatus: 'تصفية حسب الحالة',
      filterByFuel: 'تصفية حسب الوقود', allFuelTypes: 'الوقود: الكل',
      allTransmissions: 'ناقل الحركة: الكل', allBodyStyles: 'نوع الهيكل: الكل',
      resetFilters: 'إعادة التعيين',
      gridView: 'شبكة', tableView: 'جدول',
      currentStatus: 'الحالة الحالية', changeStatus: 'تغيير الحالة',
      selectStatus: 'اختر الحالة', lastUpdate: 'آخر تحديث',
      noImages: 'لا توجد صور', dropImages: 'أسقط الصور هنا أو انقر للرفع',
      vehicleImages: 'صور السيارة', mainImage: 'الصورة الرئيسية', changeImage: 'تغيير الصورة',
      addImages: 'إضافة صور', gallery: 'المعرض', imageManagement: 'إدارة الصور',

      overview: 'نظرة عامة', technical: 'تقنية', financial: 'مالي',
      administrative: 'إداري', documents: 'وثائق',
      technicalSpecs: 'المواصفات', technicalInfo: 'معلومات تقنية',
      financialInfo: 'معلومات مالية', adminInfo: 'معلومات إدارية',
      vehicleInfo: 'معلومات السيارة', insuranceInfo: 'معلومات التأمين',

      duplicateVehicle: 'تكرار', archiveVehicle: 'أرشفة',
      markAsSold: 'تحديد كمباع', restoreVehicle: 'استعادة',
      exportData: 'تصدير',

      // صفحة إدارة التأمينات
      insuranceManagement: 'إدارة التأمينات',
      managePoliciesDesc: 'إدارة عقود التأمين والانتهاءات وحالات التغطية',
      activePolicies: 'وثائق نشطة', expiringSoon: 'تنتهي قريباً',
      expiredPolicies: 'منتهية', totalInsuranceCost: 'إجمالي تكاليف التأمين',
      addInsurance: 'إضافة تأمين', renewInsurance: 'تجديد',
      typeAssurance: 'نوع التغطية', allStatuses: 'جميع الحالات',
      allCompanies: 'جميع الشركات', noPolicies: 'لا توجد وثائق تأمين',
      addFirstPolicy: 'أضف أول عقد تأمين للبدء.',
      policyAlerts: 'تنبيهات مطلوبة', requireAttention: 'وثائق',
      overdue: 'متأخر', policies: 'وثائق',
      currentExpiry: 'تاريخ الانتهاء الحالي', confirmRenew: 'تأكيد التجديد',
      policyDetails: 'تفاصيل الوثيقة', dates: 'التواريخ',

      // صفحة مبيعات السيارات
      ventes: 'مبيعات السيارات', vente: 'بيع',
      sellCar: 'بيع', sellCarDesc: 'تسجيل وإدارة السيارات المباعة.',
      saleDate: 'تاريخ البيع', salePrice: 'سعر البيع',
      buyer: 'المشتري', buyerName: 'اسم المشتري...',
      soldVehicles: 'السيارات المباعة', availableToSell: 'متاح للبيع',
      confirmSale: 'تأكيد البيع',
      noCarsToSell: 'لا توجد سيارات متاحة للبيع.',
      noSoldCars: 'لم يتم تسجيل أي سيارة مباعة حتى الآن.',
      sellWarning: 'سيؤدي هذا الإجراء إلى تحديد السيارة كمباعة. يُسجَّل التغيير في ملف السيارة.',
      soldCar: 'سيارة مباعة', profit: 'الربح',

      profitability: 'الربحية', roi: 'معدل العائد',
      totalRentals: 'إجمالي الإيجارات', avgDailyRevenue: 'متوسط الإيراد اليومي',
      totalExpenses: 'إجمالي المصاريف',
      revenueGenerated: 'الإيرادات المحققة',

      // فلتر التوفر
      availabilityFilter: 'التحقق من التوفر',
      checkAvailability: 'تم تحديث النتائج للفترة المختارة',
      clearDates: 'مسح التواريخ',
      from: 'من', to: 'إلى',
      availableForPeriod: 'متاح', bookedForPeriod: 'محجوز',

      // Vehicle detail page extras
      photos: 'الصور', reservationHistory: 'سجل الحجوزات',
      moreActions: 'المزيد', monthlyEstimate: 'التقدير الشهري',
      occupancyEst: 'معدل الإشغال', noVehicleReservations: 'لا توجد حجوزات لهذه المركبة.',
      expiresOn: 'تنتهي في', renewDoc: 'تجديد', uploadDoc: 'رفع',
      vehicleSummary: 'ملخص المركبة', technicalSummary: 'الملخص التقني',
      financialSummary: 'الملخص المالي', docStatus: 'حالة الوثائق',

      // عروض التقويم للجوال
      month: 'شهر', week: 'أسبوع', day: 'يوم', agenda: 'جدول الأعمال',
      noBookingsForDay: 'لا توجد حجوزات لهذا اليوم.',
      noUpcomingReservations: 'لا توجد حجوزات قادمة.',

      // ── شراء السيارات والتمويل ───────────────────────────────────────────
      groupPurchases: 'المشتريات',
      carPurchases: 'شراء السيارات', carPurchase: 'شراء سيارة',
      suppliers: 'الموردون', supplier: 'المورد',
      supplierDetails: 'تفاصيل المورد',
      monthlyPayments: 'الأقساط الشهرية',
      companyName: 'اسم الشركة', contactPerson: 'جهة الاتصال',
      taxId: 'الرقم الضريبي', bankInfo: 'المعلومات البنكية', city: 'المدينة',
      purchaseDetails: 'تفاصيل الشراء',
      financingType: 'نوع التمويل', creditDetails: 'تفاصيل القرض',
      comptant: 'نقداً', creditFinancing: 'تمويل بالقرض', leasing: 'ليزينغ',
      tauxInteret: 'معدل الفائدة (%)', dateDebutCredit: 'تاريخ بدء القرض',
      resteAFinancer: 'المبلغ المتبقي للتمويل',
      financingSummary: 'ملخص التمويل',
      paymentSchedule: 'جدول السداد',
      installmentNum: 'رقم القسط', dueDate: 'تاريخ الاستحقاق',
      monthlyAmount: 'المبلغ', remainingBalance: 'الرصيد المتبقي',
      installments: 'الأقساط',
      brouillon: 'مسودة',
      achatActif: 'نشط', achatTermine: 'مكتمل',
      achatAnnule: 'ملغى',
      achat_brouillon: 'مسودة', achat_actif: 'نشط',
      achat_termine: 'مكتمل', achat_annule: 'ملغى', achat_archive: 'مؤرشف',
      pay_pending: 'قيد الانتظار', pay_paid: 'مدفوع', pay_late: 'متأخر', pay_partial: 'جزئي',
      allTypes: 'كل الأنواع', allVehicles: 'كل السيارات',
      markAsPaid: 'تحديد كمدفوع', recordPayment: 'تسجيل الدفع',
      confirmPayment: 'تأكيد الدفع', totalDue: 'إجمالي المستحق',
      uploadInvoice: 'رفع الفاتورة', previewInvoice: 'معاينة', downloadInvoice: 'تنزيل',
      replaceInvoice: 'استبدال', removeInvoice: 'حذف', invoice: 'الفاتورة',
      chooseFile: 'اختر ملفاً', upload: 'رفع',
      noInstallments: 'لا توجد أقساط للعرض.',
      totalFinanced: 'ممولة', remainingDebt: 'الدين المتبقي',
      monthlyPaymentTotal: 'المستحق الشهري', overduePayments: 'متأخرة',
      outstanding: 'جارية', perMonth: 'شهرياً', vehicles: 'سيارات',
    }
  };

  private currentLanguage = new BehaviorSubject<string>('en');
  private currentDirection = new BehaviorSubject<string>('ltr');

  currentLang$ = this.currentLanguage.asObservable();
  direction$   = this.currentDirection.asObservable();

  constructor() { this.initializeLanguage(); }

  private initializeLanguage(): void {
    const saved   = localStorage.getItem('language');
    const browser = navigator.language.split('-')[0];
    const lang = (saved && ['en','fr','ar'].includes(saved)) ? saved
               : (['en','fr','ar'].includes(browser) ? browser : 'en');
    this.setLanguage(lang);
  }

  setLanguage(lang: string): void {
    if (!['en','fr','ar'].includes(lang)) return;
    this.currentLanguage.next(lang);
    localStorage.setItem('language', lang);
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    this.currentDirection.next(dir);
    document.documentElement.setAttribute('dir', dir);
  }

  translate(key: string): string {
    const lang = this.currentLanguage.value;
    return this.translations[lang]?.[key] ?? key;
  }

  getCurrentLanguage(): string  { return this.currentLanguage.value; }
  getDirection(): string        { return this.currentDirection.value; }
}
