# Vidéos du guide

Dépose ici les vidéos qui accompagnent inerWeb Fluide, puis déclare-les dans
le guide. Elles apparaissent alors dans **Guide → Vidéos et supports de cours**.

## Ajouter une vidéo

1. Dépose le fichier : `videos/prise-en-main.mp4`
2. Ouvre `guide.html`, descends au tableau `RESSOURCES` (tout en bas, dans le
   `<script>`), et ajoute une entrée :

```js
{
  genre: 'video',
  titre: 'Prise en main en 5 minutes',
  meta: '5 min · tout public',
  resume: "Ce qu'on fait au premier lancement : compte administrateur, "
        + "établissement, première machine.",
  fichier: 'videos/prise-en-main.mp4'
}
```

C'est tout. Le lecteur s'affiche dans la carte, et le pavé « Emplacement
vidéo » disparaît de lui-même dès qu'une vidéo est déclarée.

Pour une vidéo hébergée ailleurs (chaîne de l'établissement, plateforme
académique), remplace `fichier:` par `lien:` — la carte affiche alors un
bouton qui ouvre la page dans un nouvel onglet.

## Format

- **MP4, codec H.264, son AAC.** C'est ce que lisent tous les navigateurs sans
  extension. Un `.mkv` ou un `.avi` ne s'ouvrira pas.
- **Vise le poids.** Une vidéo de plusieurs centaines de Mo dans un dépôt Git,
  c'est un dépôt qui devient lent pour tout le monde, définitivement — Git
  garde chaque version. Au-delà de ~25 Mo, préfère un hébergement externe et
  un `lien:`.
- **Sous-titres.** Si tu as un fichier `.vtt`, dis-le-moi et j'ajoute la piste :
  c'est ce qui rend la vidéo utilisable par un élève sourd ou malentendant, et
  par tous ceux qui regardent sans le son.

## Droits

Une vidéo que tu as tournée toi-même ne pose aucune question. Une vidéo prise
ailleurs — chaîne constructeur, site technique, extrait d'un DVD de formation —
ne peut pas être déposée ici : elle reste sous le droit d'auteur de son
producteur. Dans ce cas, un `lien:` vers la source d'origine est la seule voie
propre.

Attention aussi à ce qui est filmé : si des élèves apparaissent à l'image, il
faut une autorisation de droit à l'image, et le RGPD s'applique.
