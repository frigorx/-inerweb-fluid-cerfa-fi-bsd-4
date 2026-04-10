/**
 * inerWeb Fluide — Aide contextuelle intégrée
 * Bouton ? sur chaque section avec guide complet
 */

const AIDE = {

  /** Contenu d'aide par section */
  contenus: {

    dashboard: {
      titre: 'Tableau de bord',
      description: 'Vue d\'ensemble de votre activité F-Gas.',
      sections: [
        {
          q: 'À quoi sert cette page ?',
          r: 'Le tableau de bord affiche un résumé : nombre de machines, bouteilles en stock, équivalent CO2 total, et les alertes en cours. C\'est votre page d\'accueil.'
        },
        {
          q: 'Que faire en premier ?',
          r: '1. Allez dans Admin pour configurer votre entreprise (SIRET, adresse).\n2. Ajoutez vos machines dans l\'onglet Machines.\n3. Ajoutez vos bouteilles dans l\'onglet Bouteilles.\n4. Créez votre premier mouvement via le bouton "Nouveau mouvement".'
        },
        {
          q: 'Comment générer un CERFA ?',
          r: 'Cliquez sur "Visualiser CERFA" pour un aperçu, ou créez un mouvement — le CERFA est généré automatiquement à la fin du wizard.'
        },
        {
          q: 'Comment imprimer les QR codes ?',
          r: 'Cliquez sur "QR Codes" pour générer une feuille imprimable avec tous les QR codes de vos machines et bouteilles.'
        }
      ]
    },

    machines: {
      titre: 'Parc machines',
      description: 'Gestion de vos équipements frigorifiques.',
      sections: [
        {
          q: 'Comment ajouter une machine ?',
          r: 'Cliquez sur le bouton "Ajouter" en haut. Remplissez au minimum : désignation, type, fluide, charge nominale.'
        },
        {
          q: 'Comment supprimer une machine ?',
          r: 'Cliquez sur l\'icône 🗑️ sous la carte machine. La machine sera archivée (pas supprimée définitivement). Vous pourrez la restaurer depuis l\'onglet Archives.'
        },
        {
          q: 'Que signifient les couleurs ?',
          r: '• Vert = En service, contrôle à jour\n• Orange = Contrôle d\'étanchéité proche\n• Rouge = Contrôle échu, intervention nécessaire'
        },
        {
          q: 'Comment voir l\'historique d\'une machine ?',
          r: 'Cliquez sur la carte machine. La fiche détaillée affiche tous les mouvements, contrôles et CERFAs liés, avec des liens croisés vers les bouteilles et opérateurs.'
        },
        {
          q: 'Qu\'est-ce qu\'une machine préchargée ?',
          r: 'Une machine préchargée en usine a déjà du fluide dedans à la livraison. Dans le wizard mouvement, l\'étape Bouteille peut être passée car le fluide ne vient pas d\'une bouteille.'
        }
      ]
    },

    bouteilles: {
      titre: 'Stock bouteilles',
      description: 'Suivi de vos bouteilles de fluide frigorigène.',
      sections: [
        {
          q: 'Comment ajouter une bouteille ?',
          r: 'Cliquez sur "Ajouter". Choisissez la catégorie (Neuve, Transfert, Récupération), le fluide, la tare et la masse actuelle.'
        },
        {
          q: 'Comment supprimer une bouteille ?',
          r: 'Cliquez sur 🗑️ sous la carte. La bouteille est archivée. Son historique de mouvements est conservé.'
        },
        {
          q: 'Comment retourner une bouteille ?',
          r: 'Cliquez sur "📦 Retour" : choisissez si c\'est un retour fournisseur, un envoi Trackdéchets (BSFF), ou une bouteille vide consignée.'
        },
        {
          q: 'Comment imprimer la fiche d\'une bouteille ?',
          r: 'Cliquez sur "📄 PDF" sous la carte. Cela génère la fiche mouvement officielle (2 pages) avec l\'identité de la bouteille et le tableau de tous les mouvements.'
        },
        {
          q: 'Que signifie la barre de niveau ?',
          r: 'La barre verticale indique le taux de remplissage de la bouteille par rapport à sa capacité maximale.'
        }
      ]
    },

    mouvements: {
      titre: 'Mouvements de fluide',
      description: 'Historique de toutes les manipulations de fluide.',
      sections: [
        {
          q: 'Comment créer un mouvement ?',
          r: 'Cliquez sur "Nouveau". L\'assistant en 5 étapes vous guide :\n1. Type (Charge, Récupération, Transfert, Mise en service)\n2. Machine concernée\n3. Bouteille utilisée\n4. Pesées avant/après\n5. Signature et validation'
        },
        {
          q: 'Que signifient les statuts ?',
          r: '• BROUILLON = en cours de saisie\n• EN_ATTENTE = à valider par un enseignant/référent\n• VALIDÉ = mouvement confirmé, CERFA généré'
        },
        {
          q: 'Comment voir le CERFA d\'un mouvement ?',
          r: 'Cliquez sur le lien CERFA dans la colonne correspondante du tableau. Le vrai PDF officiel 15497*04 s\'ouvre rempli avec les données du mouvement.'
        },
        {
          q: 'Comment annuler un mouvement ?',
          r: 'Depuis la fiche détaillée du mouvement, utilisez le bouton d\'annulation. Les stocks de la machine et de la bouteille seront recalculés.'
        }
      ]
    },

    controles: {
      titre: 'Contrôles d\'étanchéité',
      description: 'Suivi réglementaire des contrôles d\'étanchéité.',
      sections: [
        {
          q: 'Comment ajouter un contrôle ?',
          r: 'Cliquez sur "Nouveau". Sélectionnez la machine, la méthode (Directe, Indirecte, Pression), et le résultat (Conforme ou Fuite).'
        },
        {
          q: 'Quelle est la fréquence obligatoire ?',
          r: 'Elle dépend de la charge en équivalent CO2 et de la présence d\'un détecteur permanent :\n• < 5 teqCO2 : tous les 12 mois (24 avec détection)\n• 5-50 teqCO2 : tous les 6 mois (12 avec détection)\n• > 50 teqCO2 : tous les 3 mois (6 avec détection)'
        },
        {
          q: 'Que faire en cas de fuite ?',
          r: 'Indiquez "Fuite" comme résultat, précisez la localisation. Une alerte sera créée. La réparation doit être faite dans les meilleurs délais et un contrôle de suivi programmé.'
        }
      ]
    },

    stats: {
      titre: 'Statistiques',
      description: 'Analyses et tendances de votre activité.',
      sections: [
        {
          q: 'Que montre cette page ?',
          r: 'Les statistiques avancées : répartition des mouvements par type, taux de conformité des contrôles, évolution sur 12 mois, répartition du parc par fluide.'
        }
      ]
    },

    bilan: {
      titre: 'Bilan annuel',
      description: 'Bilan réglementaire annuel par fluide.',
      sections: [
        {
          q: 'À quoi sert le bilan annuel ?',
          r: 'C\'est le document obligatoire pour la déclaration annuelle des fluides frigorigènes. Il récapitule par fluide : les achats, les charges, les récupérations, et les stocks début/fin d\'année.'
        },
        {
          q: 'Comment l\'utiliser ?',
          r: '1. Sélectionnez l\'année\n2. Optionnel : filtrez par fluide\n3. Cliquez "Charger"\n4. Exportez en CSV, en format ADEME (Excel), ou imprimez le PDF officiel'
        },
        {
          q: 'Qu\'est-ce que l\'export ADEME ?',
          r: 'C\'est le format structuré attendu par l\'ADEME pour la déclaration annuelle des fluides. Le bouton "Suivi fluides (PDF)" génère le tableau officiel complet.'
        },
        {
          q: 'Comment imprimer le registre des plaintes ?',
          r: 'Le bouton "Registre plaintes" génère le PDF réglementaire. Vous pouvez aussi le gérer depuis l\'onglet Admin.'
        }
      ]
    },

    fluides: {
      titre: 'Traçabilité par fluide',
      description: 'Vue centrée sur chaque fluide frigorigène.',
      sections: [
        {
          q: 'À quoi sert cette page ?',
          r: 'Elle permet de voir, pour chaque fluide (R32, R410A, R134a...), tous les mouvements associés, les machines qui l\'utilisent, et les quantités totales.'
        },
        {
          q: 'Comment ça marche ?',
          r: 'Cliquez sur un fluide pour voir sa fiche complète : mouvements, contrôles, machines concernées, stock total.'
        }
      ]
    },

    alertes: {
      titre: 'Alertes réglementaires',
      description: 'Points d\'attention et obligations en cours.',
      sections: [
        {
          q: 'Quels types d\'alertes ?',
          r: '• Attestation de capacité expirée\n• Contrôle d\'étanchéité échu\n• Fuite détectée non réparée\n• Détecteur d\'étalonnage périmé'
        },
        {
          q: 'Comment résoudre une alerte ?',
          r: 'Effectuez l\'action corrective (contrôle, réparation, renouvellement attestation), puis marquez l\'alerte comme résolue.'
        }
      ]
    },

    admin: {
      titre: 'Administration',
      description: 'Configuration de l\'application.',
      sections: [
        {
          q: 'Cadre 1 — Entreprise / Opérateur',
          r: 'Renseignez votre raison sociale, adresse et SIRET. Ces informations apparaîtront dans le Cadre 1 de tous vos CERFA.'
        },
        {
          q: 'Utilisateurs / Techniciens',
          r: 'Ajoutez les opérateurs habilités. Renseignez leur attestation de capacité (n°, date, validité, catégories). En mode OFFICIEL, seuls les opérateurs avec attestation valide peuvent créer des mouvements.'
        },
        {
          q: 'Clients / Détenteurs',
          r: 'Les propriétaires des équipements (Cadre 2 du CERFA). Associez-les aux machines.'
        },
        {
          q: 'Détecteurs de fuites',
          r: 'Enregistrez vos détecteurs (Cadre 5 du CERFA). L\'application vérifie la date d\'étalonnage et alerte si périmé.'
        },
        {
          q: 'Registre des plaintes',
          r: 'Obligatoire pour l\'attestation de capacité. Ajoutez chaque plainte reçue avec sa date, le client, la nature et le suivi. Imprimez le PDF officiel pour l\'auditeur.'
        },
        {
          q: 'Mode Formation vs Officiel',
          r: '• Formation : filigrane sur les documents, numérotation FORM-, accès libre\n• Officiel : documents sans filigrane, numérotation FI- officielle, require attestation valide'
        },
        {
          q: 'Sauvegarde & Restauration',
          r: '5 méthodes de sauvegarde disponibles :\n\n• 💾 Clé USB : télécharge un fichier JSON complet\n• ☁️ Google Drive : sauvegarde automatique dans un dossier dédié (30 backups conservés)\n• 📧 Email : envoie le backup par email avec résumé\n• 🖨️ Impression : génère tous les PDF officiels pour archivage papier\n• 📂 Restauration : recharge un backup JSON précédent\n\nRègle d\'or : sauvegardez sur AU MOINS 2 supports différents, régulièrement.'
        }
      ]
    }
  },

  /**
   * Affiche la bulle d'aide pour une section
   */
  afficher(section) {
    const aide = this.contenus[section];
    if (!aide) return;

    // Supprimer une bulle existante
    document.getElementById('aide-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'aide-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';

    let html = '<div style="background:white;border-radius:12px;max-width:600px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">';
    html += '<div style="background:#1b3a63;color:white;padding:16px 20px;border-radius:12px 12px 0 0;display:flex;justify-content:space-between;align-items:center;">';
    html += '<div><h2 style="margin:0;font-size:18px;">❓ ' + aide.titre + '</h2>';
    html += '<p style="margin:4px 0 0;font-size:13px;opacity:0.8;">' + aide.description + '</p></div>';
    html += '<button id="aide-close" style="background:none;border:none;color:white;font-size:24px;cursor:pointer;padding:0 4px;">&times;</button>';
    html += '</div>';
    html += '<div style="padding:20px;">';

    aide.sections.forEach((s, i) => {
      html += '<div style="margin-bottom:16px;' + (i > 0 ? 'border-top:1px solid #E5E7EB;padding-top:16px;' : '') + '">';
      html += '<h3 style="margin:0 0 6px;color:#1b3a63;font-size:14px;">' + s.q + '</h3>';
      html += '<p style="margin:0;font-size:13px;color:#374151;line-height:1.6;white-space:pre-line;">' + s.r + '</p>';
      html += '</div>';
    });

    html += '</div></div>';
    overlay.innerHTML = html;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.id === 'aide-close') overlay.remove();
    });

    document.body.appendChild(overlay);
  },

  /**
   * Injecte les boutons d'aide dans toutes les sections
   */
  injecterBoutons() {
    const mapping = {
      'view-dashboard': 'dashboard',
      'view-machines': 'machines',
      'view-bouteilles': 'bouteilles',
      'view-mouvements': 'mouvements',
      'view-controles': 'controles',
      'view-stats': 'stats',
      'view-bilan': 'bilan',
      'view-fluides': 'fluides',
      'view-alertes': 'alertes',
      'view-admin': 'admin'
    };

    for (const [viewId, section] of Object.entries(mapping)) {
      const view = document.getElementById(viewId);
      if (!view) continue;

      // Chercher le premier h2 ou header
      const header = view.querySelector('h2, .section-header, .card-header');
      if (!header) continue;

      // Ne pas ajouter si déjà présent
      if (header.querySelector('.btn-aide')) continue;

      const btn = document.createElement('button');
      btn.className = 'btn-aide';
      btn.title = 'Aide — ' + (this.contenus[section]?.titre || section);
      btn.textContent = '?';
      btn.style.cssText = 'background:#ff6b35;color:white;border:none;border-radius:50%;width:28px;height:28px;font-size:16px;font-weight:bold;cursor:pointer;margin-left:10px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;box-shadow:0 2px 6px rgba(255,107,53,0.4);transition:transform 0.2s;';
      btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.15)');
      btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.afficher(section);
      });

      header.appendChild(btn);
    }
  }
};

window.AIDE = AIDE;
