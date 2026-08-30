# Redirections du livret « Habilitation Fluide » — à déployer

Copier le dossier `f/` tel quel **à la racine du dépôt `frigorx/pilote-fluides`**
(le dépôt qui sert inerweb.fr par GitHub Pages). Chaque alias imprimé dans le
livret — `https://inerweb.fr/f/<slug>` — devient alors une page de redirection
statique, la seule forme de redirection que GitHub Pages sache servir : un
`.htaccess` y est ignoré (aucun Apache derrière, en-tête `server: GitHub.com`).

Changer la cible d’un QR déjà imprimé = rééditer le `index.html` de son alias
dans pilote-fluides, jamais le livret. Ce dossier se régénère en entier par
`npm run qr` ; ne pas l’éditer à la main ici.
